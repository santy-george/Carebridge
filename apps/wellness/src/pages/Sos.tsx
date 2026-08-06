import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';

interface CareTeamMember {
  id: string;
  name: string;
  role_label: string;
  initials: string | null;
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

function currentLocation(): Promise<{ lat: number; lng: number } | null> {
  if (!navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000 },
    );
  });
}

type Status = 'confirm' | 'sending' | 'sent' | 'error';

export function Sos() {
  const { selectedMemberId } = useAuth();
  const navigate = useNavigate();
  const [careTeam, setCareTeam] = useState<CareTeamMember[]>([]);
  const [status, setStatus] = useState<Status>('confirm');

  useEffect(() => {
    let isMounted = true;
    if (!selectedMemberId) return;

    Promise.all([
      supabase
        .from('care_team')
        .select('id, name, role_label, initials')
        .eq('member_id', selectedMemberId)
        .order('display_order', { ascending: true }),
    ]).then(([{ data }]: [{ data: CareTeamMember[] | null }]) => {
      if (!isMounted) return;
      setCareTeam(data ?? []);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedMemberId]);

  const sendAlert = async () => {
    if (!selectedMemberId) return;
    setStatus('sending');
    const location = await currentLocation();
    const { error } = await supabase.from('sos_alerts').insert({
      member_id: selectedMemberId,
      alert_type: 'manual',
      location_lat: location?.lat ?? null,
      location_lng: location?.lng ?? null,
    });
    setStatus(error ? 'error' : 'sent');
  };

  if (status === 'sent') {
    return (
      <div className="vbody" style={{ alignItems: 'center', textAlign: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: '96px',
            height: '96px',
            borderRadius: '50%',
            background: 'var(--mint-50)',
            color: 'var(--mint-500)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '20px auto 6px',
          }}
        >
          <span className="icon" style={{ width: '44px', height: '44px' }}>
            <svg style={{ width: '44px', height: '44px' }}>
              <use href="#i-check" />
            </svg>
          </span>
        </div>
        <h2>Alert sent</h2>
        <p>Your care coordinator has been notified and will follow up with you shortly.</p>
        <button type="button" className="mbtn mbtn--fill mbtn--block" onClick={() => navigate('/')}>
          Back to home
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="tbar">
        <Link className="backbtn" to="/" aria-label="Back to home">
          <span className="icon">
            <svg>
              <use href="#i-chevron" />
            </svg>
          </span>
        </Link>
        <div className="tbar__title">
          <h1 className="sm">Emergency SOS</h1>
        </div>
      </div>

      <div
        className="vbody has-cta"
        style={{ alignItems: 'center', textAlign: 'center', justifyContent: 'center' }}
      >
        <div
          style={{
            width: '96px',
            height: '96px',
            borderRadius: '50%',
            background: 'var(--danger-soft)',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '20px auto 6px',
          }}
        >
          <span className="icon" style={{ width: '44px', height: '44px' }}>
            <svg style={{ width: '44px', height: '44px' }}>
              <use href="#i-emergency" />
            </svg>
          </span>
        </div>
        <h2>Send an emergency alert?</h2>
        <p style={{ maxWidth: '280px', margin: '0 auto' }}>
          This creates an emergency alert for your care coordinator, with your location if available. They
          will follow up with you directly.
        </p>

        {careTeam.length > 0 && (
          <div className="card" style={{ width: '100%', textAlign: 'left', marginTop: '22px' }}>
            {careTeam.map((member, i) => {
              const colors = AVATAR_COLORS[i % AVATAR_COLORS.length];
              return (
                <div className="row" key={member.id}>
                  <span
                    className="avatar avatar--sm"
                    style={{
                      background: colors.bg,
                      color: colors.fg,
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '12px',
                    }}
                  >
                    {initialsFor(member)}
                  </span>
                  <div className="m">
                    <div className="t">{member.name}</div>
                    <div className="s">{member.role_label} · will be notified</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {status === 'error' && (
          <p className="form-error" role="alert">
            Couldn&apos;t send your alert — try again.
          </p>
        )}
      </div>

      <div className="cta-bar">
        <button
          type="button"
          className="mbtn mbtn--sos mbtn--block"
          disabled={status === 'sending'}
          onClick={sendAlert}
        >
          <span className="icon">
            <svg>
              <use href="#i-emergency" />
            </svg>
          </span>
          {status === 'sending' ? 'Sending…' : 'Confirm — send alert'}
        </button>
        <Link to="/">
          <button type="button" className="mbtn mbtn--ghost mbtn--block" style={{ marginTop: '8px' }}>
            Cancel
          </button>
        </Link>
      </div>
    </>
  );
}
