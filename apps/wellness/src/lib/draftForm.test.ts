import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearDraft, loadDraft, saveDraft } from './draftForm';

describe('draftForm', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when no draft has been saved', () => {
    expect(loadDraft('care')).toBeNull();
  });

  it('round-trips a saved draft', () => {
    saveDraft('care', { name: 'Dr. Priya Menon', phone: '555-0100' });
    expect(loadDraft('care')).toEqual({ name: 'Dr. Priya Menon', phone: '555-0100' });
  });

  it('expires a draft older than 10 minutes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-30T10:00:00Z'));
    saveDraft('care', { name: 'Dr. Priya Menon' });

    vi.setSystemTime(new Date('2026-08-30T10:11:00Z'));
    expect(loadDraft('care')).toBeNull();
  });

  it('keeps a draft saved 9 minutes ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-30T10:00:00Z'));
    saveDraft('care', { name: 'Dr. Priya Menon' });

    vi.setSystemTime(new Date('2026-08-30T10:09:00Z'));
    expect(loadDraft('care')).toEqual({ name: 'Dr. Priya Menon' });
  });

  it('clearDraft removes the stored draft', () => {
    saveDraft('care', { name: 'Dr. Priya Menon' });
    clearDraft('care');
    expect(loadDraft('care')).toBeNull();
  });

  it('keys are independent of each other', () => {
    saveDraft('care', { name: 'Dr. Priya Menon' });
    saveDraft('invite', { relationship: 'Daughter' });
    expect(loadDraft('care')).toEqual({ name: 'Dr. Priya Menon' });
    expect(loadDraft('invite')).toEqual({ relationship: 'Daughter' });
    clearDraft('care');
    expect(loadDraft('care')).toBeNull();
    expect(loadDraft('invite')).toEqual({ relationship: 'Daughter' });
  });

  it('returns null for malformed stored JSON instead of throwing', () => {
    localStorage.setItem('cbh-draft:care', 'not json');
    expect(loadDraft('care')).toBeNull();
  });
});
