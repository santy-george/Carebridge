import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext, type AuthContextValue } from './AuthProvider';

vi.mock('../lib/supabase', () => ({ supabase: { auth: { signOut: vi.fn() } } }));

import { RedirectIfAuthenticated, RequireFieldStaff } from './RequireAuth';

function auth(overrides: Partial<AuthContextValue>): AuthContextValue {
  return {
    session: null,
    loading: false,
    roleLoaded: true,
    isFieldStaff: false,
    fullName: null,
    ...overrides,
  };
}

function renderAt(path: string, value: AuthContextValue) {
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<RedirectIfAuthenticated />}>
            <Route path="/login" element={<div>login page</div>} />
          </Route>
          <Route element={<RequireFieldStaff />}>
            <Route path="/" element={<div>home page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

const session = { user: { id: 'u1' } } as AuthContextValue['session'];

describe('field auth guards', () => {
  it('sends signed-out users to login', () => {
    renderAt('/', auth({}));
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('lets a field staff account in', () => {
    renderAt('/', auth({ session, isFieldStaff: true }));
    expect(screen.getByText('home page')).toBeInTheDocument();
  });

  it('blocks a signed-in account that is not field staff', () => {
    renderAt('/', auth({ session, isFieldStaff: false }));
    expect(screen.getByText('Not a field staff account')).toBeInTheDocument();
    expect(screen.queryByText('home page')).not.toBeInTheDocument();
  });

  it('waits for the role before deciding', () => {
    renderAt('/', auth({ session, roleLoaded: false }));
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('redirects an authenticated field staff account away from login', () => {
    renderAt('/login', auth({ session, isFieldStaff: true }));
    expect(screen.queryByText('login page')).not.toBeInTheDocument();
  });
});
