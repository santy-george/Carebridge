import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsentRequests } from './ConsentRequests';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

interface HistoryConsentRow {
  id: string;
  user_id: string;
  member_id: string | null;
  event: string;
  scope: string | null;
  created_at: string;
  members: { full_name: string } | null;
}

function mockQueries({
  pendingProfiles = [] as Array<{ id: string; full_name: string | null; email: string | null }>,
  requestedConsents = [] as Array<{
    user_id: string;
    member_id: string;
    scope: string;
    created_at: string;
    members: { full_name: string } | null;
  }>,
  verifiedConsents = [] as HistoryConsentRow[],
  reactivatedConsents = [] as HistoryConsentRow[],
} = {}) {
  vi.mocked(supabase.from).mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: pendingProfiles, error: null }),
        }),
      } as never;
    }
    if (table === 'consents') {
      return {
        select: () => ({
          eq: (col: string, value: string) => {
            if (col === 'event' && value === 'withdrawal_requested') {
              return {
                in: () => ({
                  order: () => Promise.resolve({ data: requestedConsents, error: null }),
                }),
              };
            }
            if (col === 'event' && value === 'withdrawal_verified') {
              return {
                order: () => ({
                  limit: () => Promise.resolve({ data: verifiedConsents, error: null }),
                }),
              };
            }
            if (col === 'event' && value === 'given') {
              return {
                not: () => ({
                  order: () => ({
                    limit: () => Promise.resolve({ data: reactivatedConsents, error: null }),
                  }),
                }),
              };
            }
            throw new Error(`unexpected eq in test: ${col}=${value}`);
          },
        }),
      } as never;
    }
    throw new Error(`unexpected table in test: ${table}`);
  });
}

describe('ConsentRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an empty state when there are no pending requests', async () => {
    mockQueries();
    render(<ConsentRequests />);
    expect(await screen.findByText(/no pending consent requests/i)).toBeInTheDocument();
  });

  it('lists a pending request with the requester, member, and scope', async () => {
    mockQueries({
      pendingProfiles: [{ id: 'user-1', full_name: 'Jane Doe', email: 'jane@example.com' }],
      requestedConsents: [
        {
          user_id: 'user-1',
          member_id: 'member-1',
          scope: 'all',
          created_at: '2026-08-10T10:00:00Z',
          members: { full_name: 'John Doe' },
        },
      ],
    });
    render(<ConsentRequests />);

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Everyone linked to this record')).toBeInTheDocument();
  });

  it('reactivates via the RPC when "False alarm" is confirmed', async () => {
    mockQueries({
      pendingProfiles: [{ id: 'user-1', full_name: 'Jane Doe', email: 'jane@example.com' }],
      requestedConsents: [
        {
          user_id: 'user-1',
          member_id: 'member-1',
          scope: 'self',
          created_at: '2026-08-10T10:00:00Z',
          members: { full_name: 'John Doe' },
        },
      ],
    });
    vi.mocked(supabase.rpc).mockResolvedValue({ error: null } as never);
    const user = userEvent.setup();

    render(<ConsentRequests />);
    await screen.findByText('Jane Doe');

    await user.click(screen.getByRole('button', { name: /false alarm/i }));

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('reactivate_consent', {
        p_user_id: 'user-1',
        p_member_id: 'member-1',
      });
    });
  });

  it('invokes the erasure Edge Function after typed confirmation on "Verified — erase permanently"', async () => {
    mockQueries({
      pendingProfiles: [{ id: 'user-1', full_name: 'Jane Doe', email: 'jane@example.com' }],
      requestedConsents: [
        {
          user_id: 'user-1',
          member_id: 'member-1',
          scope: 'all',
          created_at: '2026-08-10T10:00:00Z',
          members: { full_name: 'John Doe' },
        },
      ],
    });
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ error: null } as never);
    const user = userEvent.setup();

    render(<ConsentRequests />);
    await screen.findByText('Jane Doe');

    await user.click(screen.getByRole('button', { name: /verified.*erase permanently/i }));
    await user.type(screen.getByLabelText(/type withdraw to confirm/i), 'WITHDRAW');
    await user.click(screen.getByRole('button', { name: /confirm erasure/i }));

    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith('erase-consent-withdrawal', {
        body: { member_id: 'member-1', requester_user_id: 'user-1', scope: 'all' },
      });
    });
  });

  it('merges verified-erasure and reactivated-given history from separate queries, most recent first', async () => {
    mockQueries({
      verifiedConsents: [
        {
          id: 'consent-erased',
          user_id: 'user-2',
          member_id: 'member-2',
          event: 'withdrawal_verified',
          scope: 'all',
          created_at: '2026-08-09T09:00:00Z',
          members: { full_name: 'Erased Member' },
        },
      ],
      reactivatedConsents: [
        {
          id: 'consent-reactivated',
          user_id: 'user-3',
          member_id: 'member-3',
          event: 'given',
          scope: 'all',
          created_at: '2026-08-10T09:00:00Z',
          members: { full_name: 'Reactivated Member' },
        },
      ],
    });

    render(<ConsentRequests />);

    const reactivatedCell = await screen.findByText('Reactivated Member');
    const erasedCell = await screen.findByText('Erased Member');

    expect(screen.getByText('Reactivated')).toBeInTheDocument();
    expect(screen.getByText('Erased')).toBeInTheDocument();

    // Most recent first: the 'given' row (2026-08-10) comes before the 'withdrawal_verified' row (2026-08-09).
    const reactivatedRow = reactivatedCell.closest('tr');
    const erasedRow = erasedCell.closest('tr');
    const rows = Array.from(document.querySelectorAll('tbody tr'));
    expect(rows.indexOf(reactivatedRow as HTMLTableRowElement)).toBeLessThan(
      rows.indexOf(erasedRow as HTMLTableRowElement),
    );
  });
});
