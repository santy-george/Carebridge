import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchVisitReports,
  formatDay,
  formatTime,
  formatVitals,
  localRange,
  type AdminVisitReport,
} from '../lib/visits';

export function VisitReports() {
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [reports, setReports] = useState<AdminVisitReport[]>([]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      const now = new Date();
      const past = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
      const { from } = localRange(past, 0);
      const { to } = localRange(now, 1);
      try {
        const rows = await fetchVisitReports(from, to);
        if (ignore) return;
        setReports(rows);
      } catch {
        if (!ignore) setFetchError(true);
      }
      if (!ignore) setLoading(false);
    }
    void load();
    return () => {
      ignore = true;
    };
  }, []);

  if (loading) return <div className="card">Loading…</div>;

  return (
    <>
      {fetchError && (
        <div className="card" role="alert">
          <span>Something went wrong loading reports.</span>
        </div>
      )}

      <div className="page-header">
        <div className="page-header__txt">
          <h1>Visit Reports</h1>
          <p>Reports field staff have submitted in the last 30 days.</p>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="card">
          <span>No submitted reports yet.</span>
        </div>
      ) : (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Visit</th>
                <th>Member</th>
                <th>Staff</th>
                <th>Vitals</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.visit_id}>
                  <td>
                    {formatDay(r.scheduled_start)}, {formatTime(r.scheduled_start)}
                    <div>{r.service_type}</div>
                  </td>
                  <td>
                    <Link className="name cell-link" to={`/members/${r.member_id}`}>
                      {r.member_name}
                    </Link>
                  </td>
                  <td>{r.staff_name}</td>
                  <td>{formatVitals(r)}</td>
                  <td>{r.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
