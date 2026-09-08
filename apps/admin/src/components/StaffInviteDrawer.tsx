import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { INVITABLE_ROLES, ROLE_LABELS, type UserRole } from '../lib/staff';

export function StaffInviteDrawer({
  open,
  onClose,
  onInvited,
  defaultRole = 'field_staff',
}: {
  open: boolean;
  onClose: () => void;
  onInvited: () => void;
  defaultRole?: UserRole;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(defaultRole);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const { error: inviteError } = await supabase.functions.invoke('invite-staff', {
      body: { full_name: fullName.trim(), email: email.trim(), role },
    });
    setSaving(false);
    if (inviteError) {
      setError('Something went wrong sending the invite.');
      return;
    }
    setFullName('');
    setEmail('');
    setRole(defaultRole);
    onInvited();
    onClose();
  };

  return (
    <>
      <div className={`overlay${open ? ' is-open' : ''}`} onClick={onClose} />
      <aside className={`drawer${open ? ' is-open' : ''}`} aria-label="Invite user">
        <div className="drawer__head">
          <span className="drawer__title">Invite user</span>
          <button type="button" className="x-btn" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <form
          className="drawer__body"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="field field--full">
            <label htmlFor="invite-name">Full name</label>
            <div className="control">
              <input
                id="invite-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>
          <div className="field field--full">
            <label htmlFor="invite-email">Email</label>
            <div className="control">
              <input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="field field--full">
            <label htmlFor="invite-role">Role</label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              {INVITABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </form>
        <div className="drawer__foot">
          <button type="button" className="btn btn--outline btn--sm" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={saving || !fullName.trim() || !email.trim()}
            onClick={submit}
          >
            {saving ? 'Sending…' : 'Send invite'}
          </button>
        </div>
      </aside>
    </>
  );
}
