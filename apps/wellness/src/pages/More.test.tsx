import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { More } from './More';
import { useAuth } from '../auth/useAuth';

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../lib/supabase', () => ({
  supabase: { auth: { signOut: vi.fn() } },
}));

describe('More', () => {
  it('renders the More heading without a switcher for a single link', () => {
    vi.mocked(useAuth).mockReturnValue({
      memberLinks: [{ memberId: 'm1', relationshipLabel: 'Self', isSelf: true }],
      selectedMemberId: 'm1',
      selectMember: vi.fn(),
    } as never);

    render(
      <MemoryRouter>
        <More />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /more/i })).toBeInTheDocument();
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
        <More />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/viewing/i)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Mother' })).toBeInTheDocument();
  });

  it('links to profile, reports, and education', () => {
    vi.mocked(useAuth).mockReturnValue({
      memberLinks: [{ memberId: 'm1', relationshipLabel: 'Self', isSelf: true }],
      selectedMemberId: 'm1',
      selectMember: vi.fn(),
    } as never);

    render(
      <MemoryRouter>
        <More />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /profile & settings/i })).toHaveAttribute(
      'href',
      '/profile',
    );
    expect(screen.getByRole('link', { name: /wellness reports/i })).toHaveAttribute(
      'href',
      '/reports',
    );
    expect(screen.getByRole('link', { name: /health education/i })).toHaveAttribute(
      'href',
      '/education',
    );
  });
});
