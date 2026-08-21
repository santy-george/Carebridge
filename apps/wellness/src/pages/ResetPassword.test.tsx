import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResetPassword } from './ResetPassword';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: vi.fn(),
    },
  },
}));

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading state while the auth session is resolving', () => {
    vi.mocked(useAuth).mockReturnValue({ session: null, loading: true } as never);

    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>,
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument();
  });

  it('shows an expired-link message when there is no session', () => {
    vi.mocked(useAuth).mockReturnValue({ session: null, loading: false } as never);

    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>,
    );

    expect(screen.getByText(/link expired/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /request a new link/i })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });

  it('updates the password and navigates to / on success', async () => {
    vi.mocked(useAuth).mockReturnValue({
      session: { user: { id: 'u1' } },
      loading: false,
    } as never);
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({ error: null } as never);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/^new password$/i), 'newsecret1');
    await user.type(screen.getByLabelText(/confirm new password/i), 'newsecret1');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'newsecret1' });
    });
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('rejects mismatched passwords without calling updateUser', async () => {
    vi.mocked(useAuth).mockReturnValue({
      session: { user: { id: 'u1' } },
      loading: false,
    } as never);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/^new password$/i), 'newsecret1');
    await user.type(screen.getByLabelText(/confirm new password/i), 'different1');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Passwords do not match.');
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows a generic error and does not navigate when updateUser fails', async () => {
    vi.mocked(useAuth).mockReturnValue({
      session: { user: { id: 'u1' } },
      loading: false,
    } as never);
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({
      error: { message: 'Password too weak' },
    } as never);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/^new password$/i), 'newsecret1');
    await user.type(screen.getByLabelText(/confirm new password/i), 'newsecret1');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong updating your password. Please try again.',
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
