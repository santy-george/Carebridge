import { describe, expect, it } from 'vitest';
import { initialsFor, permissionLabel } from './care';

describe('initialsFor', () => {
  it('takes the first letter of the first two words, uppercased', () => {
    expect(initialsFor('Sarah Doe')).toBe('SD');
    expect(initialsFor('  michael   james doe ')).toBe('MJ');
  });

  it('handles a single-word name', () => {
    expect(initialsFor('Cher')).toBe('C');
  });
});

describe('permissionLabel', () => {
  it('maps full to "Full access" and view to "View only"', () => {
    expect(permissionLabel('full')).toBe('Full access');
    expect(permissionLabel('view')).toBe('View only');
  });
});
