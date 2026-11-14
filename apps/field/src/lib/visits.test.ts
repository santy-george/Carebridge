import { describe, expect, it, vi } from 'vitest';
vi.mock('./supabase', () => ({ supabase: {} }));

import {
  localDayRange,
  localRange,
  nextVisit,
  parseVital,
  statusLabel,
  type Visit,
} from './visits';

function visit(overrides: Partial<Visit>): Visit {
  return {
    id: 'v',
    member_id: 'm',
    member_name: 'Member',
    member_phone: null,
    member_address: null,
    member_location: null,
    conditions: [],
    allergies: [],
    service_type: 'Nursing visit',
    scheduled_start: '2026-11-15T04:00:00.000Z',
    scheduled_end: '2026-11-15T05:00:00.000Z',
    status: 'scheduled',
    checkin_at: null,
    checkout_at: null,
    report_submitted: false,
    ...overrides,
  };
}

describe('parseVital', () => {
  it('treats blank as not recorded, never zero', () => {
    expect(parseVital('')).toBeNull();
    expect(parseVital('   ')).toBeNull();
  });
  it('parses numbers and rejects junk', () => {
    expect(parseVital('98')).toBe(98);
    expect(parseVital('36.8')).toBe(36.8);
    expect(parseVital('abc')).toBeNull();
  });
});

describe('local day ranges', () => {
  it('spans exactly one local calendar day', () => {
    const { from, to } = localDayRange(new Date(2026, 10, 15, 13, 30));
    expect(new Date(from).getTime()).toBe(new Date(2026, 10, 15).getTime());
    expect(new Date(to).getTime()).toBe(new Date(2026, 10, 16).getTime());
  });
  it('widens by whole local days', () => {
    const { from, to } = localRange(new Date(2026, 10, 15, 13, 30), 7, 7);
    expect(new Date(from).getTime()).toBe(new Date(2026, 10, 8).getTime());
    expect(new Date(to).getTime()).toBe(new Date(2026, 10, 23).getTime());
  });
});

describe('nextVisit', () => {
  it('prefers a visit already in progress', () => {
    const visits = [
      visit({ id: 'a', scheduled_start: '2026-11-15T03:00:00.000Z' }),
      visit({ id: 'b', status: 'in_progress', scheduled_start: '2026-11-15T06:00:00.000Z' }),
    ];
    expect(nextVisit(visits)?.id).toBe('b');
  });
  it('otherwise picks the earliest scheduled visit', () => {
    const visits = [
      visit({ id: 'late', scheduled_start: '2026-11-15T09:00:00.000Z' }),
      visit({ id: 'early', scheduled_start: '2026-11-15T03:00:00.000Z' }),
      visit({ id: 'done', status: 'completed', scheduled_start: '2026-11-15T01:00:00.000Z' }),
    ];
    expect(nextVisit(visits)?.id).toBe('early');
  });
  it('returns null when nothing is left to do', () => {
    expect(nextVisit([visit({ status: 'completed' })])).toBeNull();
    expect(nextVisit([])).toBeNull();
  });
});

describe('statusLabel', () => {
  it('labels every status', () => {
    expect(statusLabel('in_progress')).toBe('In progress');
    expect(statusLabel('missed')).toBe('Missed');
  });
});
