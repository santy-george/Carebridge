export interface MonthlyReport {
  monthKey: string;
  monthLabel: string;
  avgWellnessScore: number | null;
  checkinsCompleted: number;
  daysInMonth: number;
  adherencePercent: number | null;
  vitalsLoggedCount: number;
}

export interface MonthStatus {
  label: string;
  chipClass: string;
}

export function classifyMonth(avgWellnessScore: number | null): MonthStatus | null {
  if (avgWellnessScore == null) return null;
  if (avgWellnessScore >= 80) return { label: 'Good month', chipClass: 'chip2--ok' };
  if (avgWellnessScore >= 60) return { label: 'Fair month', chipClass: 'chip2--warn' };
  return { label: 'Needs attention', chipClass: 'chip2--alert' };
}

export function monthKeyOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function monthLabelOf(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export function daysInMonthOf(key: string): number {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

export interface CheckinLike {
  checkin_date: string;
  wellness_score: number | null;
}

export interface MedicationLogLike {
  scheduled_date: string;
  taken: boolean;
}

export interface DatedRow {
  recorded_at?: string;
  reading_date?: string;
}

export function buildMonthlyReports(
  checkins: CheckinLike[],
  medicationLogs: MedicationLogLike[],
  vitalsReadings: DatedRow[],
  glucoseReadings: DatedRow[],
): MonthlyReport[] {
  const keys = new Set<string>([
    ...checkins.map((c) => monthKeyOf(c.checkin_date)),
    ...medicationLogs.map((l) => monthKeyOf(l.scheduled_date)),
    ...vitalsReadings.map((v) => monthKeyOf(v.recorded_at!)),
    ...glucoseReadings.map((g) => monthKeyOf(g.reading_date!)),
  ]);

  const reports = [...keys].map((key): MonthlyReport => {
    const monthCheckins = checkins.filter((c) => monthKeyOf(c.checkin_date) === key);
    const monthLogs = medicationLogs.filter((l) => monthKeyOf(l.scheduled_date) === key);
    const monthVitals = vitalsReadings.filter((v) => monthKeyOf(v.recorded_at!) === key);
    const monthGlucose = glucoseReadings.filter((g) => monthKeyOf(g.reading_date!) === key);

    const scores = monthCheckins.map((c) => c.wellness_score).filter((s): s is number => s != null);
    const avgWellnessScore = scores.length
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : null;

    const adherencePercent = monthLogs.length
      ? Math.round((monthLogs.filter((l) => l.taken).length / monthLogs.length) * 100)
      : null;

    return {
      monthKey: key,
      monthLabel: monthLabelOf(key),
      avgWellnessScore,
      checkinsCompleted: monthCheckins.length,
      daysInMonth: daysInMonthOf(key),
      adherencePercent,
      vitalsLoggedCount: monthVitals.length + monthGlucose.length,
    };
  });

  return reports.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}
