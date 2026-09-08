import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { StaffInviteDrawer } from '../components/StaffInviteDrawer';
import { ROLE_LABELS, sortUsersByRoleThenName, type UserRole } from '../lib/staff';

interface StaffUser {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  created_at: string;
  last_sign_in_at: string | null;
  invite_accepted: boolean;
}

// Reflects what RLS actually enforces today (this phase and earlier) --
// a "—" means no policy exists yet for that module, not that access is
// denied by a real rule. Updated as each later phase ships real access
// control for its module.
const PERMISSION_MATRIX: { permission: string; access: Partial<Record<UserRole, string>> }[] = [
  {
    permission: 'Members & care models',
    access: { admin: 'Full', coordinator: 'Assigned' },
  },
  { permission: 'Emergency centre (SOS)', access: { admin: 'Full', coordinator: 'Full' } },
  {
    permission: 'Human Resources',
    access: { admin: 'Full', coordinator: 'View', field_staff: 'Own profile' },
  },
  { permission: 'Users, roles & settings', access: { admin: 'Full' } },
  { permission: 'Assessments', access: {} },
  { permission: 'Scheduling & visits', access: {} },
  { permission: 'Visit reports', access: {} },
  { permission: 'Billing & invoices', access: {} },
  { permission: 'Staff payments', access: {} },
  { permission: 'Reports & analytics', access: {} },
];

export function UsersRoles() {
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [tab, setTab] = useState<'users' | 'roles'>('users');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function load() {
      const { data, error } = await supabase.functions.invoke('list-staff-users');
      if (ignore) return;
      setLoading(false);
      setFetchError(!!error);
      if (data && (data as { users: StaffUser[] }).users) {
        setUsers((data as { users: StaffUser[] }).users);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  if (loading) {
    return <div className="card">Loading…</div>;
  }

  const sorted = sortUsersByRoleThenName(
    users.map((u) => ({ ...u, full_name: u.full_name ?? 'Unnamed' })),
  );
  const pendingCount = users.filter((u) => !u.invite_accepted).length;

  return (
    <>
      {fetchError && (
        <div className="card" role="alert">
          <span>Something went wrong loading users.</span>
          <button type="button" onClick={() => setFetchError(false)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="page-header">
        <div className="page-header__txt">
          <h1>Users &amp; Roles</h1>
          <p>Admin access, role assignment and account status.</p>
        </div>
        <div className="page-header__actions">
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => setDrawerOpen(true)}
          >
            Invite user
          </button>
        </div>
      </div>

      <div className="metric-row">
        <div className="metric">
          <div className="metric__label">Total users</div>
          <div className="metric__num">{users.length}</div>
        </div>
        <div className="metric metric--warn">
          <div className="metric__label">Pending invites</div>
          <div className="metric__num">{pendingCount}</div>
        </div>
        <div className="metric">
          <div className="metric__label">Roles</div>
          <div className="metric__num">5</div>
        </div>
      </div>

      <div className="tabs" role="tablist">
        <span
          role="tab"
          aria-selected={tab === 'users'}
          className={`tab${tab === 'users' ? ' is-active' : ''}`}
          onClick={() => setTab('users')}
        >
          Users
        </span>
        <span
          role="tab"
          aria-selected={tab === 'roles'}
          className={`tab${tab === 'roles' ? ' is-active' : ''}`}
          onClick={() => setTab('roles')}
        >
          Roles &amp; permissions
        </span>
      </div>

      {tab === 'users' ? (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Last active</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="u__txt">
                      <div className="name">{u.full_name}</div>
                      <div className="sub">{u.email ?? '—'}</div>
                    </div>
                  </td>
                  <td>{ROLE_LABELS[u.role]}</td>
                  <td>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : '—'}</td>
                  <td>
                    {u.invite_accepted ? (
                      <span className="chip chip--completed">
                        <span className="dot" />
                        Active
                      </span>
                    ) : (
                      <span className="chip chip--pending">
                        <span className="dot" />
                        Invite sent
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Permission</th>
                <th>Admin</th>
                <th>Coordinator</th>
                <th>Nurse / Caregiver</th>
                <th>Finance</th>
                <th>Management</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MATRIX.map((row) => (
                <tr key={row.permission}>
                  <td>{row.permission}</td>
                  <td>{row.access.admin ?? '—'}</td>
                  <td>{row.access.coordinator ?? '—'}</td>
                  <td>{row.access.field_staff ?? '—'}</td>
                  <td>{row.access.finance ?? '—'}</td>
                  <td>{row.access.management ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <StaffInviteDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onInvited={() => setRefreshKey((k) => k + 1)}
      />
    </>
  );
}
