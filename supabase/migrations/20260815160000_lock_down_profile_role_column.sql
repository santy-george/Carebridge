-- CRITICAL fix, found during the 2026-08-15 RLS audit (Workstream D "RLS
-- audit -- no endpoint returns another member's data").
--
-- === The bug ===
--
-- 20260810130000_consent_ownership_and_status_lockdown.sql tightened
-- "profile owner updates own profile" to stop a direct client UPDATE from
-- moving consent_status, but only checked consent_status. The `role` column
-- -- the single flag every is_coordinator() check in this schema trusts --
-- was left completely unrestricted. Any authenticated member could run:
--
--   update public.profiles set role = 'coordinator' where id = auth.uid();
--
-- and pass both USING (id = auth.uid()) and the existing WITH CHECK
-- (id = auth.uid() and consent_status unchanged) -- nothing here ever
-- inspected role. Since is_coordinator() is just `role = 'coordinator'` on
-- this same table, that one UPDATE statement is a full privilege
-- escalation: read every profile/member/consent-history row, manage
-- care_assignments and care_team for any member, update/resolve sos_alerts
-- and upgrade_leads, reactivate anyone's withdrawn consent -- every
-- coordinator-gated policy in the schema at once. No client code path
-- issues this UPDATE today, but RLS is the only backstop against a
-- malicious or compromised client, so this closes the same class of hole
-- already closed for consent_status and members.care_model/plan_level.
--
-- Same technique as both prior fixes (member_update_preserves_clinical_fields
-- in 20260806075507, profile_update_preserves_consent_status in
-- 20260810130000): a SECURITY DEFINER helper that requires the incoming
-- row's role to match what's currently stored, layered into WITH CHECK
-- alongside the existing consent_status guard. Every other profile field
-- (full_name, phone, email) remains freely owner-updatable, unchanged.
create or replace function public.profile_update_preserves_role(
  p_id uuid,
  p_role public.user_role
)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_id
      and p.role = p_role
  );
$$;

drop policy "profile owner updates own profile" on public.profiles;
create policy "profile owner updates own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and public.profile_update_preserves_consent_status(id, consent_status)
    and public.profile_update_preserves_role(id, role)
  );

-- Role changes remain possible only via a coordinator-run SQL UPDATE
-- (service_role / table owner, bypasses RLS) -- matches the existing V1
-- design ("coordinators promoted manually via SQL", profiles.sql) with no
-- self-serve or in-app path either way. Not adding an RPC here: promoting a
-- coordinator is rare, low-volume, and already documented as an operator
-- action, not a feature.
