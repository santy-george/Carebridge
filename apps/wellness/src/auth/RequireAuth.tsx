import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './useAuth';

function LoadingScreen() {
  return (
    <main className="content">
      <p className="t-body-m">Loading…</p>
    </main>
  );
}

export function RequireSession() {
  const { session, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RequireAuth() {
  const { session, loading, linksLoaded, memberLinks } = useAuth();
  if (loading || (session && !linksLoaded)) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (memberLinks.length === 0) return <Navigate to="/link-member" replace />;
  return <Outlet />;
}

export function RedirectIfAuthenticated() {
  const { session, loading, linksLoaded, memberLinks } = useAuth();
  if (loading || (session && !linksLoaded)) return <LoadingScreen />;
  if (session) {
    return <Navigate to={memberLinks.length === 0 ? '/link-member' : '/'} replace />;
  }
  return <Outlet />;
}
