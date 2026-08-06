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

export const CONDITION_CHOICES = [
  'Diabetes',
  'High BP',
  'Heart condition',
  'Arthritis',
  'Thyroid',
  'Asthma',
  'Memory issues',
];

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

export function formatMemberSince(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

export function medicalSummary(conditionsCount: number, allergiesCount: number): string {
  const parts: string[] = [];
  if (conditionsCount > 0)
    parts.push(`${conditionsCount} condition${conditionsCount > 1 ? 's' : ''}`);
  if (allergiesCount > 0) parts.push(`${allergiesCount} allerg${allergiesCount > 1 ? 'ies' : 'y'}`);
  return parts.length ? parts.join(' · ') : 'Add your health profile';
}
