import { NavLink } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';
import { initialsFor } from '../lib/members';

interface NavItem {
  label: string;
  icon: string;
  to?: string;
}

interface NavGroup {
  name: string;
  items: NavItem[];
}

// Mirrors the sidebar IA in js/sidebar.js (the Admin Portal mockup's single
// source of truth for nav structure). Items with no `to` have no matching
// screen yet -- rendered disabled rather than omitted, so the full roadmap
// stays visible instead of looking like it doesn't exist.
const GROUPS: NavGroup[] = [
  {
    name: 'Overview',
    items: [
      { label: 'Dashboard', icon: 'dashboard' },
      { label: 'Emergency Centre', icon: 'emergency', to: '/' },
    ],
  },
  {
    name: 'Membership & Care',
    items: [
      { label: 'Leads', icon: 'inbox', to: '/leads' },
      { label: 'Members', icon: 'members', to: '/members' },
      { label: 'Consent Requests', icon: 'check', to: '/consent-requests' },
      { label: 'Assessments', icon: 'clipboard' },
      { label: 'Care Models', icon: 'models' },
      { label: 'Service Catalogue', icon: 'catalogue' },
    ],
  },
  {
    name: 'Operations',
    items: [
      { label: 'Scheduler', icon: 'scheduler' },
      { label: 'Visits & Duties', icon: 'duties', to: '/visits' },
      { label: 'Visit Reports', icon: 'document', to: '/visit-reports' },
      { label: 'Area Allocation', icon: 'pin' },
    ],
  },
  {
    name: 'Workforce',
    items: [
      { label: 'Human Resources', icon: 'hr', to: '/human-resources' },
      { label: 'Attendance & GPS', icon: 'gps' },
    ],
  },
  {
    name: 'Finance',
    items: [
      { label: 'Billing & Invoices', icon: 'billing' },
      { label: 'Staff Payments', icon: 'payments' },
    ],
  },
  {
    name: 'Insights',
    items: [
      { label: 'Reports & Analytics', icon: 'reports' },
      { label: 'Health Analytics', icon: 'pulse' },
    ],
  },
  {
    name: 'Admin',
    items: [
      { label: 'Users & Roles', icon: 'shield', to: '/users-roles' },
      { label: 'Settings', icon: 'cog' },
    ],
  },
];

function iconEl(name: string) {
  return (
    <span className="icon">
      <svg>
        <use href={`#i-${name}`} />
      </svg>
    </span>
  );
}

export function Sidebar() {
  const { fullName, isAdmin } = useAuth();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <>
      <div className="sidebar__logo">
        <img src="/cbh-logo.png" alt="Care Bridge Home" />
      </div>
      <nav className="sidebar__nav">
        {GROUPS.map((group) => (
          <div key={group.name}>
            <div className="nav-tag">{group.name}</div>
            {group.items.map((item) =>
              item.to ? (
                <NavLink
                  key={item.label}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `nav-item${isActive ? ' is-active' : ''}`}
                >
                  {iconEl(item.icon)}
                  <span className="nav-item__label">{item.label}</span>
                </NavLink>
              ) : (
                <span
                  key={item.label}
                  className="nav-item nav-item--disabled"
                  title="Not built yet"
                  aria-disabled="true"
                >
                  {iconEl(item.icon)}
                  <span className="nav-item__label">{item.label}</span>
                </span>
              ),
            )}
          </div>
        ))}
      </nav>
      <div className="sidebar__foot">
        <div className="user-card">
          <span
            className="avatar avatar--sm"
            style={{ background: 'var(--purple-300)', color: '#fff' }}
          >
            {fullName ? initialsFor(fullName) : '—'}
          </span>
          <span className="user-card__txt">
            <span className="name">{fullName ?? 'Coordinator'}</span>
            <span className="role">{isAdmin ? 'Admin' : 'Care Coordinator'}</span>
          </span>
        </div>
        <span className="nav-item nav-item--foot nav-item--disabled" aria-disabled="true">
          {iconEl('help')}
          <span className="nav-item__label">Help &amp; Support</span>
        </span>
        <button
          type="button"
          className="nav-item nav-item--foot"
          onClick={handleSignOut}
          style={{
            width: '100%',
            textAlign: 'left',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {iconEl('logout')}
          <span className="nav-item__label">Log out</span>
        </button>
      </div>
    </>
  );
}
