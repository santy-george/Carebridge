import { Link, Outlet } from 'react-router-dom';
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
            <nav style={{ display: 'flex', gap: '12px', marginLeft: '16px' }}>
              <Link to="/">SOS Alerts</Link>
              <Link to="/members">Members</Link>
              <Link to="/leads">Leads</Link>
            </nav>
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
