import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WithdrawConsent } from './WithdrawConsent';
import { useAuth } from '../auth/useAuth';
import { supabase } from '../lib/supabase';

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    auth: { signOut: vi.fn() },
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('WithdrawConsent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      selectedMemberId: 'member-1',
      memberLinks: [{ memberId: 'member-1', relationshipLabel: 'Self', isSelf: true }],
    } as never);
  });

  it('keeps the submit button disabled until WITHDRAW is typed', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <WithdrawConsent />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /withdraw consent/i })).toBeDisabled();
    await user.type(screen.getByLabelText(/type withdraw to confirm/i), 'WITHDRAW');
    expect(screen.getByRole('button', { name: /withdraw consent/i })).not.toBeDisabled();
  });

  it('calls the RPC with the chosen scope, signs out, and navigates on success', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ error: null } as never);
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as never);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <WithdrawConsent />
      </MemoryRouter>,
    );

    await user.click(screen.getByLabelText(/withdraw for everyone linked to this record/i));
    await user.type(screen.getByLabelText(/type withdraw to confirm/i), 'WITHDRAW');
    await user.click(screen.getByRole('button', { name: /withdraw consent/i }));

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('request_consent_withdrawal', {
        p_member_id: 'member-1',
        p_scope: 'all',
      });
    });
    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/consent-withdrawn', { replace: true });
  });

  it('shows an error and does not sign out if the RPC fails', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ error: { message: 'boom' } } as never);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <WithdrawConsent />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/type withdraw to confirm/i), 'WITHDRAW');
    await user.click(screen.getByRole('button', { name: /withdraw consent/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });

  it('warns about family members losing monitoring when the selected member is_self', () => {
    render(
      <MemoryRouter>
        <WithdrawConsent />
      </MemoryRouter>,
    );
    expect(screen.getByText(/pauses monitoring for anyone linked to your account/i)).toBeInTheDocument();
  });

  it('does not show the family-monitoring warning for a non-self linked account', () => {
    vi.mocked(useAuth).mockReturnValue({
      selectedMemberId: 'member-1',
      memberLinks: [{ memberId: 'member-1', relationshipLabel: 'Daughter', isSelf: false }],
    } as never);
    render(
      <MemoryRouter>
        <WithdrawConsent />
      </MemoryRouter>,
    );
    expect(
      screen.queryByText(/pauses monitoring for anyone linked to your account/i),
    ).not.toBeInTheDocument();
  });
});
