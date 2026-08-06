import { Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function AdminShell() {
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <div className="app">
      <div className="main">
        <header className="topbar">
          <div className="topbar__left">
            <strong>Care Bridge Home — Admin</strong>
          </div>
          <div className="topbar__actions">
            <button type="button" className="btn btn--secondary btn--sm" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
