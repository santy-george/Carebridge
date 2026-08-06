import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Leads } from './Leads';
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

describe('Leads', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ session: { user: { id: 'coord-1' } } } as never);
    selectResponse = { data: [], error: null };
    updateCalls.length = 0;
    updateError = null;
  });

  it('shows a loading state before the initial fetch resolves', () => {
    render(<Leads />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows empty states for both open and history when there are no leads', async () => {
    render(<Leads />);
    expect(await screen.findByText(/no open leads/i)).toBeInTheDocument();
    expect(screen.getByText(/no converted or declined leads yet/i)).toBeInTheDocument();
  });

  it('lists an open lead with member details and requested plan', async () => {
    selectResponse = {
      data: [
        {
          id: 'l1',
          member_id: 'm1',
          requested_care_model: 'virtual_care',
          requested_plan_level: 'standard',
          status: 'new',
          notes: null,
          created_at: '2026-08-07T10:00:00Z',
          followed_up_at: null,
          members: { full_name: 'Jane Doe', phone: '+91 98470 00001', location: 'Ernakulam' },
        },
      ],
      error: null,
    };
    render(<Leads />);

    expect(await screen.findByText(/Jane Doe → Virtual Care · Standard/)).toBeInTheDocument();
    expect(screen.getByText(/\+91 98470 00001/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark contacted/i })).toBeInTheDocument();
  });

  it('marks a new lead as contacted with the drafted note', async () => {
    selectResponse = {
      data: [
        {
          id: 'l1',
          member_id: 'm1',
          requested_care_model: 'virtual_care',
          requested_plan_level: null,
          status: 'new',
          notes: null,
          created_at: '2026-08-07T10:00:00Z',
          followed_up_at: null,
          members: { full_name: 'Jane Doe', phone: null, location: null },
        },
      ],
      error: null,
    };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<Leads />);

    await user.type(await screen.findByLabelText(/follow-up notes/i), 'Left a voicemail.');
    await user.click(screen.getByRole('button', { name: /mark contacted/i }));

    await waitFor(() =>
      expect(updateCalls).toContainEqual({
        payload: expect.objectContaining({
          status: 'contacted',
          followed_up_by: 'coord-1',
          notes: 'Left a voicemail.',
        }),
        id: 'l1',
      }),
    );
  });

  it('marks a contacted lead as converted, and does not show Mark contacted', async () => {
    selectResponse = {
      data: [
        {
          id: 'l1',
          member_id: 'm1',
          requested_care_model: 'direct_care',
          requested_plan_level: 'premium',
          status: 'contacted',
          notes: null,
          created_at: '2026-08-07T10:00:00Z',
          followed_up_at: null,
          members: { full_name: 'Jane Doe', phone: null, location: null },
        },
      ],
      error: null,
    };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<Leads />);

    expect(await screen.findByText(/Jane Doe/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark contacted/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /mark converted/i }));

    await waitFor(() =>
      expect(updateCalls).toContainEqual({
        payload: expect.objectContaining({ status: 'converted', followed_up_by: 'coord-1' }),
        id: 'l1',
      }),
    );
  });

  it('shows converted/declined leads in the History table', async () => {
    selectResponse = {
      data: [
        {
          id: 'l2',
          member_id: 'm2',
          requested_care_model: 'virtual_care',
          requested_plan_level: 'basic',
          status: 'declined',
          notes: 'Decided to stay on Self Care.',
          created_at: '2026-08-06T10:00:00Z',
          followed_up_at: '2026-08-06T12:00:00Z',
          members: { full_name: 'John Roe', phone: null, location: null },
        },
      ],
      error: null,
    };
    render(<Leads />);

    expect(await screen.findByText('John Roe')).toBeInTheDocument();
    expect(screen.getByText('Decided to stay on Self Care.')).toBeInTheDocument();
    expect(screen.getByText('Declined')).toBeInTheDocument();
  });

  it('shows a dismissible error banner when the fetch fails', async () => {
    selectResponse = { data: null, error: { message: 'network error' } };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<Leads />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
