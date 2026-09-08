import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  DISCIPLINE_LABELS,
  EMPLOYMENT_STATUS_CHIP_CLASS,
  EMPLOYMENT_STATUS_LABELS,
  PCC_STATUS_LABELS,
  RATE_TYPE_LABELS,
  type EmploymentStatus,
  type PccStatus,
  type StaffDiscipline,
  type StaffRateType,
} from '../lib/staff';
import { initialsFor } from '../lib/members';

interface StaffDetail {
  id: string;
  discipline: StaffDiscipline | null;
  qualification: string | null;
  pcc_status: PccStatus;
  experience_years: number | null;
  languages: string[];
  service_area: string | null;
  service_radius_km: number | null;
  employment_status: EmploymentStatus;
  rate_type: StaffRateType | null;
  visit_rate: number | null;
  emergency_duty_rate: number | null;
  profiles: { full_name: string } | null;
}

export function StaffProfile() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffDetail | null>(null);

  useEffect(() => {
    let ignore = false;
    if (!id) return;

    async function load() {
      const { data } = await supabase
        .from('staff_profiles')
        .select(
          'id, discipline, qualification, pcc_status, experience_years, languages, service_area, service_radius_km, employment_status, rate_type, visit_rate, emergency_duty_rate, profiles(full_name)',
        )
        .eq('id', id!)
        .maybeSingle();
      if (ignore) return;
      setLoading(false);
      setStaff((data as unknown as StaffDetail | null) ?? null);
    }

    load();
    return () => {
      ignore = true;
    };
  }, [id]);

  if (loading) {
    return <div className="card">Loading…</div>;
  }

  if (!staff || !staff.profiles) {
    return (
      <div className="card">
        <span>Staff member not found.</span>
      </div>
    );
  }

  const fullName = staff.profiles.full_name;

  return (
    <>
      <div className="breadcrumb">
        <Link to="/human-resources">Human Resources</Link>
        <span>{fullName}</span>
      </div>

      <div className="page-header">
        <div className="profile-hero">
          <span className="avatar-lg">{initialsFor(fullName)}</span>
          <div>
            <h2>{fullName}</h2>
            <div className="meta">
              {staff.discipline ? DISCIPLINE_LABELS[staff.discipline] : 'Discipline not set'}
              {staff.service_area ? ` · ${staff.service_area}` : ''}
            </div>
          </div>
        </div>
        <div className="page-header__actions">
          <span className={`chip ${EMPLOYMENT_STATUS_CHIP_CLASS[staff.employment_status]}`}>
            <span className="dot" />
            {EMPLOYMENT_STATUS_LABELS[staff.employment_status]}
          </span>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="section-card">
            <div className="section-card__head">
              <span className="section-card__title">Profile</span>
            </div>
            <div className="kv">
              <div className="kv__row">
                <span className="kv__k">Discipline</span>
                <span className="kv__v">
                  {staff.discipline ? DISCIPLINE_LABELS[staff.discipline] : '—'}
                </span>
              </div>
              <div className="kv__row">
                <span className="kv__k">Qualification</span>
                <span className="kv__v">{staff.qualification ?? '—'}</span>
              </div>
              <div className="kv__row">
                <span className="kv__k">PCC status</span>
                <span className="kv__v">{PCC_STATUS_LABELS[staff.pcc_status]}</span>
              </div>
              <div className="kv__row">
                <span className="kv__k">Experience</span>
                <span className="kv__v">
                  {staff.experience_years != null ? staff.experience_years : '—'}
                </span>
              </div>
              <div className="kv__row">
                <span className="kv__k">Languages</span>
                <span className="kv__v">
                  {staff.languages.length > 0 ? staff.languages.join(', ') : '—'}
                </span>
              </div>
              <div className="kv__row">
                <span className="kv__k">Service area</span>
                <span className="kv__v">
                  {staff.service_area ?? '—'}
                  {staff.service_radius_km != null ? ` · ${staff.service_radius_km} km` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        <aside className="detail-side">
          <div className="section-card">
            <div className="section-card__title" style={{ marginBottom: '8px' }}>
              Payment settings
            </div>
            <div className="kv">
              <div className="kv__row">
                <span className="kv__k">Rate type</span>
                <span className="kv__v">
                  {staff.rate_type ? RATE_TYPE_LABELS[staff.rate_type] : '—'}
                </span>
              </div>
              <div className="kv__row">
                <span className="kv__k">Visit rate</span>
                <span className="kv__v">
                  {staff.visit_rate != null ? `₹${staff.visit_rate}` : '—'}
                </span>
              </div>
              <div className="kv__row">
                <span className="kv__k">Emergency duty</span>
                <span className="kv__v">
                  {staff.emergency_duty_rate != null ? `₹${staff.emergency_duty_rate}` : '—'}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
