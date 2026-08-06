export type LeadStatus = 'new' | 'contacted' | 'converted' | 'declined';

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  converted: 'Converted',
  declined: 'Declined',
};

export const STATUS_CHIP_CLASS: Record<LeadStatus, string> = {
  new: 'chip--pending',
  contacted: 'chip--inprogress',
  converted: 'chip--completed',
  declined: 'chip--missed',
};

export function isOpenStatus(status: LeadStatus): boolean {
  return status === 'new' || status === 'contacted';
}

export interface LeadLike {
  status: LeadStatus;
  created_at: string;
}

// Oldest first -- an open lead sitting the longest needs following up first.
export function sortOpen<T extends LeadLike>(leads: T[]): T[] {
  return [...leads]
    .filter((l) => isOpenStatus(l.status))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

// Most recent first -- history is a log, read newest-to-oldest.
export function sortClosed<T extends LeadLike>(leads: T[]): T[] {
  return [...leads]
    .filter((l) => !isOpenStatus(l.status))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
