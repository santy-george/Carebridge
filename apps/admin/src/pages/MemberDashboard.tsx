import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';
import {
  CARE_MODEL_LABELS,
  PLAN_LEVEL_LABELS,
  adherencePercent,
  calculateAge,
  calculateBmi,
  categorizeBmi,
  classifyBloodPressure,
  classifyGlucose,
  classifySpo2,
  initialsFor,
  type CareModel,
  type GlucoseContext,
  type PlanLevel,
} from '../lib/members';

interface Member {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  location: string | null;
  care_model: CareModel;
  plan_level: PlanLevel;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
}

interface MedicalProfile {
  conditions: string[];
  conditions_other: string | null;
  allergies: string[];
  notes: string | null;
}

interface Checkin {
  checkin_date: string;
  mood: string | null;
  energy: string | null;
  sleep: string | null;
  aches: string | null;
  wellness_score: number | null;
}

interface Medication {
  id: string;
  name: string;
  dosage: string | null;
  high_risk: boolean;
}

interface MedicationLog {
  taken: boolean;
}

interface VitalRow {
  vital_type: string;
  value: number;
  recorded_at: string;
}

interface GlucoseRow {
  value_mg_dl: number;
  context: GlucoseContext;
  reading_date: string;
}

interface SosAlert {
  id: string;
  alert_type: 'manual' | 'wearable_fall';
  status: string;
  triggered_at: string;
  notes: string | null;
}

interface CareTeamMember {
  id: string;
  role_label: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
}

function latestByType(rows: VitalRow[], type: string): VitalRow | null {
  return rows.find((r) => r.vital_type === type) ?? null;
}

