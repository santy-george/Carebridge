import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';
import { initialsFor, permissionLabel, type FamilyMember, type PermissionLevel } from '../lib/care';
import { clearDraft, useDraftForm, usePersistedSheet } from '../lib/draftForm';

interface CareTeamMember {
  id: string;
  name: string;
  role_label: string;
  initials: string | null;
  phone: string | null;
  email: string | null;
}

type Sheet = null | 'care' | 'invite';

const AVATAR_COLORS = [
  { bg: 'var(--accent-soft)', fg: 'var(--accent-text)' },
  { bg: 'var(--purple-100)', fg: 'var(--purple-700)' },
];

function initialsForMember(member: CareTeamMember): string {
  return member.initials || initialsFor(member.name);
}

export function Care() {
  const { selectedMemberId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [careTeam, setCareTeam] = useState<CareTeamMember[]>([]);
  const [familyCircle, setFamilyCircle] = useState<FamilyMember[]>([]);
  const [sheet, setSheet] = useState<Sheet>(null);

  const [careName, setCareName] = useState('');
  const [careDesc, setCareDesc] = useState('');
  const [carePhone, setCarePhone] = useState('');
  const [careEmail, setCareEmail] = useState('');
  const [careAddress, setCareAddress] = useState('');
  const [careNotes, setCareNotes] = useState('');
  const [careError, setCareError] = useState(false);

  const [inviteRelationship, setInviteRelationship] = useState('');
  const [invitePermission, setInvitePermission] = useState<PermissionLevel>('full');
  const [inviteError, setInviteError] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  useDraftForm(
    'care-team-member',
    sheet === 'care',
    { careName, careDesc, carePhone, careEmail, careAddress, careNotes },
    (v) => {
      setCareName(v.careName);
      setCareDesc(v.careDesc);
      setCarePhone(v.carePhone);
      setCareEmail(v.careEmail);
      setCareAddress(v.careAddress);
      setCareNotes(v.careNotes);
    },
  );

  useDraftForm(
    'invite-family',
    sheet === 'invite' && !inviteCode,
    { inviteRelationship, invitePermission },
    (v) => {
      setInviteRelationship(v.inviteRelationship);
      setInvitePermission(v.invitePermission);
    },
  );

  usePersistedSheet('care', sheet, setSheet, ['care', 'invite']);

  useEffect(() => {
    let isMounted = true;
    if (!selectedMemberId) return;

    Promise.all([
      supabase
        .from('care_team')
        .select('id, name, role_label, initials, phone, email')
        .eq('member_id', selectedMemberId)
        .order('display_order', { ascending: true }),
      supabase
        .from('member_links')
        .select('id, relationship_label, permission_level')
        .eq('member_id', selectedMemberId)
        .eq('is_self', false),
    ]).then(([careTeamRes, familyRes]) => {
      if (!isMounted) return;
      setLoading(false);
      setFetchError(!!careTeamRes.error || !!familyRes.error);
      setCareTeam((careTeamRes.data as CareTeamMember[] | null) ?? []);
      setFamilyCircle((familyRes.data as FamilyMember[] | null) ?? []);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedMemberId]);

  const openCareSheet = () => {
    setCareError(false);
    setSheet('care');
  };

  const openInviteSheet = () => {
    setInviteError(false);
    setInviteCode('');
    setSheet('invite');
  };

  const submitCareTeam = async () => {
    if (!selectedMemberId || !careName.trim()) return;
    setCareError(false);
    const { data, error } = await supabase
      .from('care_team')
      .insert({
        member_id: selectedMemberId,
        name: careName.trim(),
        role_label: careDesc.trim() || 'Care team member',
        phone: carePhone.trim() || null,
        email: careEmail.trim() || null,
        address: careAddress.trim() || null,
        notes: careNotes.trim() || null,
      })
      .select('id, name, role_label, initials, phone, email')
      .single();
    if (error || !data) {
      setCareError(true);
      return;
    }
    setCareTeam((prev) => [...prev, data as CareTeamMember]);
    setCareName('');
    setCareDesc('');
    setCarePhone('');
    setCareEmail('');
    setCareAddress('');
    setCareNotes('');
    clearDraft('care-team-member');
    clearDraft('open-sheet:care');
    setSheet(null);
  };

  const submitInvite = async () => {
    if (!selectedMemberId) return;
    setInviteError(false);
    const { data, error } = await supabase.rpc('create_family_invite', {
      p_member_id: selectedMemberId,
      p_relationship_label: inviteRelationship.trim() || 'Family member',
      p_permission_level: invitePermission,
    });
    if (error || !data) {
      setInviteError(true);
      return;
    }
    clearDraft('invite-family');
    setInviteCode(data as string);
  };

  const closeSheet = () => {
    if (sheet === 'care') clearDraft('care-team-member');
    if (sheet === 'invite') clearDraft('invite-family');
    clearDraft('open-sheet:care');
    setSheet(null);
  };

  const shareInviteEmail = () => {
    const body = `You've been invited to join the family circle on Care Bridge Home.\n\nOpen the app, go to "Link a member", and enter this code:\n\n${inviteCode}\n\nThis code expires in 14 days.`;
    window.location.href = `mailto:?subject=${encodeURIComponent('Care Bridge Home invite')}&body=${encodeURIComponent(body)}`;
  };

  if (loading) {
    return <div className="card">Loading…</div>;
  }

  return (
    <>
      <style>{`
        .tbar__title h1, .sec, .tt, h2, h3 { color: var(--purple-700); }
        .row-actions { display: flex; gap: 8px; }
      `}</style>

      {fetchError && (
        <div className="card" role="alert">
          <span>Something went wrong loading your data.</span>
          <button type="button" onClick={() => setFetchError(false)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="tbar">
        <div className="tbar__title">
          <h1 className="sm">Care</h1>
        </div>
      </div>

      <div className="vbody has-nav">
        <div className="sec">
          Your care team
          <a href="#add-care-team" onClick={(e) => (e.preventDefault(), openCareSheet())}>
            + Add
          </a>
        </div>
        {careTeam.length === 0 ? (
          <div className="card">
            <span>No one on your care team yet — add a doctor, nurse, or pharmacist.</span>
          </div>
        ) : (
          <div className="card card--flush reveal">
            {careTeam.map((member, i) => {
              const colors = AVATAR_COLORS[i % AVATAR_COLORS.length];
              return (
                <div className="row" key={member.id}>
                  <span
                    className="avatar"
                    style={{
                      background: colors.bg,
                      color: colors.fg,
                      fontWeight: 700,
                    }}
                  >
                    {initialsForMember(member)}
                  </span>
                  <div className="m">
                    <div className="t">{member.name}</div>
                    <div className="s">{member.role_label}</div>
                  </div>
                  <div className="row-actions">
                    {member.email && (
                      <a
                        className="iconbtn"
                        href={`mailto:${member.email}`}
                        aria-label={`Message ${member.name}`}
                      >
                        <span className="icon">
                          <svg>
                            <use href="#i-chat" />
                          </svg>
                        </span>
                      </a>
                    )}
                    {member.phone && (
                      <a
                        className="iconbtn"
                        href={`tel:${member.phone}`}
                        aria-label={`Call ${member.name}`}
                      >
                        <span className="icon">
                          <svg>
                            <use href="#i-phone" />
                          </svg>
                        </span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="sec">Family Circle</div>
        {familyCircle.length === 0 ? (
          <div className="card">
            <span>No family members linked yet — invite one below.</span>
          </div>
        ) : (
          <div className="card reveal">
            {familyCircle.map((member) => (
              <div className="circle-member" key={member.id}>
                <span className="av">{initialsFor(member.relationship_label)}</span>
                <div className="info">
                  <div className="nm">{member.relationship_label}</div>
                </div>
                <span className={`perm${member.permission_level === 'full' ? ' lvl-full' : ''}`}>
                  {permissionLabel(member.permission_level)}
                </span>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          className="mbtn mbtn--soft mbtn--block reveal"
          onClick={openInviteSheet}
        >
          <span className="icon">
            <svg>
              <use href="#i-plus" />
            </svg>
          </span>
          Invite family member
        </button>
      </div>

      <div className={`scrim${sheet ? ' show' : ''}`} onClick={closeSheet} />

      <div className={`sheet${sheet === 'care' ? ' show' : ''}`}>
        <div className="sheet__grip" />
        <button
          type="button"
          className="iconbtn"
          style={{ position: 'absolute', top: '14px', right: '14px' }}
          aria-label="Close"
          onClick={closeSheet}
        >
          <span className="icon">
            <svg>
              <use href="#i-close" />
            </svg>
          </span>
        </button>
        <h2>Add care team member</h2>
        <p className="lead">Add a person who supports your care.</p>
        <form
          style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}
          onSubmit={(e) => {
            e.preventDefault();
            submitCareTeam();
          }}
        >
          <div className="field">
            <label htmlFor="care-name">Name</label>
            <input
              id="care-name"
              type="text"
              placeholder="e.g. Dr. Priya Menon"
              value={careName}
              onChange={(e) => setCareName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="care-desc">Description / role</label>
            <input
              id="care-desc"
              type="text"
              placeholder="e.g. Primary physician, or Pharmacist — Springfield Pharmacy"
              value={careDesc}
              onChange={(e) => setCareDesc(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="care-phone">Phone</label>
            <input
              id="care-phone"
              type="tel"
              placeholder="e.g. (555) 010-1234"
              value={carePhone}
              onChange={(e) => setCarePhone(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="care-email">Email (optional)</label>
            <input
              id="care-email"
              type="email"
              placeholder="e.g. priya@clinic.com"
              value={careEmail}
              onChange={(e) => setCareEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="care-address">Address</label>
            <input
              id="care-address"
              type="text"
              placeholder="e.g. 214 Elm St, Springfield"
              value={careAddress}
              onChange={(e) => setCareAddress(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="care-notes">Notes</label>
            <textarea
              id="care-notes"
              placeholder="Anything the family should know"
              value={careNotes}
              onChange={(e) => setCareNotes(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="mbtn mbtn--fill mbtn--block sheet__save"
            style={{ marginTop: '8px' }}
          >
            Save care member
          </button>
          {careError && (
            <p className="form-error" role="alert">
              Couldn&apos;t save that care team member — try again.
            </p>
          )}
        </form>
      </div>

      <div className={`sheet${sheet === 'invite' ? ' show' : ''}`}>
        <div className="sheet__grip" />
        <button
          type="button"
          className="iconbtn"
          style={{ position: 'absolute', top: '14px', right: '14px' }}
          aria-label="Close"
          onClick={closeSheet}
        >
          <span className="icon">
            <svg>
              <use href="#i-close" />
            </svg>
          </span>
        </button>
        <h2>Invite family member</h2>
        {!inviteCode ? (
          <>
            <p className="lead">Generate a one-time code to link a family member's account.</p>
            <form
              style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}
              onSubmit={(e) => {
                e.preventDefault();
                submitInvite();
              }}
            >
              <div className="field">
                <label htmlFor="invite-relationship">Relationship</label>
                <input
                  id="invite-relationship"
                  type="text"
                  placeholder="e.g. Daughter"
                  value={inviteRelationship}
                  onChange={(e) => setInviteRelationship(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Access level</label>
                <div className="seg">
                  <button
                    type="button"
                    className={invitePermission === 'full' ? 'is-active' : ''}
                    onClick={() => setInvitePermission('full')}
                  >
                    Full access
                  </button>
                  <button
                    type="button"
                    className={invitePermission === 'view' ? 'is-active' : ''}
                    onClick={() => setInvitePermission('view')}
                  >
                    View only
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="mbtn mbtn--fill mbtn--block sheet__save"
                style={{ marginTop: '8px' }}
              >
                Generate code
              </button>
              {inviteError && (
                <p className="form-error" role="alert">
                  Couldn&apos;t generate an invite code — try again.
                </p>
              )}
            </form>
          </>
        ) : (
          <div style={{ marginTop: '16px' }}>
            <p className="lead">Share this code — it expires in 14 days.</p>
            <div
              className="card"
              style={{
                textAlign: 'center',
                fontSize: '28px',
                fontWeight: 700,
                letterSpacing: '3px',
                color: 'var(--text-heading)',
              }}
            >
              {inviteCode}
            </div>
            <button
              type="button"
              className="mbtn mbtn--fill mbtn--block"
              style={{ marginTop: '12px' }}
              onClick={shareInviteEmail}
            >
              <span className="icon">
                <svg>
                  <use href="#i-mail" />
                </svg>
              </span>
              Share via email
            </button>
          </div>
        )}
      </div>
    </>
  );
}
