import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';

interface CareTeamMember {
  id: string;
  name: string;
  role_label: string;
  initials: string | null;
  phone: string | null;
  email: string | null;
}

const AVATAR_COLORS = [
  { bg: 'var(--accent-soft)', fg: 'var(--accent-text)' },
  { bg: 'var(--purple-100)', fg: 'var(--purple-700)' },
];

function initialsFor(member: CareTeamMember): string {
  if (member.initials) return member.initials;
  return member.name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Care() {
  const { selectedMemberId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [careTeam, setCareTeam] = useState<CareTeamMember[]>([]);

  useEffect(() => {
    let isMounted = true;
    if (!selectedMemberId) return;

    Promise.all([
      supabase
        .from('care_team')
        .select('id, name, role_label, initials, phone, email')
        .eq('member_id', selectedMemberId)
        .order('display_order', { ascending: true }),
    ]).then(([{ data, error }]: [{ data: CareTeamMember[] | null; error: unknown }]) => {
      if (!isMounted) return;
      setLoading(false);
      setFetchError(!!error);
      setCareTeam(data ?? []);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedMemberId]);

  if (loading) {
    return <div className="card">Loading…</div>;
  }

  return (
    <>
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

      <div className="sec">Your care team</div>
      {careTeam.length === 0 ? (
        <div className="card">
          <span>Your care coordinator hasn&apos;t added anyone to your care team yet.</span>
        </div>
      ) : (
        <div className="card card--flush">
          {careTeam.map((member, i) => {
            const colors = AVATAR_COLORS[i % AVATAR_COLORS.length];
            return (
              <div className="row" key={member.id}>
                <span
                  className="avatar avatar--sm"
                  style={{
                    background: colors.bg,
                    color: colors.fg,
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '13px',
                  }}
                >
                  {initialsFor(member)}
                </span>
                <div className="m">
                  <div className="t">{member.name}</div>
                  <div className="s">{member.role_label}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {member.phone && (
                    <a className="iconbtn" href={`tel:${member.phone}`} aria-label={`Call ${member.name}`}>
                      <span className="icon">
                        <svg>
                          <use href="#i-phone" />
                        </svg>
                      </span>
                    </a>
                  )}
                  {member.email && (
                    <a className="iconbtn" href={`mailto:${member.email}`} aria-label={`Email ${member.name}`}>
                      <span className="icon">
                        <svg>
                          <use href="#i-mail" />
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
    </>
  );
}
