import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

function LoadingScreen() {
  return (
    <main className="content">
      <p className="t-body-m">Loading…</p>
    </main>
  );
}

function NotAuthorized() {
  return (
    <main className="content">
      <div className="card">
        <h1 className="t-heading-s">Not authorized</h1>
        <p className="t-body-m">This account isn&apos;t set up as a coordinator.</p>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => supabase.auth.signOut()}
        >
          Sign out
        </button>
      </div>
    </main>
  );
}

export function RequireCoordinator() {
  const { session, loading, roleLoaded, isCoordinator } = useAuth();
  if (loading || (session && !roleLoaded)) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (!isCoordinator) return <NotAuthorized />;
  return <Outlet />;
}

export function RedirectIfAuthenticated() {
  const { session, loading, roleLoaded, isCoordinator } = useAuth();
  if (loading || (session && !roleLoaded)) return <LoadingScreen />;
  if (session && isCoordinator) return <Navigate to="/" replace />;
  return <Outlet />;
}
