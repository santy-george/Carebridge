import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForgotPassword } from './ForgotPassword';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

describe('ForgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends a reset email with a redirect to /reset-password and shows a confirmation', async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ error: null } as never);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('jane@example.com', {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    });
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
  });

  it('shows a generic error and does not show the confirmation on failure', async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
      error: { message: 'Rate limit exceeded' },
    } as never);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong sending the reset email. Please try again.',
    );
    expect(screen.queryByText(/check your email/i)).not.toBeInTheDocument();
  });
});
