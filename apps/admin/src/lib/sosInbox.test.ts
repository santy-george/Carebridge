import { describe, expect, it } from 'vitest';
import { formatWaiting, isActiveStatus, sortActive, sortHistory } from './sosInbox';

describe('isActiveStatus', () => {
  it('treats open and acknowledged as active', () => {
    expect(isActiveStatus('open')).toBe(true);
    expect(isActiveStatus('acknowledged')).toBe(true);
  });

  it('treats resolved and false_alarm as not active', () => {
    expect(isActiveStatus('resolved')).toBe(false);
    expect(isActiveStatus('false_alarm')).toBe(false);
  });
});

describe('sortActive', () => {
  it('keeps only open/acknowledged, oldest triggered first', () => {
    const alerts = [
      { id: 'a', status: 'open' as const, triggered_at: '2026-08-07T10:00:00Z' },
      { id: 'b', status: 'resolved' as const, triggered_at: '2026-08-07T09:00:00Z' },
      { id: 'c', status: 'acknowledged' as const, triggered_at: '2026-08-07T08:00:00Z' },
    ];
    expect(sortActive(alerts).map((a) => a.id)).toEqual(['c', 'a']);
  });
});

describe('sortHistory', () => {
  it('keeps only resolved/false_alarm, most recent triggered first', () => {
    const alerts = [
      { id: 'a', status: 'open' as const, triggered_at: '2026-08-07T10:00:00Z' },
      { id: 'b', status: 'resolved' as const, triggered_at: '2026-08-07T09:00:00Z' },
      { id: 'c', status: 'false_alarm' as const, triggered_at: '2026-08-07T11:00:00Z' },
    ];
    expect(sortHistory(alerts).map((a) => a.id)).toEqual(['c', 'b']);
  });
});

describe('formatWaiting', () => {
  it('shows minutes under an hour', () => {
    expect(formatWaiting('2026-08-07T10:00:00Z', new Date('2026-08-07T10:12:00Z'))).toBe('12m');
  });

  it('shows hours and minutes past an hour', () => {
    expect(formatWaiting('2026-08-07T08:00:00Z', new Date('2026-08-07T10:05:00Z'))).toBe('2h 5m');
  });

  it('never goes negative for clock skew', () => {
    expect(formatWaiting('2026-08-07T10:05:00Z', new Date('2026-08-07T10:00:00Z'))).toBe('0m');
  });
});
