export type Mood = 'low' | 'okay' | 'good';
export type Energy = 'low' | 'medium' | 'high';
export type Sleep = 'poor' | 'fair' | 'good';
export type Aches = 'none' | 'mild' | 'moderate' | 'severe';

const MOOD_SCORE: Record<Mood, number> = { low: 5, okay: 15, good: 25 };
const ENERGY_SCORE: Record<Energy, number> = { low: 5, medium: 15, high: 25 };
const SLEEP_SCORE: Record<Sleep, number> = { poor: 5, fair: 15, good: 25 };
const ACHES_SCORE: Record<Aches, number> = { severe: 0, moderate: 10, mild: 18, none: 25 };

export function calculateWellnessScore(
  mood: Mood,
  energy: Energy,
  sleep: Sleep,
  aches: Aches,
): number {
  return MOOD_SCORE[mood] + ENERGY_SCORE[energy] + SLEEP_SCORE[sleep] + ACHES_SCORE[aches];
}

export const MOOD_OPTIONS: { value: Mood; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'okay', label: 'Okay' },
  { value: 'good', label: 'Good' },
];

export const ENERGY_OPTIONS: { value: Energy; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export const SLEEP_OPTIONS: { value: Sleep; label: string }[] = [
  { value: 'poor', label: 'Poor' },
  { value: 'fair', label: 'Fair' },
  { value: 'good', label: 'Good' },
];

export const ACHES_OPTIONS: { value: Aches; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
];
