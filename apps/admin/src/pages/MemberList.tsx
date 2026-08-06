import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  CARE_MODEL_LABELS,
  PLAN_LEVEL_LABELS,
  calculateAge,
  initialsFor,
  type CareModel,
  type PlanLevel,
} from '../lib/members';

interface MemberRow {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  location: string | null;
  care_model: CareModel;
  plan_level: PlanLevel;
}

const MODEL_CHIP_CLASS: Record<CareModel, string> = {
  self_care: 'model-chip--self',
  virtual_care: 'model-chip--virtual',
  direct_care: 'model-chip--direct',
};

const PLAN_CHIP_CLASS: Record<PlanLevel, string> = {
  basic: '',
  standard: 'plan--standard',
  premium: 'plan--premium',
};

export function MemberList() {
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [staffByMember, setStaffByMember] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let ignore = false;

    async function load() {
      const { data: memberRows, error: membersError } = await supabase
        .from('members')
        .select('id, full_name, date_of_birth, gender, location, care_model, plan_level')
        .order('full_name');
      if (ignore) return;
      if (membersError || !memberRows) {
        setLoading(false);
        setFetchError(true);
        return;
      }
      setMembers(memberRows);

      const memberIds = memberRows.map((m) => m.id);
      if (memberIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: assignments } = await supabase
        .from('care_assignments')
        .select('member_id, coordinator_id')
        .eq('is_active', true)
        .in('member_id', memberIds);
      if (ignore) return;

      const coordinatorIds = [...new Set((assignments ?? []).map((a) => a.coordinator_id))];
      const { data: coordinators } =
        coordinatorIds.length > 0
          ? await supabase.from('profiles').select('id, full_name').in('id', coordinatorIds)
          : { data: [] as { id: string; full_name: string | null }[] };
      if (ignore) return;

      const nameById = new Map((coordinators ?? []).map((c) => [c.id, c.full_name ?? 'Unnamed']));
      const byMember: Record<string, string[]> = {};
      for (const a of assignments ?? []) {
        const name = nameById.get(a.coordinator_id);
        if (!name) continue;
        (byMember[a.member_id] ??= []).push(name);
      }

      setLoading(false);
      setStaffByMember(byMember);
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  if (loading) {
    return <div className="card">Loading…</div>;
  }

  return (
    <>
      {fetchError && (
        <div className="card" role="alert">
          <span>Something went wrong loading members.</span>
          <button type="button" onClick={() => setFetchError(false)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="page-header">
        <div className="page-header__txt">
          <h1>Members</h1>
          <p>{members.length} member(s) assigned to you</p>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="card">
          <span>No members assigned to you yet.</span>
        </div>
      ) : (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Care Model</th>
                <th>Plan</th>
                <th>District</th>
                <th>Assigned staff</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>
                    <div className="u">
                      <span className="avatar avatar--sm">{initialsFor(member.full_name)}</span>
                      <div className="u__txt">
                        <Link className="name cell-link" to={`/members/${member.id}`}>
                          {member.full_name}
                        </Link>
                        <div className="sub">
                          {member.gender ? `${member.gender} · ` : ''}
                          {member.date_of_birth ? `${calculateAge(member.date_of_birth)}y` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`model-chip ${MODEL_CHIP_CLASS[member.care_model]}`}>
                      <span className="dot" />
                      {CARE_MODEL_LABELS[member.care_model]}
                    </span>
                  </td>
                  <td>
                    <span className={`plan ${PLAN_CHIP_CLASS[member.plan_level]}`}>
                      {PLAN_LEVEL_LABELS[member.plan_level]}
                    </span>
                  </td>
                  <td>{member.location ?? '—'}</td>
                  <td>{staffByMember[member.id]?.join(', ') ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
