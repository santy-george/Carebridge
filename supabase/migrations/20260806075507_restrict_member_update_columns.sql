-- Human-partner decision (2026-08-06): linked (non-coordinator) accounts
-- may update contact/emergency fields on the member they're linked to, but
-- NOT clinical/assessment fields (care_model, plan_level, full_name,
-- date_of_birth, location). Coordinators keep full-row UPDATE access,
-- unchanged, via the existing "assigned coordinator updates member record"
-- policy (is_coordinator()-gated -- untouched by this migration). A
-- per-user/per-link elevated-permission toggle is explicitly out of scope
-- here, deferred to a future design cycle.
--
-- RLS's USING/WITH CHECK clauses can't restrict *which columns* a role may
-- write -- only *which rows*. A column-level GRANT can't distinguish
-- "coordinator acting as authenticated" from "linked account acting as
-- authenticated" either, since both share the same Postgres role
-- (`authenticated`) -- the coordinator/member distinction lives in
-- `profiles.role`, checked by RLS predicates, not by a separate grantee.
--
-- So the column restriction is enforced by tightening ONLY the
-- linked-account policy's WITH CHECK, via a SECURITY DEFINER helper that
-- verifies the incoming row's clinical fields are unchanged from the
-- currently-stored row. This relies on Postgres RLS's permissive-policy OR
-- composition: when multiple permissive policies apply to the same
-- command, a row need only pass ONE policy's USING and ONE policy's WITH
-- CHECK (not necessarily the same policy) for the statement to succeed. A
-- coordinator's UPDATE is still allowed in full via their own separate
-- "assigned coordinator updates member record" policy (USING and WITH
-- CHECK both gated on is_coordinator()) -- entirely independent of this
-- stricter check, which only binds the "member updates own member record"
-- policy that applies to linked (non-coordinator) accounts. Verified
-- locally with `supabase test db` (see rls.test.sql): a linked
-- non-coordinator can update phone but is rejected (42501) attempting to
-- change care_model, while the assigned coordinator can still change
-- care_model on the same row.
create or replace function public.member_update_preserves_clinical_fields(
  p_id uuid,
  p_care_model public.care_model,
  p_plan_level public.plan_level,
  p_full_name text,
  p_date_of_birth date,
  p_location text
)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members m
    where m.id = p_id
      and m.care_model = p_care_model
      and m.plan_level = p_plan_level
      and m.full_name = p_full_name
      and m.date_of_birth is not distinct from p_date_of_birth
      and m.location is not distinct from p_location
  );
$$;

drop policy "member updates own member record" on public.members;
create policy "member updates own member record"
  on public.members for update
  using (public.member_owns(id))
  with check (
    public.member_owns(id)
    and (
      public.is_coordinator()
      or public.member_update_preserves_clinical_fields(
        id, care_model, plan_level, full_name, date_of_birth, location
      )
    )
  );
