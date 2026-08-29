import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Health } from './Health';
import { useAuth } from '../auth/useAuth';

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));

const tableResponses: Record<string, { data: unknown; error: unknown }> = {};

function mockTable(table: string) {
  const filters: { column: string; value: unknown }[] = [];
  const builder = {
    select: () => builder,
    eq: (column: string, value: unknown) => {
      filters.push({ column, value });
      return builder;
    },
    in: () => builder,
    not: () => builder,
    order: () => builder,
    limit: () => builder,
    then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
      const base = tableResponses[table] ?? { data: null, error: null };
      // wearable_readings is now queried once per reading_type (each with
      // its own small limit, to stop a high-frequency type crowding a
      // low-frequency one out of a shared cap) -- the mock must filter by
      // the actual reading_type each query used, the same way real
      // Postgrest would, or every query would resolve to the same
      // undifferentiated array regardless of which type it asked for.
      if (table === 'wearable_readings' && Array.isArray(base.data)) {
        const readingTypeFilter = filters.find((f) => f.column === 'reading_type');
        if (readingTypeFilter) {
          resolve({
            data: (base.data as { reading_type: string }[]).filter(
              (r) => r.reading_type === readingTypeFilter.value,
            ),
            error: base.error,
          });
          return;
        }
      }
      resolve(base);
    },
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
    tableResponses.wearable_readings = { data: [], error: null };
    tableResponses.daily_activity_totals = { data: [], error: null };
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

  it('shows a heart rate row sourced from wearable_readings', async () => {
    tableResponses.wearable_readings = {
      data: [{ reading_type: 'heart_rate', value: 72, recorded_at: '2026-08-20T08:00:00Z' }],
      error: null,
    };
    render(<Health />);
    expect(await screen.findByText('Heart rate')).toBeInTheDocument();
    expect(screen.getByText('72 bpm')).toBeInTheDocument();
  });

  it('merges Watch-sourced SpO2 with manually logged SpO2 into one row', async () => {
    tableResponses.vitals_readings = {
      data: [{ vital_type: 'spo2_pct', value: 97, recorded_at: '2026-08-01T08:00:00Z' }],
      error: null,
    };
    tableResponses.wearable_readings = {
      data: [{ reading_type: 'spo2', value: 96, recorded_at: '2026-08-02T08:00:00Z' }],
      error: null,
    };
    render(<Health />);
    const spo2Rows = await screen.findAllByText('SpO2');
    expect(spo2Rows).toHaveLength(1);
    expect(screen.getByText('96%')).toBeInTheDocument(); // the later (Watch) reading is latest
  });

  it('shows a resting heart rate row classified against the same 60-100 bpm range as heart rate', async () => {
    tableResponses.wearable_readings = {
      data: [
        { reading_type: 'resting_heart_rate', value: 105, recorded_at: '2026-08-20T08:00:00Z' },
      ],
      error: null,
    };
    render(<Health />);
    expect(await screen.findByText('Resting heart rate')).toBeInTheDocument();
    expect(screen.getByText('105 bpm')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('shows HRV as a trend-only row with no chip pill and no normal-range line', async () => {
    tableResponses.wearable_readings = {
      data: [
        {
          reading_type: 'heart_rate_variability_sdnn',
          value: 42.3,
          recorded_at: '2026-08-20T08:00:00Z',
        },
      ],
      error: null,
    };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<Health />);

    const row = await screen.findByRole('button', { name: /heart rate variability/i });
    expect(row).toHaveTextContent('42.3 ms');
    // No chip label text (High/Low/Normal/OK/etc) should appear in this row.
    expect(row).not.toHaveTextContent(/normal|low|high|elevated|active/i);

    await user.click(row);
    expect(screen.queryByText(/normal range:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/suggested next step/i)).not.toBeInTheDocument();
  });

  it('shows a daily activity total (active energy) as a chip-classified row', async () => {
    tableResponses.daily_activity_totals = {
      data: [{ reading_type: 'active_energy_burned', value: 45, day: '2026-08-20' }],
      error: null,
    };
    render(<Health />);
    expect(await screen.findByText('Active energy')).toBeInTheDocument();
    expect(screen.getByText('45 kcal')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('only shows rows for metrics that actually have data, ignoring the rest', async () => {
    tableResponses.wearable_readings = {
      data: [{ reading_type: 'heart_rate', value: 72, recorded_at: '2026-08-20T08:00:00Z' }],
      error: null,
    };
    render(<Health />);
    await screen.findByText('Heart rate');
    expect(screen.queryByText('Resting heart rate')).not.toBeInTheDocument();
    expect(screen.queryByText('Walking speed')).not.toBeInTheDocument();
    expect(screen.queryByText('Cardio fitness (VO2 max)')).not.toBeInTheDocument();
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
