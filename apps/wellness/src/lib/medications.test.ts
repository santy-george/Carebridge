import { describe, expect, it } from 'vitest';
import { buildDosesByBand, computeStockDaysLeft, lowStockMessage } from './medications';

describe('computeStockDaysLeft', () => {
  it('computes days left from qty and doses per day, sorted ascending', () => {
    const result = computeStockDaysLeft([
      { id: '1', name: 'A', qty: 20, unit: 'tablets', doses_per_day: 2, high_risk: false },
      { id: '2', name: 'B', qty: 4, unit: 'capsules', doses_per_day: 1, high_risk: false },
    ]);
    expect(result.map((r) => r.name)).toEqual(['B', 'A']);
    expect(result[0]).toMatchObject({ daysLeft: 4, chipClass: 'chip2--alert' });
    expect(result[1]).toMatchObject({ daysLeft: 10, chipClass: 'chip2--warn' });
  });

  it('treats zero doses per day as one to avoid dividing by zero', () => {
    const [item] = computeStockDaysLeft([
      { id: '1', name: 'A', qty: 30, unit: 'tablets', doses_per_day: 0, high_risk: false },
    ]);
    expect(item.daysLeft).toBe(30);
  });

  it('chips ok above 14 days left', () => {
    const [item] = computeStockDaysLeft([
      { id: '1', name: 'A', qty: 30, unit: 'tablets', doses_per_day: 1, high_risk: false },
    ]);
    expect(item.chipClass).toBe('chip2--ok');
  });
});

describe('lowStockMessage', () => {
  it('is empty when nothing is low', () => {
    expect(lowStockMessage(computeStockDaysLeft([{ id: '1', name: 'A', qty: 30, unit: 'tablets', doses_per_day: 1, high_risk: false }]))).toBe('');
  });

  it('names the single low item and its days left', () => {
    const items = computeStockDaysLeft([
      { id: '1', name: 'Metformin', qty: 4, unit: 'tablets', doses_per_day: 2, high_risk: false },
    ]);
    expect(lowStockMessage(items)).toBe('Metformin runs out in 2 days — refill soon');
  });

  it('summarizes when multiple items are low', () => {
    const items = computeStockDaysLeft([
      { id: '1', name: 'A', qty: 2, unit: 'tablets', doses_per_day: 1, high_risk: false },
      { id: '2', name: 'B', qty: 3, unit: 'tablets', doses_per_day: 1, high_risk: false },
    ]);
    expect(lowStockMessage(items)).toBe('2 medicines are running low — refill soon');
  });
});

describe('buildDosesByBand', () => {
  it('groups doses by band and marks taken from matching logs', () => {
    const meds = [
      { id: 'm1', name: 'Metformin', dosage: '500mg', high_risk: false, time_of_day: ['morning', 'evening'] as const },
      { id: 'm2', name: 'Aspirin', dosage: '75mg', high_risk: true, time_of_day: ['morning'] as const },
    ];
    const logs = [{ medication_id: 'm1', time_of_day: 'morning' as const, taken: true }];

    const byBand = buildDosesByBand(
      meds.map((m) => ({ ...m, time_of_day: [...m.time_of_day] })),
      logs,
    );

    expect(byBand.morning.map((d) => d.name)).toEqual(['Metformin', 'Aspirin']);
    expect(byBand.morning.find((d) => d.medicationId === 'm1')?.taken).toBe(true);
    expect(byBand.morning.find((d) => d.medicationId === 'm2')?.taken).toBe(false);
    expect(byBand.evening.map((d) => d.name)).toEqual(['Metformin']);
    expect(byBand.evening[0].taken).toBe(false);
    expect(byBand.noon).toEqual([]);
    expect(byBand.night).toEqual([]);
  });
});
