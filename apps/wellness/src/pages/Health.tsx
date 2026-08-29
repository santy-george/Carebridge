import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';
import {
  categorizeBmi,
  classifyActiveEnergy,
  classifyBloodPressure,
  classifyDistance,
  classifyGlucose,
  classifyHeartRate,
  classifyRespiratoryRate,
  classifySpo2,
  classifyStandTime,
  classifyWalkingSpeed,
  classifyWalkingSteadiness,
  glucoseContextLabel,
  type GlucoseContext,
} from '../lib/vitals';
import {
  buildBmiSeries,
  buildSparklinePoints,
  formatShortDate,
  severityRank,
} from '../lib/observations';

interface VitalRow {
  vital_type: string;
  value: number;
  recorded_at: string;
}

interface GlucoseRow {
  value_mg_dl: number;
  context: GlucoseContext;
  reading_date: string;
  reading_time: string;
}

interface WearableRow {
  reading_type: string;
  value: number;
  recorded_at: string;
}

interface DailyTotalRow {
  reading_type: string;
  value: number;
  day: string;
}

interface ObservationRow {
  id: string;
  category: string;
  name: string;
  range: string;
  value: string;
  // Trend-only metrics (no established population "normal range") omit
  // these three -- no chip pill, no risk-framed suggestion banner.
  chipClass?: string;
  statusLabel?: string;
  suggestion?: string;
  note: string;
  pts: string;
  dayRows: { day: string; val: string }[];
}

const RECENT_COUNT = 7;

// Every reading_type this screen can show from wearable_readings, each
// fetched with its OWN small limit. A single shared query with one limit
// across all types would let a high-frequency type (heart_rate arrives
// every few minutes) crowd out a low-frequency one (vo2_max arrives every
// few weeks) out of the row cap entirely.
const WEARABLE_READING_TYPES = [
  'heart_rate',
  'spo2',
  'resting_heart_rate',
  'heart_rate_variability_sdnn',
  'respiratory_rate',
  'walking_speed',
  'apple_walking_steadiness',
  'vo2_max',
  'apple_sleeping_wrist_temperature',
] as const;

const DAILY_TOTAL_READING_TYPES = [
  'active_energy_burned',
  'distance_walked_running',
  'apple_stand_time',
] as const;

const NOTES = {
  bp: 'Sustained readings above 130 raise the risk of stroke, heart disease and kidney strain if not managed with your care team.',
  spo2: "Readings below 92% can indicate your body isn't getting enough oxygen and should be checked promptly, especially alongside breathlessness.",
  heart_rate:
    'Resting heart rate outside 60–100 bpm can be a normal variation (fitness, medication) but is worth tracking — share persistent patterns with your care team.',
  resting_heart_rate:
    'Your heart rate while at rest, measured periodically by your Watch. Outside 60–100 bpm can be a normal variation but is worth tracking over time.',
  bmi: 'BMI is a screening measure calculated from your logged weight and height. Values outside the normal range are linked to higher risk of heart disease, diabetes and joint strain — your care team can help interpret it alongside your other vitals.',
  glucose:
    'Repeated highs over weeks raise the risk of diabetes-related complications, including nerve, eye and kidney damage. Fasting/pre-meal and post-meal readings use different normal ranges, since a normal post-meal value is naturally higher than a fasting one.',
  respiratory_rate:
    'Breaths per minute while resting. A persistently elevated rate can signal breathing difficulty and is worth flagging promptly, especially alongside a respiratory condition.',
  walking_speed:
    'How fast you typically walk, measured by your Watch. Gait speed below about 0.6 m/s is an established indicator of increased fall risk in older adults.',
  apple_walking_steadiness:
    "Apple's own balance and fall-risk score, computed from how you walk. A declining trend is worth discussing with your care team even before it reaches Low.",
  heart_rate_variability_sdnn:
    "The variation in time between heartbeats. There's no single healthy number — it's highly individual and most meaningful as your own trend over time, so no normal range is shown.",
  vo2_max:
    "An estimate of cardiovascular fitness. Like HRV, there's no simple population normal range — it depends on age, sex and fitness level, so this is shown as a trend rather than against a fixed range.",
  apple_sleeping_wrist_temperature:
    "Your skin temperature while sleeping, relative to your own baseline. Shown as a trend since there's no fixed normal value — only meaningful changes from your usual pattern.",
  active_energy_burned:
    'Calories burned through movement, from your Watch. General activity guidance, not a diagnostic measurement — a quiet day is not itself a medical concern.',
  distance_walked_running:
    "Distance covered on foot today, from your Watch. General activity guidance — worth a mention to your care team only if it's a real change from your usual pattern.",
  apple_stand_time:
    'Minutes spent standing or moving today, from your Watch. General activity guidance, not a diagnostic measurement.',
} as const;

