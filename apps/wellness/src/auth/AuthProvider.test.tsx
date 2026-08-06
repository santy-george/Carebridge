import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(),
  },
}));

function mockNoSubscription() {
  vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  } as never);
}

function mockMemberLinksQuery(rows: Array<{ member_id: string; relationship_label: string; is_self: boolean }>) {
  vi.mocked(supabase.from).mockReturnValue({
    select: () => ({
      eq: () => Promise.resolve({ data: rows, error: null }),
    }),
  } as never);
}

function Probe() {
  const { loading, session, memberLinks, selectedMemberId } = useAuth();
  if (loading) return <p>loading</p>;
  return (
    <div>
      <p data-testid="session">{session ? 'has-session' : 'no-session'}</p>
      <p data-testid="link-count">{memberLinks.length}</p>
      <p data-testid="selected">{selectedMemberId ?? 'none'}</p>
    </div>
  );
}

describe('AuthProvider', () => {
  it('exposes no session and zero links when there is no session', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as never);
    mockNoSubscription();

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(await screen.findByTestId('session')).toHaveTextContent('no-session');
    expect(screen.getByTestId('link-count')).toHaveTextContent('0');
  });

  it('selects the is_self link when one exists among multiple', async () => {
    const fakeSession = { user: { id: 'user-1' } };
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: fakeSession } } as never);
    mockNoSubscription();
    mockMemberLinksQuery([
      { member_id: 'member-family', relationship_label: 'Son', is_self: false },
      { member_id: 'member-self', relationship_label: 'Self', is_self: true },
    ]);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(await screen.findByTestId('session')).toHaveTextContent('has-session');
    expect(screen.getByTestId('link-count')).toHaveTextContent('2');
    expect(screen.getByTestId('selected')).toHaveTextContent('member-self');
  });

  it('falls back to the first link when none is is_self', async () => {
    const fakeSession = { user: { id: 'user-1' } };
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: fakeSession } } as never);
    mockNoSubscription();
    mockMemberLinksQuery([{ member_id: 'member-only', relationship_label: 'Son', is_self: false }]);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(await screen.findByTestId('link-count')).toHaveTextContent('1');
    expect(screen.getByTestId('selected')).toHaveTextContent('member-only');
  });
});
