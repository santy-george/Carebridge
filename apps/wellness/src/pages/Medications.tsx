import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';
import {
  BAND_LABELS,
  TIME_OF_DAY_BANDS,
  buildDosesByBand,
  buildPharmacistOrderMailto,
  computeStockDaysLeft,
  findPharmacistEmail,
  lowStockMessage,
  type MedicationForDoses,
  type MedicationLogForDoses,
  type StockItem,
  type TimeOfDayBand,
} from '../lib/medications';

type Sheet = null | 'med' | 'refill' | 'pharm';

const BAND_BG: Record<TimeOfDayBand, string> = {
  morning: 'var(--amber-50)',
  noon: 'var(--blue-50)',
  evening: 'var(--purple-50)',
  night: 'var(--mint-50)',
};

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function Medications() {
  const { selectedMemberId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [allergiesText, setAllergiesText] = useState('No known allergies on file');
  const [medications, setMedications] = useState<MedicationForDoses[]>([]);
  const [logs, setLogs] = useState<MedicationLogForDoses[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [periodOpen, setPeriodOpen] = useState<Record<TimeOfDayBand, boolean>>({
    morning: true,
    noon: true,
    evening: true,
    night: true,
  });
  const [stockOpen, setStockOpen] = useState(true);
  const [sheet, setSheet] = useState<Sheet>(null);

  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medBands, setMedBands] = useState<TimeOfDayBand[]>([]);
  const [medHighRisk, setMedHighRisk] = useState(false);
  const [medError, setMedError] = useState(false);

  const [refillName, setRefillName] = useState('');
  const [refillQty, setRefillQty] = useState('');
  const [refillUnit, setRefillUnit] = useState('tablets');
  const [refillDosage, setRefillDosage] = useState('');
  const [refillTakenFor, setRefillTakenFor] = useState('');
  const [refillDosesPerDay, setRefillDosesPerDay] = useState('1');
  const [refillHighRisk, setRefillHighRisk] = useState(false);
  const [refillIsRx, setRefillIsRx] = useState(true);
  const [refillPrescriber, setRefillPrescriber] = useState('');
  const [refillExpiry, setRefillExpiry] = useState('');
  const [refillError, setRefillError] = useState(false);

  const [careTeam, setCareTeam] = useState<{ role_label: string; email: string | null }[]>([]);
  const [pharmEmail, setPharmEmail] = useState('');
  const [pharmChecked, setPharmChecked] = useState<Record<string, boolean>>({});
  const [pharmError, setPharmError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!selectedMemberId) return;

    Promise.all([
      supabase
        .from('medical_profile')
        .select('allergies')
        .eq('member_id', selectedMemberId)
        .maybeSingle(),
      supabase
        .from('medications')
        .select('id, name, dosage, high_risk, time_of_day')
        .eq('member_id', selectedMemberId)
        .eq('active', true),
      supabase
        .from('medication_logs')
        .select('medication_id, time_of_day, taken')
        .eq('member_id', selectedMemberId)
        .eq('scheduled_date', todayDate()),
      supabase
        .from('med_stock')
        .select('id, name, qty, unit, doses_per_day, high_risk, dosage, taken_for')
        .eq('member_id', selectedMemberId),
      supabase.from('care_team').select('role_label, email').eq('member_id', selectedMemberId),
    ]).then(([profileRes, medsRes, logsRes, stockRes, careTeamRes]) => {
      if (!isMounted) return;
      setLoading(false);
      const anyError =
        profileRes.error || medsRes.error || logsRes.error || stockRes.error || careTeamRes.error;
      setFetchError(!!anyError);
      const allergies = (profileRes.data as { allergies: string[] } | null)?.allergies ?? [];
      setAllergiesText(allergies.length ? allergies.join(', ') : 'No known allergies on file');
      setMedications((medsRes.data as MedicationForDoses[] | null) ?? []);
      setLogs((logsRes.data as MedicationLogForDoses[] | null) ?? []);
      setStock((stockRes.data as StockItem[] | null) ?? []);
      setCareTeam(
        (careTeamRes.data as { role_label: string; email: string | null }[] | null) ?? [],
      );
    });

    return () => {
      isMounted = false;
    };
  }, [selectedMemberId]);

  const togglePeriod = (band: TimeOfDayBand) =>
    setPeriodOpen((prev) => ({ ...prev, [band]: !prev[band] }));

  const toggleDose = async (medicationId: string, band: TimeOfDayBand, currentlyTaken: boolean) => {
    if (!selectedMemberId) return;
    const nextTaken = !currentlyTaken;
    setLogs((prev) => {
      const withoutThis = prev.filter(
        (l) => !(l.medication_id === medicationId && l.time_of_day === band),
      );
      return [...withoutThis, { medication_id: medicationId, time_of_day: band, taken: nextTaken }];
    });
    await supabase.from('medication_logs').upsert(
      {
        medication_id: medicationId,
        member_id: selectedMemberId,
        scheduled_date: todayDate(),
        time_of_day: band,
        taken: nextTaken,
        taken_at: nextTaken ? new Date().toISOString() : null,
      },
      { onConflict: 'medication_id,scheduled_date,time_of_day' },
    );
  };

  const toggleMedBand = (band: TimeOfDayBand) =>
    setMedBands((prev) => (prev.includes(band) ? prev.filter((b) => b !== band) : [...prev, band]));

  const submitMedication = async () => {
    if (!selectedMemberId || !medName.trim() || medBands.length === 0) return;
    setMedError(false);
    const { data, error } = await supabase
      .from('medications')
      .insert({
        member_id: selectedMemberId,
        name: medName.trim(),
        dosage: medDosage.trim() || null,
        time_of_day: medBands,
        high_risk: medHighRisk,
      })
      .select('id, name, dosage, high_risk, time_of_day')
      .single();
    if (error || !data) {
      setMedError(true);
      return;
    }
    setMedications((prev) => [...prev, data as MedicationForDoses]);
    setMedName('');
    setMedDosage('');
    setMedBands([]);
    setMedHighRisk(false);
    setSheet(null);
  };

  const submitRefill = async () => {
    const qty = parseFloat(refillQty);
    const dosesPerDay = parseInt(refillDosesPerDay, 10) || 1;
    if (!selectedMemberId || !refillName.trim() || !qty) return;
    setRefillError(false);
    const { data, error } = await supabase
      .from('med_stock')
      .insert({
        member_id: selectedMemberId,
        name: refillName.trim(),
        qty,
        unit: refillUnit.trim() || 'tablets',
        dosage: refillDosage.trim() || null,
        taken_for: refillTakenFor.trim() || null,
        doses_per_day: dosesPerDay,
        high_risk: refillHighRisk,
        prescribed_by: refillIsRx ? refillPrescriber.trim() || null : null,
        expiry_date: refillExpiry || null,
      })
      .select('id, name, qty, unit, doses_per_day, high_risk, dosage, taken_for')
      .single();
    if (error || !data) {
      setRefillError(true);
      return;
    }
    setStock((prev) => [...prev, data as StockItem]);
    setRefillName('');
    setRefillQty('');
    setRefillUnit('tablets');
    setRefillDosage('');
    setRefillTakenFor('');
    setRefillDosesPerDay('1');
    setRefillHighRisk(false);
    setRefillIsRx(true);
    setRefillPrescriber('');
    setRefillExpiry('');
    setSheet(null);
  };

  const openPharmacistSheet = () => {
    const withDays = computeStockDaysLeft(stock);
    const email = findPharmacistEmail(careTeam);
    const checked: Record<string, boolean> = {};
    for (const item of withDays) {
      checked[item.id] = item.daysLeft <= 14;
    }
    setPharmEmail(email);
    setPharmChecked(checked);
    setPharmError(false);
    setSheet('pharm');
  };

  const togglePharmItem = (id: string) => setPharmChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const submitPharmacist = () => {
    const items = computeStockDaysLeft(stock).filter((item) => pharmChecked[item.id]);
    const email = pharmEmail.trim();
    if (!items.length || !email) {
      setPharmError(true);
      return;
    }
    window.location.href = buildPharmacistOrderMailto(email, items);
    setSheet(null);
  };

  if (loading) {
    return <div className="card">Loading…</div>;
  }

  const dosesByBand = buildDosesByBand(medications, logs);
  const allDoses = TIME_OF_DAY_BANDS.flatMap((band) => dosesByBand[band]);
  const takenCount = allDoses.filter((d) => d.taken).length;
  const totalCount = allDoses.length;
  const todayPercent = totalCount ? Math.round((takenCount / totalCount) * 100) : 0;

  const stockWithDays = computeStockDaysLeft(stock);
  const lowMessage = lowStockMessage(stockWithDays);

  return (
    <>
      <style>{`
        .tbar__title h1, .sec, .tt, h2, h3 { color: var(--purple-700); }
        .seg button.is-active { background: var(--purple-700); color: #fff; box-shadow: var(--shadow-xs) }
        .card--flush .med-item { padding-left: 16px; padding-right: 16px }
        .med-item__toggle { cursor: pointer }
        .med-item--highrisk { background: var(--danger-soft) }
        .med-item--highrisk .ic { background: var(--danger-soft); color: var(--danger) }
      `}</style>

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
          <h1 className="sm">My Schedule</h1>
        </div>
        <button
          type="button"
          className="iconbtn"
          aria-label="Add medication"
          onClick={() => setSheet('med')}
        >
          <span className="icon">
            <svg>
              <use href="#i-plus" />
            </svg>
          </span>
        </button>
      </div>

      <div className="seg" style={{ marginBottom: '4px' }}>
        <button type="button" disabled style={{ opacity: 0.5, cursor: 'default' }}>
          Appointments
        </button>
        <button type="button" className="is-active">
          Medications
        </button>
        <button type="button" disabled style={{ opacity: 0.5, cursor: 'default' }}>
          Activity
        </button>
      </div>

      <div className="banner banner--warn" style={{ marginBottom: '12px' }}>
        <div className="ic">
          <span className="icon">
            <svg>
              <use href="#i-bandage" />
            </svg>
          </span>
        </div>
        <div>
          <div className="bt">Allergies</div>
          <div className="bs">{allergiesText}</div>
        </div>
      </div>

      {lowMessage && (
        <div className="banner banner--alert" style={{ marginBottom: '12px' }}>
          <div className="ic">
            <span className="icon">
              <svg>
                <use href="#i-alert" />
              </svg>
            </span>
          </div>
          <div>
            <div className="bt">Running low on stock</div>
            <div className="bs">{lowMessage}</div>
          </div>
        </div>
      )}

      {TIME_OF_DAY_BANDS.map((band) => (
        <div key={band}>
          <div className="sec tap" onClick={() => togglePeriod(band)}>
            {BAND_LABELS[band]}
            <span
              className="icon"
              style={{
                width: 16,
                height: 16,
                color: 'var(--text-subtle)',
                transform: periodOpen[band] ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }}
            >
              <svg>
                <use href="#i-chevron-down" />
              </svg>
            </span>
          </div>
          {periodOpen[band] && (
            <div className="card card--flush" style={{ background: BAND_BG[band] }}>
              {dosesByBand[band].length === 0 && (
                <div className="med-item">No medications scheduled</div>
              )}
              {dosesByBand[band].map((dose) => (
                <div
                  key={dose.key}
                  className={`med-item${dose.taken ? ' med-item--taken' : ''}${
                    dose.highRisk ? ' med-item--highrisk' : ''
                  }`}
                >
                  <div className="ic">
                    <span className="icon">
                      <svg>
                        <use href="#i-pill" />
                      </svg>
                    </span>
                  </div>
                  <div className="m">
                    <div className="t">
                      {dose.name}
                      {dose.dosage ? ` ${dose.dosage}` : ''}
                      {dose.highRisk && (
                        <span className="chip2 chip2--alert">
                          <span className="icon">
                            <svg>
                              <use href="#i-alert" />
                            </svg>
                          </span>
                          High risk
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="med-item__toggle"
                    role="button"
                    tabIndex={0}
                    aria-label={`Mark ${dose.name} ${BAND_LABELS[band]} as ${dose.taken ? 'not taken' : 'taken'}`}
                    onClick={() => toggleDose(dose.medicationId, band, dose.taken)}
                  >
                    <span className="icon">
                      <svg>
                        <use href="#i-check" />
                      </svg>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="sec">Today's completion</div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        <div
          style={{
            width: '88px',
            height: '88px',
            borderRadius: '50%',
            flex: '0 0 auto',
            background: `conic-gradient(var(--accent) 0 ${todayPercent}%, var(--border) ${todayPercent}% 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '66px',
              height: '66px',
              borderRadius: '50%',
              background: 'var(--surface)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <b style={{ fontSize: '16px', color: 'var(--text-heading)' }}>{todayPercent}%</b>
          </div>
        </div>
        <div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Doses taken today</div>
          <b
            style={{
              fontSize: '15px',
              color: 'var(--text-heading)',
              display: 'block',
              marginTop: 2,
            }}
          >
            {takenCount} of {totalCount}
          </b>
        </div>
      </div>

      <div className="sec tap" onClick={() => setStockOpen((v) => !v)}>
        Medicine stock level
        <span
          className="icon"
          style={{
            width: 16,
            height: 16,
            color: 'var(--text-subtle)',
            transform: stockOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}
        >
          <svg>
            <use href="#i-chevron-down" />
          </svg>
        </span>
      </div>
      {stockOpen && (
        <>
          <div className="card card--pad0" style={{ overflow: 'hidden' }}>
            <table className="table" style={{ fontSize: '12.5px' }}>
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th className="t-right">In stock</th>
                  <th className="t-right">Days left</th>
                </tr>
              </thead>
              <tbody>
                {stockWithDays.map((item) => (
                  <tr
                    key={item.id}
                    style={item.high_risk ? { background: 'var(--danger-soft)' } : undefined}
                  >
                    <td>
                      {item.name}
                      {item.high_risk && (
                        <span className="chip2 chip2--alert">
                          <span className="icon">
                            <svg>
                              <use href="#i-alert" />
                            </svg>
                          </span>
                          High risk
                        </span>
                      )}
                    </td>
                    <td className="t-right">
                      {item.qty} {item.unit}
                    </td>
                    <td className="t-right">
                      <span className={`chip2 ${item.chipClass}`}>{item.daysLeft}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="mbtn mbtn--fill mbtn--block"
            style={{ marginTop: '10px' }}
            onClick={() => setSheet('refill')}
          >
            Refill stock
          </button>
          <button
            type="button"
            className="mbtn mbtn--line mbtn--block"
            style={{ marginTop: '8px' }}
            onClick={openPharmacistSheet}
          >
            <span className="icon">
              <svg>
                <use href="#i-mail" />
              </svg>
            </span>
            Send to pharmacist
          </button>
        </>
      )}

      <div className={`scrim${sheet ? ' show' : ''}`} onClick={() => setSheet(null)} />

      <div className={`sheet${sheet === 'med' ? ' show' : ''}`}>
        <div className="sheet__grip" />
        <button
          type="button"
          className="iconbtn"
          style={{ position: 'absolute', top: '14px', right: '14px' }}
          aria-label="Close"
          onClick={() => setSheet(null)}
        >
          <span className="icon">
            <svg>
              <use href="#i-close" />
            </svg>
          </span>
        </button>
        <h2>New medication</h2>
        <p className="lead">Add a medication to your schedule.</p>
        <form
          style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}
          onSubmit={(e) => {
            e.preventDefault();
            submitMedication();
          }}
        >
          <div className="field">
            <label htmlFor="med-name">Medication name &amp; dose</label>
            <input
              id="med-name"
              type="text"
              placeholder="e.g. Vitamin B12 1000mcg"
              value={medName}
              onChange={(e) => setMedName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="med-dosage">Dosage</label>
            <input
              id="med-dosage"
              type="text"
              placeholder="e.g. 1 tablet"
              value={medDosage}
              onChange={(e) => setMedDosage(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Time of day</label>
            <div className="checkin__choices">
              {TIME_OF_DAY_BANDS.map((band) => (
                <span
                  key={band}
                  role="button"
                  tabIndex={0}
                  className={`choice${medBands.includes(band) ? ' on' : ''}`}
                  onClick={() => toggleMedBand(band)}
                >
                  {BAND_LABELS[band]}
                </span>
              ))}
            </div>
          </div>
          <div className="field">
            <label>High-risk medication? (e.g. anticoagulant)</label>
            <div className="seg">
              <button
                type="button"
                className={medHighRisk ? 'is-active' : ''}
                onClick={() => setMedHighRisk(true)}
              >
                Yes
              </button>
              <button
                type="button"
                className={!medHighRisk ? 'is-active' : ''}
                onClick={() => setMedHighRisk(false)}
              >
                No
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="mbtn mbtn--fill mbtn--block sheet__save"
            style={{ marginTop: '8px' }}
          >
            Save medication
          </button>
          {medError && (
            <p className="form-error" role="alert">
              Couldn&apos;t save that medication — try again.
            </p>
          )}
        </form>
      </div>

      <div className={`sheet${sheet === 'refill' ? ' show' : ''}`}>
        <div className="sheet__grip" />
        <button
          type="button"
          className="iconbtn"
          style={{ position: 'absolute', top: '14px', right: '14px' }}
          aria-label="Close"
          onClick={() => setSheet(null)}
        >
          <span className="icon">
            <svg>
              <use href="#i-close" />
            </svg>
          </span>
        </button>
        <h2>Refill stock</h2>
        <p className="lead">Add a new medicine to your stock.</p>
        <form
          style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}
          onSubmit={(e) => {
            e.preventDefault();
            submitRefill();
          }}
        >
          <div className="field">
            <label htmlFor="refill-name">Medicine name</label>
            <input
              id="refill-name"
              type="text"
              placeholder="e.g. Vitamin B12 1000mcg"
              value={refillName}
              onChange={(e) => setRefillName(e.target.value)}
            />
          </div>
          <div className="vgrid">
            <div className="field">
              <label htmlFor="refill-qty">Quantity</label>
              <input
                id="refill-qty"
                type="number"
                step="1"
                placeholder="e.g. 30"
                value={refillQty}
                onChange={(e) => setRefillQty(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="refill-unit">Unit</label>
              <input
                id="refill-unit"
                type="text"
                placeholder="e.g. tablets"
                value={refillUnit}
                onChange={(e) => setRefillUnit(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="refill-dosage">Dosage</label>
            <input
              id="refill-dosage"
              type="text"
              placeholder="e.g. 1 tablet daily"
              value={refillDosage}
              onChange={(e) => setRefillDosage(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="refill-taken-for">Taken for</label>
            <input
              id="refill-taken-for"
              type="text"
              placeholder="e.g. Blood pressure"
              value={refillTakenFor}
              onChange={(e) => setRefillTakenFor(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="refill-doses">Doses per day</label>
            <input
              id="refill-doses"
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 2"
              value={refillDosesPerDay}
              onChange={(e) => setRefillDosesPerDay(e.target.value)}
            />
          </div>
          <div className="field">
            <label>High-risk medication? (e.g. anticoagulant)</label>
            <div className="seg">
              <button
                type="button"
                className={refillHighRisk ? 'is-active' : ''}
                onClick={() => setRefillHighRisk(true)}
              >
                Yes
              </button>
              <button
                type="button"
                className={!refillHighRisk ? 'is-active' : ''}
                onClick={() => setRefillHighRisk(false)}
              >
                No
              </button>
            </div>
          </div>
          <div className="field">
            <label>Prescription medicine?</label>
            <div className="seg">
              <button
                type="button"
                className={refillIsRx ? 'is-active' : ''}
                onClick={() => setRefillIsRx(true)}
              >
                Yes
              </button>
              <button
                type="button"
                className={!refillIsRx ? 'is-active' : ''}
                onClick={() => setRefillIsRx(false)}
              >
                No
              </button>
            </div>
          </div>
          {refillIsRx && (
            <div className="field">
              <label htmlFor="refill-prescriber">Prescribed by</label>
              <input
                id="refill-prescriber"
                type="text"
                placeholder="e.g. Dr. Sarah Chen"
                value={refillPrescriber}
                onChange={(e) => setRefillPrescriber(e.target.value)}
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="refill-expiry">Expiry date</label>
            <input
              id="refill-expiry"
              type="date"
              value={refillExpiry}
              onChange={(e) => setRefillExpiry(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="mbtn mbtn--fill mbtn--block sheet__save"
            style={{ marginTop: '8px' }}
          >
            Save to stock
          </button>
          {refillError && (
            <p className="form-error" role="alert">
              Couldn&apos;t save that item — try again.
            </p>
          )}
        </form>
      </div>

      <div className={`sheet${sheet === 'pharm' ? ' show' : ''}`}>
        <div className="sheet__grip" />
        <button
          type="button"
          className="iconbtn"
          style={{ position: 'absolute', top: '14px', right: '14px' }}
          aria-label="Close"
          onClick={() => setSheet(null)}
        >
          <span className="icon">
            <svg>
              <use href="#i-close" />
            </svg>
          </span>
        </button>
        <h2>Send to pharmacist</h2>
        <p className="lead">Email your pharmacist the medicines you need to reorder.</p>
        <form
          style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}
          onSubmit={(e) => {
            e.preventDefault();
            submitPharmacist();
          }}
        >
          <div className="field">
            <label htmlFor="pharm-email">Pharmacist email</label>
            <input
              id="pharm-email"
              type="email"
              placeholder="e.g. orders@springfieldpharmacy.com"
              value={pharmEmail}
              onChange={(e) => setPharmEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Items to include</label>
            <div className="card card--flush" style={{ border: '1px solid var(--border)' }}>
              {stockWithDays.map((item) => (
                <label className="row" key={item.id} style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!!pharmChecked[item.id]}
                    onChange={() => togglePharmItem(item.id)}
                    style={{ width: '18px', height: '18px', marginRight: '4px' }}
                  />
                  <div className="m">
                    <div className="t">{item.name}</div>
                    <div className="s">
                      {item.qty} {item.unit} · {item.daysLeft} days left
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="mbtn mbtn--fill mbtn--block sheet__save"
            style={{ marginTop: '8px' }}
          >
            <span className="icon">
              <svg>
                <use href="#i-mail" />
              </svg>
            </span>
            Send email
          </button>
          {pharmError && (
            <p className="form-error" role="alert">
              Pick at least one item and a pharmacist email.
            </p>
          )}
        </form>
      </div>
    </>
  );
}
