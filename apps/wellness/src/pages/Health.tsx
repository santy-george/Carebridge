import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';
import {
  categorizeBmi,
  classifyBloodPressure,
  classifyGlucose,
  classifySpo2,
  glucoseContextLabel,
  type GlucoseContext,
} from '../lib/vitals';
import { buildBmiSeries, buildSparklinePoints, formatShortDate, severityRank } from '../lib/observations';

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

interface ObservationRow {
  id: string;
  category: string;
  name: string;
  range: string;
  value: string;
  chipClass: string;
  statusLabel: string;
  note: string;
  suggestion: string;
  pts: string;
  dayRows: { day: string; val: string }[];
}

const RECENT_COUNT = 7;

const NOTES = {
  bp: 'Sustained readings above 130 raise the risk of stroke, heart disease and kidney strain if not managed with your care team.',
  spo2: "Readings below 92% can indicate your body isn't getting enough oxygen and should be checked promptly, especially alongside breathlessness.",
  bmi: 'BMI is a screening measure calculated from your logged weight and height. Values outside the normal range are linked to higher risk of heart disease, diabetes and joint strain — your care team can help interpret it alongside your other vitals.',
  glucose:
    'Repeated highs over weeks raise the risk of diabetes-related complications, including nerve, eye and kidney damage. Fasting/pre-meal and post-meal readings use different normal ranges, since a normal post-meal value is naturally higher than a fasting one.',
} as const;

const SUGGESTIONS = {
  bp: 'Share this trend with your care team at your next check-in.',
  spo2: 'Flag this trend to your care team, especially if you notice breathlessness.',
  bmi: 'Share this trend with your care team and keep logging weight regularly.',
  glucose: 'Log meals alongside your next few readings and share this trend with your care team.',
} as const;

export function Health() {
  const { selectedMemberId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [vitals, setVitals] = useState<VitalRow[]>([]);
  const [glucose, setGlucose] = useState<GlucoseRow[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    if (!selectedMemberId) return;

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
    ]).then(([vitalsRes, glucoseRes]) => {
      if (!isMounted) return;
      setLoading(false);
      setFetchError(!!(vitalsRes.error || glucoseRes.error));
      setVitals((vitalsRes.data as VitalRow[] | null) ?? []);
      setGlucose((glucoseRes.data as GlucoseRow[] | null) ?? []);
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

  const spo2Readings = vitals.filter((v) => v.vital_type === 'spo2_pct');
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

  rows.sort((a, b) => severityRank(b.chipClass) - severityRank(a.chipClass));

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
        These observations are from readings collected via manual entries. Please reach out to your care
        team or general physician for professional medical advice.
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
                  <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-heading)' }}>
                    {row.name}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-subtle)', marginTop: '1px' }}>
                    {row.category}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '13px', color: 'var(--text-heading)' }}>
                  {row.value}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`chip2 ${row.chipClass}`}>{row.statusLabel}</span>
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
                  <div style={{ fontSize: '10.5px', color: 'var(--text-subtle)', marginBottom: '6px' }}>
                    Normal range: {row.range}
                  </div>
                  <svg viewBox="0 0 280 40" style={{ width: '100%', height: '40px', display: 'block' }}>
                    <polyline
                      points={row.pts}
                      fill="none"
                      stroke="var(--purple-500)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
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
                        <div style={{ fontSize: '10px', color: 'var(--text-heading)', fontWeight: 600, marginTop: '1px' }}>
                          {d.val}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-body)', lineHeight: 1.5, marginTop: '10px' }}>
                    {row.note}
                  </div>
                  {row.suggestion && (
                    <div className="banner banner--warn" style={{ marginTop: '10px', padding: '10px' }}>
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
