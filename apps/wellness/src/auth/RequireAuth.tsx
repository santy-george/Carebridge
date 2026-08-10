import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';

function LoadingScreen() {
  return (
    <main className="content">
      <p className="t-body-m">Loading…</p>
    </main>
  );
}

function ConsentPendingScreen() {
  return (
    <div
      className="vbody"
      style={{ alignItems: 'center', textAlign: 'center', justifyContent: 'center' }}
    >
      <h2>Withdrawal request received</h2>
      <p style={{ maxWidth: '280px', margin: '0 auto' }}>
        Your coordinator will contact you to confirm this wasn&apos;t accidental before anything
        is removed.
      </p>
      <button
        type="button"
        className="mbtn mbtn--ghost mbtn--block"
        style={{ marginTop: '16px' }}
        onClick={() => supabase.auth.signOut()}
      >
        Sign out
      </button>
    </div>
  );
}

export function RequireSession() {
  const { session, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RequireAuth() {
  const { session, loading, linksLoaded, memberLinks, consentStatus } = useAuth();
  if (loading || (session && !linksLoaded)) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (consentStatus === 'withdrawal_pending') return <ConsentPendingScreen />;
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
