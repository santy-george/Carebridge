import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LinkMember } from './LinkMember';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';

vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('LinkMember', () => {
  const refreshMemberLinks = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    refreshMemberLinks.mockClear();
    vi.mocked(useAuth).mockReturnValue({ refreshMemberLinks } as never);
  });

  it('redeems a valid code, refreshes links, and navigates to /', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 'member-1', error: null } as never);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <LinkMember />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/invite code/i), 'VALIDCODE');
    await user.click(screen.getByRole('button', { name: /link account/i }));

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('redeem_invite_code', { p_code: 'VALIDCODE' });
    });
    expect(refreshMemberLinks).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('shows an error for an invalid or expired code and does not navigate', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'invalid_or_expired_code' },
    } as never);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <LinkMember />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/invite code/i), 'BADCODE');
    await user.click(screen.getByRole('button', { name: /link account/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid or has expired/i);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(refreshMemberLinks).not.toHaveBeenCalled();
  });
});
