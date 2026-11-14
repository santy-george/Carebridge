import type { Database } from '@carebridge/db-types';
import { supabase } from './supabase';

type GeneratedVisit = Database['public']['Functions']['get_visits_admin']['Returns'][number];
type GeneratedReport =
  Database['public']['Functions']['get_visit_reports_admin']['Returns'][number];

export type VisitStatus = Database['public']['Enums']['visit_status'];

// `returns table` columns are typed non-null by the generator; check-in/out
// are unset until the visit reaches them.
export type AdminVisit = Omit<GeneratedVisit, 'checkin_at' | 'checkout_at'> & {
  checkin_at: string | null;
  checkout_at: string | null;
};

// Vitals are all optional on a report.
export type AdminVisitReport = Omit<
  GeneratedReport,
  'bp_systolic' | 'bp_diastolic' | 'pulse' | 'spo2' | 'glucose_mgdl' | 'temperature_c' | 'notes'
> & {
  bp_systolic: number | null;
  bp_diastolic: number | null;
  pulse: number | null;
  spo2: number | null;
  glucose_mgdl: number | null;
  temperature_c: number | null;
  notes: string | null;
};

export const SERVICE_TYPES = [
  'Nursing visit',
  'Caregiver visit',
  'Physiotherapy',
  'Doctor visit',
  'Wound dressing',
  'Injection / IV',
] as const;

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
  missed: 'Missed',
  cancelled: 'Cancelled',
};

export const VISIT_STATUS_CHIP_CLASS: Record<VisitStatus, string> = {
  scheduled: 'chip--scheduled',
  in_progress: 'chip--inprogress',
  completed: 'chip--completed',
  missed: 'chip--missed',
  cancelled: 'chip--pending',
};

// Day windows are the coordinator's local calendar days, not UTC: for Kerala
// (UTC+5:30) a UTC boundary would split the early-morning visits onto the
// wrong day. Bounds are built from local Y/M/D, then serialized.
export function localRange(day: Date, daysAfter: number): { from: string; to: string } {
  const from = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const to = new Date(day.getFullYear(), day.getMonth(), day.getDate() + daysAfter + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function toDateInputValue(day: Date): string {
  const m = String(day.getMonth() + 1).padStart(2, '0');
  const d = String(day.getDate()).padStart(2, '0');
  return `${day.getFullYear()}-${m}-${d}`;
}

// "YYYY-MM-DD" from a date input is a local calendar day; new Date(str)
// would parse it as UTC midnight.
export function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

// Local date + "HH:MM" + duration (minutes) to ISO start/end. Null when the
// inputs are incomplete or the duration is not positive.
export function buildSchedule(
  dateValue: string,
  timeValue: string,
  durationMinutes: number,
): { start: string; end: string } | null {
  const day = parseDateInput(dateValue);
  const time = /^(\d{2}):(\d{2})$/.exec(timeValue);
  if (!day || !time || !(durationMinutes > 0)) return null;
  const start = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    Number(time[1]),
    Number(time[2]),
  );
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function formatVitals(r: AdminVisitReport): string {
  const parts: string[] = [];
  if (r.bp_systolic != null && r.bp_diastolic != null) {
    parts.push(`BP ${r.bp_systolic}/${r.bp_diastolic}`);
  }
  if (r.pulse != null) parts.push(`Pulse ${r.pulse}`);
  if (r.spo2 != null) parts.push(`SpO₂ ${r.spo2}%`);
  if (r.glucose_mgdl != null) parts.push(`Glucose ${r.glucose_mgdl}`);
  if (r.temperature_c != null) parts.push(`Temp ${r.temperature_c}°C`);
  return parts.length > 0 ? parts.join(' · ') : 'No vitals recorded';
}

export async function fetchVisits(from: string, to: string): Promise<AdminVisit[]> {
  const { data, error } = await supabase.rpc('get_visits_admin', { p_from: from, p_to: to });
  if (error) throw error;
  return (data ?? []) as AdminVisit[];
}

export async function fetchVisitReports(from: string, to: string): Promise<AdminVisitReport[]> {
  const { data, error } = await supabase.rpc('get_visit_reports_admin', {
    p_from: from,
    p_to: to,
  });
  if (error) throw error;
  return (data ?? []) as AdminVisitReport[];
}

export interface AssignableStaff {
  id: string;
  full_name: string;
  discipline: string | null;
  service_area: string | null;
}

export async function fetchAssignableStaff(): Promise<AssignableStaff[]> {
  const { data, error } = await supabase.rpc('list_assignable_staff');
  if (error) throw error;
  return (data ?? []) as AssignableStaff[];
}

export async function closeVisit(visitId: string, status: 'cancelled' | 'missed'): Promise<void> {
  const { error } = await supabase.rpc('close_unattended_visit', {
    p_visit_id: visitId,
    p_status: status,
  });
  if (error) throw error;
}

export async function createVisit(input: {
  memberId: string;
  staffId: string;
  serviceType: string;
  start: string;
  end: string;
  createdBy: string | null;
}): Promise<void> {
  const { error } = await supabase.from('visits').insert({
    member_id: input.memberId,
    staff_id: input.staffId,
    service_type: input.serviceType,
    scheduled_start: input.start,
    scheduled_end: input.end,
    created_by: input.createdBy,
  });
  if (error) throw error;
}
