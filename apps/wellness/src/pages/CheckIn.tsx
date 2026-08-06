import { useState } from 'react';
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

  const save = async () => {
    if (!selectedMemberId) return;
    setSaving(true);
    setSaveError(false);
    const { error } = await supabase.from('checkins').insert({
      member_id: selectedMemberId,
      mood,
      sleep,
      energy,
      aches,
      notes: notes.trim() || null,
      wellness_score: calculateWellnessScore(mood, energy, sleep, aches),
    });
    setSaving(false);
    if (error) {
      setSaveError(true);
      return;
    }
    navigate('/');
  };

  return (
    <>
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

      <div className="checkin">
        <div className="checkin__head">
          <h3>How are you feeling today?</h3>
          <span className="day">
            {new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
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
                className={`choice${mood === opt.value ? ' on' : ''}`}
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
                className={`choice${sleep === opt.value ? ' on' : ''}`}
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
                className={`choice${energy === opt.value ? ' on' : ''}`}
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
                className={`choice${aches === opt.value ? ' on' : ''}${
                  aches === opt.value && opt.value !== 'none' ? '-warn' : ''
                }`}
                onClick={() => setAches(opt.value)}
              >
                {opt.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="field">
        <label htmlFor="checkin-notes">Add a note for your care team (optional)</label>
        <textarea
          id="checkin-notes"
          placeholder="e.g. Felt a bit tired after lunch, otherwise fine."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

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
    </>
  );
}
