export type AlertType = 'manual' | 'wearable_fall';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved' | 'false_alarm';

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  manual: 'Manual SOS',
  wearable_fall: 'Wearable fall',
};

export const STATUS_LABELS: Record<AlertStatus, string> = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  resolved: 'Resolved',
  false_alarm: 'False alarm',
};

export const STATUS_CHIP_CLASS: Record<AlertStatus, string> = {
  open: 'chip--pending',
  acknowledged: 'chip--inprogress',
  resolved: 'chip--completed',
  false_alarm: 'chip--missed',
};

export function isActiveStatus(status: AlertStatus): boolean {
  return status === 'open' || status === 'acknowledged';
}

export interface SosAlertLike {
  status: AlertStatus;
  triggered_at: string;
}

// Oldest first -- an alert that's been waiting longest is the most urgent.
export function sortActive<T extends SosAlertLike>(alerts: T[]): T[] {
  return [...alerts]
    .filter((a) => isActiveStatus(a.status))
    .sort((a, b) => a.triggered_at.localeCompare(b.triggered_at));
}

// Most recent first -- history is a log, read newest-to-oldest.
export function sortHistory<T extends SosAlertLike>(alerts: T[]): T[] {
  return [...alerts]
    .filter((a) => !isActiveStatus(a.status))
    .sort((a, b) => b.triggered_at.localeCompare(a.triggered_at));
}

export function formatWaiting(triggeredAt: string, now: Date): string {
  const minutes = Math.max(
    0,
    Math.round((now.getTime() - new Date(triggeredAt).getTime()) / 60000),
  );
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h ${remaining}m`;
}
