import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SosInbox } from './SosInbox';
import { useAuth } from '../auth/useAuth';

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));

let selectResponse: { data: unknown; error: unknown } = { data: [], error: null };
const updateCalls: { payload: unknown; id: string }[] = [];
let updateError: { message: string } | null = null;

function mockTable() {
  return {
    select: () => ({
      order: () => ({
        limit: () => Promise.resolve(selectResponse),
      }),
    }),
    update: (payload: unknown) => ({
      eq: (_col: string, id: string) => {
        updateCalls.push({ payload, id });
        return Promise.resolve({ error: updateError });
      },
    }),
  };
}

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockTable()),
  },
}));

describe('SosInbox', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ session: { user: { id: 'coord-1' } } } as never);
    selectResponse = { data: [], error: null };
    updateCalls.length = 0;
    updateError = null;
  });

  it('shows a loading state before the initial fetch resolves', () => {
    render(<SosInbox />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows an empty active state and empty history when there are no alerts', async () => {
    render(<SosInbox />);
    expect(await screen.findByText(/no open alerts/i)).toBeInTheDocument();
    expect(screen.getByText(/no resolved alerts yet/i)).toBeInTheDocument();
  });

  it('lists an open alert in Active with member details, oldest first', async () => {
    selectResponse = {
      data: [
        {
          id: 'a1',
          member_id: 'm1',
          alert_type: 'manual',
          status: 'open',
          triggered_at: '2026-08-07T10:00:00Z',
          location_lat: 9.9816,
          location_lng: 76.2999,
          notes: null,
          members: { full_name: 'Jane Doe', phone: '+91 98470 00001', location: 'Ernakulam' },
        },
      ],
      error: null,
    };
    render(<SosInbox />);

    expect(await screen.findByText(/Jane Doe — Manual SOS/)).toBeInTheDocument();
    expect(screen.getByText(/\+91 98470 00001/)).toBeInTheDocument();
    expect(screen.getByText(/GPS 9.9816, 76.2999/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /acknowledge/i })).toBeInTheDocument();
  });

  it('acknowledges an open alert with the current coordinator id', async () => {
    selectResponse = {
      data: [
        {
          id: 'a1',
          member_id: 'm1',
          alert_type: 'manual',
          status: 'open',
          triggered_at: '2026-08-07T10:00:00Z',
          location_lat: null,
          location_lng: null,
          notes: null,
          members: { full_name: 'Jane Doe', phone: null, location: null },
        },
      ],
      error: null,
    };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<SosInbox />);

    await user.click(await screen.findByRole('button', { name: /acknowledge/i }));

    await waitFor(() =>
      expect(updateCalls).toContainEqual({
        payload: expect.objectContaining({ status: 'acknowledged', acknowledged_by: 'coord-1' }),
        id: 'a1',
      }),
    );
  });

  it('resolves an alert with the drafted note', async () => {
    selectResponse = {
      data: [
        {
          id: 'a1',
          member_id: 'm1',
          alert_type: 'wearable_fall',
          status: 'acknowledged',
          triggered_at: '2026-08-07T10:00:00Z',
          location_lat: null,
          location_lng: null,
          notes: null,
          members: { full_name: 'Jane Doe', phone: null, location: null },
        },
      ],
      error: null,
    };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<SosInbox />);

    await user.type(await screen.findByLabelText(/incident notes/i), 'Family confirmed OK.');
    await user.click(screen.getByRole('button', { name: /^resolve$/i }));

    await waitFor(() =>
      expect(updateCalls).toContainEqual({
        payload: expect.objectContaining({ status: 'resolved', notes: 'Family confirmed OK.' }),
        id: 'a1',
      }),
    );
  });

  it('shows resolved alerts in the History table', async () => {
    selectResponse = {
      data: [
        {
          id: 'a2',
          member_id: 'm2',
          alert_type: 'manual',
          status: 'resolved',
          triggered_at: '2026-08-07T09:00:00Z',
          location_lat: null,
          location_lng: null,
          notes: 'All clear.',
          members: { full_name: 'John Roe', phone: null, location: null },
        },
      ],
      error: null,
    };
    render(<SosInbox />);

    expect(await screen.findByText('John Roe')).toBeInTheDocument();
    expect(screen.getByText('All clear.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /acknowledge/i })).not.toBeInTheDocument();
  });
});
