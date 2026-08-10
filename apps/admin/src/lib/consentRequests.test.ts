import { describe, expect, it } from 'vitest';
import { scopeLabel, sortHistoryRows, sortPending } from './consentRequests';

describe('scopeLabel', () => {
  it('labels self scope', () => {
    expect(scopeLabel('self')).toBe('Just their own access');
  });

  it('labels all scope', () => {
    expect(scopeLabel('all')).toBe('Everyone linked to this record');
  });
});

describe('sortPending', () => {
  it('sorts oldest requested_at first', () => {
    const rows = [
      { id: 'a', requested_at: '2026-08-10T10:00:00Z' },
      { id: 'b', requested_at: '2026-08-10T08:00:00Z' },
      { id: 'c', requested_at: '2026-08-10T09:00:00Z' },
    ];
    expect(sortPending(rows).map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('sortHistoryRows', () => {
  it('sorts most recent resolved_at first', () => {
    const rows = [
      { id: 'a', resolved_at: '2026-08-10T10:00:00Z' },
      { id: 'b', resolved_at: '2026-08-10T08:00:00Z' },
      { id: 'c', resolved_at: '2026-08-10T09:00:00Z' },
    ];
    expect(sortHistoryRows(rows).map((r) => r.id)).toEqual(['a', 'c', 'b']);
  });
});
