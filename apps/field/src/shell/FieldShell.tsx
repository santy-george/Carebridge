import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { injectIconSprite } from '@carebridge/design-system';

const NAV_ITEMS = [
  { to: '/', label: 'Today', icon: 'dashboard' },
  { to: '/visits', label: 'Visits', icon: 'duties' },
  { to: '/profile', label: 'Profile', icon: 'user' },
] as const;

export function FieldShell() {
  const location = useLocation();

  useEffect(() => {
    injectIconSprite();
  }, []);

  return (
    <div className="stack">
      <div className="brand-strip">
        <img src="/cbh-logo.png" alt="Care Bridge Home" />
      </div>

      <div className="vbody has-nav">
        <Outlet />
      </div>

      <nav className="bnav">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            className={`bnav__i${location.pathname === item.to ? ' is-active' : ''}`}
            to={item.to}
          >
            <span className="ic">
              <span className="icon">
                <svg>
                  <use href={`#i-${item.icon}`} />
                </svg>
              </span>
            </span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
