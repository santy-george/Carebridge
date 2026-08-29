import { assertEquals } from 'jsr:@std/assert@1';
import {
  isValidReading,
  isValidSleepSession,
  isValidEcgReading,
  isValidRhythmEvent,
  isDailyCumulativeType,
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
