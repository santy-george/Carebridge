import { describe, expect, it } from 'vitest';
import {
  calculateBmi,
  categorizeBmi,
  classifyBloodPressure,
  classifyGlucose,
  classifyHeartRate,
  classifySpo2,
  glucoseContextLabel,
  hasLowStockAlert,
} from './vitals';

describe('classifyBloodPressure', () => {
  it('is Normal below 120', () => {
    expect(classifyBloodPressure(119)).toEqual({
      label: 'Normal',
      chipClass: 'chip2--ok',
      percent: 66,
    });
  });
  it('is Elevated from 120 to 139', () => {
    expect(classifyBloodPressure(130)).toEqual({
      label: 'Elevated',
      chipClass: 'chip2--warn',
      percent: 72,
    });
  });
  it('is High at 140 and above', () => {
    expect(classifyBloodPressure(140)).toEqual({
      label: 'High',
      chipClass: 'chip2--alert',
      percent: 78,
    });
  });
  it('clamps the gauge fill above the 180 ceiling', () => {
    expect(classifyBloodPressure(220).percent).toBe(100);
  });
});

describe('classifySpo2', () => {
  it('is Normal at 95 and above', () => {
    expect(classifySpo2(95)).toEqual({ label: 'Normal', chipClass: 'chip2--ok', percent: 95 });
  });
  it('is Low below 95', () => {
    expect(classifySpo2(94)).toEqual({ label: 'Low', chipClass: 'chip2--alert', percent: 94 });
  });
});

describe('classifyHeartRate', () => {
  it('is Low below 60', () => {
    expect(classifyHeartRate(55)).toEqual({ label: 'Low', chipClass: 'chip2--warn', percent: 31 });
  });
  it('is Normal from 60 to 100', () => {
    expect(classifyHeartRate(72)).toEqual({ label: 'Normal', chipClass: 'chip2--ok', percent: 40 });
  });
  it('is High above 100', () => {
    expect(classifyHeartRate(110)).toEqual({ label: 'High', chipClass: 'chip2--warn', percent: 61 });
  });
  it('clamps the gauge fill above the 180 ceiling', () => {
    expect(classifyHeartRate(220).percent).toBe(100);
  });
});

describe('classifyGlucose', () => {
  it('classifies post_meal bands', () => {
    expect(classifyGlucose(139, 'post_meal').label).toBe('Normal');
    expect(classifyGlucose(140, 'post_meal').label).toBe('Needs attention');
    expect(classifyGlucose(180, 'post_meal').label).toBe('High');
  });
  it('classifies fasting bands', () => {
    expect(classifyGlucose(99, 'fasting').label).toBe('Normal');
    expect(classifyGlucose(100, 'fasting').label).toBe('Needs attention');
    expect(classifyGlucose(126, 'fasting').label).toBe('High');
  });
  it('classifies pre_meal the same as fasting', () => {
    expect(classifyGlucose(99, 'pre_meal').label).toBe('Normal');
  });
  it('classifies bedtime bands', () => {
    expect(classifyGlucose(139, 'bedtime').label).toBe('Normal');
    expect(classifyGlucose(140, 'bedtime').label).toBe('Needs attention');
    expect(classifyGlucose(160, 'bedtime').label).toBe('High');
  });
  it('clamps the gauge fill above the 200 ceiling', () => {
    expect(classifyGlucose(400, 'fasting').percent).toBe(100);
  });
});

describe('glucoseContextLabel', () => {
  it('maps each context to display text', () => {
    expect(glucoseContextLabel('fasting')).toBe('Fasting');
    expect(glucoseContextLabel('pre_meal')).toBe('Pre-meal');
    expect(glucoseContextLabel('post_meal')).toBe('Post-meal');
    expect(glucoseContextLabel('bedtime')).toBe('Bedtime');
  });
});

describe('calculateBmi', () => {
  it('computes BMI from weight and height', () => {
    expect(calculateBmi(70.4, 162)).toBe(26.8);
  });
});

describe('categorizeBmi', () => {
  it('is Underweight below 18.5', () => {
    expect(categorizeBmi(18.4)).toEqual({ label: 'Underweight', chipClass: 'chip2--warn' });
  });
  it('is Normal weight from 18.5 to 24.9', () => {
    expect(categorizeBmi(18.5)).toEqual({ label: 'Normal weight', chipClass: 'chip2--ok' });
    expect(categorizeBmi(24.9)).toEqual({ label: 'Normal weight', chipClass: 'chip2--ok' });
  });
  it('is Overweight from 25 to 29.9', () => {
    expect(categorizeBmi(25)).toEqual({ label: 'Overweight', chipClass: 'chip2--warn' });
  });
  it('is Obese at 30 and above', () => {
    expect(categorizeBmi(30)).toEqual({ label: 'Obese', chipClass: 'chip2--alert' });
  });
});

describe('hasLowStockAlert', () => {
  it('is false when every item has more than 7 days left', () => {
    expect(hasLowStockAlert([{ qty: 24, doses_per_day: 2 }])).toBe(false);
  });
  it('is true when any item has 7 or fewer days left', () => {
    expect(
      hasLowStockAlert([
        { qty: 24, doses_per_day: 2 },
        { qty: 5, doses_per_day: 1 },
      ]),
    ).toBe(true);
  });
  it('treats a 0 doses_per_day as 1 to avoid a divide-by-zero', () => {
    expect(hasLowStockAlert([{ qty: 5, doses_per_day: 0 }])).toBe(true);
  });
  it('is false for an empty stock list', () => {
    expect(hasLowStockAlert([])).toBe(false);
  });
});
