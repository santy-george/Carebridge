import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';
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

const DISCIPLINE_OPTIONS = Object.keys(DISCIPLINE_LABELS) as StaffDiscipline[];
const PCC_STATUS_OPTIONS = Object.keys(PCC_STATUS_LABELS) as PccStatus[];
const EMPLOYMENT_STATUS_OPTIONS = Object.keys(EMPLOYMENT_STATUS_LABELS) as EmploymentStatus[];
const RATE_TYPE_OPTIONS = Object.keys(RATE_TYPE_LABELS) as StaffRateType[];

interface StaffFormState {
  discipline: StaffDiscipline | '';
  qualification: string;
  pcc_status: PccStatus;
  experience_years: string;
  languages: string;
  service_area: string;
  service_radius_km: string;
  employment_status: EmploymentStatus;
  rate_type: StaffRateType | '';
  visit_rate: string;
  emergency_duty_rate: string;
}

function toFormState(staff: StaffDetail): StaffFormState {
  return {
    discipline: staff.discipline ?? '',
    qualification: staff.qualification ?? '',
    pcc_status: staff.pcc_status,
    experience_years: staff.experience_years != null ? String(staff.experience_years) : '',
    languages: staff.languages.join(', '),
    service_area: staff.service_area ?? '',
    service_radius_km: staff.service_radius_km != null ? String(staff.service_radius_km) : '',
    employment_status: staff.employment_status,
    rate_type: staff.rate_type ?? '',
    visit_rate: staff.visit_rate != null ? String(staff.visit_rate) : '',
    emergency_duty_rate: staff.emergency_duty_rate != null ? String(staff.emergency_duty_rate) : '',
  };
}

export function StaffProfile() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<StaffFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  const startEditing = () => {
    setSaveError(null);
    setForm(toFormState(staff));
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setForm(null);
    setSaveError(null);
  };

  const save = async () => {
    if (!form || !id) return;
    setSaving(true);
    setSaveError(null);

    const experienceYears = form.experience_years.trim() ? Number(form.experience_years) : null;
    const serviceRadiusKm = form.service_radius_km.trim() ? Number(form.service_radius_km) : null;
    const visitRate = form.visit_rate.trim() ? Number(form.visit_rate) : null;
    const emergencyDutyRate = form.emergency_duty_rate.trim()
      ? Number(form.emergency_duty_rate)
      : null;

    const { data, error } = await supabase
      .from('staff_profiles')
      .update({
        discipline: form.discipline || null,
        qualification: form.qualification.trim() || null,
        pcc_status: form.pcc_status,
        experience_years: experienceYears,
        languages: form.languages
          .split(',')
          .map((l) => l.trim())
          .filter(Boolean),
        service_area: form.service_area.trim() || null,
        service_radius_km: serviceRadiusKm,
        employment_status: form.employment_status,
        rate_type: form.rate_type || null,
        visit_rate: visitRate,
        emergency_duty_rate: emergencyDutyRate,
      })
      .eq('id', id)
      .select(
        'id, discipline, qualification, pcc_status, experience_years, languages, service_area, service_radius_km, employment_status, rate_type, visit_rate, emergency_duty_rate, profiles(full_name)',
      )
      .maybeSingle();

    setSaving(false);
    if (error || !data) {
      setSaveError('Something went wrong saving these changes.');
      return;
    }
    setStaff(data as unknown as StaffDetail);
    setEditing(false);
    setForm(null);
  };

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
          {isAdmin && !editing && (
            <button type="button" className="btn btn--outline btn--sm" onClick={startEditing}>
              Edit
            </button>
          )}
        </div>
      </div>

      {editing && form ? (
        <form
          className="section-card"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="section-card__head">
            <span className="section-card__title">Edit profile</span>
          </div>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="edit-discipline">Discipline</label>
              <select
                id="edit-discipline"
                value={form.discipline}
                onChange={(e) =>
                  setForm({ ...form, discipline: e.target.value as StaffDiscipline | '' })
                }
              >
                <option value="">Not set</option>
                {DISCIPLINE_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {DISCIPLINE_LABELS[d]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="edit-qualification">Qualification</label>
              <input
                id="edit-qualification"
                type="text"
                value={form.qualification}
                onChange={(e) => setForm({ ...form, qualification: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="edit-pcc-status">PCC status</label>
              <select
                id="edit-pcc-status"
                value={form.pcc_status}
                onChange={(e) => setForm({ ...form, pcc_status: e.target.value as PccStatus })}
              >
                {PCC_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {PCC_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="edit-experience">Experience (years)</label>
              <input
                id="edit-experience"
                type="number"
                min="0"
                value={form.experience_years}
                onChange={(e) => setForm({ ...form, experience_years: e.target.value })}
              />
            </div>
            <div className="field field--full">
              <label htmlFor="edit-languages">Languages (comma-separated)</label>
              <input
                id="edit-languages"
                type="text"
                value={form.languages}
                onChange={(e) => setForm({ ...form, languages: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="edit-service-area">Service area</label>
              <input
                id="edit-service-area"
                type="text"
                value={form.service_area}
                onChange={(e) => setForm({ ...form, service_area: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="edit-service-radius">Service radius (km)</label>
              <input
                id="edit-service-radius"
                type="number"
                min="0"
                value={form.service_radius_km}
                onChange={(e) => setForm({ ...form, service_radius_km: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="edit-employment-status">Employment status</label>
              <select
                id="edit-employment-status"
                value={form.employment_status}
                onChange={(e) =>
                  setForm({ ...form, employment_status: e.target.value as EmploymentStatus })
                }
              >
                {EMPLOYMENT_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {EMPLOYMENT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="edit-rate-type">Rate type</label>
              <select
                id="edit-rate-type"
                value={form.rate_type}
                onChange={(e) =>
                  setForm({ ...form, rate_type: e.target.value as StaffRateType | '' })
                }
              >
                <option value="">Not set</option>
                {RATE_TYPE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {RATE_TYPE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="edit-visit-rate">Visit rate (₹)</label>
              <input
                id="edit-visit-rate"
                type="number"
                min="0"
                value={form.visit_rate}
                onChange={(e) => setForm({ ...form, visit_rate: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="edit-emergency-rate">Emergency duty rate (₹)</label>
              <input
                id="edit-emergency-rate"
                type="number"
                min="0"
                value={form.emergency_duty_rate}
                onChange={(e) => setForm({ ...form, emergency_duty_rate: e.target.value })}
              />
            </div>
          </div>
          {saveError && (
            <p className="form-error" role="alert">
              {saveError}
            </p>
          )}
          <div className="section-card__foot">
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={cancelEditing}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      ) : (
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
      )}
    </>
  );
}
