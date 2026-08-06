import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useAuth } from './useAuth';
import { RedirectIfAuthenticated, RequireCoordinator } from './RequireAuth';

vi.mock('./useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../lib/supabase', () => ({ supabase: { auth: { signOut: vi.fn() } } }));

function renderGuard(guard: React.ReactElement, initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={guard}>
          <Route path="/protected" element={<p>protected content</p>} />
        </Route>
        <Route path="/login" element={<p>login page</p>} />
        <Route path="/" element={<p>home page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireCoordinator', () => {
  it('redirects to /login with no session', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: null,
      loading: false,
      roleLoaded: true,
      isCoordinator: false,
    } as never);
    renderGuard(<RequireCoordinator />, '/protected');
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('shows loading while a session exists but the role fetch has not resolved', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {},
      loading: false,
      roleLoaded: false,
      isCoordinator: false,
    } as never);
    renderGuard(<RequireCoordinator />, '/protected');
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows a not-authorized message for a signed-in non-coordinator', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {},
      loading: false,
      roleLoaded: true,
      isCoordinator: false,
    } as never);
    renderGuard(<RequireCoordinator />, '/protected');
    expect(screen.getByText(/not authorized/i)).toBeInTheDocument();
  });

  it('renders protected content for a signed-in coordinator', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {},
      loading: false,
      roleLoaded: true,
      isCoordinator: true,
    } as never);
    renderGuard(<RequireCoordinator />, '/protected');
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });
});

describe('RedirectIfAuthenticated', () => {
  it('renders the public page (e.g. login form) with no session', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: null,
      loading: false,
      roleLoaded: true,
      isCoordinator: false,
    } as never);
    renderGuard(<RedirectIfAuthenticated />, '/protected');
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });

  it('redirects to / when already authenticated as a coordinator', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {},
      loading: false,
      roleLoaded: true,
      isCoordinator: true,
    } as never);
    renderGuard(<RedirectIfAuthenticated />, '/protected');
    expect(screen.getByText('home page')).toBeInTheDocument();
  });

  it('renders the public page for a signed-in non-coordinator instead of redirecting', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {},
      loading: false,
      roleLoaded: true,
      isCoordinator: false,
    } as never);
    renderGuard(<RedirectIfAuthenticated />, '/protected');
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });
});
