-- The Admin Consent Requests inbox must show which member a withdrawal
-- request belongs to (name, phone) regardless of whether the viewing
-- coordinator happens to be that member's assigned coordinator -- same
-- reasoning as 20260807040000_coordinator_reads_member_with_sos_alert.sql
-- and 20260807050000_coordinator_reads_member_with_upgrade_lead.sql.
--
-- Scoped to members with at least one withdrawal_requested consents row,
-- not "any coordinator reads any member" -- keeps this as narrow as the
-- two existing precedents.
create policy "any coordinator reads member with withdrawal request"
  on public.members for select using (
    public.is_coordinator()
    and exists (
      select 1 from public.consents c
      where c.member_id = members.id and c.event = 'withdrawal_requested'
    )
  );
