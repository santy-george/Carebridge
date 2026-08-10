-- Fix for parked Minor gap #2 from the consent-tracking final review: the
-- direct-client insert policy (20260810150001_...) constrains user_id,
-- event, and member_id, but says nothing about the four snapshot columns
-- added afterward in 20260810150000_consent_audit_snapshot_columns.sql.
-- A client's signup-shaped 'given' insert could set actor_user_id/actor_email
-- to arbitrary values -- verified inert against all 3 current readers of the
-- table (none of them trust actor_* on a non-coordinator-authored row), but
-- not structurally closed. Close it: a direct client insert never has a real
-- actor (request_consent_withdrawal/reactivate_consent/the Edge Function are
-- all SECURITY DEFINER and bypass this policy), so require both null.
drop policy "user inserts own consent-given events" on public.consents;
create policy "user inserts own consent-given events"
  on public.consents for insert
  with check (
    user_id = auth.uid()
    and event = 'given'
    and member_id is null
    and actor_user_id is null
    and actor_email is null
  );
