import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useAuth } from './useAuth';
import { RedirectIfAuthenticated, RequireAuth, RequireSession } from './RequireAuth';

vi.mock('./useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { signOut: vi.fn() },
  },
}));

function renderGuard(guard: React.ReactElement, initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={guard}>
          <Route path="/protected" element={<p>protected content</p>} />
        </Route>
        <Route path="/login" element={<p>login page</p>} />
        <Route path="/link-member" element={<p>link member page</p>} />
        <Route path="/" element={<p>home page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  it('redirects to /login with no session', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: null,
      loading: false,
      linksLoaded: true,
      memberLinks: [],
      consentStatus: 'active',
    } as never);
    renderGuard(<RequireAuth />, '/protected');
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('redirects to /link-member with a session, links loaded, but no member links', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {},
      loading: false,
      linksLoaded: true,
      memberLinks: [],
      consentStatus: 'active',
    } as never);
    renderGuard(<RequireAuth />, '/protected');
    expect(screen.getByText('link member page')).toBeInTheDocument();
  });

  it('renders protected content with a session and at least one link', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {},
      loading: false,
      linksLoaded: true,
      memberLinks: [{ memberId: 'm1', relationshipLabel: 'Self', isSelf: true }],
      consentStatus: 'active',
    } as never);
    renderGuard(<RequireAuth />, '/protected');
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });

  it('shows the loading screen while a session exists but its member_links fetch has not resolved yet (finding 1)', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {},
      loading: false,
      linksLoaded: false,
      memberLinks: [],
      consentStatus: 'active',
    } as never);
    renderGuard(<RequireAuth />, '/protected');
    expect(screen.queryByText('link member page')).not.toBeInTheDocument();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows the consent-pending screen instead of the app when consentStatus is withdrawal_pending', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {},
      loading: false,
      linksLoaded: true,
      memberLinks: [{ memberId: 'm1', relationshipLabel: 'Self', isSelf: true }],
      consentStatus: 'withdrawal_pending',
    } as never);
    renderGuard(<RequireAuth />, '/protected');
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    expect(screen.getByText(/withdrawal request received/i)).toBeInTheDocument();
  });

  it('fails CLOSED when the consent_status fetch errored: blocks the app instead of granting access', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {},
      loading: false,
      linksLoaded: true,
      memberLinks: [{ memberId: 'm1', relationshipLabel: 'Self', isSelf: true }],
      consentStatus: 'unknown',
    } as never);
    renderGuard(<RequireAuth />, '/protected');
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    expect(screen.getByText(/couldn.t confirm your account status/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('still renders the app when no profile row exists (consentStatus null) -- null is not the fetch-failed sentinel', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {},
      loading: false,
      linksLoaded: true,
      memberLinks: [{ memberId: 'm1', relationshipLabel: 'Self', isSelf: true }],
      consentStatus: null,
    } as never);
    renderGuard(<RequireAuth />, '/protected');
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });

  it('shows a retry screen instead of /link-member when the member_links fetch failed with zero links (finding 10)', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {},
      loading: false,
      linksLoaded: true,
      linksFetchError: true,
      memberLinks: [],
      consentStatus: 'active',
    } as never);
    renderGuard(<RequireAuth />, '/protected');
    expect(screen.queryByText('link member page')).not.toBeInTheDocument();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    expect(screen.getByText(/couldn.t load your account/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('renders protected content on a failed refetch when known-good links are still present (finding 10)', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {},
      loading: false,
      linksLoaded: true,
      linksFetchError: true,
      memberLinks: [{ memberId: 'm1', relationshipLabel: 'Self', isSelf: true }],
      consentStatus: 'active',
    } as never);
    renderGuard(<RequireAuth />, '/protected');
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });
});

describe('RequireSession', () => {
  it('redirects to /login with no session', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: null,
      loading: false,
      linksLoaded: true,
      memberLinks: [],
      consentStatus: 'active',
    } as never);
    renderGuard(<RequireSession />, '/protected');
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('renders protected content with a session, regardless of link count', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {},
      loading: false,
      linksLoaded: true,
      memberLinks: [],
      consentStatus: 'active',
    } as never);
    renderGuard(<RequireSession />, '/protected');
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });

  it('renders protected content with a session even while linksLoaded is false -- RequireSession only cares about session existence', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {},
      loading: false,
      linksLoaded: false,
      memberLinks: [],
      consentStatus: 'active',
    } as never);
    renderGuard(<RequireSession />, '/protected');
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });
});

describe('RedirectIfAuthenticated', () => {
  it('renders the public page (e.g. login form) with no session', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: null,
      loading: false,
      linksLoaded: true,
      memberLinks: [],
      consentStatus: 'active',
    } as never);
    renderGuard(<RedirectIfAuthenticated />, '/protected');
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });

  it('redirects to /link-member when already authenticated with no links', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {},
      loading: false,
      linksLoaded: true,
      memberLinks: [],
      consentStatus: 'active',
    } as never);
    renderGuard(<RedirectIfAuthenticated />, '/protected');
    expect(screen.getByText('link member page')).toBeInTheDocument();
  });

  it('redirects to / when already authenticated with links', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {},
      loading: false,
      linksLoaded: true,
      memberLinks: [{ memberId: 'm1', relationshipLabel: 'Self', isSelf: true }],
      consentStatus: 'active',
    } as never);
    renderGuard(<RedirectIfAuthenticated />, '/protected');
    expect(screen.getByText('home page')).toBeInTheDocument();
  });

  it('shows the loading screen instead of redirecting to /link-member while a session exists but links have not loaded yet (finding 1)', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {},
      loading: false,
      linksLoaded: false,
      memberLinks: [],
      consentStatus: 'active',
    } as never);
    renderGuard(<RedirectIfAuthenticated />, '/protected');
    expect(screen.queryByText('link member page')).not.toBeInTheDocument();
    expect(screen.queryByText('home page')).not.toBeInTheDocument();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('redirects to / instead of /link-member when the links fetch errored with zero links (finding 10)', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {},
      loading: false,
      linksLoaded: true,
      linksFetchError: true,
      memberLinks: [],
      consentStatus: 'active',
    } as never);
    renderGuard(<RedirectIfAuthenticated />, '/protected');
    expect(screen.queryByText('link member page')).not.toBeInTheDocument();
    expect(screen.getByText('home page')).toBeInTheDocument();
  });
});
