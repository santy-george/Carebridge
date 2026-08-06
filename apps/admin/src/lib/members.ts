export type CareModel = 'self_care' | 'virtual_care' | 'direct_care';
export type PlanLevel = 'basic' | 'standard' | 'premium';

export const CARE_MODEL_LABELS: Record<CareModel, string> = {
  self_care: 'Self Care',
  virtual_care: 'Virtual Care',
  direct_care: 'Direct Care',
};

export const PLAN_LEVEL_LABELS: Record<PlanLevel, string> = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
};

export function initialsFor(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function calculateAge(dateOfBirth: string, today: Date = new Date()): number {
  const dob = new Date(dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export interface Status {
  label: string;
  chipClass: string;
}

export function classifyBloodPressure(systolic: number): Status {
  if (systolic < 120) return { label: 'Normal', chipClass: 'chip2--ok' };
  if (systolic < 140) return { label: 'Elevated', chipClass: 'chip2--warn' };
  return { label: 'High', chipClass: 'chip2--alert' };
}

export function classifySpo2(value: number): Status {
  if (value >= 95) return { label: 'Normal', chipClass: 'chip2--ok' };
  return { label: 'Low', chipClass: 'chip2--alert' };
}

export type GlucoseContext = 'fasting' | 'pre_meal' | 'post_meal' | 'bedtime';

export function classifyGlucose(value: number, context: GlucoseContext): Status {
  if (context === 'post_meal') {
    if (value < 140) return { label: 'Normal', chipClass: 'chip2--ok' };
    if (value < 180) return { label: 'Needs attention', chipClass: 'chip2--warn' };
    return { label: 'High', chipClass: 'chip2--alert' };
  }
  if (context === 'bedtime') {
    if (value < 140) return { label: 'Normal', chipClass: 'chip2--ok' };
    if (value < 160) return { label: 'Needs attention', chipClass: 'chip2--warn' };
    return { label: 'High', chipClass: 'chip2--alert' };
  }
  if (value < 100) return { label: 'Normal', chipClass: 'chip2--ok' };
  if (value < 126) return { label: 'Needs attention', chipClass: 'chip2--warn' };
  return { label: 'High', chipClass: 'chip2--alert' };
}

export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export function categorizeBmi(bmi: number): Status {
  if (bmi < 18.5) return { label: 'Underweight', chipClass: 'chip2--warn' };
  if (bmi < 25) return { label: 'Normal weight', chipClass: 'chip2--ok' };
  if (bmi < 30) return { label: 'Overweight', chipClass: 'chip2--warn' };
  return { label: 'Obese', chipClass: 'chip2--alert' };
}

// Percent of medication_logs rows marked taken, over whatever window the
// caller already filtered to. Null (not 0) when there's no data to judge --
// a member with no logged doses hasn't necessarily missed anything.
export function adherencePercent(logs: { taken: boolean }[]): number | null {
  if (logs.length === 0) return null;
  const taken = logs.filter((l) => l.taken).length;
  return Math.round((taken / logs.length) * 100);
}
