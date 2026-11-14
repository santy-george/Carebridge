import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

function LoadingScreen() {
  return (
    <div className="vbody">
      <p className="t-body-m">Loading…</p>
    </div>
  );
}

function NotAuthorized() {
  return (
    <div className="vbody" style={{ justifyContent: 'center', textAlign: 'center' }}>
      <h2>Not a field staff account</h2>
      <p>This app is for Care Bridge nurses and caregivers. Ask your coordinator for access.</p>
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

export function RequireFieldStaff() {
  const { session, loading, roleLoaded, isFieldStaff } = useAuth();
  if (loading || (session && !roleLoaded)) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (!isFieldStaff) return <NotAuthorized />;
  return <Outlet />;
}

export function RedirectIfAuthenticated() {
  const { session, loading, roleLoaded, isFieldStaff } = useAuth();
  if (loading || (session && !roleLoaded)) return <LoadingScreen />;
  if (session && isFieldStaff) return <Navigate to="/" replace />;
  return <Outlet />;
}
