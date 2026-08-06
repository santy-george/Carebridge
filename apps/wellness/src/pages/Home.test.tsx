import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Home } from './Home';
import { useAuth } from '../auth/useAuth';

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));

const tableResponses: Record<string, { data: unknown; error: unknown }> = {};
const insertCalls: { table: string; payload: unknown }[] = [];
const insertResponses: Record<string, { error: unknown }> = {};

// A generic chainable + thenable query-builder mock: every filter/modifier
// method (select/eq/in/order/limit/maybeSingle) returns the same object, so
// it works regardless of which methods a given real query chains and in
// what order — matching how the real supabase-js query builder behaves
// (each intermediate call is itself awaitable).
function mockTable(table: string) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: () => builder,
    insert: (payload: unknown) => {
      insertCalls.push({ table, payload });
      return Promise.resolve(insertResponses[table] ?? { error: null });
    },
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

describe('Home', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ selectedMemberId: 'm1' } as never);
    for (const key of Object.keys(tableResponses)) delete tableResponses[key];
    for (const key of Object.keys(insertResponses)) delete insertResponses[key];
    insertCalls.length = 0;
    tableResponses.members = { data: { full_name: 'Jane Doe' }, error: null };
  });

  it('shows a loading skeleton before the initial fetch resolves', () => {
    render(<Home />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows the add-profile CTA when no medical profile exists', async () => {
    tableResponses.medical_profile = { data: null, error: null };
    render(<Home />);
    expect(await screen.findByText(/add your health profile/i)).toBeInTheDocument();
  });

  it('shows conditions and allergies when a medical profile exists', async () => {
    tableResponses.medical_profile = {
      data: { conditions: ['Diabetes'], conditions_other: null, allergies: ['Peanuts'] },
      error: null,
    };
    render(<Home />);
    expect(await screen.findByText('Diabetes')).toBeInTheDocument();
    expect(await screen.findByText('Peanuts')).toBeInTheDocument();
  });

  it('shows "No check-in yet" when there is no checkin row', async () => {
    tableResponses.checkins = { data: [], error: null };
    render(<Home />);
    expect(await screen.findByText(/no check-in yet/i)).toBeInTheDocument();
  });

  it('shows the wellness score when a checkin exists', async () => {
    tableResponses.checkins = {
      data: [{ wellness_score: 72, checkin_date: '2026-08-01' }],
      error: null,
    };
    render(<Home />);
    expect(await screen.findByText('72')).toBeInTheDocument();
  });

  it('shows a placeholder for the activity row with no query', async () => {
    render(<Home />);
    await waitFor(() => expect(screen.getByText(/jane/i)).toBeInTheDocument());
    expect(screen.getAllByText(/connect a wearable/i).length).toBeGreaterThan(0);
  });

  it('renders the greeting with the member first name', async () => {
    render(<Home />);
    expect(await screen.findByText(/good (morning|afternoon|evening), jane/i)).toBeInTheDocument();
  });

  it('shows a dismissible error banner when a fetch fails', async () => {
    tableResponses.medical_profile = { data: null, error: { message: 'network error' } };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<Home />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the BMI card with weight/height and computed category', async () => {
    tableResponses.vitals_readings = {
      data: [
        { vital_type: 'weight_kg', value: 70.4, recorded_at: '2026-08-01T00:00:00Z' },
        { vital_type: 'height_cm', value: 162, recorded_at: '2026-08-01T00:00:00Z' },
      ],
      error: null,
    };
    render(<Home />);
    expect(await screen.findByText('26.8')).toBeInTheDocument();
    expect(await screen.findByText('Overweight')).toBeInTheDocument();
  });

  it('submits a glucose reading with the correct payload', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<Home />);

    await user.type(await screen.findByLabelText(/blood glucose/i), '118');
    await user.click(screen.getByRole('button', { name: /log glucose reading/i }));

    await waitFor(() =>
      expect(insertCalls).toContainEqual({
        table: 'glucose_readings',
        payload: expect.objectContaining({
          member_id: 'm1',
          value_mg_dl: 118,
          context: 'post_meal',
        }),
      }),
    );
  });

  it('submits weight and height as two vitals_readings inserts', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<Home />);

    await user.type(await screen.findByLabelText(/^weight$/i), '70.4');
    await user.type(screen.getByLabelText(/^height$/i), '162');
    await user.click(screen.getByRole('button', { name: /log body reading/i }));

    await waitFor(() => {
      expect(insertCalls).toContainEqual({
        table: 'vitals_readings',
        payload: expect.objectContaining({
          member_id: 'm1',
          vital_type: 'weight_kg',
          value: 70.4,
          source: 'manual',
        }),
      });
      expect(insertCalls).toContainEqual({
        table: 'vitals_readings',
        payload: expect.objectContaining({
          member_id: 'm1',
          vital_type: 'height_cm',
          value: 162,
          source: 'manual',
        }),
      });
    });
  });

  it('shows an inline error when the glucose submit fails', async () => {
    insertResponses.glucose_readings = { error: { message: 'insert failed' } };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<Home />);

    await user.type(await screen.findByLabelText(/blood glucose/i), '118');
    await user.click(screen.getByRole('button', { name: /log glucose reading/i }));

    expect(await screen.findByText(/couldn.t save that reading/i)).toBeInTheDocument();
  });

  it('shows an inline error when the BMI submit fails', async () => {
    insertResponses.vitals_readings = { error: { message: 'insert failed' } };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<Home />);

    await user.type(await screen.findByLabelText(/^weight$/i), '70.4');
    await user.type(screen.getByLabelText(/^height$/i), '162');
    await user.click(screen.getByRole('button', { name: /log body reading/i }));

    expect(await screen.findByText(/couldn.t save that reading/i)).toBeInTheDocument();
  });
});
