import { describe, expect, it } from 'vitest';
import { calculateWellnessScore } from './checkin';

describe('calculateWellnessScore', () => {
  it('is 100 for the best answers across every dimension', () => {
    expect(calculateWellnessScore('good', 'high', 'good', 'none')).toBe(100);
  });

  it('is 15 for the worst mood/energy/sleep with severe aches', () => {
    expect(calculateWellnessScore('low', 'low', 'poor', 'severe')).toBe(15);
  });

  it('sums each dimension independently', () => {
    expect(calculateWellnessScore('okay', 'medium', 'fair', 'mild')).toBe(15 + 15 + 15 + 18);
  });
});
