import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { scopeLabel, sortHistoryRows, sortPending, type ConsentScope } from '../lib/consentRequests';

interface PendingRow {
  user_id: string;
  member_id: string;
  scope: ConsentScope;
  requested_at: string;
  requester_name: string;
  requester_email: string;
  member_name: string;
}

interface HistoryRow {
  id: string;
  resolved_at: string;
  requester_name: string;
  member_name: string;
  outcome: 'reactivated' | 'erased';
}

interface RequestedConsentRow {
  user_id: string;
  member_id: string;
  scope: string;
  created_at: string;
  members: { full_name: string } | null;
}

interface ResolvedConsentRow {
  id: string;
  user_id: string | null;
  member_id: string | null;
  event: string;
  scope: string | null;
  created_at: string;
  members: { full_name: string } | null;
}

const REFRESH_INTERVAL_MS = 20000;

export function ConsentRequests() {
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [eraseTargetUserId, setEraseTargetUserId] = useState<string | null>(null);
  const [eraseConfirmText, setEraseConfirmText] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function load() {
      const { data: pendingProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('consent_status', 'withdrawal_pending');

      if (ignore) return;

      if (profilesError || !pendingProfiles) {
        setLoading(false);
        setFetchError(true);
        return;
      }

      const pendingIds = pendingProfiles.map((p) => p.id);
      const [requestedResult, resolvedResult] = await Promise.all([
        pendingIds.length > 0
          ? supabase
              .from('consents')
              .select('user_id, member_id, scope, created_at, members(full_name)')
              .eq('event', 'withdrawal_requested')
              .in('user_id', pendingIds)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] as RequestedConsentRow[] | null }),
        supabase
          .from('consents')
          .select('id, user_id, member_id, event, scope, created_at, members(full_name)')
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      if (ignore) return;
      setLoading(false);

      const requested = (requestedResult.data ?? []) as RequestedConsentRow[];
      const resolved = (resolvedResult.data ?? []) as ResolvedConsentRow[];

      const nameByProfileId = new Map(pendingProfiles.map((p) => [p.id, p]));
      const latestRequestByUser = new Map<string, RequestedConsentRow>();
      for (const row of requested) {
        if (!latestRequestByUser.has(row.user_id)) {
          latestRequestByUser.set(row.user_id, row);
        }
      }

      const pendingRows: PendingRow[] = pendingIds.flatMap((id) => {
        const req = latestRequestByUser.get(id);
        const profile = nameByProfileId.get(id);
        if (!req || !profile) return [];
        return [
          {
            user_id: id,
            member_id: req.member_id,
            scope: req.scope as ConsentScope,
            requested_at: req.created_at,
            requester_name: profile.full_name ?? 'Unknown',
            requester_email: profile.email ?? '—',
            member_name: req.members?.full_name ?? 'Unknown member',
          },
        ];
      });

      const historyRows: HistoryRow[] = resolved
        .filter((row) => row.event === 'withdrawal_verified' || (row.event === 'given' && row.member_id))
        .map((row) => ({
          id: row.id,
          resolved_at: row.created_at,
          requester_name: 'requester',
          member_name: row.members?.full_name ?? 'Unknown member',
          outcome: row.event === 'withdrawal_verified' ? 'erased' : 'reactivated',
        }));

      setPending(sortPending(pendingRows));
      setHistory(sortHistoryRows(historyRows));
    }

    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [refreshKey]);

  const reactivate = async (row: PendingRow) => {
    setBusyUserId(row.user_id);
    const { error } = await supabase.rpc('reactivate_consent', {
      p_user_id: row.user_id,
      p_member_id: row.member_id,
    });
    setBusyUserId(null);
    if (error) {
      setFetchError(true);
      return;
    }
    setRefreshKey((k) => k + 1);
  };

  const confirmErase = async () => {
    const row = pending.find((p) => p.user_id === eraseTargetUserId);
    if (!row) return;
    setBusyUserId(row.user_id);
    const { error } = await supabase.functions.invoke('erase-consent-withdrawal', {
      body: { member_id: row.member_id, requester_user_id: row.user_id, scope: row.scope },
    });
    setBusyUserId(null);
    setEraseTargetUserId(null);
    setEraseConfirmText('');
    if (error) {
      setFetchError(true);
      return;
    }
    setRefreshKey((k) => k + 1);
  };

  if (loading) {
    return <div className="card">Loading…</div>;
  }

  return (
    <>
      {fetchError && (
        <div className="card" role="alert">
          <span>Something went wrong loading consent requests.</span>
          <button type="button" onClick={() => setFetchError(false)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="page-header">
        <div className="page-header__txt">
          <h1>Consent Requests</h1>
          <p>Withdrawal requests awaiting verification, oldest first.</p>
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
          <span className="section-card__title">Pending ({pending.length})</span>
        </div>
        {pending.length === 0 ? (
          <p className="t-body-m">No pending consent requests.</p>
        ) : (
          pending.map((row) => (
            <div key={row.user_id} className="info-card" style={{ marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <h4>{row.requester_name}</h4>
                <p>
                  {row.requester_email} · Member: <strong>{row.member_name}</strong>
                </p>
                <p>
                  Requested: <strong>{scopeLabel(row.scope)}</strong> ·{' '}
                  {new Date(row.requested_at).toLocaleString()}
                </p>

                {eraseTargetUserId === row.user_id ? (
                  <div className="field field--full" style={{ marginTop: '8px' }}>
                    <label htmlFor={`erase-confirm-${row.user_id}`}>
                      Type WITHDRAW to confirm
                    </label>
                    <input
                      id={`erase-confirm-${row.user_id}`}
                      type="text"
                      value={eraseConfirmText}
                      onChange={(e) => setEraseConfirmText(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button
                        type="button"
                        className="btn btn--danger btn--sm"
                        disabled={
                          eraseConfirmText.trim().toUpperCase() !== 'WITHDRAW' ||
                          busyUserId === row.user_id
                        }
                        onClick={confirmErase}
                      >
                        Confirm erasure
                      </button>
                      <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        onClick={() => {
                          setEraseTargetUserId(null);
                          setEraseConfirmText('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button
                      type="button"
                      className="btn btn--outline btn--sm"
                      disabled={busyUserId === row.user_id}
                      onClick={() => reactivate(row)}
                    >
                      False alarm — reactivate
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger btn--sm"
                      disabled={busyUserId === row.user_id}
                      onClick={() => setEraseTargetUserId(row.user_id)}
                    >
                      Verified — erase permanently
                    </button>
                  </div>
                )}
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
          <p className="t-body-m">No resolved requests yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Outcome</th>
                <th>Resolved</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id}>
                  <td>{row.member_name}</td>
                  <td>{row.outcome === 'erased' ? 'Erased' : 'Reactivated'}</td>
                  <td>{new Date(row.resolved_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
