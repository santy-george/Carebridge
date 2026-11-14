import { describe, expect, it, vi, beforeEach } from 'vitest';

const listeners: Record<string, (data: unknown) => void> = {};
const appListeners: Record<string, (state: { isActive: boolean }) => void> = {};
const invokeMock = vi.fn();

const { mockPlugin, mockCapacitor } = vi.hoisted(() => {
  const mockCapacitor = {
    isNativePlatform: vi.fn(() => true),
    getPlatform: vi.fn(() => 'ios'),
  };
  const mockPlugin = {
    requestAuthorization: vi.fn(),
    startObserving: vi.fn(),
    syncNow: vi.fn(),
    addListener: vi.fn((eventName: string, cb: (data: unknown) => void) => {
      listeners[eventName] = cb;
      return Promise.resolve({ remove: vi.fn() });
    }),
  };
  return { mockPlugin, mockCapacitor };
});

vi.mock('@capacitor/core', () => ({
  Capacitor: mockCapacitor,
  registerPlugin: vi.fn(() => mockPlugin),
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn((eventName: string, cb: (state: { isActive: boolean }) => void) => {
      appListeners[eventName] = cb;
      return Promise.resolve({ remove: vi.fn() });
    }),
  },
}));

vi.mock('./supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn((...args: unknown[]) => invokeMock(...args)),
    },
  },
}));

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
  withScope: vi.fn((callback) => callback({ setUser: vi.fn(), setTag: vi.fn() })),
}));

import { registerHealthKit, __resetHealthKitStateForTests, FLUSH_BATCH_SIZE } from './healthkit';

