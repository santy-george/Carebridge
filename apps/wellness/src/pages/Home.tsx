import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';
import { GaugeRing } from '../components/GaugeRing';
import { classifyBloodPressure, classifyGlucose, classifySpo2 } from '../lib/vitals';

interface MedicalProfile {
  conditions: string[];
  conditions_other: string | null;
  allergies: string[];
}

interface LatestCheckin {
  wellness_score: number | null;
  checkin_date: string;
}

interface VitalRow {
  vital_type: string;
  value: number;
  recorded_at: string;
}

interface LatestGlucose {
  value_mg_dl: number;
  context: 'fasting' | 'pre_meal' | 'post_meal' | 'bedtime';
  reading_date: string;
  reading_time: string;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function latestByType(rows: VitalRow[], vitalType: string): VitalRow | null {
  return rows.filter((r) => r.vital_type === vitalType)[0] ?? null;
}

const RING_COLOR_BY_CHIP: Record<string, string> = {
  'chip2--ok': 'var(--mint-500)',
  'chip2--warn': 'var(--amber-500)',
  'chip2--alert': 'var(--danger)',
};

function ringColorFor(status: { chipClass: string } | null): string {
  return status ? RING_COLOR_BY_CHIP[status.chipClass] : 'var(--neutral-300)';
}

export function Home() {
  const { selectedMemberId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [medicalProfile, setMedicalProfile] = useState<MedicalProfile | null>(null);
  const [checkin, setCheckin] = useState<LatestCheckin | null>(null);
  const [vitals, setVitals] = useState<VitalRow[]>([]);
  const [glucose, setGlucose] = useState<LatestGlucose | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!selectedMemberId) return;

    Promise.all([
      supabase.from('members').select('full_name').eq('id', selectedMemberId).maybeSingle(),
      supabase.from('medical_profile').select('conditions, conditions_other, allergies').eq('member_id', selectedMemberId).maybeSingle(),
      supabase
        .from('checkins')
        .select('wellness_score, checkin_date')
        .eq('member_id', selectedMemberId)
        .order('checkin_date', { ascending: false })
        .limit(1),
      supabase
        .from('vitals_readings')
        .select('vital_type, value, recorded_at')
        .eq('member_id', selectedMemberId)
        .in('vital_type', ['blood_pressure', 'spo2_pct', 'weight_kg', 'height_cm'])
        .order('recorded_at', { ascending: false }),
      supabase
        .from('glucose_readings')
        .select('value_mg_dl, context, reading_date, reading_time')
        .eq('member_id', selectedMemberId)
        .order('reading_date', { ascending: false })
        .order('reading_time', { ascending: false })
        .limit(1),
    ]).then(([membersRes, profileRes, checkinsRes, vitalsRes, glucoseRes]) => {
      if (!isMounted) return;
      setLoading(false);
      const anyError =
        membersRes.error || profileRes.error || checkinsRes.error || vitalsRes.error || glucoseRes.error;
      setFetchError(!!anyError);
      const memberRow = membersRes.data as { full_name: string } | null;
      setFirstName(memberRow ? memberRow.full_name.split(' ')[0] : '');
      setMedicalProfile((profileRes.data as MedicalProfile | null) ?? null);
      const checkinRows = (checkinsRes.data as LatestCheckin[] | null) ?? [];
      setCheckin(checkinRows[0] ?? null);
      setVitals((vitalsRes.data as VitalRow[] | null) ?? []);
      const glucoseRows = (glucoseRes.data as LatestGlucose[] | null) ?? [];
      setGlucose(glucoseRows[0] ?? null);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedMemberId]);

  if (loading) {
    return <div className="card">Loading…</div>;
  }

  const hasMedicalProfile = !!(
    medicalProfile &&
    (medicalProfile.conditions.length > 0 || medicalProfile.conditions_other || medicalProfile.allergies.length > 0)
  );
  const conditionsList = medicalProfile
    ? [...medicalProfile.conditions, ...(medicalProfile.conditions_other ? [medicalProfile.conditions_other] : [])]
    : [];

  const bp = latestByType(vitals, 'blood_pressure');
  const spo2 = latestByType(vitals, 'spo2_pct');
  const bpStatus = bp ? classifyBloodPressure(bp.value) : null;
  const spo2Status = spo2 ? classifySpo2(spo2.value) : null;
  const glucoseStatus = glucose ? classifyGlucose(glucose.value_mg_dl, glucose.context) : null;

  return (
    <>
      {fetchError && (
        <div className="card" role="alert">
          <span>Something went wrong loading your data.</span>
          <button type="button" onClick={() => setFetchError(false)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="tbar">
        <div className="tbar__title">
          <div className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <h1>
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </h1>
        </div>
      </div>

      {hasMedicalProfile ? (
        <div className="card card--flush">
          <div className="kv">
            <div className="kv__row">
              <span className="kv__k">Conditions</span>
              <span className="kv__v">{conditionsList.length ? conditionsList.join(', ') : 'None on file'}</span>
            </div>
            <div className="kv__row">
              <span className="kv__k">Allergies</span>
              <span className="kv__v">
                {medicalProfile && medicalProfile.allergies.length ? medicalProfile.allergies.join(', ') : 'None on file'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <span>Add your health profile</span>
        </div>
      )}

      <div className="hero-card" style={{ textAlign: 'center' }}>
        {checkin ? (
          <GaugeRing percent={checkin.wellness_score ?? 0} colorVar="var(--cyan-500)" label={String(checkin.wellness_score ?? '—')} />
        ) : (
          <>
            <GaugeRing percent={0} colorVar="var(--neutral-300)" label="—" />
            <div>No check-in yet</div>
          </>
        )}
      </div>

      <div className="sec">My vitals</div>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
        <div>
          <GaugeRing percent={bpStatus?.percent ?? 0} colorVar={ringColorFor(bpStatus)} label={bp ? String(bp.value) : '—'} size="sm" />
          <div>Blood pressure</div>
        </div>
        <div>
          <GaugeRing percent={glucoseStatus?.percent ?? 0} colorVar={ringColorFor(glucoseStatus)} label={glucose ? String(glucose.value_mg_dl) : '—'} size="sm" />
          <div>Glucose</div>
        </div>
        <div>
          <GaugeRing percent={spo2Status?.percent ?? 0} colorVar={ringColorFor(spo2Status)} label={spo2 ? String(spo2.value) : '—'} size="sm" />
          <div>SpO2</div>
        </div>
      </div>

      <div className="sec">My activity</div>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
        <div>
          <div>Heart rate</div>
          <div>Connect a wearable to see this</div>
        </div>
        <div>
          <div>Steps</div>
          <div>Connect a wearable to see this</div>
        </div>
        <div>
          <div>Sleep</div>
          <div>Connect a wearable to see this</div>
        </div>
      </div>
    </>
  );
}
