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
      const chipClass = daysLeft <= 7 ? 'chip2--alert' : daysLeft <= 14 ? 'chip2--warn' : 'chip2--ok';
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
      worst.daysLeft <= 0 ? 'less than a day' : `${worst.daysLeft} day${worst.daysLeft === 1 ? '' : 's'}`;
    return `${worst.name} runs out in ${dayText} — refill soon`;
  }
  return `${low.length} medicines are running low — refill soon`;
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
  const takenByKey = new Map(logs.map((log) => [`${log.medication_id}:${log.time_of_day}`, log.taken]));
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
