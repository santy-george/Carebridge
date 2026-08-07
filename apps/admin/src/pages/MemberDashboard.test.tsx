import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemberDashboard } from './MemberDashboard';
import { useAuth } from '../auth/useAuth';

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));

const tableResponses: Record<string, { data: unknown; error: unknown }> = {};
const insertCalls: { table: string; payload: unknown }[] = [];
const deleteCalls: { table: string; id: string }[] = [];
const updateCalls: { table: string; payload: unknown; id: string }[] = [];
const singleResponses: Record<string, { data: unknown; error: unknown }> = {};
let deleteError: { message: string } | null = null;
let updateError: { message: string } | null = null;

function mockTable(table: string) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    order: () => builder,
    limit: () => builder,
    gte: () => builder,
    maybeSingle: () => builder,
    single: () => Promise.resolve(singleResponses[table] ?? { data: null, error: null }),
    insert: (payload: unknown) => {
      insertCalls.push({ table, payload });
      return builder;
    },
    update: (payload: unknown) => ({
      eq: (_col: string, id: string) => {
        updateCalls.push({ table, payload, id });
        return Promise.resolve({ error: updateError });
      },
    }),
    delete: () => ({
      eq: (_col: string, id: string) => {
        deleteCalls.push({ table, id });
        return Promise.resolve({ error: deleteError });
      },
    }),
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

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/members/m1']}>
      <Routes>
        <Route path="/members/:id" element={<MemberDashboard />} />
        <Route path="/members" element={<div>Members list</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MemberDashboard', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ session: { user: { id: 'coord-1' } } } as never);
    for (const key of Object.keys(tableResponses)) delete tableResponses[key];
    for (const key of Object.keys(singleResponses)) delete singleResponses[key];
    insertCalls.length = 0;
    deleteCalls.length = 0;
    updateCalls.length = 0;
    deleteError = null;
    updateError = null;
    tableResponses.members = {
      data: {
        id: 'm1',
        full_name: 'Jane Doe',
        date_of_birth: '1954-03-01',
        gender: 'F',
        phone: '+91 98470 00001',
        location: 'Ernakulam',
        care_model: 'direct_care',
        plan_level: 'premium',
        emergency_contact_name: 'Sarah Doe',
        emergency_contact_phone: '+1 416 555 0100',
      },
      error: null,
    };
    tableResponses.medical_profile = {
      data: {
        conditions: ['Diabetes'],
        conditions_other: null,
        allergies: ['Penicillin'],
        notes: null,
      },
      error: null,
    };
    tableResponses.checkins = { data: [], error: null };
    tableResponses.medications = { data: [], error: null };
    tableResponses.medication_logs = { data: [], error: null };
    tableResponses.vitals_readings = { data: [], error: null };
    tableResponses.glucose_readings = { data: [], error: null };
    tableResponses.sos_alerts = { data: [], error: null };
    tableResponses.care_team = { data: [], error: null };
    tableResponses.preventive_plan_goals = { data: [], error: null };
  });

  it('shows a loading state before the initial fetch resolves', () => {
    renderDashboard();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows a not-found state when the member is null', async () => {
    tableResponses.members = { data: null, error: null };
    renderDashboard();
    expect(await screen.findByText(/not found, or not assigned to you/i)).toBeInTheDocument();
  });

  it('shows identity and medical summary', async () => {
    renderDashboard();
    expect(await screen.findByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument();
    expect(screen.getByText(/Diabetes/)).toBeInTheDocument();
    expect(screen.getByText(/Penicillin/)).toBeInTheDocument();
  });

  it('classifies vitals and shows adherence', async () => {
    tableResponses.vitals_readings = {
      data: [
        { vital_type: 'blood_pressure', value: 145, recorded_at: '2026-08-01T08:00:00Z' },
        { vital_type: 'spo2_pct', value: 98, recorded_at: '2026-08-01T08:00:00Z' },
      ],
      error: null,
    };
    tableResponses.medication_logs = {
      data: [{ taken: true }, { taken: true }, { taken: false }],
      error: null,
    };
    renderDashboard();

    expect(await screen.findByText(/high/i)).toBeInTheDocument();
    expect(screen.getByText(/normal/i)).toBeInTheDocument();
    expect(screen.getByText(/67% of doses taken in the last 7 days/i)).toBeInTheDocument();
  });

  it('shows check-ins and SOS history in their tables', async () => {
    tableResponses.checkins = {
      data: [
        {
          checkin_date: '2026-08-01',
          mood: 'good',
          energy: 'high',
          sleep: 'good',
          aches: 'none',
          wellness_score: 88,
        },
      ],
      error: null,
    };
    tableResponses.sos_alerts = {
      data: [
        {
          id: 's1',
          alert_type: 'manual',
          status: 'resolved',
          triggered_at: '2026-08-01T10:00:00Z',
          notes: 'False alarm, tripped over a rug.',
        },
      ],
      error: null,
    };
    renderDashboard();

    expect(await screen.findByText('2026-08-01')).toBeInTheDocument();
    expect(screen.getByText('88')).toBeInTheDocument();
    expect(screen.getByText('Manual SOS')).toBeInTheDocument();
    expect(screen.getByText('False alarm, tripped over a rug.')).toBeInTheDocument();
  });

  it('shows a dismissible error banner when a fetch fails', async () => {
    tableResponses.checkins = { data: null, error: { message: 'network error' } };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderDashboard();

    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('links back to the members list', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderDashboard();

    await user.click(await screen.findByRole('link', { name: 'Members' }));
    expect(await screen.findByText('Members list')).toBeInTheDocument();
  });

  it('lists existing care team members', async () => {
    tableResponses.care_team = {
      data: [
        {
          id: 'ct1',
          role_label: 'Primary nurse',
          name: 'Rita Alvarez',
          phone: '555-0101',
          email: null,
          address: null,
          notes: null,
        },
      ],
      error: null,
    };
    renderDashboard();
    expect(await screen.findByText('Rita Alvarez')).toBeInTheDocument();
    expect(screen.getByText('Primary nurse')).toBeInTheDocument();
    expect(screen.getByText('555-0101')).toBeInTheDocument();
  });

  it('adds a care team member through the drawer', async () => {
    singleResponses.care_team = {
      data: {
        id: 'ct2',
        role_label: 'Family physician',
        name: 'Dr. Rajeev Menon',
        phone: null,
        email: null,
        address: null,
        notes: null,
      },
      error: null,
    };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderDashboard();

    await user.click(await screen.findByRole('button', { name: 'Add care team member' }));
    await user.type(screen.getByLabelText(/^name$/i), 'Dr. Rajeev Menon');
    await user.type(screen.getByLabelText(/description \/ role/i), 'Family physician');
    await user.click(screen.getByRole('button', { name: /save care member/i }));

    await waitFor(() =>
      expect(insertCalls).toContainEqual({
        table: 'care_team',
        payload: expect.objectContaining({
          member_id: 'm1',
          name: 'Dr. Rajeev Menon',
          role_label: 'Family physician',
          created_by: 'coord-1',
        }),
      }),
    );
    expect(await screen.findByText('Dr. Rajeev Menon')).toBeInTheDocument();
  });

  it('removes a care team member', async () => {
    tableResponses.care_team = {
      data: [
        {
          id: 'ct1',
          role_label: 'Primary nurse',
          name: 'Rita Alvarez',
          phone: null,
          email: null,
          address: null,
          notes: null,
        },
      ],
      error: null,
    };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderDashboard();

    await user.click(await screen.findByRole('button', { name: /remove/i }));

    await waitFor(() => expect(deleteCalls).toContainEqual({ table: 'care_team', id: 'ct1' }));
    expect(screen.queryByText('Rita Alvarez')).not.toBeInTheDocument();
  });

  it('lists preventive plan goals with a completed/total count', async () => {
    tableResponses.preventive_plan_goals = {
      data: [
        {
          id: 'g1',
          title: 'Annual flu vaccination',
          icon: 'bandage',
          due_date: '2026-07-31',
          completed_at: '2026-07-02T00:00:00Z',
          completed_note: null,
        },
        {
          id: 'g2',
          title: 'Annual eye exam',
          icon: 'eye',
          due_date: '2026-07-31',
          completed_at: null,
          completed_note: null,
        },
      ],
      error: null,
    };
    renderDashboard();

    expect(await screen.findByText(/Preventive health plan \(1\/2\)/)).toBeInTheDocument();
    expect(screen.getByText('Annual flu vaccination')).toBeInTheDocument();
    expect(screen.getByText(/Completed/)).toBeInTheDocument();
    expect(screen.getByText('Due 2026-07-31')).toBeInTheDocument();
  });

  it('adds a preventive plan goal through the drawer', async () => {
    singleResponses.preventive_plan_goals = {
      data: {
        id: 'g3',
        title: 'Bone density scan',
        icon: 'lab',
        due_date: null,
        completed_at: null,
        completed_note: null,
      },
      error: null,
    };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderDashboard();

    await user.click(await screen.findByRole('button', { name: 'Add preventive plan goal' }));
    await user.type(screen.getByLabelText(/^goal$/i), 'Bone density scan');
    await user.click(screen.getByRole('button', { name: /save goal/i }));

    await waitFor(() =>
      expect(insertCalls).toContainEqual({
        table: 'preventive_plan_goals',
        payload: expect.objectContaining({
          member_id: 'm1',
          title: 'Bone density scan',
          created_by: 'coord-1',
        }),
      }),
    );
    expect(await screen.findByText('Bone density scan')).toBeInTheDocument();
  });

  it('toggles a goal as done', async () => {
    tableResponses.preventive_plan_goals = {
      data: [
        {
          id: 'g1',
          title: 'Annual eye exam',
          icon: 'eye',
          due_date: '2026-07-31',
          completed_at: null,
          completed_note: null,
        },
      ],
      error: null,
    };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderDashboard();

    await user.click(await screen.findByRole('button', { name: /mark done/i }));

    await waitFor(() =>
      expect(updateCalls).toContainEqual(
        expect.objectContaining({ table: 'preventive_plan_goals', id: 'g1' }),
      ),
    );
    expect(await screen.findByRole('button', { name: /mark not done/i })).toBeInTheDocument();
  });

  it('removes a preventive plan goal', async () => {
    tableResponses.preventive_plan_goals = {
      data: [
        {
          id: 'g1',
          title: 'Annual eye exam',
          icon: 'eye',
          due_date: null,
          completed_at: null,
          completed_note: null,
        },
      ],
      error: null,
    };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderDashboard();

    await user.click(await screen.findByRole('button', { name: /remove/i }));

    await waitFor(() =>
      expect(deleteCalls).toContainEqual({ table: 'preventive_plan_goals', id: 'g1' }),
    );
    expect(screen.queryByText('Annual eye exam')).not.toBeInTheDocument();
  });
});
