import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Health } from './Health';
import { useAuth } from '../auth/useAuth';

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));

const tableResponses: Record<string, { data: unknown; error: unknown }> = {};

function mockTable(table: string) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    order: () => builder,
    limit: () => builder,
    then: (resolve: (v: { data: unknown; error: unknown }) => void) =>
      resolve(tableResponses[table] ?? { data: null, error: null }),
  };
  return builder;
}

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => mockTable(table)),
  },
}));

describe('Health', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ selectedMemberId: 'm1' } as never);
    for (const key of Object.keys(tableResponses)) delete tableResponses[key];
    tableResponses.vitals_readings = { data: [], error: null };
    tableResponses.glucose_readings = { data: [], error: null };
  });

  it('shows a loading state before the initial fetch resolves', () => {
    render(<Health />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows an empty state when nothing has been logged', async () => {
    render(<Health />);
    expect(await screen.findByText(/no readings logged yet/i)).toBeInTheDocument();
  });

  it('shows a blood pressure row classified as High, sorted above a Normal SpO2 row', async () => {
    tableResponses.vitals_readings = {
      data: [
        { vital_type: 'blood_pressure', value: 145, recorded_at: '2026-08-01T08:00:00Z' },
        { vital_type: 'spo2_pct', value: 98, recorded_at: '2026-08-01T08:00:00Z' },
      ],
      error: null,
    };
    render(<Health />);

    const rows = await screen.findAllByRole('button');
    expect(rows[0]).toHaveTextContent('Blood pressure');
    expect(rows[0]).toHaveTextContent('High');
    expect(rows[1]).toHaveTextContent('SpO2');
    expect(rows[1]).toHaveTextContent('Normal');
  });

  it('expands a row to show the normal range, day values, and note', async () => {
    tableResponses.vitals_readings = {
      data: [{ vital_type: 'spo2_pct', value: 98, recorded_at: '2026-08-01T08:00:00Z' }],
      error: null,
    };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<Health />);

    await user.click(await screen.findByRole('button', { name: /spo2/i }));
    expect(screen.getByText(/normal range: 95–100%/i)).toBeInTheDocument();
    expect(screen.getByText(/readings below 92%/i)).toBeInTheDocument();
  });

  it('shows a suggestion banner only for out-of-range readings', async () => {
    tableResponses.vitals_readings = {
      data: [{ vital_type: 'spo2_pct', value: 88, recorded_at: '2026-08-01T08:00:00Z' }],
      error: null,
    };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<Health />);

    await user.click(await screen.findByRole('button', { name: /spo2/i }));
    expect(screen.getByText(/suggested next step/i)).toBeInTheDocument();
  });

  it('computes a BMI row by pairing weight and height readings', async () => {
    tableResponses.vitals_readings = {
      data: [
        { vital_type: 'weight_kg', value: 70.4, recorded_at: '2026-08-01T08:00:00Z' },
        { vital_type: 'height_cm', value: 162, recorded_at: '2026-07-01T08:00:00Z' },
      ],
      error: null,
    };
    render(<Health />);
    expect(await screen.findByText('Body Mass Index')).toBeInTheDocument();
    expect(screen.getByText('26.8')).toBeInTheDocument();
  });

  it('shows a glucose row from glucose_readings', async () => {
    tableResponses.glucose_readings = {
      data: [
        {
          value_mg_dl: 118,
          context: 'post_meal',
          reading_date: '2026-08-01',
          reading_time: '08:00',
        },
      ],
      error: null,
    };
    render(<Health />);
    expect(await screen.findByText('Blood glucose')).toBeInTheDocument();
    expect(screen.getByText(/118 mg\/dL \(post-meal\)/i)).toBeInTheDocument();
  });

  it('shows a dismissible error banner when a fetch fails', async () => {
    tableResponses.vitals_readings = { data: null, error: { message: 'network error' } };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<Health />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
