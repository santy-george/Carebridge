export type TimeOfDayBand = 'morning' | 'noon' | 'evening' | 'night';

export const TIME_OF_DAY_BANDS: TimeOfDayBand[] = ['morning', 'noon', 'evening', 'night'];

export const BAND_LABELS: Record<TimeOfDayBand, string> = {
  morning: 'Morning',
  noon: 'Noon',
  evening: 'Evening',
  night: 'Night',
};

export interface StockItem {
  id: string;
  name: string;
  qty: number;
  unit: string;
  doses_per_day: number;
  high_risk: boolean;
  dosage?: string | null;
  taken_for?: string | null;
  prescribed_by?: string | null;
  expiry_date?: string | null;
}

export interface StockWithDaysLeft extends StockItem {
  daysLeft: number;
  chipClass: string;
}

export function computeStockDaysLeft(items: StockItem[]): StockWithDaysLeft[] {
  return items
    .map((item) => {
      const dosesPerDay = item.doses_per_day > 0 ? item.doses_per_day : 1;
      const daysLeft = Math.floor(item.qty / dosesPerDay);
      const chipClass =
        daysLeft <= 7 ? 'chip2--alert' : daysLeft <= 14 ? 'chip2--warn' : 'chip2--ok';
      return { ...item, daysLeft, chipClass };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

export function lowStockMessage(items: StockWithDaysLeft[]): string {
  const low = items.filter((i) => i.daysLeft <= 7);
  if (!low.length) return '';
  if (low.length === 1) {
    const worst = low[0];
    const dayText =
      worst.daysLeft <= 0
        ? 'less than a day'
        : `${worst.daysLeft} day${worst.daysLeft === 1 ? '' : 's'}`;
    return `${worst.name} runs out in ${dayText} — refill soon`;
  }
  return `${low.length} medicines are running low — refill soon`;
}

export function findPharmacistEmail(
  careTeam: { role_label: string; email: string | null }[],
): string {
  const pharmacist = careTeam.find((m) => m.role_label.toLowerCase().includes('pharmac'));
  return pharmacist?.email ?? '';
}

export function buildPharmacistOrderMailto(
  email: string,
  items: { name: string; qty: number; unit: string }[],
): string {
  const lines = items.map((i) => `${i.name} — reorder ${i.qty} ${i.unit}`);
  const body = `${lines.join('\n')}\n\nSent from Care Bridge Home.`;
  return `mailto:${email}?subject=${encodeURIComponent('Medicine order')}&body=${encodeURIComponent(body)}`;
}

export interface Appointment {
  id: string;
  provider: string;
  visit_type: string | null;
  appt_date: string;
  appt_time: string | null;
}

export interface WeekDay {
  date: string;
  label: string;
  dayNumber: number;
  isToday: boolean;
  hasAppointment: boolean;
}

const WEEKDAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function buildWeekStrip(today: Date, appointments: Appointment[]): WeekDay[] {
  const appointmentDates = new Set(appointments.map((a) => a.appt_date));
  const todayKey = toDateKey(today);
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dateKey = toDateKey(d);
    return {
      date: dateKey,
      label: WEEKDAY_LABELS[i],
      dayNumber: d.getDate(),
      isToday: dateKey === todayKey,
      hasAppointment: appointmentDates.has(dateKey),
    };
  });
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function sortUpcomingAppointments(
  appointments: Appointment[],
  todayKey: string,
): Appointment[] {
  return appointments
    .filter((a) => a.appt_date >= todayKey)
    .sort((a, b) => {
      if (a.appt_date !== b.appt_date) return a.appt_date < b.appt_date ? -1 : 1;
      return (a.appt_time ?? '').localeCompare(b.appt_time ?? '');
    });
}

export function formatAppointmentWhen(apptDate: string, apptTime: string | null): string {
  const dateTime = apptTime ? `${apptDate}T${apptTime}` : `${apptDate}T00:00`;
  const d = new Date(dateTime);
  const datePart = d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  if (!apptTime) return datePart;
  const timePart = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${datePart}, ${timePart}`;
}

export interface Dose {
  key: string;
  medicationId: string;
  band: TimeOfDayBand;
  name: string;
  dosage: string | null;
  highRisk: boolean;
  taken: boolean;
}

export interface MedicationForDoses {
  id: string;
  name: string;
  dosage: string | null;
  high_risk: boolean;
  time_of_day: TimeOfDayBand[];
}

export interface MedicationLogForDoses {
  medication_id: string;
  time_of_day: TimeOfDayBand | null;
  taken: boolean;
}

export function buildDosesByBand(
  medications: MedicationForDoses[],
  logs: MedicationLogForDoses[],
): Record<TimeOfDayBand, Dose[]> {
  const takenByKey = new Map(
    logs.map((log) => [`${log.medication_id}:${log.time_of_day}`, log.taken]),
  );
  const byBand: Record<TimeOfDayBand, Dose[]> = { morning: [], noon: [], evening: [], night: [] };
  for (const med of medications) {
    for (const band of med.time_of_day) {
      byBand[band].push({
        key: `${med.id}:${band}`,
        medicationId: med.id,
        band,
        name: med.name,
        dosage: med.dosage,
        highRisk: med.high_risk,
        taken: takenByKey.get(`${med.id}:${band}`) ?? false,
      });
    }
  }
  return byBand;
}
