import { assertEquals } from 'jsr:@std/assert@1';
import {
  isValidReading,
  isValidSleepSession,
  isValidEcgReading,
  isValidRhythmEvent,
  isDailyCumulativeType,
  resolveDeviceVendor,
  dropKnown,
} from './index.ts';

Deno.test('isValidReading accepts a known reading_type with a numeric value and valid timestamp', () => {
  assertEquals(
    isValidReading({ reading_type: 'heart_rate_variability_sdnn', value: 42.5, recorded_at: '2026-08-29T04:00:00Z' }),
    true,
  );
});

Deno.test('isValidReading rejects an unknown reading_type', () => {
  assertEquals(
    isValidReading({ reading_type: 'made_up_type', value: 1, recorded_at: '2026-08-29T04:00:00Z' }),
    false,
  );
});

Deno.test('isValidReading rejects a non-numeric value', () => {
  assertEquals(
    isValidReading({ reading_type: 'step_count', value: 'lots', recorded_at: '2026-08-29T04:00:00Z' }),
    false,
  );
});

Deno.test('isDailyCumulativeType is true for the 4 daily-cumulative types and false for streaming types', () => {
  assertEquals(isDailyCumulativeType('step_count'), true);
  assertEquals(isDailyCumulativeType('active_energy_burned'), true);
  assertEquals(isDailyCumulativeType('distance_walked_running'), true);
  assertEquals(isDailyCumulativeType('apple_stand_time'), true);
  assertEquals(isDailyCumulativeType('heart_rate'), false);
  assertEquals(isDailyCumulativeType('heart_rate_variability_sdnn'), false);
});

Deno.test('isValidSleepSession accepts a known stage with valid timestamps', () => {
  assertEquals(
    isValidSleepSession({ started_at: '2026-08-29T02:00:00Z', ended_at: '2026-08-29T04:00:00Z', stage: 'asleep_deep' }),
    true,
  );
});

Deno.test('isValidSleepSession rejects an unknown stage', () => {
  assertEquals(
    isValidSleepSession({ started_at: '2026-08-29T02:00:00Z', ended_at: '2026-08-29T04:00:00Z', stage: 'dreaming' }),
    false,
  );
});

Deno.test('isValidEcgReading accepts a classification with no average_heart_rate', () => {
  assertEquals(isValidEcgReading({ recorded_at: '2026-08-29T04:00:00Z', classification: 'sinus_rhythm' }), true);
});

Deno.test('isValidEcgReading rejects an empty classification', () => {
  assertEquals(isValidEcgReading({ recorded_at: '2026-08-29T04:00:00Z', classification: '' }), false);
});

Deno.test('isValidRhythmEvent accepts a valid timestamp', () => {
  assertEquals(isValidRhythmEvent({ recorded_at: '2026-08-29T04:00:00Z' }), true);
});

Deno.test('isValidRhythmEvent rejects a missing timestamp', () => {
  assertEquals(isValidRhythmEvent({}), false);
});

Deno.test('resolveDeviceVendor defaults to apple_watch when omitted', () => {
  assertEquals(resolveDeviceVendor(undefined), 'apple_watch');
});

Deno.test('resolveDeviceVendor accepts health_connect and rejects unknown vendors', () => {
  assertEquals(resolveDeviceVendor('health_connect'), 'health_connect');
  assertEquals(resolveDeviceVendor('garmin'), null);
  assertEquals(resolveDeviceVendor(5), null);
});

Deno.test('isValidReading accepts the Health Connect RMSSD HRV type', () => {
  assertEquals(
    isValidReading({ reading_type: 'heart_rate_variability_rmssd', value: 28, recorded_at: '2026-11-15T04:00:00Z' }),
    true,
  );
});

Deno.test('dropKnown skips rows already stored and repeats within the batch', () => {
  const rows = [{ k: 'a' }, { k: 'b' }, { k: 'b' }, { k: 'c' }];
  assertEquals(
    dropKnown(rows, new Set(['a']), (r) => r.k).map((r) => r.k),
    ['b', 'c'],
  );
});

Deno.test('dropKnown returns everything when nothing is known', () => {
  assertEquals(dropKnown([{ k: 'a' }], new Set(), (r) => r.k).length, 1);
});
