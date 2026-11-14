import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { getPosition } from '../lib/geo';
import {
  checkInVisit,
  checkOutVisit,
  fetchMyVisits,
  fetchVisitReport,
  formatDay,
  formatTime,
  localRange,
  parseVital,
  saveVisitReport,
  statusLabel,
  type Visit,
  type VisitReportInput,
} from '../lib/visits';

interface ReportForm {
  bpSystolic: string;
  bpDiastolic: string;
  pulse: string;
  spo2: string;
  glucoseMgdl: string;
  temperatureC: string;
  notes: string;
}

const EMPTY_FORM: ReportForm = {
  bpSystolic: '',
  bpDiastolic: '',
  pulse: '',
  spo2: '',
  glucoseMgdl: '',
  temperatureC: '',
  notes: '',
};

function toForm(report: VisitReportInput | null): ReportForm {
  if (!report) return EMPTY_FORM;
  const s = (n: number | null) => (n === null ? '' : String(n));
  return {
    bpSystolic: s(report.bpSystolic),
    bpDiastolic: s(report.bpDiastolic),
    pulse: s(report.pulse),
    spo2: s(report.spo2),
    glucoseMgdl: s(report.glucoseMgdl),
    temperatureC: s(report.temperatureC),
    notes: report.notes,
  };
}

function toInput(form: ReportForm): VisitReportInput {
  return {
    bpSystolic: parseVital(form.bpSystolic),
    bpDiastolic: parseVital(form.bpDiastolic),
    pulse: parseVital(form.pulse),
    spo2: parseVital(form.spo2),
    glucoseMgdl: parseVital(form.glucoseMgdl),
    temperatureC: parseVital(form.temperatureC),
    notes: form.notes.trim(),
  };
}

export function VisitDetail() {
  const { id } = useParams<{ id: string }>();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState<ReportForm>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    // A visit is only ever opened from a list that already covers this
    // window; refetching the same window keeps one RPC as the source of truth.
    const { from, to } = localRange(new Date(), 30, 30);
    fetchMyVisits(from, to)
      .then(async (rows) => {
        const found = rows.find((row) => row.id === id) ?? null;
        const report =
          found && found.status === 'in_progress' ? await fetchVisitReport(found.id) : null;
        if (!isMounted) return;
        setVisit(found);
        if (found && found.status === 'in_progress') setForm(toForm(report));
        setLoaded(true);
      })
      .catch(() => {
        if (!isMounted) return;
        setError('We couldn’t load this visit. Check your connection and try again.');
        setLoaded(true);
      });
    return () => {
      isMounted = false;
    };
  }, [id, reloadKey]);

  const run = async (action: () => Promise<void>, failure: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setReloadKey((key) => key + 1);
    } catch {
      setError(failure);
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) return <p className="t-body-m">Loading…</p>;
  if (!visit) {
    return (
      <>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <p className="t-body-m">Visit not found.</p>
      </>
    );
  }

  const setField = (key: keyof ReportForm) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleCheckIn = () =>
    run(async () => checkInVisit(visit.id, await getPosition()), 'Check-in failed. Try again.');

  const handleSaveDraft = (event: FormEvent) => {
    event.preventDefault();
    return run(async () => {
      await saveVisitReport(visit.id, toInput(form), false);
      setNotice('Draft saved.');
    }, 'Couldn’t save the report. Check the values and try again.');
  };

  const handleSubmitReport = () =>
    run(
      () => saveVisitReport(visit.id, toInput(form), true),
      'Couldn’t submit the report. Check the values and try again.',
    );

  const handleCheckOut = () =>
    run(async () => checkOutVisit(visit.id, await getPosition()), 'Check-out failed. Try again.');

  const field = (key: keyof ReportForm, label: string, unit?: string) => (
    <div className="field">
      <label htmlFor={`f-${key}`}>
        {label}
        {unit ? ` (${unit})` : ''}
      </label>
      <input
        id={`f-${key}`}
        inputMode="decimal"
        value={form[key]}
        onChange={(event) => setField(key)(event.target.value)}
      />
    </div>
  );

  return (
    <>
      <div className="tbar">
        <div className="tbar__title">
          <div className="eyebrow">{formatDay(visit.scheduled_start)}</div>
          <h1 className="sm">{visit.member_name}</h1>
        </div>
        <span className="chip2 chip2--accent">{statusLabel(visit.status)}</span>
      </div>

      <div className="card">
        <div className="t-body-m">
          {formatTime(visit.scheduled_start)} – {formatTime(visit.scheduled_end)} ·{' '}
          {visit.service_type}
        </div>
        {visit.member_address && <div className="t-body-m">{visit.member_address}</div>}
        {visit.member_phone && (
          <a className="mbtn mbtn--soft mbtn--sm" href={`tel:${visit.member_phone}`}>
            Call {visit.member_phone}
          </a>
        )}
      </div>

      {(visit.conditions.length > 0 || visit.allergies.length > 0) && (
        <div className="card">
          {visit.conditions.length > 0 && (
            <div className="t-body-m">
              <strong>Conditions:</strong> {visit.conditions.join(', ')}
            </div>
          )}
          {visit.allergies.length > 0 && (
            <div className="t-body-m">
              <strong>Allergies:</strong> {visit.allergies.join(', ')}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && <p className="t-body-m">{notice}</p>}

      {visit.status === 'scheduled' && (
        <button
          type="button"
          className="mbtn mbtn--fill mbtn--block"
          onClick={handleCheckIn}
          disabled={busy}
        >
          {busy ? 'Checking in…' : 'Check in'}
        </button>
      )}

      {visit.status === 'in_progress' && !visit.report_submitted && (
        <form onSubmit={handleSaveDraft}>
          <div className="t-overline">Visit report</div>
          <div className="vgrid">
            {field('bpSystolic', 'BP systolic', 'mmHg')}
            {field('bpDiastolic', 'BP diastolic', 'mmHg')}
            {field('pulse', 'Pulse', 'bpm')}
            {field('spo2', 'SpO2', '%')}
            {field('glucoseMgdl', 'Glucose', 'mg/dL')}
            {field('temperatureC', 'Temperature', '°C')}
          </div>
          <div className="field">
            <label htmlFor="f-notes">Notes</label>
            <textarea
              id="f-notes"
              value={form.notes}
              onChange={(event) => setField('notes')(event.target.value)}
              placeholder="Observations…"
            />
          </div>
          <button type="submit" className="mbtn mbtn--line mbtn--block" disabled={busy}>
            Save draft
          </button>
          <button
            type="button"
            className="mbtn mbtn--fill mbtn--block"
            style={{ marginTop: '8px' }}
            onClick={handleSubmitReport}
            disabled={busy}
          >
            Submit report
          </button>
        </form>
      )}

      {visit.status === 'in_progress' && visit.report_submitted && (
        <>
          <p className="t-body-m">Report submitted. Check out to finish the visit.</p>
          <button
            type="button"
            className="mbtn mbtn--fill mbtn--block"
            onClick={handleCheckOut}
            disabled={busy}
          >
            {busy ? 'Checking out…' : 'Check out'}
          </button>
        </>
      )}

      {visit.status === 'completed' && (
        <p className="t-body-m">
          Visit completed{visit.checkout_at ? ` at ${formatTime(visit.checkout_at)}` : ''}.
        </p>
      )}
    </>
  );
}
