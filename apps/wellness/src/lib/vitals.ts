export type GlucoseContext = 'fasting' | 'pre_meal' | 'post_meal' | 'bedtime';

export interface Status {
  label: string;
  chipClass: string;
  percent: number;
}

export function classifyBloodPressure(systolic: number): Status {
  const percent = Math.round((Math.min(systolic, 180) / 180) * 100);
  if (systolic < 120) return { label: 'Normal', chipClass: 'chip2--ok', percent };
  if (systolic < 140) return { label: 'Elevated', chipClass: 'chip2--warn', percent };
  return { label: 'High', chipClass: 'chip2--alert', percent };
}

export function classifySpo2(value: number): Status {
  const percent = Math.round(Math.min(value, 100));
  if (value >= 95) return { label: 'Normal', chipClass: 'chip2--ok', percent };
  return { label: 'Low', chipClass: 'chip2--alert', percent };
}

// Resting heart rate outside 60-100 bpm can be a normal variation
// (fitness, medication, transient exertion caught by a continuous
// wearable sample) rather than an acute problem the way a single high BP
// reading can be -- warn, not alert, on both bounds.
export function classifyHeartRate(value: number): Status {
  const percent = Math.round((Math.min(value, 180) / 180) * 100);
  if (value < 60) return { label: 'Low', chipClass: 'chip2--warn', percent };
  if (value <= 100) return { label: 'Normal', chipClass: 'chip2--ok', percent };
  return { label: 'High', chipClass: 'chip2--warn', percent };
}

export function classifyGlucose(value: number, context: GlucoseContext): Status {
  const percent = Math.round((Math.min(value, 200) / 200) * 100);
  if (context === 'post_meal') {
    if (value < 140) return { label: 'Normal', chipClass: 'chip2--ok', percent };
    if (value < 180) return { label: 'Needs attention', chipClass: 'chip2--warn', percent };
    return { label: 'High', chipClass: 'chip2--alert', percent };
  }
  if (context === 'bedtime') {
    if (value < 140) return { label: 'Normal', chipClass: 'chip2--ok', percent };
    if (value < 160) return { label: 'Needs attention', chipClass: 'chip2--warn', percent };
    return { label: 'High', chipClass: 'chip2--alert', percent };
  }
  // fasting or pre_meal
  if (value < 100) return { label: 'Normal', chipClass: 'chip2--ok', percent };
  if (value < 126) return { label: 'Needs attention', chipClass: 'chip2--warn', percent };
  return { label: 'High', chipClass: 'chip2--alert', percent };
}

const GLUCOSE_CONTEXT_LABELS: Record<GlucoseContext, string> = {
  fasting: 'Fasting',
  pre_meal: 'Pre-meal',
  post_meal: 'Post-meal',
  bedtime: 'Bedtime',
};

export function glucoseContextLabel(context: GlucoseContext): string {
  return GLUCOSE_CONTEXT_LABELS[context];
}

export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export interface BmiCategory {
  label: string;
  chipClass: string;
}

export function categorizeBmi(bmi: number): BmiCategory {
  if (bmi < 18.5) return { label: 'Underweight', chipClass: 'chip2--warn' };
  if (bmi < 25) return { label: 'Normal weight', chipClass: 'chip2--ok' };
  if (bmi < 30) return { label: 'Overweight', chipClass: 'chip2--warn' };
  return { label: 'Obese', chipClass: 'chip2--alert' };
}

// Normal adult respiratory rate. Elevated rate is worth flagging more
// urgently than a single high reading of most vitals here, since it can
// signal acute respiratory distress -- relevant for members with a
// respiratory condition (e.g. asthma) on file.
export function classifyRespiratoryRate(value: number): Status {
  const percent = Math.round((Math.min(value, 30) / 30) * 100);
  if (value < 12) return { label: 'Low', chipClass: 'chip2--warn', percent };
  if (value <= 20) return { label: 'Normal', chipClass: 'chip2--ok', percent };
  if (value <= 24) return { label: 'Elevated', chipClass: 'chip2--warn', percent };
  return { label: 'High', chipClass: 'chip2--alert', percent };
}

// Published geriatric gait-speed thresholds: under ~0.6 m/s is associated
// with elevated fall risk and frailty in older adults; 0.6-1.0 m/s is
// borderline; at or above 1.0 m/s is typical for healthy, community-
// ambulatory older adults. One of the few wearable metrics here with a
// real, well-established clinical reference range for this population.
export function classifyWalkingSpeed(value: number): Status {
  const percent = Math.round((Math.min(value, 1.5) / 1.5) * 100);
  if (value < 0.6) return { label: 'Low', chipClass: 'chip2--alert', percent };
  if (value < 1.0) return { label: 'Below average', chipClass: 'chip2--warn', percent };
  return { label: 'Normal', chipClass: 'chip2--ok', percent };
}

// Apple's own published Walking Steadiness bands (the value is already a
// 0-100 score computed on-device).
export function classifyWalkingSteadiness(value: number): Status {
  const percent = Math.round(Math.min(value, 100));
  if (value < 30) return { label: 'Very low', chipClass: 'chip2--alert', percent };
  if (value < 50) return { label: 'Low', chipClass: 'chip2--warn', percent };
  return { label: 'OK', chipClass: 'chip2--ok', percent };
}

// Activity-tracking metrics below (energy, distance, stand time) have no
// clinical "normal range" the way BP or glucose do -- these are general
// activity-guidance thresholds, not diagnostic ones. More activity is
// never itself a bad sign, so only a low-activity band is flagged, never
// a "too high" one.
export function classifyActiveEnergy(kcal: number): Status {
  const percent = Math.round((Math.min(kcal, 500) / 500) * 100);
  if (kcal < 100) return { label: 'Low', chipClass: 'chip2--warn', percent };
  return { label: 'Active', chipClass: 'chip2--ok', percent };
}

export function classifyDistance(km: number): Status {
  const percent = Math.round((Math.min(km, 3) / 3) * 100);
  if (km < 0.5) return { label: 'Low', chipClass: 'chip2--warn', percent };
  return { label: 'Active', chipClass: 'chip2--ok', percent };
}

export function classifyStandTime(minutes: number): Status {
  const percent = Math.round((Math.min(minutes, 180) / 180) * 100);
  if (minutes < 60) return { label: 'Low', chipClass: 'chip2--warn', percent };
  return { label: 'Active', chipClass: 'chip2--ok', percent };
}

export function hasLowStockAlert(stock: { qty: number; doses_per_day: number }[]): boolean {
  return stock.some((item) => {
    const dosesPerDay = item.doses_per_day > 0 ? item.doses_per_day : 1;
    return Math.floor(item.qty / dosesPerDay) <= 7;
  });
}
