-- Fix for the Critical finding from the task-9 code review (see
-- .superpowers/sdd/2026-08-10-consent-and-pii-scrubbing/task-9-report.md).
-- New migration rather than editing 20260810120000_consent_tracking.sql,
-- 20260810120001_coordinator_reads_member_with_withdrawal_request.sql, or
-- 20260810130000_consent_ownership_and_status_lockdown.sql -- those are
-- already applied/committed; migrations here are additive only.

-- === consents.user_id must not cascade-delete on auth.users deletion ===
--
-- consents.user_id was declared `not null references auth.users(id) on
-- delete cascade`. The erase-consent-withdrawal Edge Function inserts a
-- `withdrawal_verified` consents row for requester_user_id and THEN deletes
-- that same auth.users row (scope: 'self' always; scope: 'all' often too,
-- when the requester is one of the linked accounts). Insert-before-delete
-- doesn't help against a cascade: Postgres evaluates ON DELETE CASCADE
-- against whatever rows reference the parent at the moment the parent row
-- is actually deleted, not based on statement order within the request. So
-- the audit row this function just wrote was being deleted moments later by
-- its own cascade, meaning the whole point of this table -- an audit trail
-- that survives the very deletions it records -- was defeated for user_id.
--
-- This is exactly the class of bug already fixed for member_id in
-- 20260810120000_consent_tracking.sql (see the comment on that column) --
-- user_id was simply missed. Same fix, same reasoning: ON DELETE SET NULL
-- instead of CASCADE, so the row survives with user_id nulled out instead
-- of disappearing. This requires user_id to become nullable first, since a
-- NOT NULL column can't be set to null by SET NULL.
alter table public.consents alter column user_id drop not null;

alter table public.consents drop constraint consents_user_id_fkey;
alter table public.consents
  add constraint consents_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;
