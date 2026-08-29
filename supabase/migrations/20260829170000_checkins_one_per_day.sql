-- Human-partner decision (2026-08-29): "Daily check-in" should mean one
-- row per member per day, resaving replaces it -- not append-only.
--
-- Root cause of the reported bug: checkins had no unique constraint on
-- (member_id, checkin_date), so CheckIn.tsx's plain INSERT silently
-- created a new row every time a member re-saved the same day. Home.tsx's
-- "latest checkin" query ordered only by checkin_date (a DATE, not a
-- timestamp) with no tiebreaker, so with multiple same-day rows Postgres'
-- tie-break order is unspecified -- Home could show an arbitrary earlier
-- check-in instead of the member's actual latest edit.
--
-- Existing same-day duplicates must be collapsed to their most recent row
-- before the unique constraint can be added, or this migration would fail
-- against any account (like the one used for today's device testing) that
-- already has them.
delete from public.checkins a
using public.checkins b
where a.member_id = b.member_id
  and a.checkin_date = b.checkin_date
  and a.created_at < b.created_at;

alter table public.checkins
  add constraint checkins_member_date_unique unique (member_id, checkin_date);
