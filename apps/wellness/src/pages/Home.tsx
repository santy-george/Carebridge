import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';
import { GaugeRing } from '../components/GaugeRing';
import {
  calculateBmi,
  categorizeBmi,
  classifyBloodPressure,
  classifyGlucose,
  classifyHeartRate,
  classifySpo2,
  glucoseContextLabel,
  type GlucoseContext,
} from '../lib/vitals';

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

interface HeartRateRow {
  value: number;
  recorded_at: string;
}

interface StepsRow {
  value: number;
  day: string;
}

interface SleepSegment {
  started_at: string;
  ended_at: string;
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

function formatSleepDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
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
  const [glucoseInput, setGlucoseInput] = useState('');
  const [glucoseContext, setGlucoseContext] = useState<GlucoseContext>('post_meal');
  const [glucoseError, setGlucoseError] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [bmiError, setBmiError] = useState(false);
  const [heartRate, setHeartRate] = useState<HeartRateRow | null>(null);
  const [steps, setSteps] = useState<StepsRow | null>(null);
  const [sleepMinutes, setSleepMinutes] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!selectedMemberId) return;

    Promise.all([
      supabase.from('members').select('full_name').eq('id', selectedMemberId).maybeSingle(),
      supabase
        .from('medical_profile')
        .select('conditions, conditions_other, allergies')
        .eq('member_id', selectedMemberId)
        .maybeSingle(),
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
      supabase
        .from('wearable_readings')
        .select('reading_type, value, recorded_at')
        .eq('member_id', selectedMemberId)
        .eq('reading_type', 'heart_rate')
        .not('value', 'is', null)
        .order('recorded_at', { ascending: false })
        .limit(1),
      supabase
        .from('daily_activity_totals')
        .select('value, day')
        .eq('member_id', selectedMemberId)
        .eq('reading_type', 'step_count')
        .order('day', { ascending: false })
        .limit(1),
      supabase
        .from('sleep_sessions')
        .select('started_at, ended_at')
        .eq('member_id', selectedMemberId)
        .neq('stage', 'awake')
        .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('started_at', { ascending: false }),
    ]).then(
      ([membersRes, profileRes, checkinsRes, vitalsRes, glucoseRes, hrRes, stepsRes, sleepRes]) => {
        if (!isMounted) return;
        setLoading(false);
        const anyError =
          membersRes.error ||
          profileRes.error ||
          checkinsRes.error ||
          vitalsRes.error ||
          glucoseRes.error ||
          hrRes.error ||
          stepsRes.error ||
          sleepRes.error;
        setFetchError(!!anyError);
        const memberRow = membersRes.data as { full_name: string } | null;
        setFirstName(memberRow ? memberRow.full_name.split(' ')[0] : '');
        setMedicalProfile((profileRes.data as MedicalProfile | null) ?? null);
        const checkinRows = (checkinsRes.data as LatestCheckin[] | null) ?? [];
        setCheckin(checkinRows[0] ?? null);
        setVitals((vitalsRes.data as VitalRow[] | null) ?? []);
        const glucoseRows = (glucoseRes.data as LatestGlucose[] | null) ?? [];
        setGlucose(glucoseRows[0] ?? null);
        const hrRows = (hrRes.data as { value: number; recorded_at: string }[] | null) ?? [];
        setHeartRate(hrRows[0] ?? null);
        const stepsRows = (stepsRes.data as StepsRow[] | null) ?? [];
        setSteps(stepsRows[0] ?? null);
        const sleepRows = (sleepRes.data as SleepSegment[] | null) ?? [];
        const totalSleepMinutes = sleepRows.reduce(
          (sum, seg) =>
            sum + (new Date(seg.ended_at).getTime() - new Date(seg.started_at).getTime()) / 60000,
          0,
        );
        setSleepMinutes(sleepRows.length > 0 ? totalSleepMinutes : null);
        const weightRow = ((vitalsRes.data as VitalRow[] | null) ?? []).find(
          (r) => r.vital_type === 'weight_kg',
        );
        const heightRow = ((vitalsRes.data as VitalRow[] | null) ?? []).find(
          (r) => r.vital_type === 'height_cm',
        );
        if (weightRow) setWeightInput(String(weightRow.value));
        if (heightRow) setHeightInput(String(heightRow.value));
      },
    );

    return () => {
      isMounted = false;
    };
  }, [selectedMemberId]);

  const logGlucose = async () => {
    const value = parseFloat(glucoseInput);
    if (!value || !selectedMemberId) return;
    setGlucoseError(false);
    const now = new Date();
    const { error } = await supabase.from('glucose_readings').insert({
      member_id: selectedMemberId,
      reading_date: now.toISOString().slice(0, 10),
      reading_time: now.toTimeString().slice(0, 5),
      value_mg_dl: value,
      context: glucoseContext,
    });
    if (error) {
      setGlucoseError(true);
      return;
    }
    setGlucoseInput('');
    setGlucose({
      value_mg_dl: value,
      context: glucoseContext,
      reading_date: now.toISOString().slice(0, 10),
      reading_time: now.toTimeString().slice(0, 5),
    });
  };

  const logBodyReading = async () => {
    const weight = parseFloat(weightInput);
    const height = parseFloat(heightInput);
    if (!weight || !height || !selectedMemberId) return;
    setBmiError(false);
    const now = new Date().toISOString();
    const results = await Promise.all([
      supabase.from('vitals_readings').insert({
        member_id: selectedMemberId,
        vital_type: 'weight_kg',
        value: weight,
        source: 'manual',
        recorded_at: now,
      }),
      supabase.from('vitals_readings').insert({
        member_id: selectedMemberId,
        vital_type: 'height_cm',
        value: height,
        source: 'manual',
        recorded_at: now,
      }),
    ]);
    if (results.some((r) => r.error)) {
      setBmiError(true);
      return;
    }
    setVitals((prev) => [
      { vital_type: 'weight_kg', value: weight, recorded_at: now },
      { vital_type: 'height_cm', value: height, recorded_at: now },
      ...prev.filter((r) => r.vital_type !== 'weight_kg' && r.vital_type !== 'height_cm'),
    ]);
  };

  if (loading) {
    return <div className="card">Loading…</div>;
  }

  const hasMedicalProfile = !!(
    medicalProfile &&
    (medicalProfile.conditions.length > 0 ||
      medicalProfile.conditions_other ||
      medicalProfile.allergies.length > 0)
  );
  const conditionsList = medicalProfile
    ? [
        ...medicalProfile.conditions,
        ...(medicalProfile.conditions_other ? [medicalProfile.conditions_other] : []),
      ]
    : [];

  const bp = latestByType(vitals, 'blood_pressure');
  const spo2 = latestByType(vitals, 'spo2_pct');
  const bpStatus = bp ? classifyBloodPressure(bp.value) : null;
  const spo2Status = spo2 ? classifySpo2(spo2.value) : null;
  const glucoseStatus = glucose ? classifyGlucose(glucose.value_mg_dl, glucose.context) : null;
  const weightRow = latestByType(vitals, 'weight_kg');
  const heightRow = latestByType(vitals, 'height_cm');
  const bmi = weightRow && heightRow ? calculateBmi(weightRow.value, heightRow.value) : null;
  const bmiCategory = bmi !== null ? categorizeBmi(bmi) : null;

  const checkinScore = checkin?.wellness_score ?? 0;
  const checkinScoreLabel = checkin ? (checkin.wellness_score ?? '—') : '—';

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
          <div className="eyebrow" style={{ color: 'var(--purple-400)' }}>
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </div>
          <h1 style={{ color: 'var(--purple-700)' }}>
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </h1>
        </div>
      </div>

      {hasMedicalProfile ? (
        <div className="card card--flush" style={{ padding: '2px 14px' }}>
          <div className="kv">
            <div className="kv__row">
              <span className="kv__k">Conditions</span>
              <span className="kv__v">
                {conditionsList.length ? conditionsList.join(', ') : 'None on file'}
              </span>
            </div>
            <div className="kv__row">
              <span className="kv__k">Allergies</span>
              <span className="kv__v">
                {medicalProfile && medicalProfile.allergies.length
                  ? medicalProfile.allergies.join(', ')
                  : 'None on file'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <Link
          to="/profile"
          className="card"
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}
        >
          <span className="icon" style={{ width: 18, height: 18, color: 'var(--accent-text)' }}>
            <svg>
              <use href="#i-clipboard" />
            </svg>
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)' }}>
            Add your health profile
          </span>
          <span className="icon chev" style={{ marginLeft: 'auto' }}>
            <svg>
              <use href="#i-chevron" />
            </svg>
          </span>
        </Link>
      )}

      <Link
        to="/check-in"
        className="hero-card hero-card--image"
        style={{
          textAlign: 'center',
          padding: '11px 9px',
          width: '100%',
          margin: '0 auto',
          background: 'url("/wellness-calm-companion.png") center / cover no-repeat',
          display: 'block',
        }}
      >
        {checkin ? (
          <GaugeRing
            percent={checkinScore}
            colorVar="var(--cyan-500)"
            label={String(checkinScoreLabel)}
            size="hero"
            sublabel="Overall Score"
            trackColor="var(--neutral-100)"
            textColor="var(--cyan-700)"
          />
        ) : (
          <>
            <GaugeRing
              percent={0}
              colorVar="var(--neutral-300)"
              label="—"
              size="hero"
              trackColor="var(--neutral-100)"
            />
            <div>No check-in yet</div>
          </>
        )}
      </Link>

      <div className="sec" style={{ color: 'var(--purple-700)' }}>
        My vitals
      </div>
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          textAlign: 'center',
          padding: '16px 10px',
        }}
      >
        <div>
          <GaugeRing
            percent={bpStatus?.percent ?? 0}
            colorVar={ringColorFor(bpStatus)}
            label={bp ? String(bp.value) : '—'}
            size="sm"
          />
          <div className="vital-label">Blood pressure</div>
        </div>
        <div>
          <GaugeRing
            percent={glucoseStatus?.percent ?? 0}
            colorVar={ringColorFor(glucoseStatus)}
            label={glucose ? String(glucose.value_mg_dl) : '—'}
            size="sm"
          />
          <div className="vital-label">Glucose</div>
        </div>
        <div>
          <GaugeRing
            percent={spo2Status?.percent ?? 0}
            colorVar={ringColorFor(spo2Status)}
            label={spo2 ? String(spo2.value) : '—'}
            size="sm"
          />
          <div className="vital-label">SpO2</div>
        </div>
      </div>
      <div className="vital-status">
        <span style={{ width: 56 }}>{bpStatus?.label ?? '—'}</span>
        <span
          style={{
            width: 56,
            color: glucoseStatus?.chipClass === 'chip2--warn' ? 'var(--warning-text)' : undefined,
            fontWeight: glucoseStatus?.chipClass === 'chip2--warn' ? 600 : undefined,
          }}
        >
          {glucoseStatus?.label ?? '—'}
        </span>
        <span style={{ width: 56 }}>{spo2Status?.label ?? '—'}</span>
      </div>

      <div className="sec" style={{ color: 'var(--purple-700)' }}>
        My activity
      </div>
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          textAlign: 'center',
          padding: '16px 10px',
        }}
      >
        <div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Heart rate</div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              marginTop: 2,
              color: heartRate
                ? ringColorFor(classifyHeartRate(heartRate.value))
                : 'var(--text-muted)',
            }}
          >
            {heartRate ? `${Math.round(heartRate.value)} bpm` : 'Connect a wearable'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Steps</div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              marginTop: 2,
              color: steps ? undefined : 'var(--text-muted)',
            }}
          >
            {steps
              ? `${Math.round(steps.value).toLocaleString()} steps`
              : heartRate
                ? 'Not tracked yet'
                : 'Connect a wearable'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Sleep</div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              marginTop: 2,
              color: sleepMinutes ? undefined : 'var(--text-muted)',
            }}
          >
            {sleepMinutes
              ? formatSleepDuration(sleepMinutes)
              : heartRate
                ? 'Not tracked yet'
                : 'Connect a wearable'}
          </div>
        </div>
      </div>

      <div className="sec" style={{ color: 'var(--purple-700)' }}>
        BLOOD GLUCOSE
      </div>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="metric-value">{glucose ? `${glucose.value_mg_dl} mg/dL` : '—'}</div>
            <div className="metric-sub">
              {glucose
                ? `${glucoseContextLabel(glucose.context)} · logged ${glucose.reading_date}`
                : 'No readings yet'}
            </div>
          </div>
          {glucoseStatus && (
            <span className={`chip2 ${glucoseStatus.chipClass}`}>{glucoseStatus.label}</span>
          )}
        </div>
        <div className="seg" style={{ marginTop: 10 }}>
          {(['fasting', 'pre_meal', 'post_meal', 'bedtime'] as const).map((ctx) => (
            <button
              key={ctx}
              type="button"
              className={glucoseContext === ctx ? 'is-active' : ''}
              onClick={() => setGlucoseContext(ctx)}
            >
              {glucoseContextLabel(ctx)}
            </button>
          ))}
        </div>
        <div className="vin" style={{ marginTop: 8 }}>
          <label htmlFor="glucose-input">Blood glucose</label>
          <div className="r">
            <input
              id="glucose-input"
              type="number"
              step="1"
              value={glucoseInput}
              onChange={(e) => setGlucoseInput(e.target.value)}
            />
            <span className="u">mg/dL</span>
          </div>
        </div>
        <button
          className="mbtn mbtn--fill mbtn--block mbtn--sm"
          type="button"
          aria-label="Log glucose reading"
          onClick={logGlucose}
          style={{ marginTop: 10 }}
        >
          <span className="icon">
            <svg>
              <use href="#i-droplet" />
            </svg>
          </span>{' '}
          Log reading
        </button>
        {glucoseError && (
          <p className="form-error" role="alert">
            Couldn&apos;t save that reading — try again.
          </p>
        )}
        <Link to="/health" className="view-history">
          View full history on My Health
        </Link>
      </div>

      <div className="sec" style={{ color: 'var(--purple-700)' }}>
        MY BODY
      </div>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="metric-value">{bmi !== null ? bmi : '—'}</div>
            <div className="metric-sub">
              {weightRow && heightRow
                ? `${weightRow.value} kg · ${heightRow.value} cm`
                : 'No readings yet'}
            </div>
          </div>
          {bmiCategory && (
            <span className={`chip2 ${bmiCategory.chipClass}`}>{bmiCategory.label}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <div className="vin" style={{ flex: 1 }}>
            <label htmlFor="weight-input">Weight</label>
            <div className="r">
              <input
                id="weight-input"
                type="number"
                step="0.1"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
              />
              <span className="u">kg</span>
            </div>
          </div>
          <div className="vin" style={{ flex: 1 }}>
            <label htmlFor="height-input">Height</label>
            <div className="r">
              <input
                id="height-input"
                type="number"
                step="1"
                value={heightInput}
                onChange={(e) => setHeightInput(e.target.value)}
              />
              <span className="u">cm</span>
            </div>
          </div>
        </div>
        <button
          className="mbtn mbtn--fill mbtn--block mbtn--sm"
          type="button"
          aria-label="Log body reading"
          onClick={logBodyReading}
          style={{ marginTop: 10 }}
        >
          <span className="icon">
            <svg>
              <use href="#i-plus" />
            </svg>
          </span>{' '}
          Log reading
        </button>
        {bmiError && (
          <p className="form-error" role="alert">
            Couldn&apos;t save that reading — try again.
          </p>
        )}
        <Link to="/health" className="view-history">
          View full history on My Health
        </Link>
      </div>
    </>
  );
}
