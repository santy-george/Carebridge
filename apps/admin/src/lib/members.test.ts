import { describe, expect, it } from 'vitest';
import {
  adherencePercent,
  calculateAge,
  calculateBmi,
  categorizeBmi,
  classifyBloodPressure,
  classifyGlucose,
  classifySpo2,
  initialsFor,
} from './members';

describe('initialsFor', () => {
  it('takes the first letter of the first two words, uppercased', () => {
    expect(initialsFor('jane doe')).toBe('JD');
  });
});

describe('calculateAge', () => {
  it('counts a full year once the birthday has passed', () => {
    expect(calculateAge('1954-03-01', new Date('2026-08-07'))).toBe(72);
  });

  it('has not yet counted this year if the birthday has not happened', () => {
    expect(calculateAge('1954-12-01', new Date('2026-08-07'))).toBe(71);
  });
});

describe('classifyBloodPressure', () => {
  it('is Normal below 120, Elevated 120-139, High at 140+', () => {
    expect(classifyBloodPressure(115).label).toBe('Normal');
    expect(classifyBloodPressure(130).label).toBe('Elevated');
    expect(classifyBloodPressure(145).label).toBe('High');
  });
});

describe('classifySpo2', () => {
  it('is Normal at 95+, Low below', () => {
    expect(classifySpo2(97).label).toBe('Normal');
    expect(classifySpo2(90).label).toBe('Low');
  });
});

describe('classifyGlucose', () => {
  it('uses post_meal thresholds', () => {
    expect(classifyGlucose(120, 'post_meal').label).toBe('Normal');
    expect(classifyGlucose(160, 'post_meal').label).toBe('Needs attention');
    expect(classifyGlucose(190, 'post_meal').label).toBe('High');
  });

  it('uses fasting/pre_meal thresholds', () => {
    expect(classifyGlucose(90, 'fasting').label).toBe('Normal');
    expect(classifyGlucose(110, 'pre_meal').label).toBe('Needs attention');
    expect(classifyGlucose(140, 'fasting').label).toBe('High');
  });
});

describe('calculateBmi / categorizeBmi', () => {
  it('computes BMI and categorizes it', () => {
    const bmi = calculateBmi(70.4, 162);
    expect(bmi).toBe(26.8);
    expect(categorizeBmi(bmi).label).toBe('Overweight');
  });
});

describe('adherencePercent', () => {
  it('is null with no logs', () => {
    expect(adherencePercent([])).toBeNull();
  });

  it('computes the percentage taken', () => {
    expect(
      adherencePercent([{ taken: true }, { taken: true }, { taken: false }, { taken: true }]),
    ).toBe(75);
  });
});
