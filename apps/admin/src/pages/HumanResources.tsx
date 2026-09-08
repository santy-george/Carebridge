import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  DISCIPLINE_LABELS,
  EMPLOYMENT_STATUS_CHIP_CLASS,
  EMPLOYMENT_STATUS_LABELS,
  PCC_STATUS_CHIP_CLASS,
  PCC_STATUS_LABELS,
  sortStaffByName,
  type EmploymentStatus,
  type PccStatus,
  type StaffDiscipline,
} from '../lib/staff';
import { initialsFor } from '../lib/members';

interface StaffRow {
  id: string;
  discipline: StaffDiscipline | null;
  qualification: string | null;
  pcc_status: PccStatus;
  service_area: string | null;
  employment_status: EmploymentStatus;
  profiles: { full_name: string } | null;
}

export function HumanResources() {
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [staff, setStaff] = useState<StaffRow[]>([]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      const { data, error } = await supabase
        .from('staff_profiles')
        .select(
          'id, discipline, qualification, pcc_status, service_area, employment_status, profiles(full_name)',
        )
        .order('created_at', { ascending: false });
      if (ignore) return;
      setLoading(false);
      setFetchError(!!error);
      if (data) setStaff(data as unknown as StaffRow[]);
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  if (loading) {
    return <div className="card">Loading…</div>;
  }

  const named = staff
    .filter((s) => s.profiles)
    .map((s) => ({ ...s, full_name: s.profiles!.full_name }));
  const sorted = sortStaffByName(named);
  const activeCount = staff.filter((s) => s.employment_status === 'active').length;
  const inactiveCount = staff.filter((s) => s.employment_status === 'inactive').length;

  return (
    <>
      {fetchError && (
        <div className="card" role="alert">
          <span>Something went wrong loading staff.</span>
          <button type="button" onClick={() => setFetchError(false)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="page-header">
        <div className="page-header__txt">
          <h1>Human Resources</h1>
          <p>Field staff — nurses, caregivers, physios and doctors.</p>
        </div>
      </div>

      <div className="metric-row">
        <div className="metric">
          <div className="metric__label">Total staff</div>
          <div className="metric__num">{staff.length}</div>
        </div>
        <div className="metric metric--success">
          <div className="metric__label">Active</div>
          <div className="metric__num">{activeCount}</div>
        </div>
        <div className="metric">
          <div className="metric__label">Inactive</div>
          <div className="metric__num">{inactiveCount}</div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="card">
          <span>No staff on file yet.</span>
        </div>
      ) : (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Staff</th>
                <th>Discipline</th>
                <th>Qualification</th>
                <th>PCC status</th>
                <th>Service area</th>
                <th>Employment status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="u">
                      <span className="avatar avatar--sm">{initialsFor(s.full_name)}</span>
                      <Link className="name cell-link" to={`/human-resources/${s.id}`}>
                        {s.full_name}
                      </Link>
                    </div>
                  </td>
                  <td>{s.discipline ? DISCIPLINE_LABELS[s.discipline] : '—'}</td>
                  <td>{s.qualification ?? '—'}</td>
                  <td>
                    <span className={`chip ${PCC_STATUS_CHIP_CLASS[s.pcc_status]}`}>
                      <span className="dot" />
                      {PCC_STATUS_LABELS[s.pcc_status]}
                    </span>
                  </td>
                  <td>{s.service_area ?? '—'}</td>
                  <td>
                    <span className={`chip ${EMPLOYMENT_STATUS_CHIP_CLASS[s.employment_status]}`}>
                      <span className="dot" />
                      {EMPLOYMENT_STATUS_LABELS[s.employment_status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
