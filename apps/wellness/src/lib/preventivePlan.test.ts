import { describe, expect, it } from 'vitest';
import { computeProgress } from './preventivePlan';

describe('computeProgress', () => {
  it('is all zero with no goals', () => {
    expect(computeProgress([])).toEqual({ completed: 0, total: 0, percent: 0 });
  });

  it('counts completed vs total and rounds the percent', () => {
    const goals = [
      { completed_at: '2026-07-01T00:00:00Z' },
      { completed_at: '2026-07-02T00:00:00Z' },
      { completed_at: null },
    ];
    expect(computeProgress(goals)).toEqual({ completed: 2, total: 3, percent: 67 });
  });
});
