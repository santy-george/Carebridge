import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useAuth } from './useAuth';
import { RedirectIfAuthenticated, RequireAuth, RequireSession } from './RequireAuth';

vi.mock('./useAuth', () => ({ useAuth: vi.fn() }));

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
    vi.mocked(useAuth).mockReturnValue({ session: null, loading: false, memberLinks: [] } as never);
    renderGuard(<RequireAuth />, '/protected');
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('redirects to /link-member with a session but no member links', () => {
    vi.mocked(useAuth).mockReturnValue({ session: {}, loading: false, memberLinks: [] } as never);
    renderGuard(<RequireAuth />, '/protected');
    expect(screen.getByText('link member page')).toBeInTheDocument();
  });

  it('renders protected content with a session and at least one link', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {},
      loading: false,
      memberLinks: [{ memberId: 'm1', relationshipLabel: 'Self', isSelf: true }],
    } as never);
    renderGuard(<RequireAuth />, '/protected');
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });
});

describe('RequireSession', () => {
  it('redirects to /login with no session', () => {
    vi.mocked(useAuth).mockReturnValue({ session: null, loading: false, memberLinks: [] } as never);
    renderGuard(<RequireSession />, '/protected');
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('renders protected content with a session, regardless of link count', () => {
    vi.mocked(useAuth).mockReturnValue({ session: {}, loading: false, memberLinks: [] } as never);
    renderGuard(<RequireSession />, '/protected');
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });
});

describe('RedirectIfAuthenticated', () => {
  it('renders the public page (e.g. login form) with no session', () => {
    vi.mocked(useAuth).mockReturnValue({ session: null, loading: false, memberLinks: [] } as never);
    renderGuard(<RedirectIfAuthenticated />, '/protected');
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });

  it('redirects to /link-member when already authenticated with no links', () => {
    vi.mocked(useAuth).mockReturnValue({ session: {}, loading: false, memberLinks: [] } as never);
    renderGuard(<RedirectIfAuthenticated />, '/protected');
    expect(screen.getByText('link member page')).toBeInTheDocument();
  });

  it('redirects to / when already authenticated with links', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {},
      loading: false,
      memberLinks: [{ memberId: 'm1', relationshipLabel: 'Self', isSelf: true }],
    } as never);
    renderGuard(<RedirectIfAuthenticated />, '/protected');
    expect(screen.getByText('home page')).toBeInTheDocument();
  });
});
