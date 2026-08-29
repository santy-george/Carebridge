import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';
import {
  ACHES_OPTIONS,
  ENERGY_OPTIONS,
  MOOD_OPTIONS,
  SLEEP_OPTIONS,
  calculateWellnessScore,
  type Aches,
  type Energy,
  type Mood,
  type Sleep,
} from '../lib/checkin';

// Local calendar date, not UTC -- new Date().toISOString().slice(0, 10)
// would file a late-evening check-in under tomorrow's UTC date for any
// positive-offset timezone (India included, this app's actual market).
function localDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

interface TodaysCheckin {
  mood: Mood;
  sleep: Sleep;
  energy: Energy;
  aches: Aches;
  notes: string | null;
}

export function CheckIn() {
  const { selectedMemberId } = useAuth();
  const navigate = useNavigate();
  const [mood, setMood] = useState<Mood>('good');
  const [sleep, setSleep] = useState<Sleep>('good');
  const [energy, setEnergy] = useState<Energy>('medium');
  const [aches, setAches] = useState<Aches>('none');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!selectedMemberId) return;

    supabase
      .from('checkins')
      .select('mood, sleep, energy, aches, notes')
      .eq('member_id', selectedMemberId)
      .eq('checkin_date', localDateString(new Date()))
      .maybeSingle()
      .then(({ data }) => {
        if (!isMounted || !data) return;
        const todays = data as TodaysCheckin;
        setMood(todays.mood);
        setSleep(todays.sleep);
        setEnergy(todays.energy);
        setAches(todays.aches);
        setNotes(todays.notes ?? '');
      });

    return () => {
      isMounted = false;
    };
  }, [selectedMemberId]);

  const save = async () => {
    if (!selectedMemberId) return;
    setSaving(true);
    setSaveError(false);
    const localCheckinDate = localDateString(new Date());
    const { error } = await supabase.from('checkins').upsert(
      {
        member_id: selectedMemberId,
        checkin_date: localCheckinDate,
        mood,
        sleep,
        energy,
        aches,
        notes: notes.trim() || null,
        wellness_score: calculateWellnessScore(mood, energy, sleep, aches),
      },
      { onConflict: 'member_id,checkin_date' },
    );
    setSaving(false);
    if (error) {
      setSaveError(true);
      return;
    }
    navigate('/');
  };

  /** Active-state modifier for a choice pill. Negative health indicators use
   *  `on-warn` (yellow), severe conditions use `on-alert` (red), positive/neutral use `on`. */
  const choiceClass = (isSelected: boolean, severity?: 'warn' | 'alert') =>
    isSelected ? ` on${severity ? '-' + severity : ''}` : '';

  return (
    <>
      <style>{`
        .tbar__title h1, .sec, .tt, h2, h3 { color: var(--purple-700); }
      `}</style>

      <div className="tbar">
        <Link className="backbtn" to="/" aria-label="Back to home">
          <span className="icon">
            <svg>
              <use href="#i-chevron" />
            </svg>
          </span>
        </Link>
        <div className="tbar__title">
          <h1 className="sm">Daily check-in</h1>
        </div>
      </div>

      <div className="vbody has-cta">
        <div className="checkin reveal">
          <div className="checkin__head">
            <h3>How are you feeling today?</h3>
            <span className="day">
              {new Date().toLocaleDateString(undefined, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </span>
          </div>

          <div className="checkin__q">
            <div className="ql">Mood</div>
            <div className="checkin__choices">
              {MOOD_OPTIONS.map((opt) => (
                <span
                  key={opt.value}
                  role="button"
                  tabIndex={0}
                  className={`choice${choiceClass(mood === opt.value, opt.value === 'low' ? 'warn' : undefined)}`}
                  onClick={() => setMood(opt.value)}
                >
                  {opt.label}
                </span>
              ))}
            </div>
          </div>

          <div className="checkin__q">
            <div className="ql">Sleep last night</div>
            <div className="checkin__choices">
              {SLEEP_OPTIONS.map((opt) => (
                <span
                  key={opt.value}
                  role="button"
                  tabIndex={0}
                  className={`choice${choiceClass(sleep === opt.value, opt.value === 'poor' ? 'warn' : undefined)}`}
                  onClick={() => setSleep(opt.value)}
                >
                  {opt.label}
                </span>
              ))}
            </div>
          </div>

          <div className="checkin__q">
            <div className="ql">Energy level</div>
            <div className="checkin__choices">
              {ENERGY_OPTIONS.map((opt) => (
                <span
                  key={opt.value}
                  role="button"
                  tabIndex={0}
                  className={`choice${choiceClass(energy === opt.value, opt.value === 'low' ? 'warn' : undefined)}`}
                  onClick={() => setEnergy(opt.value)}
                >
                  {opt.label}
                </span>
              ))}
            </div>
          </div>

          <div className="checkin__q">
            <div className="ql">Any pain or discomfort?</div>
            <div className="checkin__choices">
              {ACHES_OPTIONS.map((opt) => (
                <span
                  key={opt.value}
                  role="button"
                  tabIndex={0}
                  className={`choice${choiceClass(
                    aches === opt.value,
                    aches === opt.value
                      ? opt.value === 'severe'
                        ? 'alert'
                        : opt.value !== 'none'
                          ? 'warn'
                          : undefined
                      : undefined,
                  )}`}
                  onClick={() => setAches(opt.value)}
                >
                  {opt.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="field reveal">
          <label htmlFor="checkin-notes">Add a note for your care team (optional)</label>
          <textarea
            id="checkin-notes"
            placeholder="e.g. Felt a bit tired after lunch, otherwise fine."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="cta-bar">
        <button
          className="mbtn mbtn--fill mbtn--block"
          type="button"
          disabled={saving}
          onClick={save}
        >
          {saving ? 'Saving…' : 'Save check-in'}
        </button>
        {saveError && (
          <p className="form-error" role="alert">
            Couldn&apos;t save your check-in — try again.
          </p>
        )}
      </div>
    </>
  );
}
