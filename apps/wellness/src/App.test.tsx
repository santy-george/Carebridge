import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { useAuth } from './auth/useAuth';

vi.mock('./auth/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('./lib/supabase', () => ({
  supabase: { auth: { signOut: vi.fn() } },
}));

describe('App', () => {
  it('renders the Wellness shell heading without a switcher for a single link', () => {
    vi.mocked(useAuth).mockReturnValue({
      memberLinks: [{ memberId: 'm1', relationshipLabel: 'Self', isSelf: true }],
      selectedMemberId: 'm1',
      selectMember: vi.fn(),
    } as never);

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /care bridge wellness/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/viewing/i)).not.toBeInTheDocument();
  });

  it('shows the member switcher when there are multiple links', () => {
    vi.mocked(useAuth).mockReturnValue({
      memberLinks: [
        { memberId: 'm1', relationshipLabel: 'Self', isSelf: true },
        { memberId: 'm2', relationshipLabel: 'Mother', isSelf: false },
      ],
      selectedMemberId: 'm1',
      selectMember: vi.fn(),
    } as never);

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/viewing/i)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Mother' })).toBeInTheDocument();
  });
});
