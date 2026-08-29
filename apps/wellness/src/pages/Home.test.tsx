import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Home } from './Home';
import { useAuth } from '../auth/useAuth';

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
}

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));

const insertCalls: { table: string; payload: unknown }[] = [];
const insertResponses: Record<string, { error: unknown }> = {};

// mockTable only ever needs to handle .insert() now — the read side of
// Home's fetch is a single get_home_dashboard RPC call (see rpcMock below),
// not per-table selects.
function mockTable(table: string) {
  return {
    insert: (payload: unknown) => {
      insertCalls.push({ table, payload });
      return Promise.resolve(insertResponses[table] ?? { error: null });
    },
  };
}

let dashboardData: Record<string, unknown>;
let dashboardError: unknown;

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => mockTable(table)),
    rpc: vi.fn(() =>
      Promise.resolve(
        dashboardError
          ? { data: null, error: dashboardError }
          : { data: dashboardData, error: null },
      ),
    ),
  },
}));

describe('Home', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ selectedMemberId: 'm1' } as never);
    insertCalls.length = 0;
    for (const key of Object.keys(insertResponses)) delete insertResponses[key];
    dashboardError = null;
    dashboardData = {
      full_name: 'Jane Doe',
      medical_profile: null,
      checkin: null,
      vitals: [],
      glucose: null,
      heart_rate: null,
      respiratory_rate: null,
      steps: null,
      sleep_sessions: [],
    };
  });

  it('shows a loading skeleton before the initial fetch resolves', () => {
    renderHome();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows the add-profile CTA when no medical profile exists', async () => {
    renderHome();
    expect(await screen.findByText(/add your health profile/i)).toBeInTheDocument();
  });

  it('shows conditions and allergies when a medical profile exists', async () => {
    dashboardData.medical_profile = {
      conditions: ['Diabetes'],
      conditions_other: null,
      allergies: ['Peanuts'],
    };
    renderHome();
    expect(await screen.findByText('Diabetes')).toBeInTheDocument();
    expect(await screen.findByText('Peanuts')).toBeInTheDocument();
  });

  it('shows "No check-in yet" when there is no checkin row', async () => {
    renderHome();
    expect(await screen.findByText(/no check-in yet/i)).toBeInTheDocument();
  });

  it('shows the wellness score when a checkin exists', async () => {
    dashboardData.checkin = { wellness_score: 72, checkin_date: '2026-08-01' };
    renderHome();
    expect(await screen.findByText('72')).toBeInTheDocument();
  });

  it('shows "Connect a wearable" for all activity metrics when no heart rate data exists', async () => {
    renderHome();
    await waitFor(() => expect(screen.getByText(/jane/i)).toBeInTheDocument());
    expect(screen.getAllByText(/connect a wearable/i).length).toBe(3);
  });

  it('shows heart rate value and "Not tracked yet" for steps/sleep when heart rate data exists', async () => {
    dashboardData.heart_rate = { value: 72, recorded_at: '2026-08-20T10:00:00Z' };
    renderHome();
    expect(await screen.findByText('72 bpm')).toBeInTheDocument();
    expect(screen.getAllByText(/not tracked yet/i).length).toBe(2);
    expect(screen.queryByText(/connect a wearable/i)).not.toBeInTheDocument();
  });

  it('shows the respiratory rate gauge in My vitals when wearable data exists', async () => {
    dashboardData.heart_rate = { value: 72, recorded_at: '2026-08-20T10:00:00Z' };
    dashboardData.respiratory_rate = { value: 15, recorded_at: '2026-08-20T10:00:00Z' };
    renderHome();
    expect(await screen.findByText('Respiratory rate')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('Normal')).toBeInTheDocument();
    expect(screen.queryByText('Glucose')).not.toBeInTheDocument();
  });

  it('shows the real step count when daily_activity_totals has data', async () => {
    dashboardData.heart_rate = { value: 72, recorded_at: '2026-08-20T10:00:00Z' };
    dashboardData.steps = { value: 8342, day: '2026-08-20' };
    renderHome();
    expect(await screen.findByText('8,342 steps')).toBeInTheDocument();
  });

  it('shows a summed sleep duration when sleep_sessions has data', async () => {
    dashboardData.heart_rate = { value: 72, recorded_at: '2026-08-20T10:00:00Z' };
    dashboardData.sleep_sessions = [
      { started_at: '2026-08-20T22:00:00Z', ended_at: '2026-08-21T01:00:00Z' },
      { started_at: '2026-08-21T01:30:00Z', ended_at: '2026-08-21T05:00:00Z' },
    ];
    renderHome();
    expect(await screen.findByText('6h 30m')).toBeInTheDocument();
  });

  it('renders the greeting with the member first name', async () => {
    renderHome();
    expect(await screen.findByText(/good (morning|afternoon|evening), jane/i)).toBeInTheDocument();
  });

  it('shows a dismissible error banner when a fetch fails', async () => {
    dashboardError = { message: 'network error' };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderHome();
    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the BMI card with weight/height and computed category', async () => {
    dashboardData.vitals = [
      { vital_type: 'weight_kg', value: 70.4, recorded_at: '2026-08-01T00:00:00Z' },
      { vital_type: 'height_cm', value: 162, recorded_at: '2026-08-01T00:00:00Z' },
    ];
    renderHome();
    expect(await screen.findByText('26.8')).toBeInTheDocument();
    expect(await screen.findByText('Overweight')).toBeInTheDocument();
  });

  it('submits a glucose reading with the correct payload', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderHome();

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
    renderHome();

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
    renderHome();

    await user.type(await screen.findByLabelText(/blood glucose/i), '118');
    await user.click(screen.getByRole('button', { name: /log glucose reading/i }));

    expect(await screen.findByText(/couldn.t save that reading/i)).toBeInTheDocument();
  });

  it('shows an inline error when the BMI submit fails', async () => {
    insertResponses.vitals_readings = { error: { message: 'insert failed' } };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderHome();

    await user.type(await screen.findByLabelText(/^weight$/i), '70.4');
    await user.type(screen.getByLabelText(/^height$/i), '162');
    await user.click(screen.getByRole('button', { name: /log body reading/i }));

    expect(await screen.findByText(/couldn.t save that reading/i)).toBeInTheDocument();
  });

  it('does not show the blood pressure entry form until the BP gauge is tapped', async () => {
    renderHome();
    await screen.findByText(/good (morning|afternoon|evening)/i);
    expect(screen.queryByLabelText(/systolic/i)).not.toBeInTheDocument();
  });

  it('submits a blood pressure reading with systolic and diastolic', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderHome();

    await user.click(await screen.findByRole('button', { name: /enter blood pressure/i }));
    await user.type(screen.getByLabelText(/systolic/i), '128');
    await user.type(screen.getByLabelText(/diastolic/i), '82');
    await user.click(screen.getByRole('button', { name: /log blood pressure reading/i }));

    await waitFor(() =>
      expect(insertCalls).toContainEqual({
        table: 'vitals_readings',
        payload: expect.objectContaining({
          member_id: 'm1',
          vital_type: 'blood_pressure',
          value: 128,
          value_secondary: 82,
          source: 'manual',
        }),
      }),
    );
    // Form closes and the gauge reflects the new reading immediately.
    expect(screen.queryByLabelText(/systolic/i)).not.toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();
  });

  it('shows an inline error when the blood pressure submit fails', async () => {
    insertResponses.vitals_readings = { error: { message: 'insert failed' } };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderHome();

    await user.click(await screen.findByRole('button', { name: /enter blood pressure/i }));
    await user.type(screen.getByLabelText(/systolic/i), '128');
    await user.type(screen.getByLabelText(/diastolic/i), '82');
    await user.click(screen.getByRole('button', { name: /log blood pressure reading/i }));

    expect(await screen.findByText(/couldn.t save that reading/i)).toBeInTheDocument();
  });
});
