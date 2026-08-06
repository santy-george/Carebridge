import { describe, expect, it } from 'vitest';
import { isOpenStatus, sortClosed, sortOpen } from './leads';

describe('isOpenStatus', () => {
  it('treats new and contacted as open', () => {
    expect(isOpenStatus('new')).toBe(true);
    expect(isOpenStatus('contacted')).toBe(true);
  });

  it('treats converted and declined as not open', () => {
    expect(isOpenStatus('converted')).toBe(false);
    expect(isOpenStatus('declined')).toBe(false);
  });
});

describe('sortOpen', () => {
  it('keeps only new/contacted, oldest created first', () => {
    const leads = [
      { id: 'a', status: 'new' as const, created_at: '2026-08-07T10:00:00Z' },
      { id: 'b', status: 'converted' as const, created_at: '2026-08-07T09:00:00Z' },
      { id: 'c', status: 'contacted' as const, created_at: '2026-08-07T08:00:00Z' },
    ];
    expect(sortOpen(leads).map((l) => l.id)).toEqual(['c', 'a']);
  });
});

describe('sortClosed', () => {
  it('keeps only converted/declined, most recent created first', () => {
    const leads = [
      { id: 'a', status: 'new' as const, created_at: '2026-08-07T10:00:00Z' },
      { id: 'b', status: 'converted' as const, created_at: '2026-08-07T09:00:00Z' },
      { id: 'c', status: 'declined' as const, created_at: '2026-08-07T11:00:00Z' },
    ];
    expect(sortClosed(leads).map((l) => l.id)).toEqual(['c', 'b']);
  });
});
