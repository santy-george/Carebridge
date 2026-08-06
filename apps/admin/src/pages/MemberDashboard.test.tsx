import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemberDashboard } from './MemberDashboard';

const tableResponses: Record<string, { data: unknown; error: unknown }> = {};

function mockTable(table: string) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    order: () => builder,
    limit: () => builder,
    gte: () => builder,
    maybeSingle: () => builder,
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
    for (const key of Object.keys(tableResponses)) delete tableResponses[key];
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
});
