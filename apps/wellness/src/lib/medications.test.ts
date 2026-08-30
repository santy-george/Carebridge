import { describe, expect, it } from 'vitest';
import {
  buildDosesByBand,
  buildPharmacistOrderMailto,
  buildWeekStrip,
  computeStockDaysLeft,
  findPharmacistEmail,
  formatAppointmentWhen,
  lowStockMessage,
  sortUpcomingAppointments,
} from './medications';

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
    expect(
      lowStockMessage(
        computeStockDaysLeft([
          { id: '1', name: 'A', qty: 30, unit: 'tablets', doses_per_day: 1, high_risk: false },
        ]),
      ),
    ).toBe('');
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

describe('findPharmacistEmail', () => {
  it('finds a care team member whose role mentions pharmacist, case-insensitively', () => {
    const email = findPharmacistEmail([
      { role_label: 'Primary nurse', email: 'nurse@example.com' },
      { role_label: 'Pharmacist — Springfield Pharmacy', email: 'orders@pharmacy.com' },
    ]);
    expect(email).toBe('orders@pharmacy.com');
  });

  it('returns an empty string when no pharmacist is on the care team', () => {
    expect(findPharmacistEmail([{ role_label: 'Primary nurse', email: 'nurse@example.com' }])).toBe(
      '',
    );
  });

  it('returns an empty string when the pharmacist has no email on file', () => {
    expect(findPharmacistEmail([{ role_label: 'Pharmacist', email: null }])).toBe('');
  });
});

describe('buildPharmacistOrderMailto', () => {
  it('builds a mailto link listing each item to reorder', () => {
    const href = buildPharmacistOrderMailto('orders@pharmacy.com', [
      { name: 'Metformin 500mg', qty: 4, unit: 'tablets' },
      { name: 'Aspirin 75mg', qty: 2, unit: 'tablets' },
    ]);
    expect(href).toBe(
      'mailto:orders@pharmacy.com?subject=Medicine%20order&body=' +
        encodeURIComponent(
          'Metformin 500mg — reorder 4 tablets\nAspirin 75mg — reorder 2 tablets\n\nSent from Care Bridge Home.',
        ),
    );
  });
});

describe('buildWeekStrip', () => {
  it('builds Sun-Sat around the given date, marking today and appointment days', () => {
    const today = new Date('2026-08-19T12:00:00'); // a Wednesday
    const week = buildWeekStrip(today, [
      { id: '1', provider: 'Dr. Chen', visit_type: null, appt_date: '2026-08-17', appt_time: null },
    ]);
    expect(week).toHaveLength(7);
    expect(week.map((d) => d.label)).toEqual(['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);
    expect(week[0].date).toBe('2026-08-16');
    expect(week[1].hasAppointment).toBe(true);
    expect(week[3].isToday).toBe(true);
    expect(week[3].dayNumber).toBe(19);
    expect(week[0].hasAppointment).toBe(false);
  });
});

describe('sortUpcomingAppointments', () => {
  it('drops past appointments and sorts by date then time', () => {
    const result = sortUpcomingAppointments(
      [
        { id: 'a', provider: 'A', visit_type: null, appt_date: '2026-08-20', appt_time: '09:00' },
        { id: 'b', provider: 'B', visit_type: null, appt_date: '2026-08-19', appt_time: '14:00' },
        { id: 'c', provider: 'C', visit_type: null, appt_date: '2026-08-18', appt_time: null },
      ],
      '2026-08-19',
    );
    expect(result.map((a) => a.id)).toEqual(['b', 'a']);
  });
});

describe('formatAppointmentWhen', () => {
  it('formats date and time together', () => {
    expect(formatAppointmentWhen('2026-08-21', '14:30')).toMatch(/Fri.*21.*Aug.*2:30/);
  });

  it('formats date only when no time given', () => {
    expect(formatAppointmentWhen('2026-08-21', null)).toMatch(/Fri.*21.*Aug/);
    expect(formatAppointmentWhen('2026-08-21', null)).not.toMatch(/:/);
  });
});

describe('buildDosesByBand', () => {
  it('groups doses by band and marks taken from matching logs', () => {
    const meds = [
      {
        id: 'm1',
        name: 'Metformin',
        dosage: '500mg',
        high_risk: false,
        time_of_day: ['morning', 'evening'] as const,
      },
      {
        id: 'm2',
        name: 'Aspirin',
        dosage: '75mg',
        high_risk: true,
        time_of_day: ['morning'] as const,
      },
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
