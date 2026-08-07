import { describe, expect, it } from 'vitest';
import {
  buildMonthlyReports,
  classifyMonth,
  daysInMonthOf,
  monthKeyOf,
  monthLabelOf,
} from './reports';

describe('classifyMonth', () => {
  it('is null with no score', () => {
    expect(classifyMonth(null)).toBeNull();
  });

  it('bands Good/Fair/Needs attention at 80 and 60', () => {
    expect(classifyMonth(85)?.label).toBe('Good month');
    expect(classifyMonth(65)?.label).toBe('Fair month');
    expect(classifyMonth(40)?.label).toBe('Needs attention');
  });
});

describe('monthKeyOf', () => {
  it('extracts YYYY-MM', () => {
    expect(monthKeyOf('2026-06-15')).toBe('2026-06');
    expect(monthKeyOf('2026-06-15T10:00:00Z')).toBe('2026-06');
  });
});

describe('monthLabelOf', () => {
  it('formats as full month and year', () => {
    expect(monthLabelOf('2026-06')).toMatch(/June 2026/);
  });
});

describe('daysInMonthOf', () => {
  it('knows June has 30 days', () => {
    expect(daysInMonthOf('2026-06')).toBe(30);
  });

  it('knows February 2026 (non-leap) has 28 days', () => {
    expect(daysInMonthOf('2026-02')).toBe(28);
  });
});

describe('buildMonthlyReports', () => {
  it('groups by month, most recent first', () => {
    const checkins = [
      { checkin_date: '2026-06-01', wellness_score: 80 },
      { checkin_date: '2026-06-15', wellness_score: 90 },
      { checkin_date: '2026-05-01', wellness_score: 70 },
    ];
    const reports = buildMonthlyReports(checkins, [], [], []);
    expect(reports.map((r) => r.monthKey)).toEqual(['2026-06', '2026-05']);
    expect(reports[0].avgWellnessScore).toBe(85);
    expect(reports[0].checkinsCompleted).toBe(2);
    expect(reports[1].avgWellnessScore).toBe(70);
  });

  it('computes adherence percent from medication_logs for that month', () => {
    const logs = [
      { scheduled_date: '2026-06-01', taken: true },
      { scheduled_date: '2026-06-02', taken: true },
      { scheduled_date: '2026-06-03', taken: false },
      { scheduled_date: '2026-06-04', taken: true },
    ];
    const reports = buildMonthlyReports([], logs, [], []);
    expect(reports[0].adherencePercent).toBe(75);
  });

  it('is null for avgWellnessScore and adherencePercent with no data that month', () => {
    const vitals = [{ recorded_at: '2026-06-01T00:00:00Z' }];
    const reports = buildMonthlyReports([], [], vitals, []);
    expect(reports[0].avgWellnessScore).toBeNull();
    expect(reports[0].adherencePercent).toBeNull();
    expect(reports[0].vitalsLoggedCount).toBe(1);
  });

  it('counts vitals_readings and glucose_readings together for vitalsLoggedCount', () => {
    const vitals = [
      { recorded_at: '2026-06-01T00:00:00Z' },
      { recorded_at: '2026-06-02T00:00:00Z' },
    ];
    const glucose = [{ reading_date: '2026-06-03' }];
    const reports = buildMonthlyReports([], [], vitals, glucose);
    expect(reports[0].vitalsLoggedCount).toBe(3);
  });
});
