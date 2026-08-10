import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as Sentry from '@sentry/react';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';
import { capacitorPreferencesStorage } from '../lib/storage-adapter';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
}));

vi.mock('../lib/storage-adapter', () => ({
  capacitorPreferencesStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
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

function mockSupabaseQueries(
  memberLinkRows: Array<{ member_id: string; relationship_label: string; is_self: boolean }>,
  consentStatus: string | null,
) {
  vi.mocked(supabase.from).mockImplementation((table: string) => {
    if (table === 'member_links') {
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: memberLinkRows, error: null }),
          }),
        }),
      } as never;
    }
    if (table === 'profiles') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: consentStatus ? { consent_status: consentStatus } : null,
                error: null,
              }),
          }),
        }),
      } as never;
    }
    throw new Error(`unexpected table in test: ${table}`);
  });
}

function Probe() {
  const { loading, linksLoaded, session, memberLinks, selectedMemberId, consentStatus } = useAuth();
  if (loading) return <p>loading</p>;
  return (
    <div>
      <p data-testid="session">{session ? 'has-session' : 'no-session'}</p>
      <p data-testid="links-loaded">{linksLoaded ? 'true' : 'false'}</p>
      <p data-testid="link-count">{memberLinks.length}</p>
      <p data-testid="selected">{selectedMemberId ?? 'none'}</p>
      <p data-testid="consent-status">{consentStatus ?? 'none'}</p>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes no session and zero links when there is no session', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as never);
    mockAuthStateChange();

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
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: fakeSession },
    } as never);
    mockAuthStateChange();
    vi.mocked(capacitorPreferencesStorage.getItem).mockResolvedValue(null);
    mockSupabaseQueries(
      [
        { member_id: 'member-family', relationship_label: 'Son', is_self: false },
        { member_id: 'member-self', relationship_label: 'Self', is_self: true },
      ],
      'active',
    );

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
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: fakeSession },
    } as never);
    mockAuthStateChange();
    vi.mocked(capacitorPreferencesStorage.getItem).mockResolvedValue(null);
    mockSupabaseQueries(
      [{ member_id: 'member-only', relationship_label: 'Son', is_self: false }],
      'active',
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(await screen.findByTestId('link-count')).toHaveTextContent('1');
    expect(screen.getByTestId('selected')).toHaveTextContent('member-only');
  });

  it('orders the member_links query by created_at for a deterministic first-link fallback (finding 9)', async () => {
    const fakeSession = { user: { id: 'user-1' } };
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: fakeSession },
    } as never);
    mockAuthStateChange();
    vi.mocked(capacitorPreferencesStorage.getItem).mockResolvedValue(null);

    const orderSpy = vi.fn().mockResolvedValue({ data: [], error: null });
    const eqSpy = vi.fn(() => ({ order: orderSpy }));
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'member_links') {
        return { select: () => ({ eq: eqSpy }) } as never;
      }
      return {
        select: () => ({
          eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
        }),
      } as never;
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await screen.findByTestId('session');
    expect(orderSpy).toHaveBeenCalledWith('created_at');
  });

  it('does not fetch member_links twice for the INITIAL_SESSION event on mount (finding 8)', async () => {
    const fakeSession = { user: { id: 'user-1' } };
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: fakeSession },
    } as never);
    const { trigger } = mockAuthStateChange();
    vi.mocked(capacitorPreferencesStorage.getItem).mockResolvedValue(null);
    mockSupabaseQueries(
      [{ member_id: 'member-only', relationship_label: 'Self', is_self: true }],
      'active',
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(await screen.findByTestId('session')).toHaveTextContent('has-session');
    // One call per table (member_links, profiles) for the single applySession run.
    expect(supabase.from).toHaveBeenCalledTimes(2);

    // supabase-js fires INITIAL_SESSION on subscribe with the same session
    // getSession() already resolved -- this must not trigger a second fetch.
    trigger('INITIAL_SESSION', fakeSession);
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledTimes(2);
    });
  });

  it('tracks linksLoaded independently for a session arriving after mount, so a returning user is not stranded (finding 1)', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as never);
    const { trigger } = mockAuthStateChange();
    vi.mocked(capacitorPreferencesStorage.getItem).mockResolvedValue(null);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(await screen.findByTestId('session')).toHaveTextContent('no-session');
    expect(screen.getByTestId('links-loaded')).toHaveTextContent('true');

    let resolveLinks: (value: { data: unknown; error: null }) => void = () => {};
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'member_links') {
        return {
          select: () => ({
            eq: () => ({
              order: () =>
                new Promise((resolve) => {
                  resolveLinks = resolve;
                }),
            }),
          }),
        } as never;
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: { consent_status: 'active' }, error: null }),
          }),
        }),
      } as never;
    });

    // Simulate Login.tsx's signInWithPassword() succeeding: a new session
    // arrives via onAuthStateChange well after the initial mount.
    trigger('SIGNED_IN', { user: { id: 'user-2' } });

    await waitFor(() => {
      expect(screen.getByTestId('session')).toHaveTextContent('has-session');
    });
    // The session is set immediately, but links for THIS session are still
    // in flight -- guards must see linksLoaded=false here, not redirect to
    // /link-member as if the user had zero links.
    expect(screen.getByTestId('links-loaded')).toHaveTextContent('false');
    expect(screen.getByTestId('link-count')).toHaveTextContent('0');

    resolveLinks({
      data: [{ member_id: 'member-x', relationship_label: 'Self', is_self: true }],
      error: null,
    });

    await waitFor(() => {
      expect(screen.getByTestId('links-loaded')).toHaveTextContent('true');
    });
    expect(screen.getByTestId('link-count')).toHaveTextContent('1');
  });

  it('persists the selection to capacitor preferences storage on selectMember (finding 7)', async () => {
    const fakeSession = { user: { id: 'user-1' } };
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: fakeSession },
    } as never);
    mockAuthStateChange();
    vi.mocked(capacitorPreferencesStorage.getItem).mockResolvedValue(null);
    mockSupabaseQueries(
      [
        { member_id: 'member-a', relationship_label: 'Self', is_self: true },
        { member_id: 'member-b', relationship_label: 'Mother', is_self: false },
      ],
      'active',
    );

    function SelectProbe() {
      const { selectedMemberId, selectMember } = useAuth();
      return (
        <div>
          <p data-testid="selected">{selectedMemberId ?? 'none'}</p>
          <button onClick={() => selectMember('member-b')}>select-b</button>
        </div>
      );
    }

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <SelectProbe />
      </AuthProvider>,
    );

    expect(await screen.findByTestId('selected')).toHaveTextContent('member-a');

    await user.click(screen.getByRole('button', { name: 'select-b' }));

    expect(screen.getByTestId('selected')).toHaveTextContent('member-b');
    expect(capacitorPreferencesStorage.setItem).toHaveBeenCalledWith(
      'wellness.selectedMemberId',
      'member-b',
    );
  });

  it('uses a previously-stored selectedMemberId on mount when still present among the links (survives a remount)', async () => {
    const fakeSession = { user: { id: 'user-1' } };
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: fakeSession },
    } as never);
    mockAuthStateChange();
    vi.mocked(capacitorPreferencesStorage.getItem).mockResolvedValue('member-b');
    mockSupabaseQueries(
      [
        { member_id: 'member-a', relationship_label: 'Self', is_self: true },
        { member_id: 'member-b', relationship_label: 'Mother', is_self: false },
      ],
      'active',
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(await screen.findByTestId('selected')).toHaveTextContent('member-b');
  });

  it('refreshMemberLinks preserves the current selection when it is still present, instead of resetting it', async () => {
    const fakeSession = { user: { id: 'user-1' } };
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: fakeSession },
    } as never);
    mockAuthStateChange();
    vi.mocked(capacitorPreferencesStorage.getItem).mockResolvedValue(null);
    mockSupabaseQueries(
      [
        { member_id: 'member-a', relationship_label: 'Self', is_self: true },
        { member_id: 'member-b', relationship_label: 'Mother', is_self: false },
      ],
      'active',
    );

    function RefreshProbe() {
      const { selectedMemberId, selectMember, refreshMemberLinks } = useAuth();
      return (
        <div>
          <p data-testid="selected">{selectedMemberId ?? 'none'}</p>
          <button onClick={() => selectMember('member-b')}>select-b</button>
          <button onClick={() => void refreshMemberLinks()}>refresh</button>
        </div>
      );
    }

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <RefreshProbe />
      </AuthProvider>,
    );

    expect(await screen.findByTestId('selected')).toHaveTextContent('member-a');
    await user.click(screen.getByRole('button', { name: 'select-b' }));
    expect(screen.getByTestId('selected')).toHaveTextContent('member-b');

    // Same set of links comes back on refresh (e.g. re-fetch after linking
    // a third member elsewhere) -- member-b is still present, so it must
    // stay selected rather than being clobbered back to the is_self link.
    await user.click(screen.getByRole('button', { name: 'refresh' }));

    await waitFor(() => {
      expect(screen.getByTestId('selected')).toHaveTextContent('member-b');
    });
  });

  it('refreshMemberLinks falls back to the default when the current selection is no longer present', async () => {
    const fakeSession = { user: { id: 'user-1' } };
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: fakeSession },
    } as never);
    mockAuthStateChange();
    vi.mocked(capacitorPreferencesStorage.getItem).mockResolvedValue(null);
    mockSupabaseQueries(
      [
        { member_id: 'member-a', relationship_label: 'Self', is_self: true },
        { member_id: 'member-b', relationship_label: 'Mother', is_self: false },
      ],
      'active',
    );

    function RefreshProbe() {
      const { selectedMemberId, selectMember, refreshMemberLinks } = useAuth();
      return (
        <div>
          <p data-testid="selected">{selectedMemberId ?? 'none'}</p>
          <button onClick={() => selectMember('member-b')}>select-b</button>
          <button onClick={() => void refreshMemberLinks()}>refresh</button>
        </div>
      );
    }

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <RefreshProbe />
      </AuthProvider>,
    );

    expect(await screen.findByTestId('selected')).toHaveTextContent('member-a');
    await user.click(screen.getByRole('button', { name: 'select-b' }));
    expect(screen.getByTestId('selected')).toHaveTextContent('member-b');

    // member-b was unlinked elsewhere -- the refreshed set no longer
    // includes it, so selection must fall back to the is_self default.
    mockSupabaseQueries(
      [{ member_id: 'member-a', relationship_label: 'Self', is_self: true }],
      'active',
    );
    await user.click(screen.getByRole('button', { name: 'refresh' }));

    await waitFor(() => {
      expect(screen.getByTestId('selected')).toHaveTextContent('member-a');
    });
  });

  it('exposes the fetched consent_status alongside member links', async () => {
    mockSupabaseQueries(
      [{ member_id: 'm1', relationship_label: 'Self', is_self: true }],
      'withdrawal_pending',
    );
    const { trigger } = mockAuthStateChange();
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
    } as never);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('session')).toHaveTextContent('no-session'));
    trigger('SIGNED_IN', { user: { id: 'user-1' } });

    await waitFor(() =>
      expect(screen.getByTestId('consent-status')).toHaveTextContent('withdrawal_pending'),
    );
  });

  it("reports 'unknown' (not null) when the consent_status query errors, so guards can fail closed", async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fakeSession = { user: { id: 'user-1' } };
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: fakeSession },
    } as never);
    mockAuthStateChange();
    vi.mocked(capacitorPreferencesStorage.getItem).mockResolvedValue(null);
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'member_links') {
        return {
          select: () => ({
            eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
          }),
        } as never;
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: null, error: { message: 'network failure' } }),
          }),
        }),
      } as never;
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('consent-status')).toHaveTextContent('unknown'));
    expect(consoleError).toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('reports null (not unknown) when the profile row is simply missing -- no error, no report', async () => {
    const fakeSession = { user: { id: 'user-1' } };
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: fakeSession },
    } as never);
    mockAuthStateChange();
    vi.mocked(capacitorPreferencesStorage.getItem).mockResolvedValue(null);
    mockSupabaseQueries([], null);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('consent-status')).toHaveTextContent('none'));
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