export function MemberDashboard() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [member, setMember] = useState<Member | null>(null);
  const [medicalProfile, setMedicalProfile] = useState<MedicalProfile | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>([]);
  const [vitals, setVitals] = useState<VitalRow[]>([]);
  const [glucose, setGlucose] = useState<GlucoseRow | null>(null);
  const [sosAlerts, setSosAlerts] = useState<SosAlert[]>([]);
  const [careTeam, setCareTeam] = useState<CareTeamMember[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [careName, setCareName] = useState('');
  const [careRole, setCareRole] = useState('');
  const [carePhone, setCarePhone] = useState('');
  const [careEmail, setCareEmail] = useState('');
  const [careAddress, setCareAddress] = useState('');
  const [careNotes, setCareNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    let ignore = false;
    if (!id) return;
    const memberId = id;

    async function load() {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

      const [
        memberRes,
        profileRes,
        checkinsRes,
        medsRes,
        logsRes,
        vitalsRes,
        glucoseRes,
        sosRes,
        careTeamRes,
      ] = await Promise.all([
        supabase
          .from('members')
          .select(
            'id, full_name, date_of_birth, gender, phone, location, care_model, plan_level, emergency_contact_name, emergency_contact_phone',
          )
          .eq('id', memberId)
          .maybeSingle(),
        supabase
          .from('medical_profile')
          .select('conditions, conditions_other, allergies, notes')
          .eq('member_id', memberId)
          .maybeSingle(),
        supabase
          .from('checkins')
          .select('checkin_date, mood, energy, sleep, aches, wellness_score')
          .eq('member_id', memberId)
          .order('checkin_date', { ascending: false })
          .limit(10),
        supabase
          .from('medications')
          .select('id, name, dosage, high_risk')
          .eq('member_id', memberId)
          .eq('active', true),
        supabase
          .from('medication_logs')
          .select('taken')
          .eq('member_id', memberId)
          .gte('scheduled_date', sevenDaysAgo),
        supabase
          .from('vitals_readings')
          .select('vital_type, value, recorded_at')
          .eq('member_id', memberId)
          .in('vital_type', ['blood_pressure', 'spo2_pct', 'weight_kg', 'height_cm'])
          .order('recorded_at', { ascending: false }),
        supabase
          .from('glucose_readings')
          .select('value_mg_dl, context, reading_date')
          .eq('member_id', memberId)
          .order('reading_date', { ascending: false })
          .limit(1),
        supabase
          .from('sos_alerts')
          .select('id, alert_type, status, triggered_at, notes')
          .eq('member_id', memberId)
          .order('triggered_at', { ascending: false }),
        supabase
          .from('care_team')
          .select('id, role_label, name, phone, email, address, notes')
          .eq('member_id', memberId)
          .order('display_order', { ascending: true }),
      ]);

      if (ignore) return;
      setLoading(false);
      const anyError =
        memberRes.error ||
        profileRes.error ||
        checkinsRes.error ||
        medsRes.error ||
        logsRes.error ||
        vitalsRes.error ||
        glucoseRes.error ||
        sosRes.error ||
        careTeamRes.error;
      setFetchError(!!anyError);
      setMember((memberRes.data as Member | null) ?? null);
      setMedicalProfile((profileRes.data as MedicalProfile | null) ?? null);
      setCheckins((checkinsRes.data as Checkin[] | null) ?? []);
      setMedications((medsRes.data as Medication[] | null) ?? []);
      setMedicationLogs((logsRes.data as MedicationLog[] | null) ?? []);
      setVitals((vitalsRes.data as VitalRow[] | null) ?? []);
      const glucoseRows = (glucoseRes.data as GlucoseRow[] | null) ?? [];
      setGlucose(glucoseRows[0] ?? null);
      setSosAlerts((sosRes.data as SosAlert[] | null) ?? []);
      setCareTeam((careTeamRes.data as CareTeamMember[] | null) ?? []);
    }

    load();
    return () => {
      ignore = true;
    };
  }, [id]);

  const addCareTeamMember = async () => {
    if (!id || !session || !careName.trim()) return;
    setSaving(true);
    setSaveError(false);
    const { data, error } = await supabase
      .from('care_team')
      .insert({
        member_id: id,
        name: careName.trim(),
        role_label: careRole.trim() || 'Care team member',
        phone: carePhone.trim() || null,
        email: careEmail.trim() || null,
        address: careAddress.trim() || null,
        notes: careNotes.trim() || null,
        display_order: careTeam.length,
        created_by: session.user.id,
      })
      .select('id, role_label, name, phone, email, address, notes')
      .single();
    setSaving(false);
    if (error || !data) {
      setSaveError(true);
      return;
    }
    setCareTeam((prev) => [...prev, data as CareTeamMember]);
    setCareName('');
    setCareRole('');
    setCarePhone('');
    setCareEmail('');
    setCareAddress('');
    setCareNotes('');
    setDrawerOpen(false);
  };

  const removeCareTeamMember = async (careTeamId: string) => {
    const { error } = await supabase.from('care_team').delete().eq('id', careTeamId);
    if (error) {
      setSaveError(true);
      return;
    }
    setCareTeam((prev) => prev.filter((m) => m.id !== careTeamId));
  };

  if (loading) {
    return <div className="card">Loading…</div>;
  }

  if (!member) {
    return (
      <div className="card">
        <span>Member not found, or not assigned to you.</span>
      </div>
    );
  }

  const bp = latestByType(vitals, 'blood_pressure');
  const spo2 = latestByType(vitals, 'spo2_pct');
  const weight = latestByType(vitals, 'weight_kg');
  const height = latestByType(vitals, 'height_cm');
  const bmi = weight && height ? calculateBmi(weight.value, height.value) : null;
  const adherence = adherencePercent(medicationLogs);

  return (
    <>
      {fetchError && (
        <div className="card" role="alert">
          <span>Something went wrong loading this member.</span>
          <button type="button" onClick={() => setFetchError(false)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="breadcrumb">
        <Link to="/members">Members</Link>
        <span>{member.full_name}</span>
      </div>

      <div className="page-header">
        <div className="profile-hero">
          <span className="avatar-lg">{initialsFor(member.full_name)}</span>
          <div>
            <h2>{member.full_name}</h2>
            <div className="meta">
              {member.gender ? `${member.gender} · ` : ''}
              {member.date_of_birth ? `${calculateAge(member.date_of_birth)}y · ` : ''}
              {member.location ?? 'Location unknown'}
            </div>
          </div>
        </div>
        <div className="page-header__actions">
          <span className="model-chip">
            {CARE_MODEL_LABELS[member.care_model]} · {PLAN_LEVEL_LABELS[member.plan_level]}
          </span>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="section-card">
            <div className="section-card__head">
              <span className="section-card__title">Medical summary</span>
            </div>
            <div className="kv">
              <div className="kv__row">
                <span className="kv__k">Conditions</span>
                <span className="kv__v">
                  {[...(medicalProfile?.conditions ?? []), medicalProfile?.conditions_other]
                    .filter(Boolean)
                    .join(', ') || 'None on file'}
                </span>
              </div>
              <div className="kv__row">
                <span className="kv__k">Allergies</span>
                <span className="kv__v">
                  {medicalProfile?.allergies.join(', ') || 'None on file'}
                </span>
              </div>
              <div className="kv__row">
                <span className="kv__k">Notes</span>
                <span className="kv__v">{medicalProfile?.notes || '—'}</span>
              </div>
            </div>
          </div>

          <div className="section-card">
            <div className="section-card__head">
              <span className="section-card__title">Care team</span>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => setDrawerOpen(true)}
              >
                + Add
              </button>
            </div>
            {saveError && (
              <p className="form-error" role="alert">
                Something went wrong saving the care team — try again.
              </p>
            )}
            {careTeam.length === 0 ? (
              <p className="t-body-m">No care team members added yet.</p>
            ) : (
              <div className="kv">
                {careTeam.map((ct) => (
                  <div className="kv__row" key={ct.id}>
                    <span className="kv__k">
                      {ct.name}
                      <div className="sub">{ct.role_label}</div>
                    </span>
                    <span
                      className="kv__v"
                      style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                    >
                      {[ct.phone, ct.email].filter(Boolean).join(' · ') || '—'}
                      <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        onClick={() => removeCareTeamMember(ct.id)}
                      >
                        Remove
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="section-card">
            <div className="section-card__head">
              <span className="section-card__title">Vitals (latest)</span>
            </div>
            <div className="kv">
              <div className="kv__row">
                <span className="kv__k">Blood pressure</span>
                <span className="kv__v">
                  {bp ? (
                    <>
                      {bp.value}{' '}
                      <span className={`chip2 ${classifyBloodPressure(bp.value).chipClass}`}>
                        {classifyBloodPressure(bp.value).label}
                      </span>
                    </>
                  ) : (
                    '—'
                  )}
                </span>
              </div>
              <div className="kv__row">
                <span className="kv__k">SpO2</span>
                <span className="kv__v">
                  {spo2 ? (
                    <>
                      {spo2.value}%{' '}
                      <span className={`chip2 ${classifySpo2(spo2.value).chipClass}`}>
                        {classifySpo2(spo2.value).label}
                      </span>
                    </>
                  ) : (
                    '—'
                  )}
                </span>
              </div>
              <div className="kv__row">
                <span className="kv__k">Blood glucose</span>
                <span className="kv__v">
                  {glucose ? (
                    <>
                      {glucose.value_mg_dl} mg/dL ({glucose.context}){' '}
                      <span
                        className={`chip2 ${classifyGlucose(glucose.value_mg_dl, glucose.context).chipClass}`}
                      >
                        {classifyGlucose(glucose.value_mg_dl, glucose.context).label}
                      </span>
                    </>
                  ) : (
                    '—'
                  )}
                </span>
              </div>
              <div className="kv__row">
                <span className="kv__k">BMI</span>
                <span className="kv__v">
                  {bmi != null ? (
                    <>
                      {bmi}{' '}
                      <span className={`chip2 ${categorizeBmi(bmi).chipClass}`}>
                        {categorizeBmi(bmi).label}
                      </span>
                    </>
                  ) : (
                    '—'
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="section-card">
            <div className="section-card__head">
              <span className="section-card__title">Medication adherence</span>
            </div>
            <p className="t-body-m">
              {adherence != null
                ? `${adherence}% of doses taken in the last 7 days`
                : 'No doses logged in the last 7 days'}
            </p>
            {medications.length > 0 && (
              <div className="kv" style={{ marginTop: '10px' }}>
                {medications.map((med) => (
                  <div className="kv__row" key={med.id}>
                    <span className="kv__k">
                      {med.name}
                      {med.high_risk && (
                        <span className="chip2 chip2--alert" style={{ marginLeft: '6px' }}>
                          High risk
                        </span>
                      )}
                    </span>
                    <span className="kv__v">{med.dosage ?? '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="section-card">
            <div className="section-card__head">
              <span className="section-card__title">Recent check-ins</span>
            </div>
            {checkins.length === 0 ? (
              <p className="t-body-m">No check-ins logged yet.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Mood</th>
                    <th>Energy</th>
                    <th>Sleep</th>
                    <th>Aches</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {checkins.map((c) => (
                    <tr key={c.checkin_date}>
                      <td>{c.checkin_date}</td>
                      <td>{c.mood ?? '—'}</td>
                      <td>{c.energy ?? '—'}</td>
                      <td>{c.sleep ?? '—'}</td>
                      <td>{c.aches ?? '—'}</td>
                      <td>{c.wellness_score ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="section-card">
            <div className="section-card__head">
              <span className="section-card__title">Fall / SOS history</span>
            </div>
            {sosAlerts.length === 0 ? (
              <p className="t-body-m">No SOS alerts on file.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Triggered</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {sosAlerts.map((alert) => (
                    <tr key={alert.id}>
                      <td>{alert.alert_type === 'manual' ? 'Manual SOS' : 'Wearable fall'}</td>
                      <td>{new Date(alert.triggered_at).toLocaleString()}</td>
                      <td>{alert.status}</td>
                      <td>{alert.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <aside className="detail-side">
          <div className="section-card">
            <div className="section-card__title" style={{ marginBottom: '8px' }}>
              Personal details
            </div>
            <div className="kv">
              <div className="kv__row">
                <span className="kv__k">Date of birth</span>
                <span className="kv__v">{member.date_of_birth ?? '—'}</span>
              </div>
              <div className="kv__row">
                <span className="kv__k">Phone</span>
                <span className="kv__v">{member.phone ?? '—'}</span>
              </div>
              <div className="kv__row">
                <span className="kv__k">District</span>
                <span className="kv__v">{member.location ?? '—'}</span>
              </div>
              <div className="kv__row">
                <span className="kv__k">Emergency contact</span>
                <span className="kv__v">
                  {member.emergency_contact_name
                    ? `${member.emergency_contact_name} · ${member.emergency_contact_phone ?? ''}`
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div
        className={`overlay${drawerOpen ? ' is-open' : ''}`}
        onClick={() => setDrawerOpen(false)}
      />
      <aside className={`drawer${drawerOpen ? ' is-open' : ''}`} aria-label="Add care team member">
        <div className="drawer__head">
          <span className="drawer__title">Add care team member</span>
          <button
            type="button"
            className="x-btn"
            aria-label="Close"
            onClick={() => setDrawerOpen(false)}
          >
            <span className="icon icon--sm">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </span>
          </button>
        </div>
        <form
          className="drawer__body"
          onSubmit={(e) => {
            e.preventDefault();
            addCareTeamMember();
          }}
        >
          <div className="field field--full">
            <label htmlFor="care-name">Name</label>
            <div className="control">
              <input
                id="care-name"
                type="text"
                placeholder="e.g. Dr. Priya Menon"
                value={careName}
                onChange={(e) => setCareName(e.target.value)}
              />
            </div>
          </div>
          <div className="field field--full">
            <label htmlFor="care-role">Description / role</label>
            <div className="control">
              <input
                id="care-role"
                type="text"
                placeholder="e.g. Primary physician"
                value={careRole}
                onChange={(e) => setCareRole(e.target.value)}
              />
            </div>
          </div>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="care-phone">Phone</label>
              <div className="control">
                <input
                  id="care-phone"
                  type="tel"
                  value={carePhone}
                  onChange={(e) => setCarePhone(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="care-email">Email</label>
              <div className="control">
                <input
                  id="care-email"
                  type="email"
                  value={careEmail}
                  onChange={(e) => setCareEmail(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="field field--full">
            <label htmlFor="care-address">Address</label>
            <div className="control">
              <input
                id="care-address"
                type="text"
                value={careAddress}
                onChange={(e) => setCareAddress(e.target.value)}
              />
            </div>
          </div>
          <div className="field field--full">
            <label htmlFor="care-notes">Notes</label>
            <textarea
              id="care-notes"
              placeholder="Anything the family should know"
              value={careNotes}
              onChange={(e) => setCareNotes(e.target.value)}
            />
          </div>
        </form>
        <div className="drawer__foot">
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={() => setDrawerOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={saving || !careName.trim()}
            onClick={addCareTeamMember}
          >
            {saving ? 'Saving…' : 'Save care member'}
          </button>
        </div>
      </aside>
    </>
  );
}
