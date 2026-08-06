import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { injectIconSprite } from '@carebridge/design-system';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';
import { hasLowStockAlert } from '../lib/vitals';

const NAV_ITEMS = [
  { to: '/', label: 'Summary', icon: 'home' },
  { to: '/health', label: 'My Health', icon: 'pulse' },
  { to: '/medications', label: 'My Schedule', icon: 'pill' },
  { to: '/care', label: 'My Care', icon: 'family' },
  { to: '/more', label: 'More', icon: 'more' },
] as const;

export function AppShell() {
  const location = useLocation();
  const { selectedMemberId } = useAuth();
  const [lowStock, setLowStock] = useState(false);

  useEffect(() => {
    injectIconSprite();
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (!selectedMemberId) {
      // Resetting to the known "no member selected" default, not
      // synchronizing with an external system.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLowStock(false);
      return;
    }
    supabase
      .from('med_stock')
      .select('qty, doses_per_day')
      .eq('member_id', selectedMemberId)
      .then(
        ({
          data,
          error,
        }: {
          data: { qty: number; doses_per_day: number }[] | null;
          error: unknown;
        }) => {
          if (!isMounted) return;
          setLowStock(!error && !!data && hasLowStockAlert(data));
        },
      );
    return () => {
      isMounted = false;
    };
  }, [selectedMemberId]);

  return (
    <div className="stack">
      <div className="brand-strip">
        <span className="brand-strip__brand">
          <span className="icon">
            <svg>
              <use href="#i-pulse" />
            </svg>
          </span>
          Care Bridge Home
        </span>
        <div className="tbar__actions">
          <Link
            className="iconbtn"
            to="/sos"
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
            aria-label="Emergency SOS"
          >
            <span className="icon">
              <svg>
                <use href="#i-emergency" />
              </svg>
            </span>
          </Link>
          <Link className="iconbtn" to="/medications" aria-label="Medications">
            <span className="icon">
              <svg>
                <use href="#i-bell" />
              </svg>
            </span>
            {lowStock && <span className="dot" />}
          </Link>
          <Link className="avatar-btn" to="/profile" aria-label="Profile">
            <span className="icon">
              <svg>
                <use href="#i-user" />
              </svg>
            </span>
          </Link>
        </div>
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
