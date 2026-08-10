-- Fix for the Critical "audit trail loses all subject identity" finding from
-- the final whole-branch review. New migration rather than editing any of
-- 20260810120000_consent_tracking.sql, 20260810120001_..., 20260810130000_...
-- or 20260810140000_... -- those are already applied/committed; migrations
-- here are additive only. Replacing a function body via `create or replace
-- function` in a NEW migration is not an edit of an applied migration; it
-- supersedes the earlier definition at apply time, same technique
-- 20260810130000_consent_ownership_and_status_lockdown.sql already used for
-- request_consent_withdrawal().

-- === The problem ===
--
-- consents.user_id and consents.member_id are both `on delete set null`
-- (deliberately -- see 20260810120000_consent_tracking.sql and
-- 20260810140000_consents_user_id_set_null.sql -- so the audit row survives
-- the very deletions it records). But that means after a `scope: 'all'`
-- erasure, the surviving withdrawal_verified row has BOTH FKs nulled and
-- therefore no identifying information at all: just id, event, scope,
-- policy_version, created_at. An anonymous row proves nothing. DPDP requires
-- provable "we erased X's data, verified by coordinator Y, at time T".
--
-- Fix: denormalized plain-text snapshots captured at insert time. Plain text
-- columns have no FK, so nothing ever nulls them -- they outlive the subject,
-- the member record, and (via actor_email) even the coordinator's account.
alter table public.consents
  add column subject_email text,        -- who the event was about (survives the subject's own deletion)
  add column member_name_snapshot text, -- which member record it concerned (survives the members row being erased)
  add column actor_user_id uuid references auth.users(id) on delete set null, -- which coordinator performed it, while they still exist
  add column actor_email text;          -- ...and who they were, after they don't

-- All four are nullable: a user-initiated 'given' (signup) or
-- 'withdrawal_requested' event has no actor, and the signup-time 'given' row
-- predates any member link so it has no member_name_snapshot either.

comment on column public.consents.subject_email is
  'Email of the data subject at the time of the event. Denormalized on purpose: survives deletion of the auth.users row user_id points at.';
comment on column public.consents.member_name_snapshot is
  'members.full_name at the time of the event. Denormalized on purpose: survives deletion of the members row member_id points at.';
comment on column public.consents.actor_user_id is
  'Coordinator who performed a withdrawal_verified erasure or a coordinator reactivation. Null for user-initiated events.';
comment on column public.consents.actor_email is
  'Email of the acting coordinator at the time of the event. Survives deletion of their account.';

-- === Populate at the two SECURITY DEFINER insert sites ===
-- (The third and fourth insert sites are outside this file: Signup.tsx's
-- direct 'given' insert and the erase-consent-withdrawal Edge Function's
-- 'withdrawal_verified' insert, both updated alongside this migration.)

-- Unchanged from 20260810130000_consent_ownership_and_status_lockdown.sql
-- except for the two snapshot lookups and the wider insert column list. The
-- member_owns() ownership gate and the raise/errcode behaviour are carried
-- over verbatim -- pgTAP asserts both still hold.
create or replace function public.request_consent_withdrawal(p_member_id uuid, p_scope public.consent_scope)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_subject_email text;
  v_member_name text;
begin
  if not public.member_owns(p_member_id) then
    raise exception 'not_linked_to_member';
  end if;

  -- Captured BEFORE the insert (and therefore before anything downstream can
  -- change the caller's membership or delete the member record).
  select email into v_subject_email from auth.users where id = auth.uid();
  select full_name into v_member_name from public.members where id = p_member_id;

  insert into public.consents (user_id, member_id, event, scope, subject_email, member_name_snapshot)
  values (auth.uid(), p_member_id, 'withdrawal_requested', p_scope, v_subject_email, v_member_name);

  update public.profiles set consent_status = 'withdrawal_pending' where id = auth.uid();
end;
$$;

-- Unchanged from 20260810120000_consent_tracking.sql except for the snapshot
-- and actor lookups. This is the coordinator-reactivation path, so it is the
-- one place other than the Edge Function that has a real actor to record.
create or replace function public.reactivate_consent(p_user_id uuid, p_member_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_subject_email text;
  v_member_name text;
  v_actor_email text;
begin
  if not public.is_coordinator() then
    raise exception 'only coordinators can reactivate consent' using errcode = '42501';
  end if;

  select email into v_subject_email from auth.users where id = p_user_id;
  select full_name into v_member_name from public.members where id = p_member_id;
  select email into v_actor_email from auth.users where id = auth.uid();

  update public.profiles set consent_status = 'active' where id = p_user_id;

  insert into public.consents (
    user_id, member_id, event, subject_email, member_name_snapshot, actor_user_id, actor_email
  )
  values (
    p_user_id, p_member_id, 'given', v_subject_email, v_member_name, auth.uid(), v_actor_email
  );
end;
$$;
