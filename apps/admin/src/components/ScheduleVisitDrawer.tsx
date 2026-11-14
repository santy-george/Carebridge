import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  SERVICE_TYPES,
  buildSchedule,
  createVisit,
  fetchAssignableStaff,
  toDateInputValue,
  type AssignableStaff,
} from '../lib/visits';

interface MemberOption {
  id: string;
  full_name: string;
}

export function ScheduleVisitDrawer({
  open,
  createdBy,
  onClose,
  onCreated,
}: {
  open: boolean;
  createdBy: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [staff, setStaff] = useState<AssignableStaff[]>([]);
  const [optionsError, setOptionsError] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [serviceType, setServiceType] = useState<string>(SERVICE_TYPES[0]);
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState('60');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Options load when the drawer first opens, not on every page load.
  useEffect(() => {
    if (!open) return;
    let ignore = false;
    async function load() {
      const [memberRes, staffRes] = await Promise.allSettled([
        supabase.from('members').select('id, full_name').order('full_name'),
        fetchAssignableStaff(),
      ]);
      if (ignore) return;
      const failed =
        memberRes.status === 'rejected' ||
        memberRes.value.error != null ||
        staffRes.status === 'rejected';
      setOptionsError(failed);
      if (memberRes.status === 'fulfilled' && memberRes.value.data) {
        setMembers(memberRes.value.data);
      }
      if (staffRes.status === 'fulfilled') setStaff(staffRes.value);
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [open]);

  const schedule = buildSchedule(date, time, Number(duration));
  const canSave = !!memberId && !!staffId && !!serviceType && !!schedule && !saving;

  const submit = async () => {
    if (!schedule) return;
    setSaving(true);
    setError(null);
    try {
      await createVisit({
        memberId,
        staffId,
        serviceType,
        start: schedule.start,
        end: schedule.end,
        createdBy,
      });
    } catch {
      setSaving(false);
      setError('Could not schedule the visit.');
      return;
    }
    setSaving(false);
    setMemberId('');
    setStaffId('');
    onCreated();
    onClose();
  };

  return (
    <>
      <div className={`overlay${open ? ' is-open' : ''}`} onClick={onClose} />
      <aside className={`drawer${open ? ' is-open' : ''}`} aria-label="Schedule visit">
        <div className="drawer__head">
          <span className="drawer__title">Schedule visit</span>
          <button type="button" className="x-btn" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <form
          className="drawer__body"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSave) void submit();
          }}
        >
          {optionsError && (
            <p className="form-error" role="alert">
              Could not load members or staff.
            </p>
          )}
          <div className="field field--full">
            <label htmlFor="sv-member">Member</label>
            <select id="sv-member" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              <option value="">Select member</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="field field--full">
            <label htmlFor="sv-staff">Assigned to</label>
            <select id="sv-staff" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">Select staff</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                  {s.service_area ? ` — ${s.service_area}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="field field--full">
            <label htmlFor="sv-service">Service</label>
            <select
              id="sv-service"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
            >
              {SERVICE_TYPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="field field--full">
            <label htmlFor="sv-date">Date</label>
            <div className="control">
              <input
                id="sv-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="field field--full">
            <label htmlFor="sv-time">Start time</label>
            <div className="control">
              <input
                id="sv-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
          <div className="field field--full">
            <label htmlFor="sv-duration">Duration (minutes)</label>
            <div className="control">
              <input
                id="sv-duration"
                type="number"
                min={15}
                step={15}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </form>
        <div className="drawer__foot">
          <button type="button" className="btn btn--outline btn--sm" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={!canSave}
            onClick={() => void submit()}
          >
            {saving ? 'Scheduling…' : 'Schedule visit'}
          </button>
        </div>
      </aside>
    </>
  );
}
