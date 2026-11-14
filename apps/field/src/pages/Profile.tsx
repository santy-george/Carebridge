import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';

export function Profile() {
  const { fullName, session } = useAuth();
  return (
    <>
      <div className="tbar">
        <div className="tbar__title">
          <h1>Profile</h1>
        </div>
      </div>
      <div className="card">
        <div className="t-heading-s">{fullName ?? 'Field staff'}</div>
        <div className="t-body-m">{session?.user.email}</div>
      </div>
      <button
        type="button"
        className="mbtn mbtn--ghost mbtn--block"
        onClick={() => supabase.auth.signOut()}
      >
        Sign out
      </button>
    </>
  );
}
