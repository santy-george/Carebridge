import { describe, expect, it } from 'vitest';
import { buildBmiSeries, buildSparklinePoints, scaleY, severityRank } from './observations';

describe('scaleY', () => {
  it('maps the max value near the top (small y) and min near the bottom', () => {
    const [top, , bottom] = scaleY([10, 5, 0], 40, 6);
    expect(top).toBeLessThan(bottom);
  });

  it('does not divide by zero when every value is equal', () => {
    expect(scaleY([5, 5, 5], 40, 6)).toEqual([34, 34, 34]);
  });
});

describe('buildSparklinePoints', () => {
  it('is empty for no values', () => {
    expect(buildSparklinePoints([], 280, 40, 6)).toBe('');
  });

  it('places a single value at x=0 without dividing by zero', () => {
    expect(buildSparklinePoints([42], 280, 40, 6)).toBe('0,34');
  });

  it('spreads multiple values evenly across the width', () => {
    const points = buildSparklinePoints([1, 2, 3], 280, 40, 6);
    const xs = points.split(' ').map((p) => Number(p.split(',')[0]));
    expect(xs).toEqual([0, 140, 280]);
  });
});

describe('severityRank', () => {
  it('ranks alert above warn above ok', () => {
    expect(severityRank('chip2--alert')).toBe(2);
    expect(severityRank('chip2--warn')).toBe(1);
    expect(severityRank('chip2--ok')).toBe(0);
  });
});

describe('buildBmiSeries', () => {
  it('is empty when no height has ever been logged', () => {
    expect(buildBmiSeries([{ recorded_at: '2026-08-01', value: 70 }], [])).toEqual([]);
  });

  it('pairs each weight with the most recent height at or before it', () => {
    const weights = [
      { recorded_at: '2026-08-01', value: 70 },
      { recorded_at: '2026-08-05', value: 71 },
    ];
    const heights = [
      { recorded_at: '2026-07-01', value: 160 },
      { recorded_at: '2026-08-03', value: 162 },
    ];
    const series = buildBmiSeries(weights, heights);
    expect(series[0]).toEqual({ recorded_at: '2026-08-01', bmi: 27.3 });
    expect(series[1]).toEqual({ recorded_at: '2026-08-05', bmi: 27.1 });
  });

  it('falls back to the earliest height for a weight logged before any height', () => {
    const weights = [{ recorded_at: '2026-01-01', value: 70 }];
    const heights = [{ recorded_at: '2026-08-01', value: 160 }];
    expect(buildBmiSeries(weights, heights)).toEqual([{ recorded_at: '2026-01-01', bmi: 27.3 }]);
  });
});
