-- Fixes for two Important findings from the task-1 code review (see
-- .superpowers/sdd/2026-08-10-consent-and-pii-scrubbing/task-1-report.md).
-- New migration rather than editing 20260810120000_consent_tracking.sql or
-- 20260810120001_coordinator_reads_member_with_withdrawal_request.sql --
-- those are already applied/committed; migrations here are additive only.

-- === Finding 1: no ownership check on withdrawal requests ===
--
-- request_consent_withdrawal(p_member_id, p_scope) and the direct
-- 'given'-insert RLS policy on consents never verified the caller is
-- actually linked to p_member_id via member_links -- so any authenticated
-- user could request withdrawal, or insert a forged 'given' row, for a
-- member they have no relationship to. Close both using the project's
-- existing public.member_owns(p_member_id) helper, same pattern as
-- 20260805091903_sos_alerts_upgrade_leads.sql and
-- 20260805091858_members_care_team.sql.

-- member_id is nullable on consents (null for the signup-time 'given' row,
-- before any member is linked), so the ownership check must allow
-- member_id is null through, and only apply member_owns() when a member_id
-- is actually present.
drop policy "user inserts own consent-given events" on public.consents;
create policy "user inserts own consent-given events"
  on public.consents for insert
  with check (
    user_id = auth.uid()
    and event = 'given'
    and (member_id is null or public.member_owns(member_id))
  );

-- Same check inside request_consent_withdrawal, raised as an exception
-- before any writes happen -- matching this project's existing
-- error-raising style (see redeem_invite_code's `invalid_or_expired_code`
-- in 20260806063019_member_links_and_invites.sql).
create or replace function public.request_consent_withdrawal(p_member_id uuid, p_scope public.consent_scope)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.member_owns(p_member_id) then
    raise exception 'not_linked_to_member';
  end if;

  insert into public.consents (user_id, member_id, event, scope)
  values (auth.uid(), p_member_id, 'withdrawal_requested', p_scope);

  update public.profiles set consent_status = 'withdrawal_pending' where id = auth.uid();
end;
$$;

-- === Finding 2: profiles.consent_status writable directly, bypassing the
-- coordinator-only reactivate_consent() gate ===
--
-- The pre-existing "profile owner updates own profile" policy is a
-- full-row UPDATE policy with no column restriction, so any user could
-- `UPDATE profiles SET consent_status = 'active' WHERE id = auth.uid()`
-- directly -- bypassing both request_consent_withdrawal() and
-- reactivate_consent() (both SECURITY DEFINER, so they bypass RLS as table
-- owner and are unaffected by this policy change) and leaving no audit
-- trail in consents. Same column-restriction technique already used in
-- 20260806075507_restrict_member_update_columns.sql: a SECURITY DEFINER
-- helper that verifies the incoming row's consent_status is unchanged from
-- what's currently stored, layered into the WITH CHECK. Every other
-- profile field (full_name, phone, email, etc.) remains freely updatable
-- by the owner, unchanged.
create or replace function public.profile_update_preserves_consent_status(
  p_id uuid,
  p_consent_status text
)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_id
      and p.consent_status = p_consent_status
  );
$$;

drop policy "profile owner updates own profile" on public.profiles;
create policy "profile owner updates own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and public.profile_update_preserves_consent_status(id, consent_status)
  );
