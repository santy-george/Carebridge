import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Visits } from './Visits';
import { useAuth } from '../auth/useAuth';

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));

const rpc = vi.fn();
vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    from: () => {
      const b = {
        select: () => b,
        order: () => b,
        then: (r: (v: unknown) => void) => r({ data: [], error: null }),
      };
      return b;
    },
  },
}));

const visit = (over: Record<string, unknown> = {}) => ({
  id: 'v1',
  member_id: 'm1',
  member_name: 'Asha Menon',
  staff_id: 's1',
  staff_name: 'Sree Rekha',
  service_type: 'Nursing visit',
  scheduled_start: new Date(2026, 10, 15, 9, 0).toISOString(),
  scheduled_end: new Date(2026, 10, 15, 10, 0).toISOString(),
  status: 'scheduled',
  checkin_at: null,
  checkout_at: null,
  report_submitted: false,
  ...over,
});

function renderPage() {
  return render(
    <MemoryRouter>
      <Visits />
    </MemoryRouter>,
  );
}

describe('Visits', () => {
  beforeEach(() => {
    rpc.mockReset();
    vi.mocked(useAuth).mockReturnValue({ session: { user: { id: 'c1' } } } as never);
  });

  it('shows an empty state with no visits', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    renderPage();
    expect(await screen.findByText(/no visits in this window/i)).toBeInTheDocument();
  });

  it('lists visits with member, staff and status', async () => {
    rpc.mockResolvedValue({ data: [visit()], error: null });
    renderPage();
    expect(await screen.findByText('Asha Menon')).toBeInTheDocument();
    expect(screen.getByText('Sree Rekha')).toBeInTheDocument();
    expect(screen.getAllByText('Scheduled').length).toBeGreaterThan(0);
  });

  it('filters by status', async () => {
    rpc.mockResolvedValue({
      data: [visit(), visit({ id: 'v2', member_name: 'Bina Joseph', status: 'completed' })],
      error: null,
    });
    renderPage();
    await screen.findByText('Asha Menon');
    await userEvent.click(screen.getByRole('button', { name: 'Completed' }));
    expect(screen.queryByText('Asha Menon')).not.toBeInTheDocument();
    expect(screen.getByText('Bina Joseph')).toBeInTheDocument();
  });

  it('offers cancel only on scheduled visits', async () => {
    rpc.mockResolvedValue({
      data: [visit(), visit({ id: 'v2', member_name: 'Bina Joseph', status: 'completed' })],
      error: null,
    });
    renderPage();
    await screen.findByText('Asha Menon');
    expect(
      within(screen.getByRole('table')).getAllByRole('button', { name: 'Cancel' }),
    ).toHaveLength(1);
  });

  it('cancels a visit through the close function and reloads', async () => {
    rpc.mockImplementation((name: string) =>
      Promise.resolve(
        name === 'get_visits_admin' ? { data: [visit()], error: null } : { error: null },
      ),
    );
    renderPage();
    await screen.findByText('Asha Menon');
    await userEvent.click(
      within(screen.getByRole('table')).getByRole('button', { name: 'Cancel' }),
    );
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith('close_unattended_visit', {
        p_visit_id: 'v1',
        p_status: 'cancelled',
      }),
    );
  });

  it('shows an error when loading fails', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    renderPage();
    expect(await screen.findByText(/something went wrong loading visits/i)).toBeInTheDocument();
  });
});