const SUGGESTIONS = {
  bp: 'Share this trend with your care team at your next check-in.',
  spo2: 'Flag this trend to your care team, especially if you notice breathlessness.',
  heart_rate: 'Share this trend with your care team, especially if it persists at rest.',
  resting_heart_rate: 'Share this trend with your care team, especially if it persists.',
  bmi: 'Share this trend with your care team and keep logging weight regularly.',
  glucose: 'Log meals alongside your next few readings and share this trend with your care team.',
  respiratory_rate: 'Flag this trend to your care team, especially if you notice breathlessness.',
  walking_speed: 'Share this trend with your care team — it can inform a fall-risk conversation.',
  apple_walking_steadiness:
    'Share this trend with your care team — it can inform a fall-risk conversation.',
  active_energy_burned: 'Mention this trend at your next check-in if it continues.',
  distance_walked_running: 'Mention this trend at your next check-in if it continues.',
  apple_stand_time: 'Mention this trend at your next check-in if it continues.',
} as const;

const UNITS: Record<string, string> = {
  resting_heart_rate: 'bpm',
  respiratory_rate: 'breaths/min',
  walking_speed: 'm/s',
  apple_walking_steadiness: '%',
  heart_rate_variability_sdnn: 'ms',
  vo2_max: 'ml/kg/min',
  apple_sleeping_wrist_temperature: '°C',
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function Health() {
  const { selectedMemberId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [vitals, setVitals] = useState<VitalRow[]>([]);
  const [glucose, setGlucose] = useState<GlucoseRow[]>([]);
  const [wearableByType, setWearableByType] = useState<Record<string, WearableRow[]>>({});
  const [dailyTotals, setDailyTotals] = useState<DailyTotalRow[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    if (!selectedMemberId) return;

    const wearableQueries = WEARABLE_READING_TYPES.map((readingType) =>
      supabase
        .from('wearable_readings')
        .select('reading_type, value, recorded_at')
        .eq('member_id', selectedMemberId)
        .eq('reading_type', readingType)
        .not('value', 'is', null)
        .order('recorded_at', { ascending: false })
        .limit(RECENT_COUNT),
    );

    Promise.all([
      supabase
        .from('vitals_readings')
        .select('vital_type, value, recorded_at')
        .eq('member_id', selectedMemberId)
        .in('vital_type', ['blood_pressure', 'spo2_pct', 'weight_kg', 'height_cm'])
        .order('recorded_at', { ascending: true })
        .limit(200),
      supabase
        .from('glucose_readings')
        .select('value_mg_dl, context, reading_date, reading_time')
        .eq('member_id', selectedMemberId)
        .order('reading_date', { ascending: true })
        .order('reading_time', { ascending: true })
        .limit(200),
      supabase
        .from('daily_activity_totals')
        .select('reading_type, value, day')
        .eq('member_id', selectedMemberId)
        .in('reading_type', DAILY_TOTAL_READING_TYPES)
        .order('day', { ascending: true }),
      ...wearableQueries,
    ]).then(([vitalsRes, glucoseRes, dailyTotalsRes, ...wearableResList]) => {
      if (!isMounted) return;
      setLoading(false);
      const anyError = !!(
        vitalsRes.error ||
        glucoseRes.error ||
        dailyTotalsRes.error ||
        wearableResList.some((r) => r.error)
      );
      setFetchError(anyError);
      setVitals((vitalsRes.data as VitalRow[] | null) ?? []);
      setGlucose((glucoseRes.data as GlucoseRow[] | null) ?? []);
      setDailyTotals((dailyTotalsRes.data as DailyTotalRow[] | null) ?? []);

      const byType: Record<string, WearableRow[]> = {};
      WEARABLE_READING_TYPES.forEach((readingType, i) => {
        // Fetched most-recent-first (to respect the per-type cap), reverse
        // to ascending order for the chronological sparkline/trend logic.
        byType[readingType] = ((wearableResList[i].data as WearableRow[] | null) ?? [])
          .slice()
          .reverse();
      });
      setWearableByType(byType);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedMemberId]);

  if (loading) {
    return <div className="card">Loading…</div>;
  }

  const toggle = (id: string) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  const rows: ObservationRow[] = [];

  const bpReadings = vitals.filter((v) => v.vital_type === 'blood_pressure');
  if (bpReadings.length > 0) {
    const recent = bpReadings.slice(-RECENT_COUNT);
    const latest = recent[recent.length - 1];
    const status = classifyBloodPressure(latest.value);
    rows.push({
      id: 'bp',
      category: 'Cardiovascular',
      name: 'Blood pressure',
      range: 'below 120 mmHg',
      value: `${latest.value} mmHg`,
      chipClass: status.chipClass,
      statusLabel: status.label,
      note: NOTES.bp,
      suggestion: status.chipClass === 'chip2--ok' ? '' : SUGGESTIONS.bp,
      pts: buildSparklinePoints(
        recent.map((r) => r.value),
        280,
        40,
        6,
      ),
      dayRows: recent.map((r) => ({ day: formatShortDate(r.recorded_at), val: String(r.value) })),
    });
  }

  const spo2Readings = [
    ...vitals.filter((v) => v.vital_type === 'spo2_pct'),
    ...(wearableByType.spo2 ?? []).map((w) => ({
      vital_type: 'spo2_pct',
      value: w.value,
      recorded_at: w.recorded_at,
    })),
  ].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  if (spo2Readings.length > 0) {
    const recent = spo2Readings.slice(-RECENT_COUNT);
    const latest = recent[recent.length - 1];
    const status = classifySpo2(latest.value);
    rows.push({
      id: 'spo2',
      category: 'Respiratory',
      name: 'SpO2',
      range: '95–100%',
      value: `${latest.value}%`,
      chipClass: status.chipClass,
      statusLabel: status.label,
      note: NOTES.spo2,
      suggestion: status.chipClass === 'chip2--ok' ? '' : SUGGESTIONS.spo2,
      pts: buildSparklinePoints(
        recent.map((r) => r.value),
        280,
        40,
        6,
      ),
      dayRows: recent.map((r) => ({ day: formatShortDate(r.recorded_at), val: String(r.value) })),
    });
  }

  const heartRateReadings = wearableByType.heart_rate ?? [];
  if (heartRateReadings.length > 0) {
    const recent = heartRateReadings.slice(-RECENT_COUNT);
    const latest = recent[recent.length - 1];
    const status = classifyHeartRate(latest.value);
    rows.push({
      id: 'heart_rate',
      category: 'Cardiovascular',
      name: 'Heart rate',
      range: '60–100 bpm',
      value: `${Math.round(latest.value)} bpm`,
      chipClass: status.chipClass,
      statusLabel: status.label,
      note: NOTES.heart_rate,
      suggestion: status.chipClass === 'chip2--ok' ? '' : SUGGESTIONS.heart_rate,
      pts: buildSparklinePoints(
        recent.map((r) => r.value),
        280,
        40,
        6,
      ),
      dayRows: recent.map((r) => ({
        day: formatShortDate(r.recorded_at),
        val: `${Math.round(r.value)} bpm`,
      })),
    });
  }

  const weightReadings = vitals.filter((v) => v.vital_type === 'weight_kg');
  const heightReadings = vitals.filter((v) => v.vital_type === 'height_cm');
  const bmiSeries = buildBmiSeries(
    weightReadings.map((r) => ({ recorded_at: r.recorded_at, value: r.value })),
    heightReadings.map((r) => ({ recorded_at: r.recorded_at, value: r.value })),
  );
  if (bmiSeries.length > 0) {
    const recent = bmiSeries.slice(-RECENT_COUNT);
    const latest = recent[recent.length - 1];
    const category = categorizeBmi(latest.bmi);
    rows.push({
      id: 'bmi',
      category: 'Body composition',
      name: 'Body Mass Index',
      range: '18.5–24.9',
      value: String(latest.bmi),
      chipClass: category.chipClass,
      statusLabel: category.label,
      note: NOTES.bmi,
      suggestion: category.chipClass === 'chip2--ok' ? '' : SUGGESTIONS.bmi,
      pts: buildSparklinePoints(
        recent.map((r) => r.bmi),
        280,
        40,
        6,
      ),
      dayRows: recent.map((r) => ({ day: formatShortDate(r.recorded_at), val: String(r.bmi) })),
    });
  }

  if (glucose.length > 0) {
    const recent = glucose.slice(-RECENT_COUNT);
    const latest = recent[recent.length - 1];
    const status = classifyGlucose(latest.value_mg_dl, latest.context);
    rows.push({
      id: 'glucose',
      category: 'Metabolic',
      name: 'Blood glucose',
      range: 'below 100 fasting/pre-meal · below 140 post-meal',
      value: `${latest.value_mg_dl} mg/dL (${glucoseContextLabel(latest.context)})`,
      chipClass: status.chipClass,
      statusLabel: status.label,
      note: NOTES.glucose,
      suggestion: status.chipClass === 'chip2--ok' ? '' : SUGGESTIONS.glucose,
      pts: buildSparklinePoints(
        recent.map((r) => r.value_mg_dl),
        280,
        40,
        6,
      ),
      dayRows: recent.map((r) => ({
        day: formatShortDate(r.reading_date),
        val: `${r.value_mg_dl} (${glucoseContextLabel(r.context)})`,
      })),
    });
  }

  // Chip-classified wearable metrics -- each has an established reference
  // range worth comparing against.
  const chipMetrics: {
    id: string;
    category: string;
    name: string;
    range: string;
    classify: (v: number) => { chipClass: string; label: string };
    format: (v: number) => string;
    note: string;
    suggestion: string;
  }[] = [
    {
      id: 'resting_heart_rate',
      category: 'Cardiovascular',
      name: 'Resting heart rate',
      range: '60–100 bpm',
      classify: (v) => classifyHeartRate(v),
      format: (v) => `${Math.round(v)} bpm`,
      note: NOTES.resting_heart_rate,
      suggestion: SUGGESTIONS.resting_heart_rate,
    },
    {
      id: 'respiratory_rate',
      category: 'Respiratory',
      name: 'Respiratory rate',
      range: '12–20 breaths/min',
      classify: (v) => classifyRespiratoryRate(v),
      format: (v) => `${Math.round(v)} breaths/min`,
      note: NOTES.respiratory_rate,
      suggestion: SUGGESTIONS.respiratory_rate,
    },
    {
      id: 'walking_speed',
      category: 'Mobility',
      name: 'Walking speed',
      range: 'at or above 1.0 m/s',
      classify: (v) => classifyWalkingSpeed(v),
      format: (v) => `${round1(v)} m/s`,
      note: NOTES.walking_speed,
      suggestion: SUGGESTIONS.walking_speed,
    },
    {
      id: 'apple_walking_steadiness',
      category: 'Mobility',
      name: 'Walking steadiness',
      range: 'OK (50% or above)',
      classify: (v) => classifyWalkingSteadiness(v),
      format: (v) => `${Math.round(v)}%`,
      note: NOTES.apple_walking_steadiness,
      suggestion: SUGGESTIONS.apple_walking_steadiness,
    },
  ];

  for (const metric of chipMetrics) {
    const readings = wearableByType[metric.id] ?? [];
    if (readings.length === 0) continue;
    const recent = readings.slice(-RECENT_COUNT);
    const latest = recent[recent.length - 1];
    const status = metric.classify(latest.value);
    rows.push({
      id: metric.id,
      category: metric.category,
      name: metric.name,
      range: metric.range,
      value: metric.format(latest.value),
      chipClass: status.chipClass,
      statusLabel: status.label,
      note: metric.note,
      suggestion: status.chipClass === 'chip2--ok' ? '' : metric.suggestion,
      pts: buildSparklinePoints(
        recent.map((r) => r.value),
        280,
        40,
        6,
      ),
      dayRows: recent.map((r) => ({
        day: formatShortDate(r.recorded_at),
        val: metric.format(r.value),
      })),
    });
  }

  // Trend-only wearable metrics -- no established population "normal
  // range", so no chip, no range line, no risk-framed suggestion.
  const trendMetrics: {
    id: string;
    category: string;
    name: string;
    note: string;
  }[] = [
    {
      id: 'heart_rate_variability_sdnn',
      category: 'Cardiovascular',
      name: 'Heart rate variability',
      note: NOTES.heart_rate_variability_sdnn,
    },
    {
      id: 'vo2_max',
      category: 'Cardiovascular',
      name: 'Cardio fitness (VO2 max)',
      note: NOTES.vo2_max,
    },
    {
      id: 'apple_sleeping_wrist_temperature',
      category: 'Sleep',
      name: 'Sleeping wrist temperature',
      note: NOTES.apple_sleeping_wrist_temperature,
    },
  ];

  for (const metric of trendMetrics) {
    const readings = wearableByType[metric.id] ?? [];
    if (readings.length === 0) continue;
    const recent = readings.slice(-RECENT_COUNT);
    const latest = recent[recent.length - 1];
    const unit = UNITS[metric.id] ?? '';
    rows.push({
      id: metric.id,
      category: metric.category,
      name: metric.name,
      range: '',
      value: `${round1(latest.value)} ${unit}`,
      note: metric.note,
      pts: buildSparklinePoints(
        recent.map((r) => r.value),
        280,
        40,
        6,
      ),
      dayRows: recent.map((r) => ({
        day: formatShortDate(r.recorded_at),
        val: `${round1(r.value)} ${unit}`,
      })),
    });
  }

  // Daily activity totals -- chip-classified per human-partner decision,
  // worded as general activity guidance rather than disease-risk framing.
  const dailyMetrics: {
    id: string;
    name: string;
    classify: (v: number) => { chipClass: string; label: string };
    format: (v: number) => string;
    note: string;
    suggestion: string;
  }[] = [
    {
      id: 'active_energy_burned',
      name: 'Active energy',
      classify: (v) => classifyActiveEnergy(v),
      format: (v) => `${Math.round(v)} kcal`,
      note: NOTES.active_energy_burned,
      suggestion: SUGGESTIONS.active_energy_burned,
    },
    {
      id: 'distance_walked_running',
      name: 'Distance',
      classify: (v) => classifyDistance(v),
      format: (v) => `${round1(v)} km`,
      note: NOTES.distance_walked_running,
      suggestion: SUGGESTIONS.distance_walked_running,
    },
    {
      id: 'apple_stand_time',
      name: 'Stand time',
      classify: (v) => classifyStandTime(v),
      format: (v) => `${Math.round(v)} min`,
      note: NOTES.apple_stand_time,
      suggestion: SUGGESTIONS.apple_stand_time,
    },
  ];

  for (const metric of dailyMetrics) {
    const readings = dailyTotals
      .filter((d) => d.reading_type === metric.id)
      .sort((a, b) => a.day.localeCompare(b.day));
    if (readings.length === 0) continue;
    const recent = readings.slice(-RECENT_COUNT);
    const latest = recent[recent.length - 1];
    const status = metric.classify(latest.value);
    rows.push({
      id: metric.id,
      category: 'Activity',
      name: metric.name,
      range: '',
      value: metric.format(latest.value),
      chipClass: status.chipClass,
      statusLabel: status.label,
      note: metric.note,
      suggestion: status.chipClass === 'chip2--ok' ? '' : metric.suggestion,
      pts: buildSparklinePoints(
        recent.map((r) => r.value),
        280,
        40,
        6,
      ),
      dayRows: recent.map((r) => ({
        day: formatShortDate(r.day),
        val: metric.format(r.value),
      })),
    });
  }

  rows.sort((a, b) => severityRank(b.chipClass ?? '') - severityRank(a.chipClass ?? ''));

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
          <h1 className="sm">Observations</h1>
        </div>
      </div>

      <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0 }}>
        These observations are from readings collected via manual entries and your connected Apple
        Watch, where available. Please reach out to your care team or general physician for
        professional medical advice.
      </p>

      <div className="sec">All readings</div>

      {rows.length === 0 ? (
        <div className="card">
          <span>No readings logged yet. Log a vital from Home to see it here.</span>
        </div>
      ) : (
        <div className="card card--flush">
          {rows.map((row, i) => (
            <div
              key={row.id}
              style={{
                borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                background: i % 2 === 1 ? 'var(--purple-50)' : 'transparent',
              }}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggle(row.id)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 76px 96px 18px',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 14px',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div
                    style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-heading)' }}
                  >
                    {row.name}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-subtle)', marginTop: '1px' }}>
                    {row.category}
                  </div>
                </div>
                <div
                  style={{
                    textAlign: 'right',
                    fontWeight: 700,
                    fontSize: '13px',
                    color: 'var(--text-heading)',
                  }}
                >
                  {row.value}
                </div>
                <div style={{ textAlign: 'right' }}>
                  {row.chipClass && row.statusLabel && (
                    <span className={`chip2 ${row.chipClass}`}>{row.statusLabel}</span>
                  )}
                </div>
                <span
                  className="icon"
                  style={{
                    width: '16px',
                    height: '16px',
                    color: 'var(--text-subtle)',
                    transform: open[row.id] ? 'rotate(180deg)' : 'none',
                    transition: 'transform .2s',
                  }}
                >
                  <svg>
                    <use href="#i-chevron-down" />
                  </svg>
                </span>
              </div>
              {open[row.id] && (
                <div style={{ padding: '0 14px 16px', background: 'var(--surface-sunken)' }}>
                  {row.range && (
                    <div
                      style={{
                        fontSize: '10.5px',
                        color: 'var(--text-subtle)',
                        marginBottom: '6px',
                      }}
                    >
                      Normal range: {row.range}
                    </div>
                  )}
                  <svg
                    viewBox="0 0 280 40"
                    style={{ width: '100%', height: '40px', display: 'block' }}
                  >
                    <polyline
                      points={row.pts}
                      fill="none"
                      stroke="var(--purple-500)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}
                  >
                    {row.dayRows.map((d, di) => (
                      <div key={di} style={{ textAlign: 'center', flex: 1 }}>
                        <div
                          style={{
                            fontSize: '8.5px',
                            color: 'var(--text-subtle)',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                          }}
                        >
                          {d.day}
                        </div>
                        <div
                          style={{
                            fontSize: '10px',
                            color: 'var(--text-heading)',
                            fontWeight: 600,
                            marginTop: '1px',
                          }}
                        >
                          {d.val}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-body)',
                      lineHeight: 1.5,
                      marginTop: '10px',
                    }}
                  >
                    {row.note}
                  </div>
                  {row.suggestion && (
                    <div
                      className="banner banner--warn"
                      style={{ marginTop: '10px', padding: '10px' }}
                    >
                      <div className="ic" style={{ width: '28px', height: '28px' }}>
                        <span className="icon" style={{ width: '15px', height: '15px' }}>
                          <svg>
                            <use href="#i-alert" />
                          </svg>
                        </span>
                      </div>
                      <div>
                        <div className="bt" style={{ fontSize: '12.5px' }}>
                          Suggested next step
                        </div>
                        <div className="bs">{row.suggestion}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
