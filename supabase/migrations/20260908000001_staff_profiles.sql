-- Phase A (HR staff directory) schema. See
-- docs/superpowers/specs/2026-09-08-hr-staff-directory-roles-design.md.

create type public.staff_discipline as enum (
  'nurse', 'caregiver', 'physiotherapist', 'doctor', 'nurse_coordinator', 'other'
);
create type public.pcc_status as enum ('not_submitted', 'pending', 'verified');
create type public.employment_status as enum ('active', 'inactive');
create type public.staff_rate_type as enum ('per_visit', 'monthly', 'hourly');

-- One row per field_staff account. visit_rate/emergency_duty_rate are
-- static reference numbers HR sets ("what this person is paid per visit")
-- -- Phase F (Staff Payments) computes what's actually owed from visits x
-- rate, it doesn't write derived totals back into this table.
create table public.staff_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  discipline public.staff_discipline,
  qualification text,
  pcc_status public.pcc_status not null default 'not_submitted',
  experience_years numeric,
  languages text[] not null default '{}',
  service_area text,
  service_radius_km numeric,
  employment_status public.employment_status not null default 'active',
  rate_type public.staff_rate_type,
  visit_rate numeric,
  emergency_duty_rate numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_staff_profiles_updated_at
  before update on public.staff_profiles
  for each row execute function public.set_updated_at();

alter table public.staff_profiles enable row level security;

-- Same security-definer + fixed search_path shape as is_coordinator() in
-- profiles.sql -- avoids RLS-policy self-recursion when a policy on
-- profiles/staff_profiles needs to check the caller's own role.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_field_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'field_staff'
  );
$$;

create or replace function public.is_finance()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'finance'
  );
$$;

create or replace function public.is_management()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'management'
  );
$$;

-- admin needs to read every account for the Users & Roles screen. There is
-- no blanket "coordinators read all profiles" policy to piggyback on --
-- coordinator profile reads are assignment-scoped to linked accounts only
-- (20260829160000_scope_coordinator_access_to_assignment.sql), and stay
-- that way; this is a genuinely new, broader grant for admin specifically.
-- (The wider admin-superset fix in 20260909000000_admin_superset_access.sql
-- covers is_coordinator()-gated tables elsewhere; this one is admin-only
-- by design, since "read every account" is not something coordinator gets.)
create policy "admins read all profiles"
  on public.profiles for select using (public.is_admin());

-- staff_profiles: admin full access; coordinator read-only (needs to see
-- who's available to staff a visit later); field_staff reads only their
-- own row. finance/management get nothing here -- the mockup's permission
-- matrix has no Human Resources row, so nothing is granted speculatively.
create policy "admin full access to staff_profiles"
  on public.staff_profiles for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "coordinators read staff_profiles"
  on public.staff_profiles for select
  using (public.is_coordinator());

create policy "field staff reads own staff profile"
  on public.staff_profiles for select
  using (id = auth.uid());