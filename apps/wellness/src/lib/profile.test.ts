import { describe, expect, it } from 'vitest';
import { calculateAge, formatMemberSince, initialsFor, medicalSummary } from './profile';

describe('initialsFor', () => {
  it('takes the first letter of the first two words, uppercased', () => {
    expect(initialsFor('jane doe')).toBe('JD');
  });

  it('handles a single name', () => {
    expect(initialsFor('Cher')).toBe('C');
  });

  it('ignores extra whitespace and a third+ word', () => {
    expect(initialsFor('  Jane   Middle Doe  ')).toBe('JM');
  });
});

describe('calculateAge', () => {
  it('counts a full year once the birthday has passed this year', () => {
    expect(calculateAge('1954-03-01', new Date('2026-08-07'))).toBe(72);
  });

  it('has not yet counted this year if the birthday has not happened', () => {
    expect(calculateAge('1954-12-01', new Date('2026-08-07'))).toBe(71);
  });

  it('counts the birthday itself as turning the new age', () => {
    expect(calculateAge('1954-08-07', new Date('2026-08-07'))).toBe(72);
  });
});

describe('formatMemberSince', () => {
  it('formats as short month and year', () => {
    expect(formatMemberSince('2025-01-15T00:00:00Z')).toMatch(/Jan 2025/);
  });
});

describe('medicalSummary', () => {
  it('prompts to add a profile when nothing is on file', () => {
    expect(medicalSummary(0, 0)).toBe('Add your health profile');
  });

  it('singularizes a single condition and allergy', () => {
    expect(medicalSummary(1, 1)).toBe('1 condition · 1 allergy');
  });

  it('pluralizes multiple conditions and allergies', () => {
    expect(medicalSummary(2, 3)).toBe('2 conditions · 3 allergies');
  });

  it('shows only conditions when there are no allergies', () => {
    expect(medicalSummary(2, 0)).toBe('2 conditions');
  });
});
