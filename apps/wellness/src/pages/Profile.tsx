import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';
import {
  CARE_MODEL_LABELS,
  CONDITION_CHOICES,
  PLAN_LEVEL_LABELS,
  calculateAge,
  formatMemberSince,
  initialsFor,
  medicalSummary,
  type CareModel,
  type PlanLevel,
} from '../lib/profile';
import { clearDraft, useDraftForm, usePersistedSheet } from '../lib/draftForm';

interface Member {
  full_name: string;
  date_of_birth: string | null;
  created_at: string;
  care_model: CareModel;
  plan_level: PlanLevel;
}

interface MedicalProfile {
  conditions: string[];
  conditions_other: string | null;
  allergies: string[];
  notes: string | null;
}

export function Profile() {
  const { selectedMemberId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [member, setMember] = useState<Member | null>(null);
  const [medicalProfile, setMedicalProfile] = useState<MedicalProfile | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [conditions, setConditions] = useState<string[]>([]);
  const [conditionsOther, setConditionsOther] = useState('');
  const [allergiesText, setAllergiesText] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!selectedMemberId) return;

    Promise.all([
      supabase
        .from('members')
        .select('full_name, date_of_birth, created_at, care_model, plan_level')
        .eq('id', selectedMemberId)
        .maybeSingle(),
      supabase
        .from('medical_profile')
        .select('conditions, conditions_other, allergies, notes')
        .eq('member_id', selectedMemberId)
        .maybeSingle(),
    ]).then(([memberRes, profileRes]) => {
      if (!isMounted) return;
      setLoading(false);
      setFetchError(!!(memberRes.error || profileRes.error));
      setMember((memberRes.data as Member | null) ?? null);
      setMedicalProfile((profileRes.data as MedicalProfile | null) ?? null);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedMemberId]);

  useDraftForm(
    'medical-profile',
    sheetOpen,
    { conditions, conditionsOther, allergiesText, notes },
    (v) => {
      setConditions(v.conditions);
      setConditionsOther(v.conditionsOther);
      setAllergiesText(v.allergiesText);
      setNotes(v.notes);
    },
  );

  usePersistedSheet('profile', sheetOpen ? 'open' : null, () => setSheetOpen(true), ['open']);

  const closeSheet = () => {
    clearDraft('medical-profile');
    clearDraft('open-sheet:profile');
    setSheetOpen(false);
  };

  const openSheet = () => {
    setConditions(medicalProfile?.conditions ?? []);
    setConditionsOther(medicalProfile?.conditions_other ?? '');
    setAllergiesText((medicalProfile?.allergies ?? []).join(', '));
    setNotes(medicalProfile?.notes ?? '');
    setSaveError(false);
    setSheetOpen(true);
  };

  const toggleCondition = (c: string) =>
    setConditions((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const submitMedical = async () => {
    if (!selectedMemberId) return;
    setSaving(true);
    setSaveError(false);
    const payload = {
      member_id: selectedMemberId,
      conditions,
      conditions_other: conditionsOther.trim() || null,
      allergies: allergiesText
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
      notes: notes.trim() || null,
    };
    const { error } = await supabase
      .from('medical_profile')
      .upsert(payload, { onConflict: 'member_id' });
    setSaving(false);
    if (error) {
      setSaveError(true);
      return;
    }
    setMedicalProfile(payload);
    clearDraft('medical-profile');
    clearDraft('open-sheet:profile');
    setSheetOpen(false);
  };

  if (loading) {
    return <div className="card">Loading…</div>;
  }

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
          <h1 className="sm">Profile &amp; settings</h1>
        </div>
      </div>

      {member && (
        <>
          <div className="idblock reveal" style={{ padding: '4px 2px' }}>
            <span className="av">{initialsFor(member.full_name)}</span>
            <div>
              <div className="nm">{member.full_name}</div>
              <div className="sub">
                {member.date_of_birth ? `${calculateAge(member.date_of_birth)} years old · ` : ''}
                Member since {formatMemberSince(member.created_at)}
              </div>
            </div>
          </div>
          <span className={`tierbadge tierbadge--${member.care_model.replace('_care', '')} reveal`}>
            <span className="icon">
              <svg>
                <use href="#i-shield" />
              </svg>
            </span>
            {CARE_MODEL_LABELS[member.care_model]} · {PLAN_LEVEL_LABELS[member.plan_level]}
          </span>
        </>
      )}

      <div className="sec">Account</div>
      <div className="card card--flush reveal">
        <div className="row tap" role="button" tabIndex={0} onClick={openSheet}>
          <div className="ic">
            <span className="icon">
              <svg>
                <use href="#i-clipboard" />
              </svg>
            </span>
          </div>
          <div className="m">
            <div className="t">Medical profile</div>
            <div className="s">
              {medicalSummary(
                medicalProfile?.conditions.length ?? 0,
                medicalProfile?.allergies.length ?? 0,
              )}
            </div>
          </div>
          <span className="icon chev">
            <svg>
              <use href="#i-chevron" />
            </svg>
          </span>
        </div>
      </div>

      <Link to="/more">
        <button type="button" className="mbtn mbtn--line mbtn--block">
          Manage account
        </button>
      </Link>

      <Link to="/withdraw-consent">
        <button
          type="button"
          className="mbtn mbtn--ghost mbtn--block"
          style={{ color: 'var(--danger)' }}
        >
          Withdraw consent
        </button>
      </Link>

      <div className={`scrim${sheetOpen ? ' show' : ''}`} onClick={closeSheet} />
      <div className={`sheet${sheetOpen ? ' show' : ''}`}>
        <div className="sheet__grip" />
        <button
          type="button"
          className="iconbtn"
          style={{ position: 'absolute', top: '14px', right: '14px' }}
          aria-label="Close"
          onClick={closeSheet}
        >
          <span className="icon">
            <svg>
              <use href="#i-close" />
            </svg>
          </span>
        </button>
        <h2>Medical profile</h2>
        <p className="lead">
          Existing diagnoses and allergies, shared across your Care Bridge Home apps.
        </p>
        <form
          style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}
          onSubmit={(e) => {
            e.preventDefault();
            submitMedical();
          }}
        >
          <div className="field">
            <label>Existing conditions</label>
            <div className="choices">
              {CONDITION_CHOICES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`choice${conditions.includes(c) ? ' on' : ''}`}
                  onClick={() => toggleCondition(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="conditions-other">Other condition</label>
            <input
              id="conditions-other"
              type="text"
              placeholder="e.g. Parkinson's disease"
              value={conditionsOther}
              onChange={(e) => setConditionsOther(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="allergies">Allergies</label>
            <input
              id="allergies"
              type="text"
              placeholder="e.g. Penicillin, Peanuts"
              value={allergiesText}
              onChange={(e) => setAllergiesText(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="medical-notes">Notes</label>
            <textarea
              id="medical-notes"
              placeholder="Anything your care team should know"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="mbtn mbtn--fill mbtn--block sheet__save"
            style={{ marginTop: '8px' }}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save medical profile'}
          </button>
          {saveError && (
            <p className="form-error" role="alert">
              Couldn&apos;t save your medical profile — try again.
            </p>
          )}
        </form>
      </div>
    </>
  );
}
