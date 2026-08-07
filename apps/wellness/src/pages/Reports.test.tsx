import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Reports } from './Reports';
import { useAuth } from '../auth/useAuth';

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));

const tableResponses: Record<string, { data: unknown; error: unknown }> = {};

function mockTable(table: string) {
  const builder = {
    select: () => builder,
    eq: () => builder,
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

function renderReports() {
  return render(
    <MemoryRouter initialEntries={['/reports']}>
      <Routes>
        <Route path="/reports" element={<Reports />} />
        <Route path="/more" element={<div>More content</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Reports', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ selectedMemberId: 'm1' } as never);
    for (const key of Object.keys(tableResponses)) delete tableResponses[key];
    tableResponses.checkins = { data: [], error: null };
    tableResponses.medication_logs = { data: [], error: null };
    tableResponses.vitals_readings = { data: [], error: null };
    tableResponses.glucose_readings = { data: [], error: null };
  });

  it('shows a loading state before the initial fetch resolves', () => {
    renderReports();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows an empty state when nothing has been logged', async () => {
    renderReports();
    expect(await screen.findByText(/no activity logged yet/i)).toBeInTheDocument();
  });

  it('shows the current month card with score, check-ins, adherence, vitals', async () => {
    tableResponses.checkins = {
      data: [{ checkin_date: '2026-08-01', wellness_score: 88 }],
      error: null,
    };
    tableResponses.medication_logs = {
      data: [
        { scheduled_date: '2026-08-01', taken: true },
        { scheduled_date: '2026-08-02', taken: false },
      ],
      error: null,
    };
    tableResponses.vitals_readings = {
      data: [{ recorded_at: '2026-08-01T00:00:00Z' }],
      error: null,
    };
    renderReports();

    expect(await screen.findByText('88')).toBeInTheDocument();
    expect(screen.getByText(/1\/31/)).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Good month')).toBeInTheDocument();
  });

  it('lists previous months below the current one', async () => {
    tableResponses.checkins = {
      data: [
        { checkin_date: '2026-08-01', wellness_score: 88 },
        { checkin_date: '2026-07-01', wellness_score: 79 },
      ],
      error: null,
    };
    renderReports();

    expect(await screen.findByText(/July 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Score 79/)).toBeInTheDocument();
  });

  it('shows a dismissible error banner when a fetch fails', async () => {
    tableResponses.checkins = { data: null, error: { message: 'network error' } };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderReports();

    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('back link goes to /more', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderReports();

    await user.click(await screen.findByRole('link', { name: /back to more/i }));
    expect(await screen.findByText('More content')).toBeInTheDocument();
  });
});
