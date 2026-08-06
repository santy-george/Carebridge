import { useEffect, useState } from 'react';
import type { Database } from '@carebridge/db-types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';
import {
  ALERT_TYPE_LABELS,
  STATUS_CHIP_CLASS,
  STATUS_LABELS,
  formatWaiting,
  sortActive,
  sortHistory,
  type AlertStatus,
  type AlertType,
} from '../lib/sosInbox';

interface SosAlertRow {
  id: string;
  member_id: string;
  alert_type: AlertType;
  status: AlertStatus;
  triggered_at: string;
  location_lat: number | null;
  location_lng: number | null;
  notes: string | null;
  members: { full_name: string; phone: string | null; location: string | null } | null;
}

type SosAlertUpdate = Database['public']['Tables']['sos_alerts']['Update'];

const REFRESH_INTERVAL_MS = 20000;

export function SosInbox() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [alerts, setAlerts] = useState<SosAlertRow[]>([]);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function load() {
      const { data, error } = await supabase
        .from('sos_alerts')
        .select(
          'id, member_id, alert_type, status, triggered_at, location_lat, location_lng, notes, members(full_name, phone, location)',
        )
        .order('triggered_at', { ascending: false })
        .limit(100);
      if (ignore) return;
      setLoading(false);
      setFetchError(!!error);
      if (data) setAlerts(data as unknown as SosAlertRow[]);
    }

    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [refreshKey]);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(tick);
  }, []);

  const updateStatus = async (id: string, status: AlertStatus, includeNote: boolean) => {
    if (!session) return;
    setBusyId(id);
    const patch: SosAlertUpdate = {
      status,
      ...(status === 'acknowledged' && {
        acknowledged_by: session.user.id,
        acknowledged_at: new Date().toISOString(),
      }),
      ...((status === 'resolved' || status === 'false_alarm') && {
        resolved_at: new Date().toISOString(),
      }),
      ...(includeNote && noteDrafts[id]?.trim() && { notes: noteDrafts[id].trim() }),
    };
    const { error } = await supabase.from('sos_alerts').update(patch).eq('id', id);
    setBusyId(null);
    if (error) {
      setFetchError(true);
      return;
    }
    setRefreshKey((k) => k + 1);
  };

  if (loading) {
    return <div className="card">Loading…</div>;
  }

  const active = sortActive(alerts);
  const history = sortHistory(alerts).slice(0, 25);

  return (
    <>
      {fetchError && (
        <div className="card" role="alert">
          <span>Something went wrong loading SOS alerts.</span>
          <button type="button" onClick={() => setFetchError(false)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="page-header">
        <div className="page-header__txt">
          <h1>SOS Alerts</h1>
          <p>Manual member SOS and wearable fall alerts, oldest first.</p>
        </div>
        <div className="page-header__actions">
          <span className="freshness">Refreshes every 20s</span>
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="section-card">
        <div className="section-card__head">
          <span className="section-card__title">Active ({active.length})</span>
        </div>
        {active.length === 0 ? (
          <p className="t-body-m">No open alerts.</p>
        ) : (
          active.map((alert) => (
            <div
              key={alert.id}
              className="info-card info-card--danger"
              style={{ marginBottom: '12px' }}
            >
              <span className="info-card__icon">
                <span className="icon">
                  <svg>
                    <use href="#i-emergency" />
                  </svg>
                </span>
              </span>
              <div style={{ flex: 1 }}>
                <h4>
                  {alert.members?.full_name ?? 'Unknown member'} —{' '}
                  {ALERT_TYPE_LABELS[alert.alert_type]}
                </h4>
                <p>
                  Waiting {formatWaiting(alert.triggered_at, now)} ·{' '}
                  <span className={`chip ${STATUS_CHIP_CLASS[alert.status]}`}>
                    {STATUS_LABELS[alert.status]}
                  </span>
                </p>
                <p>
                  {alert.members?.phone ? `${alert.members.phone} · ` : ''}
                  {alert.members?.location ?? 'Location on file unknown'}
                  {alert.location_lat != null && alert.location_lng != null
                    ? ` · GPS ${alert.location_lat.toFixed(4)}, ${alert.location_lng.toFixed(4)}`
                    : ' · No GPS on this alert'}
                </p>
                <div className="field field--full" style={{ marginTop: '8px' }}>
                  <label htmlFor={`note-${alert.id}`}>Incident notes</label>
                  <textarea
                    id={`note-${alert.id}`}
                    placeholder="Document response and actions taken…"
                    value={noteDrafts[alert.id] ?? alert.notes ?? ''}
                    onChange={(e) =>
                      setNoteDrafts((prev) => ({ ...prev, [alert.id]: e.target.value }))
                    }
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  {alert.status === 'open' && (
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      disabled={busyId === alert.id}
                      onClick={() => updateStatus(alert.id, 'acknowledged', false)}
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    disabled={busyId === alert.id}
                    onClick={() => updateStatus(alert.id, 'resolved', true)}
                  >
                    Resolve
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={busyId === alert.id}
                    onClick={() => updateStatus(alert.id, 'false_alarm', true)}
                  >
                    False alarm
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="section-card">
        <div className="section-card__head">
          <span className="section-card__title">History</span>
        </div>
        {history.length === 0 ? (
          <p className="t-body-m">No resolved alerts yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Type</th>
                <th>Triggered</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {history.map((alert) => (
                <tr key={alert.id}>
                  <td>{alert.members?.full_name ?? 'Unknown member'}</td>
                  <td>{ALERT_TYPE_LABELS[alert.alert_type]}</td>
                  <td>{new Date(alert.triggered_at).toLocaleString()}</td>
                  <td>
                    <span className={`chip ${STATUS_CHIP_CLASS[alert.status]}`}>
                      {STATUS_LABELS[alert.status]}
                    </span>
                  </td>
                  <td>{alert.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
