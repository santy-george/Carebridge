-- Closes a gap found in code review of the Phase A branch (HR staff
-- directory & roles, 2026-09-08): the plan's own Global Constraint says
-- "admin is a true superset of coordinator -- every gate coordinator
-- passes, admin passes too", but the implementation only added explicit
-- admin policies on profiles/staff_profiles. Every other coordinator-gated
-- table (sos_alerts, members, consents, upgrade_leads, member_links, and
-- everything else across the 72 existing is_coordinator() call sites)
-- still checked role = 'coordinator' exactly -- an admin account would see
-- empty SOS Alerts / Members / Leads / Consent Requests screens. Fails
-- closed (no data exposure), but silently breaks the "admin can do
-- everything a coordinator can" promise.
--
-- Both functions are CREATE OR REPLACE -- every existing policy that
-- references them by name (72 call sites for is_coordinator(), several
-- more indirectly via is_assigned_coordinator()/
-- is_assigned_coordinator_for_linked_profile()) picks up the new behavior
-- without touching a single policy body.
create or replace function public.is_coordinator()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role in ('coordinator', 'admin')
  );
$$;

-- Assignment-scoped tables gate on is_coordinator() AND
-- is_assigned_coordinator(member_id) (see
-- 20260829160000_scope_coordinator_access_to_assignment.sql) -- an admin
-- has no care_assignments row by default, so widening is_coordinator()
-- alone would still show them zero rows on those tables. The mockup's own
-- Users & Roles permission matrix lists "Admin: Full" on Members & care
-- models, not assignment-scoped, so admin bypasses the assignment check
-- entirely here rather than being folded into the same scoping a
-- coordinator gets.
create or replace function public.is_assigned_coordinator(p_member_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.care_assignments ca
    where ca.member_id = p_member_id and ca.coordinator_id = auth.uid() and ca.is_active
  );
$$;
