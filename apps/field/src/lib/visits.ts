import type { Database } from '@carebridge/db-types';
import { supabase } from './supabase';

type GeneratedVisit = Database['public']['Functions']['get_my_visits']['Returns'][number];

// Supabase types every column of a `returns table` function as non-null;
// these ones really can be null (members.phone/address/location are
// optional, check-in/out timestamps are unset until the visit reaches them).
export type Visit = Omit<
  GeneratedVisit,
  'member_phone' | 'member_address' | 'member_location' | 'checkin_at' | 'checkout_at'
> & {
  member_phone: string | null;
  member_address: string | null;
  member_location: string | null;
  checkin_at: string | null;
  checkout_at: string | null;
};
export type VisitStatus = Database['public']['Enums']['visit_status'];

export interface VisitReportInput {
  bpSystolic: number | null;
  bpDiastolic: number | null;
  pulse: number | null;
  spo2: number | null;
  glucoseMgdl: number | null;
  temperatureC: number | null;
  notes: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

// The visit day is the nurse's local calendar day, not UTC: for Kerala
// (UTC+5:30) a UTC day boundary would put the 5:30am-midnight window on the
// wrong side of "today". Bounds are built from local Y/M/D, then serialized.
export function localDayRange(day: Date): { from: string; to: string } {
  const from = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const to = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function localRange(day: Date, daysBefore: number, daysAfter: number) {
  const from = new Date(day.getFullYear(), day.getMonth(), day.getDate() - daysBefore);
  const to = new Date(day.getFullYear(), day.getMonth(), day.getDate() + daysAfter + 1);
  return { from: from.toISOString(), to: to.toISOString() };
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

// "" and non-numeric input mean "not recorded", never 0 -- a blank SpO2 box
// must not be saved as a reading of zero.
export function parseVital(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

// The next thing the nurse should act on: a visit already in progress wins,
// otherwise the earliest still-scheduled one.
export function nextVisit(visits: Visit[]): Visit | null {
  const active = visits.find((v) => v.status === 'in_progress');
  if (active) return active;
  return (
    [...visits]
      .filter((v) => v.status === 'scheduled')
      .sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start))[0] ?? null
  );
}

export function statusLabel(status: VisitStatus): string {
  switch (status) {
    case 'scheduled':
      return 'Scheduled';
    case 'in_progress':
      return 'In progress';
    case 'completed':
      return 'Completed';
    case 'missed':
      return 'Missed';
    case 'cancelled':
      return 'Cancelled';
  }
}

export async function fetchMyVisits(from: string, to: string): Promise<Visit[]> {
  const { data, error } = await supabase.rpc('get_my_visits', { p_from: from, p_to: to });
  if (error) throw error;
  return (data ?? []) as Visit[];
}

export async function checkInVisit(visitId: string, position: Coordinates | null) {
  const { error } = await supabase.rpc('check_in_visit', {
    p_visit_id: visitId,
    p_lat: position?.lat ?? (null as unknown as number),
    p_lng: position?.lng ?? (null as unknown as number),
  });
  if (error) throw error;
}

export async function checkOutVisit(visitId: string, position: Coordinates | null) {
  const { error } = await supabase.rpc('check_out_visit', {
    p_visit_id: visitId,
    p_lat: position?.lat ?? (null as unknown as number),
    p_lng: position?.lng ?? (null as unknown as number),
  });
  if (error) throw error;
}

export async function saveVisitReport(visitId: string, report: VisitReportInput, submit: boolean) {
  const { error } = await supabase.rpc('save_visit_report', {
    p_visit_id: visitId,
    p_bp_systolic: report.bpSystolic as number,
    p_bp_diastolic: report.bpDiastolic as number,
    p_pulse: report.pulse as number,
    p_spo2: report.spo2 as number,
    p_glucose_mgdl: report.glucoseMgdl as number,
    p_temperature_c: report.temperatureC as number,
    p_notes: report.notes,
    p_submit: submit,
  });
  if (error) throw error;
}

export async function fetchVisitReport(visitId: string): Promise<VisitReportInput | null> {
  const { data, error } = await supabase
    .from('visit_reports')
    .select('bp_systolic, bp_diastolic, pulse, spo2, glucose_mgdl, temperature_c, notes')
    .eq('visit_id', visitId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    bpSystolic: data.bp_systolic,
    bpDiastolic: data.bp_diastolic,
    pulse: data.pulse,
    spo2: data.spo2,
    glucoseMgdl: data.glucose_mgdl,
    temperatureC: data.temperature_c,
    notes: data.notes ?? '',
  };
}
