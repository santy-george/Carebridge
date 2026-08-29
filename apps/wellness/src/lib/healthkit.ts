import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import * as Sentry from '@sentry/react';
import { supabase } from './supabase';

// Read-only HealthKit integration: streams new samples from the native
// HealthKitBridge plugin (apps/wellness/ios/App/App/HealthKitBridge.swift)
// into ingest-wearable. Never writes to HealthKit. Best-effort, same posture
// as push.ts -- a member may not own a Watch at all, so permission denial or
// any failure here must never block the app.

export const FLUSH_BATCH_SIZE = 20;

type NumericReadingType =
  | 'heart_rate'
  | 'spo2'
  | 'heart_rate_variability_sdnn'
  | 'resting_heart_rate'
  | 'respiratory_rate'
  | 'walking_speed'
  | 'vo2_max'
  | 'apple_walking_steadiness'
  | 'apple_sleeping_wrist_temperature'
  | 'step_count'
  | 'active_energy_burned'
  | 'distance_walked_running'
  | 'apple_stand_time';

interface HealthKitReading {
  reading_type: NumericReadingType;
  value: number;
  recorded_at: string;
}

interface HealthKitSleepSession {
  started_at: string;
  ended_at: string;
  stage: 'in_bed' | 'asleep_core' | 'asleep_deep' | 'asleep_rem' | 'awake';
}

interface HealthKitECGReading {
  recorded_at: string;
  classification: string;
  average_heart_rate?: number;
}

interface HealthKitRhythmEvent {
  recorded_at: string;
}

interface HealthKitBridgePlugin {
  requestAuthorization(): Promise<{ granted: boolean }>;
  startObserving(): Promise<void>;
  addListener(
    eventName: 'healthKitSamples',
    listenerFunc: (data: { readings: HealthKitReading[] }) => void,
  ): Promise<{ remove: () => void }>;
  addListener(
    eventName: 'healthKitSleepSessions',
    listenerFunc: (data: { sessions: HealthKitSleepSession[] }) => void,
  ): Promise<{ remove: () => void }>;
  addListener(
    eventName: 'healthKitEcgReadings',
    listenerFunc: (data: { readings: HealthKitECGReading[] }) => void,
  ): Promise<{ remove: () => void }>;
  addListener(
    eventName: 'healthKitRhythmEvents',
    listenerFunc: (data: { events: HealthKitRhythmEvent[] }) => void,
  ): Promise<{ remove: () => void }>;
}

const HealthKitBridge = registerPlugin<HealthKitBridgePlugin>('HealthKitBridge');

let readingsQueue: HealthKitReading[] = [];
let sleepQueue: HealthKitSleepSession[] = [];
let ecgQueue: HealthKitECGReading[] = [];
let rhythmQueue: HealthKitRhythmEvent[] = [];
let activeUserId: string | null = null;
let activeMemberId: string | null = null;
let listenersAttached = false;

export function __resetHealthKitStateForTests(): void {
  readingsQueue = [];
  sleepQueue = [];
  ecgQueue = [];
  rhythmQueue = [];
  activeUserId = null;
  activeMemberId = null;
  listenersAttached = false;
}

function queuedCount(): number {
  return readingsQueue.length + sleepQueue.length + ecgQueue.length + rhythmQueue.length;
}

async function flush(): Promise<void> {
  if (queuedCount() === 0 || !activeMemberId) return;
  const body: Record<string, unknown> = { member_id: activeMemberId };
  if (readingsQueue.length) body.readings = readingsQueue;
  if (sleepQueue.length) body.sleep_sessions = sleepQueue;
  if (ecgQueue.length) body.ecg_readings = ecgQueue;
  if (rhythmQueue.length) body.rhythm_events = rhythmQueue;
  readingsQueue = [];
  sleepQueue = [];
  ecgQueue = [];
  rhythmQueue = [];

  const { data, error } = await supabase.functions.invoke('ingest-wearable', { body });
  if (error || !data?.ok) {
    console.error('Failed to ingest wearable readings:', error ?? data);
    Sentry.withScope((scope) => {
      if (activeUserId) {
        scope.setUser({ id: activeUserId });
      }
      scope.setTag('member_id', activeMemberId);
      Sentry.captureException(error ?? new Error('ingest-wearable returned not-ok'));
    });
  }
}

function flushIfBatchFull(): void {
  if (queuedCount() >= FLUSH_BATCH_SIZE) {
    void flush();
  }
}

function attachListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;

  void HealthKitBridge.addListener('healthKitSamples', (data) => {
    readingsQueue.push(...data.readings);
    flushIfBatchFull();
  });
  void HealthKitBridge.addListener('healthKitSleepSessions', (data) => {
    sleepQueue.push(...data.sessions);
    flushIfBatchFull();
  });
  void HealthKitBridge.addListener('healthKitEcgReadings', (data) => {
    ecgQueue.push(...data.readings);
    flushIfBatchFull();
  });
  void HealthKitBridge.addListener('healthKitRhythmEvents', (data) => {
    rhythmQueue.push(...data.events);
    flushIfBatchFull();
  });

  void App.addListener('appStateChange', (state) => {
    if (!state.isActive) {
      void flush();
    }
  });
}

// Called once per signed-in session (see AuthProvider), same call-site shape
// as registerPushToken. No-op on the web build.
export async function registerHealthKit(userId: string, memberId: string): Promise<void> {
  activeUserId = userId;
  activeMemberId = memberId;

  if (!Capacitor.isNativePlatform()) return;

  attachListeners();

  try {
    const { granted } = await HealthKitBridge.requestAuthorization();
    if (!granted) return;
    await HealthKitBridge.startObserving();
  } catch (error) {
    console.error('HealthKit registration failed:', error);
    Sentry.captureException(error);
  }
}
