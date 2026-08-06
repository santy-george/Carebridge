// Integration-level regression coverage for finding 1 of the final review:
// a race between the session arriving (via onAuthStateChange, right after
// Login.tsx signs in) and member_links loading could strand a returning
// user on /link-member even though they already have valid member links.
// Per-task unit tests mocked either AuthProvider's internals or
// RequireAuth's `useAuth()` in isolation and couldn't catch this -- this
// test mounts the real route tree (the same AuthProvider / RequireAuth /
// RequireSession / RedirectIfAuthenticated / Login / LinkMember / AppShell
// components main.tsx wires together) against a mocked Supabase client and
// drives an actual login.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './auth/AuthProvider';
import { RedirectIfAuthenticated, RequireAuth, RequireSession } from './auth/RequireAuth';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { LinkMember } from './pages/LinkMember';
import { Home } from './pages/Home';
import { AppShell } from './shell/AppShell';
import { supabase } from './lib/supabase';

vi.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('./lib/storage-adapter', () => ({
  capacitorPreferencesStorage: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

type AuthChangeCallback = (event: string, session: unknown) => void;

function renderRouteTree(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route element={<RedirectIfAuthenticated />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>
          <Route element={<RequireSession />}>
            <Route path="/link-member" element={<LinkMember />} />
          </Route>
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<Home />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('auth routing integration (finding 1 regression)', () => {
  it('does not strand a returning user with existing member links on /link-member after logging in', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as never);

    let authChangeCallback: AuthChangeCallback = () => {};
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((cb) => {
      authChangeCallback = cb as AuthChangeCallback;
      return { data: { subscription: { unsubscribe: vi.fn() } } } as never;
    });

    const fakeSession = { user: { id: 'user-1' } };
    let resolveLinksFetch: (value: { data: unknown; error: null }) => void = () => {};
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'member_links') {
        return {
          select: () => ({
            eq: () => ({
              order: () =>
                new Promise((resolve) => {
                  resolveLinksFetch = resolve;
                }),
            }),
          }),
        } as never;
      }
      // AppShell's med_stock query and Home's own data fetches (members,
      // medical_profile, checkins, vitals_readings, glucose_readings): a
      // generic chainable + thenable builder so they resolve immediately
      // with empty/null data regardless of which methods get chained.
      const builder = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        order: () => builder,
        limit: () => builder,
        maybeSingle: () => builder,
        then: (resolve: (v: { data: unknown; error: unknown }) => void) =>
          resolve({ data: null, error: null }),
      };
      return builder as never;
    });

    vi.mocked(supabase.auth.signInWithPassword).mockImplementation(async () => {
      // Mirrors real supabase-js: a successful sign-in fires
      // onAuthStateChange (SIGNED_IN) before signInWithPassword's own
      // promise resolves back to the caller, which then calls
      // navigate('/') immediately (see Login.tsx).
      authChangeCallback('SIGNED_IN', fakeSession);
      return { data: { session: fakeSession, user: fakeSession.user }, error: null } as never;
    });

    const user = userEvent.setup();
    renderRouteTree('/login');

    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/email/i), 'returning@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Right after login, this session's member_links fetch is still in
    // flight -- the user must see the loading state, not get redirected to
    // /link-member as if they had zero links (the bug in finding 1).
    await waitFor(() => {
      expect(screen.getByText('Loading…')).toBeInTheDocument();
    });
    expect(screen.queryByText(/link your account/i)).not.toBeInTheDocument();

    // The fetch resolves: this returning user already has a member link.
    resolveLinksFetch({
      data: [{ member_id: 'member-1', relationship_label: 'Self', is_self: true }],
      error: null,
    });

    // They land on Home ("/"), not stranded on /link-member -- assert via
    // the app shell's bottom nav rather than Home's own content, since
    // Home.tsx is a placeholder this task's own tests own.
    expect(await screen.findByRole('link', { name: /summary/i })).toBeInTheDocument();
    expect(screen.queryByText(/link your account/i)).not.toBeInTheDocument();
  });

  it('still routes a brand-new user with zero member links to /link-member after logging in', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as never);

    let authChangeCallback: AuthChangeCallback = () => {};
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((cb) => {
      authChangeCallback = cb as AuthChangeCallback;
      return { data: { subscription: { unsubscribe: vi.fn() } } } as never;
    });

    const fakeSession = { user: { id: 'user-2' } };
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    } as never);

    vi.mocked(supabase.auth.signInWithPassword).mockImplementation(async () => {
      authChangeCallback('SIGNED_IN', fakeSession);
      return { data: { session: fakeSession, user: fakeSession.user }, error: null } as never;
    });

    const user = userEvent.setup();
    renderRouteTree('/login');

    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/email/i), 'brand-new@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/link your account/i)).toBeInTheDocument();
  });
});
