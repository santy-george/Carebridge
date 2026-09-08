import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UsersRoles } from './UsersRoles';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <UsersRoles />
    </MemoryRouter>,
  );
}

describe('UsersRoles', () => {
  beforeEach(() => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { ok: true, users: [] },
      error: null,
    } as never);
  });

  it('shows a loading state before the initial fetch resolves', () => {
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('lists a user with role, and shows real totals in the metric row', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        ok: true,
        users: [
          {
            id: 'u1',
            full_name: 'Joel Abraham',
            email: 'joel@carebridge.in',
            role: 'admin',
            created_at: '2026-09-01T00:00:00Z',
            last_sign_in_at: '2026-09-08T10:00:00Z',
            invite_accepted: true,
          },
          {
            id: 'u2',
            full_name: 'Tom Sebastian',
            email: 'tom@carebridge.in',
            role: 'management',
            created_at: '2026-09-01T00:00:00Z',
            last_sign_in_at: null,
            invite_accepted: false,
          },
        ],
      },
      error: null,
    } as never);

    renderPage();

    expect(await screen.findByText('Joel Abraham')).toBeInTheDocument();
    expect(screen.getAllByText('Admin').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Management').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('2')).toBeInTheDocument(); // Total users
    expect(screen.getByText('1')).toBeInTheDocument(); // Pending invites
  });

  it('switches to the Roles & permissions tab', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/total users/i);

    await user.click(screen.getByRole('tab', { name: /roles & permissions/i }));
    expect(screen.getByText('Members & care models')).toBeInTheDocument();
    expect(screen.getByText('Human Resources')).toBeInTheDocument();
  });

  it('shows a dismissible error banner when the fetch fails', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: { message: 'network error' },
    } as never);
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('invites a user via the drawer', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/total users/i);

    await user.click(screen.getByRole('button', { name: /invite user/i }));
    await user.type(screen.getByLabelText(/full name/i), 'Anu George');
    await user.type(screen.getByLabelText(/^email/i), 'anu@carebridge.in');

    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: { ok: true, user_id: 'new-1' },
      error: null,
    } as never);

    await user.click(screen.getByRole('button', { name: /send invite/i }));

    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'invite-staff',
      expect.objectContaining({
        body: expect.objectContaining({ full_name: 'Anu George', email: 'anu@carebridge.in' }),
      }),
    );
  });
});
