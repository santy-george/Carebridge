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
        Your coordinator will contact you to confirm this wasn&apos;t accidental before anything is
        removed.
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

// Shown when member_links couldn't be fetched AND there's no previously-
// known-good link list to fall back on (a first load failing, not a
// background refresh). If we already had confirmed links, RequireAuth
// keeps using them instead of showing this -- see the linksFetchError
// check below.
function LinksUnavailableScreen() {
  return (
    <main className="content">
      <p className="t-body-m">
        We couldn&apos;t load your account. Check your connection and try again.
      </p>
      <button
        type="button"
        className="mbtn mbtn--ghost"
        style={{ marginTop: '16px' }}
        onClick={() => window.location.reload()}
      >
        Retry
      </button>
      <button
        type="button"
        className="mbtn mbtn--ghost"
        style={{ marginTop: '8px' }}
        onClick={() => supabase.auth.signOut()}
      >
        Sign out
      </button>
    </main>
  );
}

// Shown when the consent_status fetch itself failed (consentStatus ===
// 'unknown'). Deliberately blocks the app rather than falling through to the
// protected routes: if we can't tell whether this user's withdrawal is
// pending, the safe assumption is that it might be. Fail closed, not open.
function ConsentUnavailableScreen() {
  return (
    <main className="content">
      <p className="t-body-m">
        We couldn&apos;t confirm your account status. Check your connection and try again.
      </p>
      <button
        type="button"
        className="mbtn mbtn--ghost"
        style={{ marginTop: '16px' }}
        onClick={() => window.location.reload()}
      >
        Retry
      </button>
      <button
        type="button"
        className="mbtn mbtn--ghost"
        style={{ marginTop: '8px' }}
        onClick={() => supabase.auth.signOut()}
      >
        Sign out
      </button>
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
  const { session, loading, linksLoaded, linksFetchError, memberLinks, consentStatus } = useAuth();
  if (loading || (session && !linksLoaded)) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (consentStatus === 'unknown') return <ConsentUnavailableScreen />;
  if (consentStatus === 'withdrawal_pending') return <ConsentPendingScreen />;
  if (memberLinks.length === 0) {
    // A failed fetch is not the same as a confirmed empty link list -- see
    // AuthProvider's fetchMemberLinks. Only route to link-member once we
    // actually know there's nothing there; otherwise this would strand an
    // already-linked user re-entering an invite code they don't need,
    // every time a background token refresh hits a transient fetch error.
    if (linksFetchError) return <LinksUnavailableScreen />;
    return <Navigate to="/link-member" replace />;
  }
  return <Outlet />;
}

export function RedirectIfAuthenticated() {
  const { session, loading, linksLoaded, linksFetchError, memberLinks } = useAuth();
  if (loading || (session && !linksLoaded)) return <LoadingScreen />;
  if (session) {
    if (memberLinks.length === 0 && linksFetchError) {
      // Same "unknown, not confirmed empty" reasoning as RequireAuth --
      // don't send a possibly-already-linked user to link-member on a
      // transient fetch failure. Home re-evaluates via RequireAuth.
      return <Navigate to="/" replace />;
    }
    return <Navigate to={memberLinks.length === 0 ? '/link-member' : '/'} replace />;
  }
  return <Outlet />;
}
