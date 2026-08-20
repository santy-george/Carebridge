import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import * as Sentry from '@sentry/react';
import { supabase } from './supabase';

// Read-only HealthKit integration: streams new heart-rate/SpO2 samples from
// the native HealthKitBridge plugin (apps/wellness/ios/App/App/HealthKitBridge.swift)
// into ingest-wearable. Never writes to HealthKit. Best-effort, same posture
// as push.ts -- a member may not own a Watch at all, so permission denial or
// any failure here must never block the app.

export const FLUSH_BATCH_SIZE = 20;

interface HealthKitReading {
  reading_type: 'heart_rate' | 'spo2';
  value: number;
  recorded_at: string;
}

interface HealthKitBridgePlugin {
  requestAuthorization(): Promise<{ granted: boolean }>;
  startObserving(): Promise<void>;
  addListener(
    eventName: 'healthKitSamples',
    listenerFunc: (data: { readings: HealthKitReading[] }) => void,
  ): Promise<{ remove: () => void }>;
}

const HealthKitBridge = registerPlugin<HealthKitBridgePlugin>('HealthKitBridge');

let queue: HealthKitReading[] = [];
let activeUserId: string | null = null;
let activeMemberId: string | null = null;
let listenersAttached = false;

export function __resetHealthKitStateForTests(): void {
  queue = [];
  activeUserId = null;
  activeMemberId = null;
  listenersAttached = false;
}

async function flush(): Promise<void> {
  if (queue.length === 0 || !activeMemberId) return;
  const batch = queue;
  queue = [];

  const { data, error } = await supabase.functions.invoke('ingest-wearable', {
    body: { member_id: activeMemberId, readings: batch },
  });
  if (error || !data?.ok) {
    console.error('Failed to ingest wearable readings:', error ?? data);
    Sentry.captureException(error ?? new Error('ingest-wearable returned not-ok'));
  }
}

function attachListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;

  void HealthKitBridge.addListener('healthKitSamples', (data) => {
    queue.push(...data.readings);
    if (queue.length >= FLUSH_BATCH_SIZE) {
      void flush();
    }
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
