import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Signup } from './Signup';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
    },
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('Signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('signs up and navigates to /link-member on success', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: { id: 'user-1', identities: [{ id: 'identity-1' }] } },
      error: null,
    } as never);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), 'new-user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new-user@example.com',
        password: 'secret123',
      });
    });
    expect(mockNavigate).toHaveBeenCalledWith('/link-member');
  });

  it('shows a duplicate-email message for the real 422 user_already_exists response (this project has "Confirm email" OFF)', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: null, session: null },
      error: {
        name: 'AuthApiError',
        status: 422,
        code: 'user_already_exists',
        message: 'User already registered',
      },
    } as never);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/account already exists/i);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows a duplicate-email message when identities is empty (fallback path for a project with "Confirm email" ON)', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: { id: 'user-1', identities: [] } },
      error: null,
    } as never);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/account already exists/i);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows a generic error when signUp itself errors', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: null },
      error: { message: 'network error' },
    } as never);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), 'new-user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
