# Phase A — HR Staff Directory & Roles — Design

2026-09-08. First sub-project of a much larger program: building out the full Admin Portal into the real operations control centre for Care Bridge Home, per `admin-app/*.html` (the static mockup). That program was decomposed into phases (Foundations → Field Staff app → Operations → Attendance → Membership & Care rest → Finance → Insights → Dashboard); this spec covers only **Phase A — Foundations**, because nothing downstream (Scheduler assigning visits, the Field Staff app itself, Attendance/GPS, Staff Payments) can exist until real staff records and a real role model exist.

## Context

Today `user_role` is a two-value enum (`member`, `coordinator`) and the only "staff" concept in the schema is `care_team` — free-text contact rows attached to a *member* (e.g. "Dr Rajeev Menon, Family physician, phone, email"), not real employment records with logins, RLS, or scheduling relevance. The mockup's Human Resources, Staff Profile, and Users & Roles screens (`admin-app/human-resources.html`, `hr-profile.html`, `users-roles.html`) assume a much richer model: 28 staff across roles (Nurse, Caregiver, Physiotherapist, Doctor, Nurse coordinator), each with qualifications, PCC (police clearance certificate) status, service area, payment rates, and a 5-role permission system (Admin, Coordinator, Nurse/Caregiver, Finance, Management).

User decisions locked for this pass (2026-09-08 conversation):
- Build the full 5-role model now, even though several permission-matrix rows (Billing, Reports) reference modules that don't exist yet — avoids re-migrating the enum per later phase.
- Don't fabricate metrics/columns the schema can't back honestly (On duty, Available, Payment due, Visits/mo) — same principle already applied to the Admin sidebar's disabled nav items. Those come from Phase B (Field Staff app) and Phase D/F (Attendance, Staff Payments) data and get added to these screens then, not now.
- Staff account creation goes through a real Supabase Admin API invite (Edge Function, service role), not a self-serve invite-code flow like members use — a coordinator/admin creates the account directly, matching the mockup's "Invite user" drawer.

## Role model

Extend `public.user_role`:

```sql
alter type public.user_role add value 'admin';
alter type public.user_role add value 'field_staff';
alter type public.user_role add value 'finance';
alter type public.user_role add value 'management';
```

(Postgres requires `alter type ... add value` to run outside a transaction and outside the same migration that later *uses* the new value in a check/policy — split into two migrations if `is_admin()` etc. need the new values immediately, matching how `enums.sql` and the RLS-using migrations are already separate files in this repo.)

`admin` is a true superset: full read/write everywhere, including everything `coordinator` can do today. `coordinator` keeps its current assignment-scoped access unchanged (see `project_coordinator_access_scoped_2026-08-29` — that scoping decision is not being revisited here). `field_staff`, `finance`, `management` get scoped access per the permission matrix below, but **only for modules that exist today** (this phase's HR/Users screens, plus read access to what coordinators can already read where the matrix says so) — matrix rows for Billing, Reports, Scheduling etc. are recorded as intent, enforced as a no-op (no policy exists yet because the table doesn't exist yet), and get real policies added when those phases ship.

Helper functions mirroring the existing `is_coordinator()` pattern (`profiles.sql`):

```sql
create or replace function public.is_admin() returns boolean ...
create or replace function public.is_field_staff() returns boolean ...
create or replace function public.is_finance() returns boolean ...
create or replace function public.is_management() returns boolean ...
```

Discipline (Nurse/Caregiver/Physiotherapist/Doctor/Nurse coordinator) is **not** a permission role — the mockup's own permission matrix groups all of them under one "Nurse / Caregiver" row with identical access. It's a separate HR attribute (`staff_profiles.discipline`) used for display and, later, scheduling/skill matching — orthogonal to what `user_role` controls.

## Schema — `staff_profiles`

One row per non-member account (`admin`, `coordinator`, `field_staff`, `finance`, `management`), 1:1 with `profiles`:

```sql
create type public.staff_discipline as enum (
  'nurse', 'caregiver', 'physiotherapist', 'doctor', 'nurse_coordinator', 'other'
);
create type public.pcc_status as enum ('not_submitted', 'pending', 'verified');
create type public.employment_status as enum ('active', 'inactive');
create type public.staff_rate_type as enum ('per_visit', 'monthly', 'hourly');

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
```

`visit_rate`/`emergency_duty_rate` are static reference numbers HR sets — "what this person is paid per visit." *Computing* what's actually owed for a pay period (visits completed × rate, minus deductions, etc.) is Phase F (Staff Payments) reading this table, not this phase writing derived totals into it.

RLS: `admin` full read/write. Row owner (`id = auth.uid()`) reads their own row (a field-staff member should see their own HR profile once the Field Staff app exists). `coordinator`/`finance`/`management` get read access per the matrix (coordinators already implicitly need to see who's on a member's care team — this table is a natural read for them). No client-side insert — rows are created by the invite Edge Function alongside the `auth.users`/`profiles` rows it creates.

## Staff account creation — Edge Function

