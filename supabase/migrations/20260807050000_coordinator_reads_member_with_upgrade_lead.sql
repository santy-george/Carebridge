-- Same gap as 20260807040000 (coordinator_reads_member_with_sos_alert), for
-- the same reason: "coordinator manages upgrade leads" is deliberately
-- broad (any coordinator, not just the member's assigned one -- a lead
-- shouldn't stall because of an assignment gap, same reasoning as
-- sos_alerts). But the members table stayed assigned-coordinator-only for
-- SELECT, so the leads follow-up view's join to member name/phone/location
-- would silently come back null for members outside the viewing
-- coordinator's assignments.
--
-- Scoped to members with at least one upgrade_leads row, not "any
-- coordinator reads any member" -- same reasoning as the SOS migration.
create policy "any coordinator reads member with upgrade lead"
  on public.members for select using (
    public.is_coordinator()
    and exists (select 1 from public.upgrade_leads ul where ul.member_id = members.id)
  );
