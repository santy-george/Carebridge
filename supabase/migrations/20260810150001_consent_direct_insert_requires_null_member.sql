-- Fix for the "direct-insert policy is broader than any legitimate client
-- caller needs" finding from the final whole-branch review. Additive-only
-- migration, same reasoning as every other migration in this consent series.

-- 20260810130000_consent_ownership_and_status_lockdown.sql set the consents
-- insert policy's WITH CHECK to
--   event = 'given' and (member_id is null or public.member_owns(member_id))
-- which permits a direct client insert of a 'given' row WITH a member_id, as
-- long as the caller is linked to that member. No legitimate direct-client
-- caller ever does that:
--   * Signup.tsx inserts { user_id, event: 'given' } only -- member_id is
--     null there by construction (no member is linked yet at signup).
--   * reactivate_consent() is the only thing that inserts 'given' WITH a
--     member_id, and it is SECURITY DEFINER: it runs as the table owner and
--     bypasses this policy entirely, so tightening the policy cannot break it.
-- So the extra breadth serves no real caller, and it let any linked user forge
-- a 'given' + member_id row indistinguishable from a genuine coordinator
-- reactivation -- which is exactly the shape Admin's Consent Requests History
-- query selects on (event = 'given' and member_id is not null).
--
-- Tighten it to member_id is null, unconditionally, for direct client inserts.
drop policy "user inserts own consent-given events" on public.consents;
create policy "user inserts own consent-given events"
  on public.consents for insert
  with check (
    user_id = auth.uid()
    and event = 'given'
    and member_id is null
  );
