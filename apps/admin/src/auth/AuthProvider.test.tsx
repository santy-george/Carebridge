import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
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

type AuthChangeCallback = (event: string, session: unknown) => void;

function mockAuthStateChange() {
  let callback: AuthChangeCallback = () => {};
  vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((cb) => {
    callback = cb as AuthChangeCallback;
    return { data: { subscription: { unsubscribe: vi.fn() } } } as never;
  });
  return {
    trigger: (event: string, session: unknown) => callback(event, session),
  };
}

function mockProfileRoleQuery(role: string | null) {
  vi.mocked(supabase.from).mockReturnValue({
    select: () => ({
      eq: () => ({
        maybeSingle: () => Promise.resolve({ data: role ? { role } : null, error: null }),
      }),
    }),
  } as never);
}

function Probe() {
  const { loading, roleLoaded, session, isCoordinator } = useAuth();
  if (loading) return <p>loading</p>;
  return (
    <div>
      <p data-testid="session">{session ? 'has-session' : 'no-session'}</p>
      <p data-testid="role-loaded">{roleLoaded ? 'true' : 'false'}</p>
      <p data-testid="is-coordinator">{isCoordinator ? 'true' : 'false'}</p>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes no session and isCoordinator=false when there is no session', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as never);
    mockAuthStateChange();

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(await screen.findByTestId('session')).toHaveTextContent('no-session');
    expect(screen.getByTestId('is-coordinator')).toHaveTextContent('false');
  });

  it('sets isCoordinator=true when profiles.role is coordinator', async () => {
    const fakeSession = { user: { id: 'user-1' } };
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: fakeSession },
    } as never);
    mockAuthStateChange();
    mockProfileRoleQuery('coordinator');

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(await screen.findByTestId('session')).toHaveTextContent('has-session');
    expect(screen.getByTestId('is-coordinator')).toHaveTextContent('true');
  });

  it('sets isCoordinator=false when profiles.role is member', async () => {
    const fakeSession = { user: { id: 'user-1' } };
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: fakeSession },
    } as never);
    mockAuthStateChange();
    mockProfileRoleQuery('member');

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(await screen.findByTestId('session')).toHaveTextContent('has-session');
    expect(screen.getByTestId('is-coordinator')).toHaveTextContent('false');
  });

  it('does not fetch the profile role twice for the INITIAL_SESSION event on mount', async () => {
    const fakeSession = { user: { id: 'user-1' } };
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: fakeSession },
    } as never);
    const { trigger } = mockAuthStateChange();
    mockProfileRoleQuery('coordinator');

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(await screen.findByTestId('session')).toHaveTextContent('has-session');
    expect(supabase.from).toHaveBeenCalledTimes(1);

    trigger('INITIAL_SESSION', fakeSession);
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledTimes(1);
    });
  });

  it('tracks roleLoaded independently for a session arriving after mount', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as never);
    const { trigger } = mockAuthStateChange();

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(await screen.findByTestId('session')).toHaveTextContent('no-session');
    expect(screen.getByTestId('role-loaded')).toHaveTextContent('true');

    let resolveRole: (value: { data: unknown; error: null }) => void = () => {};
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            new Promise((resolve) => {
              resolveRole = resolve;
            }),
        }),
      }),
    } as never);

    trigger('SIGNED_IN', { user: { id: 'user-2' } });

    await waitFor(() => {
      expect(screen.getByTestId('session')).toHaveTextContent('has-session');
    });
    expect(screen.getByTestId('role-loaded')).toHaveTextContent('false');

    resolveRole({ data: { role: 'coordinator' }, error: null });

    await waitFor(() => {
      expect(screen.getByTestId('role-loaded')).toHaveTextContent('true');
    });
    expect(screen.getByTestId('is-coordinator')).toHaveTextContent('true');
  });
});
