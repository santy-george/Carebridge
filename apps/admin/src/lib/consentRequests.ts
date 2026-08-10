export type ConsentScope = 'self' | 'all';

export function scopeLabel(scope: ConsentScope): string {
  return scope === 'all' ? 'Everyone linked to this record' : 'Just their own access';
}

export interface PendingRequestLike {
  requested_at: string;
}

// Oldest first -- the longest-waiting request is the most overdue for a callback.
export function sortPending<T extends PendingRequestLike>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.requested_at.localeCompare(b.requested_at));
}

export interface HistoryRowLike {
  resolved_at: string;
}

// Most recent first -- history is a log, read newest-to-oldest.
export function sortHistoryRows<T extends HistoryRowLike>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.resolved_at.localeCompare(a.resolved_at));
}
