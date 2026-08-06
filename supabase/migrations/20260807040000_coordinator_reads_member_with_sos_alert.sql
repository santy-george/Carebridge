-- The Admin SOS inbox must show which member an alert belongs to (name,
-- phone, location) regardless of whether the viewing coordinator happens to
-- be that member's assigned coordinator -- same "shouldn't go unseen due to
-- an assignment gap" reasoning already applied to sos_alerts and
-- care_assignments (see 20260805091903_sos_alerts_upgrade_leads.sql and
-- 20260805091858_members_care_team.sql). Without this, is_coordinator()-gated
-- reads of sos_alerts would join against a members row the coordinator's
-- existing assigned-only SELECT policy silently filters out.
--
-- Deliberately scoped to members with at least one sos_alerts row, NOT to
-- "any coordinator reads any member" -- that would let every coordinator
-- browse the full client roster's PII at all times, a much bigger exposure
-- than the SOS inbox actually needs. This mirrors the RLS test suite's
-- expectation that an assigned coordinator sees exactly their assigned
-- members otherwise (rls.test.sql, "Assigned coordinator sees exactly
-- Member A when querying members, not Member B").
--
-- Added as an extra permissive policy rather than replacing the existing
-- one -- Postgres OR-composes multiple permissive policies for the same
-- command, so this only widens read access for members with an alert; it
-- doesn't touch the existing member-owner or assigned-coordinator policies
-- (or any UPDATE policy).
create policy "any coordinator reads member with sos alert"
  on public.members for select using (
    public.is_coordinator()
    and exists (select 1 from public.sos_alerts sa where sa.member_id = members.id)
  );
