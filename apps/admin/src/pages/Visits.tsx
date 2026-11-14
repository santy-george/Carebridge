import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { ScheduleVisitDrawer } from '../components/ScheduleVisitDrawer';
import {
  VISIT_STATUS_CHIP_CLASS,
  VISIT_STATUS_LABELS,
  closeVisit,
  fetchVisits,
  formatDay,
  formatTime,
  localRange,
  type AdminVisit,
  type VisitStatus,
} from '../lib/visits';

type StatusFilter = 'all' | VisitStatus;

const FILTERS: StatusFilter[] = [
  'all',
  'scheduled',
  'in_progress',
  'completed',
  'missed',
  'cancelled',
];

export function Visits() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [visits, setVisits] = useState<AdminVisit[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function load() {
      // Two weeks back, two weeks ahead.
      const now = new Date();
      const past = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);
      const { from } = localRange(past, 0);
      const { to } = localRange(now, 14);
      try {
        const rows = await fetchVisits(from, to);
        if (ignore) return;
        setVisits(rows);
        setFetchError(false);
      } catch {
        if (!ignore) setFetchError(true);
      }
      if (!ignore) setLoading(false);
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const close = async (id: string, status: 'cancelled' | 'missed') => {
    setActionError(false);
    try {
      await closeVisit(id, status);
      setRefreshKey((k) => k + 1);
    } catch {
      setActionError(true);
    }
  };

  if (loading) return <div className="card">Loading…</div>;

  const shown = filter === 'all' ? visits : visits.filter((v) => v.status === filter);
  const count = (s: VisitStatus) => visits.filter((v) => v.status === s).length;

  return (
    <>
      {fetchError && (
        <div className="card" role="alert">
          <span>Something went wrong loading visits.</span>
        </div>
      )}
      {actionError && (
        <div className="card" role="alert">
          <span>Could not update the visit.</span>
          <button type="button" onClick={() => setActionError(false)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="page-header">
        <div className="page-header__txt">
          <h1>Visits &amp; Duties</h1>
          <p>Schedule visits and follow them through to completion.</p>
        </div>
        <div className="page-header__actions">
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => setDrawerOpen(true)}
          >
            Schedule visit
          </button>
        </div>
      </div>

      <div className="metric-row">
        <div className="metric">
          <div className="metric__label">Scheduled</div>
          <div className="metric__num">{count('scheduled')}</div>
        </div>
        <div className="metric">
          <div className="metric__label">In progress</div>
          <div className="metric__num">{count('in_progress')}</div>
        </div>
        <div className="metric metric--success">
          <div className="metric__label">Completed</div>
          <div className="metric__num">{count('completed')}</div>
        </div>
        <div className="metric">
          <div className="metric__label">Missed</div>
          <div className="metric__num">{count('missed')}</div>
        </div>
      </div>

      <div className="segmented" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={filter === f ? 'is-active' : ''}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : VISIT_STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card">
          <span>No visits in this window.</span>
        </div>
      ) : (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Member</th>
                <th>Staff</th>
                <th>Service</th>
                <th>Status</th>
                <th>Report</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((v) => (
                <tr key={v.id}>
                  <td>
                    {formatDay(v.scheduled_start)}, {formatTime(v.scheduled_start)}–
                    {formatTime(v.scheduled_end)}
                  </td>
                  <td>
                    <Link className="name cell-link" to={`/members/${v.member_id}`}>
                      {v.member_name}
                    </Link>
                  </td>
                  <td>{v.staff_name}</td>
                  <td>{v.service_type}</td>
                  <td>
                    <span className={`chip ${VISIT_STATUS_CHIP_CLASS[v.status]}`}>
                      <span className="dot" />
                      {VISIT_STATUS_LABELS[v.status]}
                    </span>
                  </td>
                  <td>{v.report_submitted ? 'Submitted' : '—'}</td>
                  <td>
                    {v.status === 'scheduled' && (
                      <>
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          onClick={() => void close(v.id, 'cancelled')}
                        >
                          Cancel
                        </button>{' '}
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          onClick={() => void close(v.id, 'missed')}
                        >
                          Mark missed
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ScheduleVisitDrawer
        open={drawerOpen}
        createdBy={session?.user.id ?? null}
        onClose={() => setDrawerOpen(false)}
        onCreated={() => setRefreshKey((k) => k + 1)}
      />
    </>
  );
}
