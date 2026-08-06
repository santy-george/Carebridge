import { useEffect, useState } from 'react';
import type { Database } from '@carebridge/db-types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';
import {
  CARE_MODEL_LABELS,
  PLAN_LEVEL_LABELS,
  type CareModel,
  type PlanLevel,
} from '../lib/members';
import {
  STATUS_CHIP_CLASS,
  STATUS_LABELS,
  sortClosed,
  sortOpen,
  type LeadStatus,
} from '../lib/leads';

interface LeadRow {
  id: string;
  member_id: string;
  requested_care_model: CareModel;
  requested_plan_level: PlanLevel | null;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  followed_up_at: string | null;
  members: { full_name: string; phone: string | null; location: string | null } | null;
}

type LeadUpdate = Database['public']['Tables']['upgrade_leads']['Update'];

const REFRESH_INTERVAL_MS = 30000;

export function Leads() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function load() {
      const { data, error } = await supabase
        .from('upgrade_leads')
        .select(
          'id, member_id, requested_care_model, requested_plan_level, status, notes, created_at, followed_up_at, members(full_name, phone, location)',
        )
        .order('created_at', { ascending: false })
        .limit(100);
      if (ignore) return;
      setLoading(false);
      setFetchError(!!error);
      if (data) setLeads(data as unknown as LeadRow[]);
    }

    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [refreshKey]);

  const updateStatus = async (id: string, status: LeadStatus) => {
    if (!session) return;
    setBusyId(id);
    const patch: LeadUpdate = {
      status,
      followed_up_by: session.user.id,
      followed_up_at: new Date().toISOString(),
      ...(noteDrafts[id]?.trim() && { notes: noteDrafts[id].trim() }),
    };
    const { error } = await supabase.from('upgrade_leads').update(patch).eq('id', id);
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

  const open = sortOpen(leads);
  const closed = sortClosed(leads).slice(0, 25);

  return (
    <>
      {fetchError && (
        <div className="card" role="alert">
          <span>Something went wrong loading upgrade leads.</span>
          <button type="button" onClick={() => setFetchError(false)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="page-header">
        <div className="page-header__txt">
          <h1>Managed-Care Leads</h1>
          <p>Members interested in moving to Virtual or Direct Care.</p>
        </div>
        <div className="page-header__actions">
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
          <span className="section-card__title">Open ({open.length})</span>
        </div>
        {open.length === 0 ? (
          <p className="t-body-m">No open leads.</p>
        ) : (
          open.map((lead) => (
            <div className="info-card" style={{ marginBottom: '12px' }} key={lead.id}>
              <div style={{ flex: 1 }}>
                <h4>
                  {lead.members?.full_name ?? 'Unknown member'} →{' '}
                  {CARE_MODEL_LABELS[lead.requested_care_model]}
                  {lead.requested_plan_level
                    ? ` · ${PLAN_LEVEL_LABELS[lead.requested_plan_level]}`
                    : ''}
                </h4>
                <p>
                  <span className={`chip ${STATUS_CHIP_CLASS[lead.status]}`}>
                    {STATUS_LABELS[lead.status]}
                  </span>
                  {' · '}
                  {lead.members?.phone ?? 'No phone on file'}
                  {lead.members?.location ? ` · ${lead.members.location}` : ''}
                </p>
                <div className="field field--full" style={{ marginTop: '8px' }}>
                  <label htmlFor={`lead-note-${lead.id}`}>Follow-up notes</label>
                  <textarea
                    id={`lead-note-${lead.id}`}
                    placeholder="Call outcome, next steps…"
                    value={noteDrafts[lead.id] ?? lead.notes ?? ''}
                    onChange={(e) =>
                      setNoteDrafts((prev) => ({ ...prev, [lead.id]: e.target.value }))
                    }
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  {lead.status === 'new' && (
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      disabled={busyId === lead.id}
                      onClick={() => updateStatus(lead.id, 'contacted')}
                    >
                      Mark contacted
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    disabled={busyId === lead.id}
                    onClick={() => updateStatus(lead.id, 'converted')}
                  >
                    Mark converted
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={busyId === lead.id}
                    onClick={() => updateStatus(lead.id, 'declined')}
                  >
                    Mark declined
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
        {closed.length === 0 ? (
          <p className="t-body-m">No converted or declined leads yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Requested</th>
                <th>Status</th>
                <th>Followed up</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {closed.map((lead) => (
                <tr key={lead.id}>
                  <td>{lead.members?.full_name ?? 'Unknown member'}</td>
                  <td>
                    {CARE_MODEL_LABELS[lead.requested_care_model]}
                    {lead.requested_plan_level
                      ? ` · ${PLAN_LEVEL_LABELS[lead.requested_plan_level]}`
                      : ''}
                  </td>
                  <td>
                    <span className={`chip ${STATUS_CHIP_CLASS[lead.status]}`}>
                      {STATUS_LABELS[lead.status]}
                    </span>
                  </td>
                  <td>
                    {lead.followed_up_at ? new Date(lead.followed_up_at).toLocaleString() : '—'}
                  </td>
                  <td>{lead.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
