import { describe, expect, it } from 'vitest';
import { clampHydrationGoal, isGoalDoneToday, localDateString, toggleCupFilled } from './activity';

describe('localDateString', () => {
  it('formats as YYYY-MM-DD using local time, not UTC', () => {
    expect(localDateString(new Date(2026, 7, 30))).toBe('2026-08-30');
    expect(localDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('clampHydrationGoal', () => {
  it('clamps between 0 and 15', () => {
    expect(clampHydrationGoal(-1)).toBe(0);
    expect(clampHydrationGoal(20)).toBe(15);
    expect(clampHydrationGoal(8)).toBe(8);
  });
});

describe('toggleCupFilled', () => {
  it('fills up to the tapped cup when tapping past the current fill', () => {
    expect(toggleCupFilled(2, 4)).toBe(5);
  });

  it('empties back to the tapped cup when tapping the last filled cup', () => {
    expect(toggleCupFilled(5, 4)).toBe(4);
  });
});

describe('isGoalDoneToday', () => {
  it('is false when done_at is null', () => {
    expect(isGoalDoneToday(null, new Date(2026, 7, 30))).toBe(false);
  });

  it('is true when done_at falls on the same local day', () => {
    const today = new Date(2026, 7, 30, 10);
    expect(isGoalDoneToday(new Date(2026, 7, 30, 8).toISOString(), today)).toBe(true);
  });

  it('is false once the local day has rolled over', () => {
    const yesterday = new Date(2026, 7, 29, 23);
    const today = new Date(2026, 7, 30, 1);
    expect(isGoalDoneToday(yesterday.toISOString(), today)).toBe(false);
  });
});
