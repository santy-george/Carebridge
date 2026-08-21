import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';
import {
  buildMonthlyReports,
  classifyMonth,
  type CheckinLike,
  type DatedRow,
  type MedicationLogLike,
} from '../lib/reports';

export function Reports() {
  const { selectedMemberId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [checkins, setCheckins] = useState<CheckinLike[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLogLike[]>([]);
  const [vitals, setVitals] = useState<DatedRow[]>([]);
  const [glucose, setGlucose] = useState<DatedRow[]>([]);

  useEffect(() => {
    let isMounted = true;
    if (!selectedMemberId) return;

    Promise.all([
      supabase
        .from('checkins')
        .select('checkin_date, wellness_score')
        .eq('member_id', selectedMemberId)
        .order('checkin_date', { ascending: false })
        .limit(400),
      supabase
        .from('medication_logs')
        .select('scheduled_date, taken')
        .eq('member_id', selectedMemberId)
        .order('scheduled_date', { ascending: false })
        .limit(1000),
      supabase
        .from('vitals_readings')
        .select('recorded_at')
        .eq('member_id', selectedMemberId)
        .order('recorded_at', { ascending: false })
        .limit(400),
      supabase
        .from('glucose_readings')
        .select('reading_date')
        .eq('member_id', selectedMemberId)
        .order('reading_date', { ascending: false })
        .limit(400),
    ]).then(([checkinsRes, logsRes, vitalsRes, glucoseRes]) => {
      if (!isMounted) return;
      setLoading(false);
      setFetchError(!!(checkinsRes.error || logsRes.error || vitalsRes.error || glucoseRes.error));
      setCheckins((checkinsRes.data as CheckinLike[] | null) ?? []);
      setMedicationLogs((logsRes.data as MedicationLogLike[] | null) ?? []);
      setVitals((vitalsRes.data as DatedRow[] | null) ?? []);
      setGlucose((glucoseRes.data as DatedRow[] | null) ?? []);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedMemberId]);

  if (loading) {
    return <div className="card">Loading…</div>;
  }

  const reports = buildMonthlyReports(checkins, medicationLogs, vitals, glucose);
  const [current, ...previous] = reports;

  return (
    <>
      <style>{`.tbar__title h1, .sec, .tt, h2, h3 { color: var(--purple-700); }`}</style>

      {fetchError && (
        <div className="card" role="alert">
          <span>Something went wrong loading your data.</span>
          <button type="button" onClick={() => setFetchError(false)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="tbar">
        <Link className="backbtn" to="/more" aria-label="Back to more">
          <span className="icon">
            <svg>
              <use href="#i-chevron" />
            </svg>
          </span>
        </Link>
        <div className="tbar__title">
          <h1 className="sm">Wellness reports</h1>
        </div>
      </div>

      {!current ? (
        <div className="card">
          <span>No activity logged yet. Reports build up as you check in and log vitals.</span>
        </div>
      ) : (
        <>
          <div className="mreport reveal">
            <div className="mreport__head">
              <span className="mo">{current.monthLabel}</span>
              {classifyMonth(current.avgWellnessScore) && (
                <span className={`chip2 ${classifyMonth(current.avgWellnessScore)!.chipClass}`}>
                  {classifyMonth(current.avgWellnessScore)!.label}
                </span>
              )}
            </div>
            <div className="mreport__score">
              <div>
                <div className="lbl">Avg. wellness score</div>
                <div className="val">{current.avgWellnessScore ?? '—'}</div>
              </div>
            </div>
            <div className="mreport__stats">
              <div className="stat">
                <div className="n">
                  {current.checkinsCompleted}/{current.daysInMonth}
                </div>
                <div className="l">Check-ins completed</div>
              </div>
              <div className="stat">
                <div className="n">
                  {current.adherencePercent != null ? `${current.adherencePercent}%` : '—'}
                </div>
                <div className="l">Medication adherence</div>
              </div>
              <div className="stat">
                <div className="n">{current.vitalsLoggedCount}</div>
                <div className="l">Vitals logged</div>
              </div>
            </div>
          </div>

          {previous.length > 0 && (
            <>
              <div className="sec">Previous reports</div>
              <div className="card card--flush reveal">
                {previous.map((report) => (
                  <div className="row" key={report.monthKey}>
                    <div className="ic">
                      <span className="icon">
                        <svg>
                          <use href="#i-reports" />
                        </svg>
                      </span>
                    </div>
                    <div className="m">
                      <div className="t">{report.monthLabel}</div>
                      <div className="s">
                        {report.avgWellnessScore != null
                          ? `Score ${report.avgWellnessScore} · `
                          : ''}
                        {report.checkinsCompleted} check-ins
                      </div>
                    </div>
                    <span className="icon chev">
                      <svg>
                        <use href="#i-chevron" />
                      </svg>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
