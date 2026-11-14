import { describe, expect, it, vi } from 'vitest';

vi.mock('./supabase', () => ({ supabase: {} }));

import {
  buildSchedule,
  formatVitals,
  localRange,
  parseDateInput,
  toDateInputValue,
  type AdminVisitReport,
} from './visits';

describe('localRange', () => {
  it('spans local calendar days, end exclusive', () => {
    const { from, to } = localRange(new Date(2026, 10, 15, 14, 30), 1);
    expect(new Date(from)).toEqual(new Date(2026, 10, 15));
    expect(new Date(to)).toEqual(new Date(2026, 10, 17));
  });
});

describe('date input helpers', () => {
  it('round-trips a local day without UTC drift', () => {
    const day = new Date(2026, 0, 1, 1, 0);
    expect(parseDateInput(toDateInputValue(day))).toEqual(new Date(2026, 0, 1));
  });

  it('rejects malformed input', () => {
    expect(parseDateInput('')).toBeNull();
    expect(parseDateInput('15/11/2026')).toBeNull();
  });
});

describe('buildSchedule', () => {
  it('builds local start and end from date, time and duration', () => {
    const s = buildSchedule('2026-11-15', '09:30', 90)!;
    expect(new Date(s.start)).toEqual(new Date(2026, 10, 15, 9, 30));
    expect(new Date(s.end)).toEqual(new Date(2026, 10, 15, 11, 0));
  });

  it('is null for incomplete or non-positive input', () => {
    expect(buildSchedule('', '09:30', 60)).toBeNull();
    expect(buildSchedule('2026-11-15', '', 60)).toBeNull();
    expect(buildSchedule('2026-11-15', '09:30', 0)).toBeNull();
    expect(buildSchedule('2026-11-15', '09:30', NaN)).toBeNull();
  });
});

describe('formatVitals', () => {
  const base = {
    bp_systolic: null,
    bp_diastolic: null,
    pulse: null,
    spo2: null,
    glucose_mgdl: null,
    temperature_c: null,
  } as AdminVisitReport;

  it('says so when nothing was recorded', () => {
    expect(formatVitals(base)).toBe('No vitals recorded');
  });

  it('lists only recorded vitals', () => {
    expect(formatVitals({ ...base, bp_systolic: 120, bp_diastolic: 80, spo2: 98 })).toBe(
      'BP 120/80 · SpO₂ 98%',
    );
  });
});
