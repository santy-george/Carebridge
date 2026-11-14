import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import * as Sentry from '@sentry/react';
import { supabase } from './supabase';
import { toSentryError } from './toSentryError';

// Read-only wearable integration: streams new samples from the native
// HealthKitBridge plugin on iOS (apps/wellness/ios/App/App/HealthKitBridge.swift)
// or HealthConnectBridge on Android (HealthConnectBridgePlugin.kt) into
// ingest-wearable. Both plugins emit the same events, so everything below the
// platform switch is shared. Never writes. Best-effort, same posture
// as push.ts -- a member may not own a Watch at all, so permission denial or
// any failure here must never block the app.

export const FLUSH_BATCH_SIZE = 20;

type NumericReadingType =
  | 'heart_rate'
  | 'spo2'
  | 'heart_rate_variability_sdnn'
  | 'heart_rate_variability_rmssd'
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
  // Android only: Health Connect cannot push to a backgrounded app, so the
  // plugin is asked to pull on resume.
  syncNow?(): Promise<void>;
  // Android only: the WorkManager job that uploads while the app is closed.
  enableBackgroundSync?(options: {
    supabaseUrl: string;
    anonKey: string;
    memberId: string;
    deviceToken: string;
  }): Promise<void>;
  disableBackgroundSync?(): Promise<void>;
  backgroundSyncStatus?(): Promise<{
    enabledForMemberId: string | null;
    backgroundPermission: boolean;
  }>;
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
const HealthConnectBridge = registerPlugin<HealthKitBridgePlugin>('HealthConnectBridge');

function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

function bridge(): HealthKitBridgePlugin {
  return isAndroid() ? HealthConnectBridge : HealthKitBridge;
}

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
  if (isAndroid()) body.device_vendor = 'health_connect';
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
      Sentry.captureException(toSentryError(error, 'ingest-wearable returned not-ok'));
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

  void bridge().addListener('healthKitSamples', (data) => {
    readingsQueue.push(...data.readings);
    flushIfBatchFull();
  });
  void bridge().addListener('healthKitSleepSessions', (data) => {
    sleepQueue.push(...data.sessions);
    flushIfBatchFull();
  });
  void bridge().addListener('healthKitEcgReadings', (data) => {
    ecgQueue.push(...data.readings);
    flushIfBatchFull();
  });
  void bridge().addListener('healthKitRhythmEvents', (data) => {
    rhythmQueue.push(...data.events);
    flushIfBatchFull();
  });

  void App.addListener('appStateChange', (state) => {
    if (!state.isActive) {
      void flush();
    } else if (isAndroid()) {
      bridge()
        .syncNow?.()
        .catch((error) => console.error('Health Connect sync failed:', error));
    }
  });
}

// Android background sync: trade the session for a device upload key (see
// register-wearable-device) and hand it to the native job. Only on the
// member's own record, and only once per member: a key already enabled for
// this member is left alone, so an app open does not mint a new key.
async function ensureBackgroundSync(memberId: string): Promise<void> {
  const plugin = bridge();
  const status = await plugin.backgroundSyncStatus?.();
  if (!status?.backgroundPermission || status.enabledForMemberId === memberId) return;

  const { data, error } = await supabase.functions.invoke('register-wearable-device', {
    body: { member_id: memberId, platform: 'android' },
  });
  if (error || typeof data?.token !== 'string') {
    throw toSentryError(error, 'register-wearable-device returned no token');
  }
  await plugin.enableBackgroundSync?.({
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    memberId,
    deviceToken: data.token,
  });
}

// Sign-out: stop the background job and forget its key on this phone.
export async function stopWearableBackgroundSync(): Promise<void> {
  if (!Capacitor.isNativePlatform() || !isAndroid()) return;
  try {
    await bridge().disableBackgroundSync?.();
  } catch (error) {
    console.error('Stopping background sync failed:', error);
  }
}

// Called once per signed-in session (see AuthProvider), same call-site shape
// as registerPushToken. No-op on the web build. isSelf: the selected member is
// the signed-in person's own record (gates Android background sync).
export async function registerHealthKit(
  userId: string,
  memberId: string,
  isSelf = false,
): Promise<void> {
  activeUserId = userId;
  activeMemberId = memberId;

  const platform = Capacitor.getPlatform();
  if (!Capacitor.isNativePlatform() || (platform !== 'ios' && platform !== 'android')) return;

  attachListeners();

  try {
    const { granted } = await bridge().requestAuthorization();
    if (!granted) return;
    await bridge().startObserving();
    if (isAndroid() && isSelf) await ensureBackgroundSync(memberId);
  } catch (error) {
    console.error('Wearable registration failed:', error);
    Sentry.captureException(toSentryError(error, 'HealthKit registration failed'));
  }
}