describe('registerHealthKit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(listeners)) delete listeners[key];
    for (const key of Object.keys(appListeners)) delete appListeners[key];
    __resetHealthKitStateForTests();
    mockPlugin.requestAuthorization.mockResolvedValue({ granted: true });
    mockPlugin.startObserving.mockResolvedValue(undefined);
    mockPlugin.syncNow.mockResolvedValue(undefined);
    mockCapacitor.isNativePlatform.mockReturnValue(true);
    mockCapacitor.getPlatform.mockReturnValue('ios');
    invokeMock.mockResolvedValue({ data: { ok: true, inserted: 0 }, error: null });
  });

  it('is a no-op on a non-native platform', async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(false);
    await registerHealthKit('user-1', 'member-1');
    expect(mockPlugin.requestAuthorization).not.toHaveBeenCalled();
  });

  it('is a no-op on an unsupported native platform', async () => {
    mockCapacitor.getPlatform.mockReturnValue('windows');
    await registerHealthKit('user-1', 'member-1');
    expect(mockPlugin.requestAuthorization).not.toHaveBeenCalled();
  });

  it('requests authorization and starts observing on Android via Health Connect', async () => {
    mockCapacitor.getPlatform.mockReturnValue('android');
    await registerHealthKit('user-1', 'member-1');
    expect(mockPlugin.requestAuthorization).toHaveBeenCalled();
    expect(mockPlugin.startObserving).toHaveBeenCalled();
  });

  it('tags Android uploads with the health_connect vendor, and iOS uploads with none', async () => {
    mockCapacitor.getPlatform.mockReturnValue('android');
    await registerHealthKit('user-1', 'member-1');
    listeners.healthKitSamples({
      readings: Array.from({ length: FLUSH_BATCH_SIZE }, () => ({
        reading_type: 'heart_rate',
        value: 70,
        recorded_at: '2026-11-15T04:00:00Z',
      })),
    });
    await vi.waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
    expect(invokeMock.mock.calls[0][1].body.device_vendor).toBe('health_connect');

    invokeMock.mockClear();
    __resetHealthKitStateForTests();
    mockCapacitor.getPlatform.mockReturnValue('ios');
    await registerHealthKit('user-1', 'member-1');
    listeners.healthKitSamples({
      readings: Array.from({ length: FLUSH_BATCH_SIZE }, () => ({
        reading_type: 'heart_rate',
        value: 70,
        recorded_at: '2026-11-15T04:00:00Z',
      })),
    });
    await vi.waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
    expect(invokeMock.mock.calls[0][1].body.device_vendor).toBeUndefined();
  });

  it('asks the Android plugin to sync when the app returns to the foreground', async () => {
    mockCapacitor.getPlatform.mockReturnValue('android');
    await registerHealthKit('user-1', 'member-1');
    appListeners.appStateChange({ isActive: true });
    expect(mockPlugin.syncNow).toHaveBeenCalled();
  });

  it('does not call syncNow on iOS, where HealthKit pushes observer updates', async () => {
    await registerHealthKit('user-1', 'member-1');
    appListeners.appStateChange({ isActive: true });
    expect(mockPlugin.syncNow).not.toHaveBeenCalled();
  });

  it('requests authorization and starts observing on a native platform', async () => {
    await registerHealthKit('user-1', 'member-1');
    expect(mockPlugin.requestAuthorization).toHaveBeenCalled();
    expect(mockPlugin.startObserving).toHaveBeenCalled();
  });

  it('does not start observing when authorization is denied', async () => {
    mockPlugin.requestAuthorization.mockResolvedValue({ granted: false });
    await registerHealthKit('user-1', 'member-1');
    expect(mockPlugin.startObserving).not.toHaveBeenCalled();
  });

  it('flushes once the batch reaches FLUSH_BATCH_SIZE readings', async () => {
    await registerHealthKit('user-1', 'member-1');
    const readings = Array.from({ length: FLUSH_BATCH_SIZE }, (_, i) => ({
      reading_type: 'heart_rate',
      value: 70 + i,
      recorded_at: '2026-08-20T04:00:00Z',
    }));
    listeners.healthKitSamples({ readings });
    await Promise.resolve();
    await Promise.resolve();
    expect(invokeMock).toHaveBeenCalledWith('ingest-wearable', {
      body: { member_id: 'member-1', readings },
    });
  });

  it('flushes sleep_sessions separately from readings', async () => {
    await registerHealthKit('user-1', 'member-1');
    const sessions = Array.from({ length: FLUSH_BATCH_SIZE }, (_, i) => ({
      started_at: `2026-08-2${i % 9}T22:00:00Z`,
      ended_at: `2026-08-2${i % 9}T23:00:00Z`,
      stage: 'asleep_core' as const,
    }));
    listeners.healthKitSleepSessions({ sessions });
    await Promise.resolve();
    await Promise.resolve();
    expect(invokeMock).toHaveBeenCalledWith('ingest-wearable', {
      body: { member_id: 'member-1', sleep_sessions: sessions },
    });
  });

  it('flushes ecg_readings separately from readings', async () => {
    await registerHealthKit('user-1', 'member-1');
    const readings = Array.from({ length: FLUSH_BATCH_SIZE }, () => ({
      recorded_at: '2026-08-29T04:00:00Z',
      classification: 'sinus_rhythm' as const,
      average_heart_rate: 68,
    }));
    listeners.healthKitEcgReadings({ readings });
    await Promise.resolve();
    await Promise.resolve();
    expect(invokeMock).toHaveBeenCalledWith('ingest-wearable', {
      body: { member_id: 'member-1', ecg_readings: readings },
    });
  });

  it('flushes rhythm_events separately from readings', async () => {
    await registerHealthKit('user-1', 'member-1');
    const events = Array.from({ length: FLUSH_BATCH_SIZE }, () => ({
      recorded_at: '2026-08-29T04:00:00Z',
    }));
    listeners.healthKitRhythmEvents({ events });
    await Promise.resolve();
    await Promise.resolve();
    expect(invokeMock).toHaveBeenCalledWith('ingest-wearable', {
      body: { member_id: 'member-1', rhythm_events: events },
    });
  });
});
