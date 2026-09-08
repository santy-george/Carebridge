import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { injectIconSprite } from '@carebridge/design-system';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AdminShell() {
  useEffect(() => {
    injectIconSprite();
  }, []);

  return (
    <div className="app">
      <aside className="sidebar">
        <Sidebar />
      </aside>
      <div className="main">
        <Topbar />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
