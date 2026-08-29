-- RLS audit finding, 2026-08-29: the "member updates own member record"
-- policy's WITH CHECK let ANY globally-coordinator-role account bypass
-- member_update_preserves_clinical_fields for a patient they are NOT
-- assigned to, as long as they also held a member_links row to that
-- patient (obtainable via the ordinary redeem_invite_code() RPC, which has
-- no coordinator exclusion). is_coordinator() is a global role check, not
-- scoped to the patient in question -- so it satisfied this policy's WITH
-- CHECK unconditionally, short-circuiting the clinical-field-preservation
-- check entirely (Postgres RLS ORs across all applicable policies
-- independently for USING and WITH CHECK; a row only needs ONE policy's
-- WITH CHECK to pass, not this specific one's).
--
-- The 20260806075507 migration's own comment already states the intended
-- behavior: "A coordinator's UPDATE is still allowed in full via their own
-- separate 'assigned coordinator updates member record' policy... entirely
-- independent of this stricter check" -- i.e. the author believed the
-- is_coordinator() branch here was harmless/redundant, not realizing it
-- created an independent bypass. Removing it restores that stated intent
-- exactly: a properly assigned coordinator keeps full write access via the
-- separate is_assigned_coordinator(id)-gated policy (untouched by this
-- migration); this policy now only ever governs linked, non-coordinator
-- accounts, matching every other "member manages own X" policy in the
-- schema (care_team, med_stock, medications, medical_profile, documents,
-- preventive_plan_goals all already scope coordinator writes to
-- is_assigned_coordinator, never a bare global is_coordinator() check).
drop policy "member updates own member record" on public.members;
create policy "member updates own member record"
  on public.members for update
  using (public.member_owns(id))
  with check (
    public.member_owns(id)
    and public.member_update_preserves_clinical_fields(
      id, care_model, plan_level, full_name, date_of_birth, location
    )
  );