New `supabase/functions/invite-staff/index.ts`, service-role, mirroring the existing `erase-consent-withdrawal` function's shape (auth-gated to `is_admin()` callers only, not `is_coordinator()` — inviting staff is an admin action per the permission matrix's "Users, roles & settings" row):

1. Validate caller is `admin` (reject otherwise).
2. `supabase.auth.admin.inviteUserByEmail(email)` — creates the `auth.users` row and sends Supabase's own invite email with a set-password link. No custom email template needed for this pass (reuses Supabase Auth's built-in invite flow, not the Resend integration used for member-facing emails).
3. The existing `on_auth_user_created` trigger fires, creating the base `profiles` row (defaults to `role = 'member'` today — this migration needs to extend that trigger, or the Edge Function needs to `update profiles set role = ...` right after, to land the invited person in the role actually selected in the "Invite user" drawer).
4. Insert the matching `staff_profiles` row (empty/default HR fields — filled in later via Edit) for every role except `member`/`coordinator`/`admin` (those don't get an HR record — discipline doesn't apply to them). Actually: `coordinator`/`admin`/`finance`/`management` are office roles too, so whether they get a `staff_profiles` row is a real question — resolved as: only `field_staff` gets a `staff_profiles` row for now (the HR screens are specifically about *field* staff, matching the mockup's "nurses, caregivers, physios, doctors and coordinators" framing loosely but the actual table rows shown are all field-facing roles plus one nurse coordinator). Non-field roles (`coordinator`/`admin`/`finance`/`management`) are managed entirely through Users & Roles, not Human Resources.

## Screens

**Human Resources** (`/human-resources`, list) — `field_staff` only (this screen is specifically the field-staff directory, not all users — that's what Users & Roles is for):
- `page-header` — title, "Add staff" action (opens the same invite flow, pre-selecting `field_staff`).
- `metric-row` — only real numbers: Total staff, Active, Inactive, By discipline breakdown (or similar honest counts). No On duty/Available/Payment due yet.
- `table-card` — columns: Staff, Discipline, Qualification, PCC status, Service area, Employment status. Row click → staff profile. No Availability/Visits(mo)/Payment due columns yet.

**Staff Profile** (`/human-resources/:id`, detail):
- `breadcrumb` + `profile-hero` (name, discipline, service area) + employment-status chip + Edit/Deactivate actions.
- `section-card` "Profile" — discipline, qualification, PCC status, experience, languages, service area.
- `section-card` "Payment settings" — rate type, visit rate, emergency duty rate (static, no computed "payable this month" yet).
- No "Assigned visits today" / "Assigned members" / live Availability sections yet — those are Phase B/C data.

**Users & Roles** (`/users-roles`, all roles):
- `page-header` — "Invite user" action opens the drawer described above (name, email, role select across all 5 roles, area — area is decorative/unused until area-scoped RLS exists beyond coordinator assignment, stored but not yet enforced).
- `metric-row` — Total users, Active, Pending invites (Supabase-invited but not yet accepted — `auth.users` row exists, `email_confirmed_at`/last-sign-in null), Roles (fixed at 5).
- Tabs: **Users** (table: user, role, area, last active, status) and **Roles & permissions** (the static reference matrix below).
- The permission matrix is documentation of intent backed by what's actually enforced today — each cell reflects a real RLS policy where the module exists, and is visibly marked "not built yet" (not blank, not a fake "Full") where it doesn't. This keeps faith with the same principle as the disabled sidebar nav items: show the roadmap honestly, never imply something works when it doesn't.

## Testing

- `supabase/tests/database/rls.test.sql` — extend with `staff_profiles` policy coverage (admin full access; field_staff reads own row only; coordinator/finance/management read-only per matrix) and role-helper function tests (`is_admin()` etc.), following the existing pgTAP pattern in that file.
- `supabase/functions/invite-staff/index.test.ts` — mirrors `erase-consent-withdrawal`'s test shape: rejects non-admin callers, creates `auth.users` + `profiles` + (for `field_staff`) `staff_profiles`, handles the "email already exists" case from Supabase Auth.
- `apps/admin/src/pages/HumanResources.test.tsx`, `StaffProfile.test.tsx`, `UsersRoles.test.tsx` — Vitest + Testing Library, same shape as the existing `MemberList.test.tsx`/`SosInbox.test.tsx`.

## Explicitly out of scope for this pass

- Availability status, assigned visits/members, GPS/attendance, "visits this month," computed payment-owed — all later phases (B/C/D/F), not fabricated here.
- Live enforcement of `finance`/`management` permissions for Billing/Reports/Scheduling — those RLS policies get written when those tables exist.
- Area-scoped access control (the mockup's "Area: Ernakulam" per-user restriction) — `service_area`/invite-drawer "Area access" field is stored but not enforced; today's only geographic scoping is `coordinator`'s existing assignment-based access, unchanged.
- Deactivating/removing a staff account's *login* (vs. just `employment_status = 'inactive'`) — Edit/Deactivate in this pass only flips the HR status flag, doesn't touch `auth.users`.
- The Field Staff app itself (Phase B) — this phase only makes sure real staff accounts and roles exist for it to authenticate against later.
