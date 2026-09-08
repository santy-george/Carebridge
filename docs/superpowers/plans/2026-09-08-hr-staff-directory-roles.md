# Phase A — HR Staff Directory & Roles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the role model to 5 roles (admin/coordinator/field_staff/finance/management), build a real staff directory (`staff_profiles`), and ship the Human Resources, Staff Profile, and Users & Roles screens in the Admin Portal — the foundation every later phase (Field Staff app, Scheduler, Attendance, Staff Payments) needs before it can reference real staff records.

**Architecture:** Two Postgres migrations (enum extension must be its own migration — Postgres forbids using a newly added enum value inside the transaction that added it), two new Supabase Edge Functions (`invite-staff` creates real logins via the Admin API, `list-staff-users` merges `profiles` with `auth.users` metadata that only a service-role client can read), and three new Admin Portal pages reusing the design-system classes already in place.

**Tech Stack:** Postgres/Supabase (migrations, RLS, pgTAP), Deno Edge Functions, React + TypeScript + Vitest (Admin Portal).

**Spec:** `docs/superpowers/specs/2026-09-08-hr-staff-directory-roles-design.md`

## Global Constraints

- Never fabricate data the schema can't back honestly — no "On duty," "Available," "Payment due," "Visits (mo)," "Last active," or "Pending invite" unless a task below wires the real source for it.
- `admin` is a true superset of `coordinator` — every gate `coordinator` passes, `admin` passes too.
- HR (`staff_profiles`) access for Phase A: `admin` full read/write, `coordinator` read-only, `field_staff` reads only their own row. `finance`/`management` get no HR access in this phase — the mockup's permission matrix has no row for Human Resources, so nothing is granted speculatively.
- The Admin Portal login gate (`RequireCoordinator`) opens for `admin` in addition to `coordinator` in this phase. `field_staff`/`finance`/`management` do not get Admin Portal login access yet — no screen in this phase needs it, and granting it speculatively is exactly the kind of unbacked access this plan avoids elsewhere.
- All new migrations, RLS policies, and Edge Functions follow the exact patterns already in `supabase/migrations/20260805091857_profiles.sql` and `supabase/functions/erase-consent-withdrawal/index.ts` — security-definer helper functions for policies, caller-identity verification via an RLS-respecting client before any service-role action.

---

### Task 1: Migration — extend `user_role` with the 4 new roles

**Files:**
- Create: `supabase/migrations/20260908000000_add_staff_roles.sql`

**Interfaces:**
- Consumes: the existing `public.user_role` enum from `supabase/migrations/20260805091856_enums.sql`.
- Produces: `user_role` now has 6 values (`member`, `coordinator`, `admin`, `field_staff`, `finance`, `management`), usable by name starting in Task 2's migration (not this one — see the file's own comment).

- [ ] **Step 1: Write the migration**

```sql
-- Extends the 2-value user_role enum (member/coordinator) to the full
-- 6-value role model the Admin Portal mockup's Users & Roles screen
-- assumes (admin/coordinator/field_staff/finance/management, plus the
-- existing member). This migration ONLY adds the enum values -- Postgres
-- forbids referencing a newly added enum value in a comparison/WHERE
-- clause inside the same transaction that added it (ALTER TYPE ... ADD
-- VALUE takes effect at transaction commit, but the safety check that
-- blocks using it mid-transaction is separate and still applies). Every
-- migration file in this repo runs as its own transaction, so the actual
-- staff_profiles table + RLS policies that reference these new values
-- live in the next migration file, not this one.
alter type public.user_role add value 'admin';
alter type public.user_role add value 'field_staff';
alter type public.user_role add value 'finance';
alter type public.user_role add value 'management';
```

- [ ] **Step 2: Apply to local and verify**

Run:
```bash
cd supabase
supabase db reset
```
Expected: migration applies cleanly (no error), all existing seed data / prior migrations still apply after it.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260908000000_add_staff_roles.sql
git commit -m "feat(db): add admin/field_staff/finance/management to user_role"
```

---

### Task 2: Migration — `staff_profiles` table, role-helper functions, RLS

**Files:**
- Create: `supabase/migrations/20260908000001_staff_profiles.sql`

**Interfaces:**
- Consumes: `user_role` (Task 1), `public.profiles`, `public.set_updated_at()` (existing trigger function from `profiles.sql`).
- Produces: `public.staff_profiles` table; `public.is_admin()`, `public.is_field_staff()`, `public.is_finance()`, `public.is_management()` SQL functions (same shape as the existing `public.is_coordinator()`), usable by every later task's RLS policies and Edge Functions.

- [ ] **Step 1: Write the migration**

```sql
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

-- admin becomes a true superset of coordinator everywhere it matters.
-- profiles: admin needs to read every account for the Users & Roles screen
-- (coordinators already have this via the existing "coordinators read all
-- profiles" policy -- admin needs its own policy, not a rename, so that
-- policy's name/intent stays accurate for what it actually grants).
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
```

- [ ] **Step 2: Apply to local and verify**

Run:
```bash
cd supabase
supabase db reset
```
Expected: migration applies cleanly.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260908000001_staff_profiles.sql
git commit -m "feat(db): add staff_profiles table, role helpers, and RLS"
```

---

### Task 3: Regenerate `@carebridge/db-types`

**Files:**
- Modify: `packages/db-types/src/database.types.ts`

**Interfaces:**
- Consumes: the schema from Tasks 1-2.
- Produces: TypeScript types for `staff_profiles` and the widened `user_role`, used by every later frontend task.

- [ ] **Step 1: Regenerate**

Run:
```bash
cd supabase
supabase db reset
cd ../packages/db-types
supabase gen types typescript --local > src/database.types.ts
```

- [ ] **Step 2: Run the existing type-check test**

Run: `pnpm --filter @carebridge/db-types test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/db-types/src/database.types.ts
git commit -m "chore(db-types): regenerate types for staff_profiles + role model"
```

---

### Task 4: pgTAP RLS coverage for `staff_profiles` and the role helpers

**Files:**
- Modify: `supabase/tests/database/rls.test.sql`

**Interfaces:**
- Consumes: fixtures already in the file (coordinator `c0000000-...c`, member `a0000000-...a`), plus new fixtures this task adds.
- Produces: nothing consumed by later tasks — this is a verification-only task, but it must run before Task 5 (the Edge Function) so the RLS assumptions that function relies on are actually proven.

- [ ] **Step 1: Bump the plan count and add fixtures**

In `supabase/tests/database/rls.test.sql`, change line 14 from `select plan(114);` to `select plan(122);` (8 new assertions added below), and add these fixtures right after the existing `update public.profiles set role = 'coordinator' where id in (...)` line:

```sql
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('e0000000-0000-0000-0000-00000000000e', 'rls-test-admin@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('f0000000-0000-0000-0000-00000000000f', 'rls-test-field-staff-1@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('11000000-0000-0000-0000-000000000011', 'rls-test-field-staff-2@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated');

update public.profiles set role = 'admin' where id = 'e0000000-0000-0000-0000-00000000000e';
update public.profiles set role = 'field_staff' where id in ('f0000000-0000-0000-0000-00000000000f', '11000000-0000-0000-0000-000000000011');

insert into public.staff_profiles (id, discipline, employment_status)
values
  ('f0000000-0000-0000-0000-00000000000f', 'nurse', 'active'),
  ('11000000-0000-0000-0000-000000000011', 'caregiver', 'active');
```

- [ ] **Step 2: Add the assertions**

Add this block right before the final "Simulate no session at all (anon)" section at the end of the file:

```sql
-- === Simulate the admin's session ===
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'e0000000-0000-0000-0000-00000000000e')::text, true);

select is(
  (select count(*)::int from public.profiles),
  (select count(*)::int from public.profiles), -- sanity: query itself doesn't error
  'admin can query profiles without error'
);
select ok(
  (select count(*)::int from public.profiles) >= 8,
  'admin sees every profile row, not just their own'
);
select is(
  (select count(*)::int from public.staff_profiles),
  2,
  'admin sees every staff_profiles row'
);

-- Admin can write staff_profiles (full access via "admin full access to
-- staff_profiles"), proving the policy grants insert/update, not just select.
select lives_ok(
  $$ update public.staff_profiles set employment_status = 'inactive' where id = 'f0000000-0000-0000-0000-00000000000f' $$,
  'admin can update a staff_profiles row'
);
update public.staff_profiles set employment_status = 'active' where id = 'f0000000-0000-0000-0000-00000000000f';

-- === Simulate field staff #1's session ===
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'f0000000-0000-0000-0000-00000000000f')::text, true);

select is(
  (select count(*)::int from public.staff_profiles),
  1,
  'field staff sees only their own staff_profiles row, not the other field staff member''s'
);
select is(
  (select id from public.staff_profiles limit 1),
  'f0000000-0000-0000-0000-00000000000f',
  'the one row field staff sees is their own'
);
select is(
  (select count(*)::int from public.profiles where id = auth.uid()),
  1,
  'field staff can still read their own profile row via the existing owner policy'
);

-- Field staff cannot write staff_profiles at all (no insert/update/delete
-- policy grants it) -- proves "coordinators read" and "field staff reads
-- own" are select-only, not accidentally broader.
select throws_ok(
  $$ update public.staff_profiles set employment_status = 'inactive' where id = 'f0000000-0000-0000-0000-00000000000f' $$,
  '42501',
  null,
  'field staff cannot update their own staff_profiles row (read-only access)'
);
```

- [ ] **Step 3: Run the suite**

Run:
```bash
cd supabase
supabase test db
```
Expected: `1..122` all `ok`. If the `throws_ok` expected error code `42501` doesn't match what Postgres actually raises for an RLS-blocked UPDATE with zero matching rows (RLS silently filters rather than raising in some update-with-no-match cases), replace it with an assertion that checks the row is unchanged after the attempted update instead — run once to see the actual failure output before deciding.

- [ ] **Step 4: Commit**

```bash
git add supabase/tests/database/rls.test.sql
git commit -m "test(rls): cover staff_profiles and the 4 new role helpers"
```

---

### Task 5: Edge Function — `invite-staff`

**Files:**
- Create: `supabase/functions/invite-staff/index.ts`
- Create: `supabase/functions/invite-staff/index.test.ts`

**Interfaces:**
- Consumes: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` env vars (same as `erase-consent-withdrawal`); caller's `Authorization` header.
- Produces: HTTP endpoint invoked by the Admin frontend as `supabase.functions.invoke('invite-staff', { body: { full_name, email, role, discipline? } })`. On success, creates `auth.users` + `profiles` (role set correctly) + (for `role: 'field_staff'` only) a default `staff_profiles` row. Returns `{ ok: true, user_id }` or `{ error: string }`.

- [ ] **Step 1: Write the pure validation function and its test first**

Create `supabase/functions/invite-staff/index.test.ts`:

```typescript
import { assertEquals } from 'jsr:@std/assert@1';
import { isValidInviteRequest, type InviteRequest } from './index.ts';

const VALID_ROLES = ['admin', 'coordinator', 'field_staff', 'finance', 'management'];

Deno.test('isValidInviteRequest accepts a well-formed field_staff invite', () => {
  const body: InviteRequest = {
    full_name: 'Anu George',
    email: 'anu@carebridge.in',
    role: 'field_staff',
  };
  assertEquals(isValidInviteRequest(body, VALID_ROLES), true);
});

Deno.test('isValidInviteRequest rejects a missing full_name', () => {
  assertEquals(
    isValidInviteRequest({ email: 'anu@carebridge.in', role: 'field_staff' }, VALID_ROLES),
    false,
  );
});

Deno.test('isValidInviteRequest rejects a missing or malformed email', () => {
  assertEquals(
    isValidInviteRequest({ full_name: 'Anu George', email: 'not-an-email', role: 'field_staff' }, VALID_ROLES),
    false,
  );
  assertEquals(
    isValidInviteRequest({ full_name: 'Anu George', role: 'field_staff' }, VALID_ROLES),
    false,
  );
});

Deno.test('isValidInviteRequest rejects an unknown role', () => {
  assertEquals(
    isValidInviteRequest({ full_name: 'Anu George', email: 'anu@carebridge.in', role: 'super_admin' }, VALID_ROLES),
    false,
  );
});

Deno.test('isValidInviteRequest rejects role member (members self-signup, never invited here)', () => {
  assertEquals(
    isValidInviteRequest({ full_name: 'Anu George', email: 'anu@carebridge.in', role: 'member' }, VALID_ROLES),
    false,
  );
});
```

- [ ] **Step 2: Run it to verify it fails (module doesn't exist yet)**

Run: `cd supabase/functions/invite-staff && deno test`
Expected: FAIL — `index.ts` not found.

- [ ] **Step 3: Write the Edge Function**

Create `supabase/functions/invite-staff/index.ts`:

```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

// Exported and unit-tested in isolation (index.test.ts) -- pure validation,
// no Supabase client involved. 'member' is deliberately not in VALID_ROLES
// at the call site below: members self-signup through the wellness app,
// they are never created via this staff-invite path.
export interface InviteRequest {
  full_name?: string;
  email?: string;
  role?: string;
  discipline?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidInviteRequest(body: InviteRequest, validRoles: string[]): boolean {
  if (!body.full_name || !body.full_name.trim()) return false;
  if (!body.email || !EMAIL_RE.test(body.email)) return false;
  if (!body.role || !validRoles.includes(body.role)) return false;
  return true;
}

const STAFF_ROLES_WITH_HR_PROFILE = ['field_staff'];
const INVITABLE_ROLES = ['admin', 'coordinator', 'field_staff', 'finance', 'management'];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'method not allowed' }), {
        status: 405,
        headers: corsHeaders,
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'missing authorization header' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify the caller is an admin BEFORE anything privileged happens --
    // inviting staff is an admin-only action (the mockup's own permission
    // matrix: "Users, roles & settings" is Admin-Full, everyone else "--").
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: 'invalid session' }), {
        status: 401,
        headers: corsHeaders,
      });
    }
    const { data: callerProfile } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .maybeSingle();
    if (callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'admin role required' }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const body: InviteRequest = await req.json();
    if (!isValidInviteRequest(body, INVITABLE_ROLES)) {
      return new Response(
        JSON.stringify({ error: 'full_name, a valid email, and a valid role are required' }),
        { status: 400, headers: corsHeaders },
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Creates the auth.users row and sends Supabase's own built-in invite
    // email (a set-password link) -- the on_auth_user_created trigger fires
    // from this insert exactly as it does for a normal signup, creating the
    // profiles row with its schema default role='member'.
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      body.email!,
      { data: { full_name: body.full_name } },
    );
    if (inviteError || !inviteData.user) {
      return new Response(JSON.stringify({ error: inviteError?.message ?? 'invite failed' }), {
        status: 500,
        headers: corsHeaders,
      });
    }
    const newUserId = inviteData.user.id;

    // Promote past the trigger's 'member' default to the role actually
    // selected in the invite drawer. This is the one documented path for
    // changing profiles.role -- see the comment on
    // profile_update_preserves_role in
    // 20260815160000_lock_down_profile_role_column.sql: "Role changes
    // remain possible only via a coordinator-run SQL UPDATE (service_role /
    // table owner, bypasses RLS)". adminClient is exactly that.
    const { error: roleUpdateError } = await adminClient
      .from('profiles')
      .update({ role: body.role, full_name: body.full_name })
      .eq('id', newUserId);
    if (roleUpdateError) {
      return new Response(JSON.stringify({ error: roleUpdateError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    if (STAFF_ROLES_WITH_HR_PROFILE.includes(body.role!)) {
      const { error: staffProfileError } = await adminClient.from('staff_profiles').insert({
        id: newUserId,
        discipline: body.discipline ?? null,
      });
      if (staffProfileError) {
        return new Response(JSON.stringify({ error: staffProfileError.message }), {
          status: 500,
          headers: corsHeaders,
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, user_id: newUserId }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
```

- [ ] **Step 4: Run the unit tests**

Run: `cd supabase/functions/invite-staff && deno test`
Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/invite-staff/
git commit -m "feat: add invite-staff Edge Function (admin-only staff account creation)"
```

---

### Task 6: Edge Function — `list-staff-users`

**Files:**
- Create: `supabase/functions/list-staff-users/index.ts`
- Create: `supabase/functions/list-staff-users/index.test.ts`

**Interfaces:**
- Consumes: same env vars as Task 5.
- Produces: HTTP endpoint invoked as `supabase.functions.invoke('list-staff-users')` (no body). Returns `{ ok: true, users: StaffUser[] }` where each `StaffUser` has `id, full_name, email, role, created_at, last_sign_in_at, invite_accepted`. This is the only honest source for "last active" / "pending invite" — `auth.users` metadata is not readable through the regular PostgREST client, only through `auth.admin.listUsers()` with the service-role key.

- [ ] **Step 1: Write the pure mapping function and its test first**

Create `supabase/functions/list-staff-users/index.test.ts`:

```typescript
import { assertEquals } from 'jsr:@std/assert@1';
import { toStaffUser, type AuthUserLike, type ProfileLike } from './index.ts';

Deno.test('toStaffUser marks a never-signed-in invited user as invite_accepted=false', () => {
  const profile: ProfileLike = { id: 'u1', full_name: 'Tom Sebastian', email: 'tom@carebridge.in', role: 'management', created_at: '2026-09-01T00:00:00Z' };
  const authUser: AuthUserLike = { id: 'u1', last_sign_in_at: null };
  assertEquals(toStaffUser(profile, authUser), {
    id: 'u1',
    full_name: 'Tom Sebastian',
    email: 'tom@carebridge.in',
    role: 'management',
    created_at: '2026-09-01T00:00:00Z',
    last_sign_in_at: null,
    invite_accepted: false,
  });
});

Deno.test('toStaffUser marks a user who has signed in as invite_accepted=true', () => {
  const profile: ProfileLike = { id: 'u2', full_name: 'Meera P.', email: 'meera@carebridge.in', role: 'coordinator', created_at: '2026-08-01T00:00:00Z' };
  const authUser: AuthUserLike = { id: 'u2', last_sign_in_at: '2026-09-08T10:00:00Z' };
  const result = toStaffUser(profile, authUser);
  assertEquals(result.invite_accepted, true);
  assertEquals(result.last_sign_in_at, '2026-09-08T10:00:00Z');
});

Deno.test('toStaffUser handles a profile with no matching auth user (defensive, should not normally happen)', () => {
  const profile: ProfileLike = { id: 'u3', full_name: 'Ghost', email: 'ghost@carebridge.in', role: 'finance', created_at: '2026-09-01T00:00:00Z' };
  const result = toStaffUser(profile, null);
  assertEquals(result.last_sign_in_at, null);
  assertEquals(result.invite_accepted, false);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd supabase/functions/list-staff-users && deno test`
Expected: FAIL — `index.ts` not found.

- [ ] **Step 3: Write the Edge Function**

Create `supabase/functions/list-staff-users/index.ts`:

```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

export interface ProfileLike {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  created_at: string;
}

export interface AuthUserLike {
  id: string;
  last_sign_in_at: string | null;
}

export interface StaffUser {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
  invite_accepted: boolean;
}

// Pure merge, unit-tested in isolation. Not exported/used for role
// filtering -- every row in `profiles` is included; `role` itself is
// displayed, not filtered, matching the mockup's single combined Users tab.
export function toStaffUser(profile: ProfileLike, authUser: AuthUserLike | null): StaffUser {
  return {
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email,
    role: profile.role,
    created_at: profile.created_at,
    last_sign_in_at: authUser?.last_sign_in_at ?? null,
    invite_accepted: !!authUser?.last_sign_in_at,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'missing authorization header' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: 'invalid session' }), {
        status: 401,
        headers: corsHeaders,
      });
    }
    const { data: callerProfile } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .maybeSingle();
    if (callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'admin role required' }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .order('created_at', { ascending: false });
    if (profilesError) {
      return new Response(JSON.stringify({ error: profilesError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // listUsers() paginates at 50/page by default; Care Bridge Home's whole
    // staff roster is nowhere near that yet (spec context: ~28 field staff
    // total per the mockup), so a single page is sufficient for this phase.
    // Revisit with pagination if the roster grows past ~50 accounts.
    const { data: authData, error: authError } = await adminClient.auth.admin.listUsers();
    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }
    const authById = new Map(authData.users.map((u) => [u.id, { id: u.id, last_sign_in_at: u.last_sign_in_at ?? null }]));

    const users = (profiles ?? []).map((p) => toStaffUser(p as ProfileLike, authById.get(p.id) ?? null));

    return new Response(JSON.stringify({ ok: true, users }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
```

- [ ] **Step 4: Run the unit tests**

Run: `cd supabase/functions/list-staff-users && deno test`
Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/list-staff-users/
git commit -m "feat: add list-staff-users Edge Function (admin-only user roster)"
```

---

### Task 7: Admin — `AuthProvider` exposes `isAdmin`

**Files:**
- Modify: `apps/admin/src/auth/AuthProvider.tsx`
- Modify: `apps/admin/src/auth/AuthProvider.test.tsx`

**Interfaces:**
- Consumes: the same `profiles` query already in `fetchProfile` (currently selects `role, full_name`).
- Produces: `AuthContextValue.isAdmin: boolean`, consumed by Task 8's guards and Task 12's Sidebar.

- [ ] **Step 1: Write the failing test**

Add to `apps/admin/src/auth/AuthProvider.test.tsx`, inside the existing `describe('AuthProvider', ...)` block, and add `isAdmin` to the `Probe` component's rendered output first:

```typescript
// In the Probe component, add a line:
//   <p data-testid="is-admin">{isAdmin ? 'true' : 'false'}</p>
// and destructure isAdmin from useAuth() alongside the existing fields.

it('sets isAdmin=true when profiles.role is admin', async () => {
  const fakeSession = { user: { id: 'user-1' } };
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: fakeSession },
  } as never);
  mockAuthStateChange();
  mockProfileRoleQuery('admin');

  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

  expect(await screen.findByTestId('session')).toHaveTextContent('has-session');
  expect(screen.getByTestId('is-admin')).toHaveTextContent('true');
  expect(screen.getByTestId('is-coordinator')).toHaveTextContent('false');
});
```

Also update the `Probe` function definition itself:

```typescript
function Probe() {
  const { loading, roleLoaded, session, isCoordinator, isAdmin } = useAuth();
  if (loading) return <p>loading</p>;
  return (
    <div>
      <p data-testid="session">{session ? 'has-session' : 'no-session'}</p>
      <p data-testid="role-loaded">{roleLoaded ? 'true' : 'false'}</p>
      <p data-testid="is-coordinator">{isCoordinator ? 'true' : 'false'}</p>
      <p data-testid="is-admin">{isAdmin ? 'true' : 'false'}</p>
    </div>
  );
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @carebridge/admin test -- AuthProvider`
Expected: FAIL — `isAdmin` is `undefined`, test expects `'true'`.

- [ ] **Step 3: Implement**

In `apps/admin/src/auth/AuthProvider.tsx`, update the interface, the `fetchProfile` function, and the provider body:

```typescript
export interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  roleLoaded: boolean;
  isCoordinator: boolean;
  isAdmin: boolean;
  fullName: string | null;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(
  userId: string,
): Promise<{ isCoordinator: boolean; isAdmin: boolean; fullName: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return { isCoordinator: false, isAdmin: false, fullName: null };
  return {
    isCoordinator: data.role === 'coordinator',
    isAdmin: data.role === 'admin',
    fullName: data.full_name ?? null,
  };
}
```

Then in `AuthProvider`, add an `isAdmin` state variable next to `isCoordinator`, set it in `applySession`'s two branches (`false` when there's no session, `profile.isAdmin` when there is), and add it to the `AuthContext.Provider value={{ ... }}` object.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @carebridge/admin test -- AuthProvider`
Expected: PASS, including all pre-existing tests (they don't reference `isAdmin`, so they're unaffected).

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/auth/AuthProvider.tsx apps/admin/src/auth/AuthProvider.test.tsx
git commit -m "feat(admin): AuthProvider exposes isAdmin"
```

---

### Task 8: Admin — widen `RequireCoordinator`, add `RequireAdmin`

**Files:**
- Modify: `apps/admin/src/auth/RequireAuth.tsx`
- Modify: `apps/admin/src/auth/RequireAuth.test.tsx`

**Interfaces:**
- Consumes: `isAdmin` from Task 7.
- Produces: `RequireAdmin` component, consumed by Task 13's routing (protects `/users-roles`). `RequireCoordinator` keeps its existing name (all 5 current routes stay behind it unchanged) but now also admits `admin`.

- [ ] **Step 1: Write the failing tests**

Add to `apps/admin/src/auth/RequireAuth.test.tsx`:

```typescript
it('renders protected content for a signed-in admin (admin is a superset of coordinator)', () => {
  vi.mocked(useAuth).mockReturnValue({
    session: {},
    loading: false,
    roleLoaded: true,
    isCoordinator: false,
    isAdmin: true,
  } as never);
  renderGuard(<RequireCoordinator />, '/protected');
  expect(screen.getByText('protected content')).toBeInTheDocument();
});

describe('RequireAdmin', () => {
  it('redirects to /login with no session', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: null,
      loading: false,
      roleLoaded: true,
      isCoordinator: false,
      isAdmin: false,
    } as never);
    renderGuard(<RequireAdmin />, '/protected');
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('shows a not-authorized message for a signed-in coordinator (not admin)', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {},
      loading: false,
      roleLoaded: true,
      isCoordinator: true,
      isAdmin: false,
    } as never);
    renderGuard(<RequireAdmin />, '/protected');
    expect(screen.getByText(/not authorized/i)).toBeInTheDocument();
  });

  it('renders protected content for a signed-in admin', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {},
      loading: false,
      roleLoaded: true,
      isCoordinator: false,
      isAdmin: true,
    } as never);
    renderGuard(<RequireAdmin />, '/protected');
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });
});
```

Add `RequireAdmin` to the existing import line: `import { RedirectIfAuthenticated, RequireAdmin, RequireCoordinator } from './RequireAuth';`

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @carebridge/admin test -- RequireAuth`
Expected: FAIL — `RequireAdmin` is not exported.

- [ ] **Step 3: Implement**

In `apps/admin/src/auth/RequireAuth.tsx`, change `RequireCoordinator`'s condition and add `RequireAdmin`:

```typescript
export function RequireCoordinator() {
  const { session, loading, roleLoaded, isCoordinator, isAdmin } = useAuth();
  if (loading || (session && !roleLoaded)) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (!isCoordinator && !isAdmin) return <NotAuthorized />;
  return <Outlet />;
}

export function RequireAdmin() {
  const { session, loading, roleLoaded, isAdmin } = useAuth();
  if (loading || (session && !roleLoaded)) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (!isAdmin) return <NotAuthorized />;
  return <Outlet />;
}
```

`RedirectIfAuthenticated` is unchanged — it already only checks `isCoordinator`, and per this phase's scope, an authenticated admin landing on `/login` should also redirect to `/`. Update it too:

```typescript
export function RedirectIfAuthenticated() {
  const { session, loading, roleLoaded, isCoordinator, isAdmin } = useAuth();
  if (loading || (session && !roleLoaded)) return <LoadingScreen />;
  if (session && (isCoordinator || isAdmin)) return <Navigate to="/" replace />;
  return <Outlet />;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @carebridge/admin test -- RequireAuth`
Expected: PASS, all tests including pre-existing ones.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/auth/RequireAuth.tsx apps/admin/src/auth/RequireAuth.test.tsx
git commit -m "feat(admin): admin passes RequireCoordinator; add RequireAdmin guard"
```

---

### Task 9: Admin — `lib/staff.ts`

**Files:**
- Create: `apps/admin/src/lib/staff.ts`
- Create: `apps/admin/src/lib/staff.test.ts`

**Interfaces:**
- Consumes: nothing (pure functions/constants).
- Produces: `DISCIPLINE_LABELS`, `PCC_STATUS_LABELS`, `PCC_STATUS_CHIP_CLASS`, `EMPLOYMENT_STATUS_LABELS`, `EMPLOYMENT_STATUS_CHIP_CLASS`, `ROLE_LABELS`, `sortStaffByName`, `sortUsersByRoleThenName` — consumed by Tasks 10, 11, 12.

- [ ] **Step 1: Write the failing test**

Create `apps/admin/src/lib/staff.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import {
  DISCIPLINE_LABELS,
  EMPLOYMENT_STATUS_CHIP_CLASS,
  PCC_STATUS_CHIP_CLASS,
  ROLE_LABELS,
  sortStaffByName,
  sortUsersByRoleThenName,
} from './staff';

describe('staff labels', () => {
  it('has a label for every discipline', () => {
    expect(DISCIPLINE_LABELS.nurse_coordinator).toBe('Nurse coordinator');
    expect(DISCIPLINE_LABELS.physiotherapist).toBe('Physiotherapist');
  });

  it('has a chip class for every PCC status', () => {
    expect(PCC_STATUS_CHIP_CLASS.verified).toBe('chip--completed');
    expect(PCC_STATUS_CHIP_CLASS.not_submitted).toBe('chip--missed');
  });

  it('has a chip class for every employment status', () => {
    expect(EMPLOYMENT_STATUS_CHIP_CLASS.active).toBe('chip--completed');
    expect(EMPLOYMENT_STATUS_CHIP_CLASS.inactive).toBe('chip--missed');
  });

  it('has a label for every role including the 4 new ones', () => {
    expect(ROLE_LABELS.admin).toBe('Admin');
    expect(ROLE_LABELS.field_staff).toBe('Nurse / Caregiver');
    expect(ROLE_LABELS.finance).toBe('Finance');
    expect(ROLE_LABELS.management).toBe('Management');
    expect(ROLE_LABELS.coordinator).toBe('Coordinator');
  });
});

describe('sortStaffByName', () => {
  it('sorts alphabetically by full_name', () => {
    const rows = [{ full_name: 'Zoe' }, { full_name: 'Anu' }];
    expect(sortStaffByName(rows).map((r) => r.full_name)).toEqual(['Anu', 'Zoe']);
  });
});

describe('sortUsersByRoleThenName', () => {
  it('groups by role in admin/coordinator/field_staff/finance/management order, then name within a role', () => {
    const rows = [
      { role: 'coordinator' as const, full_name: 'Zed Coord' },
      { role: 'admin' as const, full_name: 'Amy Admin' },
      { role: 'coordinator' as const, full_name: 'Abe Coord' },
    ];
    expect(sortUsersByRoleThenName(rows).map((r) => r.full_name)).toEqual([
      'Amy Admin',
      'Abe Coord',
      'Zed Coord',
    ]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @carebridge/admin test -- staff`
Expected: FAIL — `./staff` module not found.

- [ ] **Step 3: Implement**

Create `apps/admin/src/lib/staff.ts`:

```typescript
export type StaffDiscipline =
  | 'nurse'
  | 'caregiver'
  | 'physiotherapist'
  | 'doctor'
  | 'nurse_coordinator'
  | 'other';

export const DISCIPLINE_LABELS: Record<StaffDiscipline, string> = {
  nurse: 'Nurse',
  caregiver: 'Caregiver',
  physiotherapist: 'Physiotherapist',
  doctor: 'Doctor',
  nurse_coordinator: 'Nurse coordinator',
  other: 'Other',
};

export type PccStatus = 'not_submitted' | 'pending' | 'verified';

export const PCC_STATUS_LABELS: Record<PccStatus, string> = {
  not_submitted: 'Not submitted',
  pending: 'Pending',
  verified: 'Verified',
};

export const PCC_STATUS_CHIP_CLASS: Record<PccStatus, string> = {
  not_submitted: 'chip--missed',
  pending: 'chip--pending',
  verified: 'chip--completed',
};

export type EmploymentStatus = 'active' | 'inactive';

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
};

export const EMPLOYMENT_STATUS_CHIP_CLASS: Record<EmploymentStatus, string> = {
  active: 'chip--completed',
  inactive: 'chip--missed',
};

export type StaffRateType = 'per_visit' | 'monthly' | 'hourly';

export const RATE_TYPE_LABELS: Record<StaffRateType, string> = {
  per_visit: 'Per visit',
  monthly: 'Monthly',
  hourly: 'Hourly',
};

export type UserRole = 'admin' | 'coordinator' | 'field_staff' | 'finance' | 'management' | 'member';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  coordinator: 'Coordinator',
  field_staff: 'Nurse / Caregiver',
  finance: 'Finance',
  management: 'Management',
  member: 'Member',
};

// Roles a coordinator/admin can invite someone into via the Users & Roles
// screen -- 'member' is excluded, members self-signup through the wellness
// app and are never created via staff invite.
export const INVITABLE_ROLES: Exclude<UserRole, 'member'>[] = [
  'admin',
  'coordinator',
  'field_staff',
  'finance',
  'management',
];

const ROLE_SORT_ORDER: Record<UserRole, number> = {
  admin: 0,
  coordinator: 1,
  field_staff: 2,
  finance: 3,
  management: 4,
  member: 5,
};

export interface StaffLike {
  full_name: string;
}

export function sortStaffByName<T extends StaffLike>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export interface UserLike {
  role: UserRole;
  full_name: string;
}

export function sortUsersByRoleThenName<T extends UserLike>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const roleDiff = ROLE_SORT_ORDER[a.role] - ROLE_SORT_ORDER[b.role];
    if (roleDiff !== 0) return roleDiff;
    return a.full_name.localeCompare(b.full_name);
  });
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @carebridge/admin test -- staff`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/staff.ts apps/admin/src/lib/staff.test.ts
git commit -m "feat(admin): add staff lib (labels, sorting)"
```

---

### Task 10: Admin — Human Resources list page

**Files:**
- Create: `apps/admin/src/pages/HumanResources.tsx`
- Create: `apps/admin/src/pages/HumanResources.test.tsx`

**Interfaces:**
- Consumes: `supabase.from('staff_profiles').select(...).join profiles`, `DISCIPLINE_LABELS`/`PCC_STATUS_LABELS`/`PCC_STATUS_CHIP_CLASS`/`EMPLOYMENT_STATUS_LABELS`/`EMPLOYMENT_STATUS_CHIP_CLASS`/`sortStaffByName` from Task 9.
- Produces: page rendered at route `/human-resources` (wired in Task 13). Row click navigates to `/human-resources/:id` (Task 11).

- [ ] **Step 1: Write the failing test**

Create `apps/admin/src/pages/HumanResources.test.tsx` (same mock-table pattern as `MemberList.test.tsx`):

```typescript
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HumanResources } from './HumanResources';

const tableResponses: Record<string, { data: unknown; error: unknown }> = {};

function mockTable(table: string) {
  const builder = {
    select: () => builder,
    order: () => builder,
    then: (resolve: (v: { data: unknown; error: unknown }) => void) =>
      resolve(tableResponses[table] ?? { data: null, error: null }),
  };
  return builder;
}

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn((table: string) => mockTable(table)) },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <HumanResources />
    </MemoryRouter>,
  );
}

describe('HumanResources', () => {
  beforeEach(() => {
    for (const key of Object.keys(tableResponses)) delete tableResponses[key];
    tableResponses.staff_profiles = { data: [], error: null };
  });

  it('shows a loading state before the initial fetch resolves', () => {
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows an empty state with no staff', async () => {
    renderPage();
    expect(await screen.findByText(/no staff on file yet/i)).toBeInTheDocument();
  });

  it('lists a staff member with discipline, PCC status, service area, and employment status', async () => {
    tableResponses.staff_profiles = {
      data: [
        {
          id: 's1',
          discipline: 'nurse',
          qualification: 'BSc Nursing',
          pcc_status: 'verified',
          service_area: 'Kakkanad',
          employment_status: 'active',
          profiles: { full_name: 'Sree Rekha R.' },
        },
      ],
      error: null,
    };

    renderPage();

    expect(await screen.findByText('Sree Rekha R.')).toBeInTheDocument();
    expect(screen.getByText('Nurse')).toBeInTheDocument();
    expect(screen.getByText('BSc Nursing')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Kakkanad')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows a real total-staff count in the metric row, and active/inactive breakdown', async () => {
    tableResponses.staff_profiles = {
      data: [
        { id: 's1', discipline: 'nurse', qualification: null, pcc_status: 'verified', service_area: null, employment_status: 'active', profiles: { full_name: 'A' } },
        { id: 's2', discipline: 'caregiver', qualification: null, pcc_status: 'pending', service_area: null, employment_status: 'inactive', profiles: { full_name: 'B' } },
      ],
      error: null,
    };

    renderPage();

    expect(await screen.findByText('2')).toBeInTheDocument(); // Total staff
    expect(screen.getAllByText('1')).toHaveLength(2); // Active: 1, Inactive: 1
  });

  it('shows a dismissible error banner when the fetch fails', async () => {
    tableResponses.staff_profiles = { data: null, error: { message: 'network error' } };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @carebridge/admin test -- HumanResources`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `apps/admin/src/pages/HumanResources.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  DISCIPLINE_LABELS,
  EMPLOYMENT_STATUS_CHIP_CLASS,
  EMPLOYMENT_STATUS_LABELS,
  PCC_STATUS_CHIP_CLASS,
  PCC_STATUS_LABELS,
  sortStaffByName,
  type EmploymentStatus,
  type PccStatus,
  type StaffDiscipline,
} from '../lib/staff';
import { initialsFor } from '../lib/members';

interface StaffRow {
  id: string;
  discipline: StaffDiscipline | null;
  qualification: string | null;
  pcc_status: PccStatus;
  service_area: string | null;
  employment_status: EmploymentStatus;
  profiles: { full_name: string } | null;
}

export function HumanResources() {
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [staff, setStaff] = useState<StaffRow[]>([]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      const { data, error } = await supabase
        .from('staff_profiles')
        .select(
          'id, discipline, qualification, pcc_status, service_area, employment_status, profiles(full_name)',
        )
        .order('created_at', { ascending: false });
      if (ignore) return;
      setLoading(false);
      setFetchError(!!error);
      if (data) setStaff(data as unknown as StaffRow[]);
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  if (loading) {
    return <div className="card">Loading…</div>;
  }

  const named = staff
    .filter((s) => s.profiles)
    .map((s) => ({ ...s, full_name: s.profiles!.full_name }));
  const sorted = sortStaffByName(named);
  const activeCount = staff.filter((s) => s.employment_status === 'active').length;
  const inactiveCount = staff.filter((s) => s.employment_status === 'inactive').length;

  return (
    <>
      {fetchError && (
        <div className="card" role="alert">
          <span>Something went wrong loading staff.</span>
          <button type="button" onClick={() => setFetchError(false)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="page-header">
        <div className="page-header__txt">
          <h1>Human Resources</h1>
          <p>Field staff — nurses, caregivers, physios and doctors.</p>
        </div>
      </div>

      <div className="metric-row">
        <div className="metric">
          <div className="metric__label">Total staff</div>
          <div className="metric__num">{staff.length}</div>
        </div>
        <div className="metric metric--success">
          <div className="metric__label">Active</div>
          <div className="metric__num">{activeCount}</div>
        </div>
        <div className="metric">
          <div className="metric__label">Inactive</div>
          <div className="metric__num">{inactiveCount}</div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="card">
          <span>No staff on file yet.</span>
        </div>
      ) : (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Staff</th>
                <th>Discipline</th>
                <th>Qualification</th>
                <th>PCC status</th>
                <th>Service area</th>
                <th>Employment status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="u">
                      <span className="avatar avatar--sm">{initialsFor(s.full_name)}</span>
                      <Link className="name cell-link" to={`/human-resources/${s.id}`}>
                        {s.full_name}
                      </Link>
                    </div>
                  </td>
                  <td>{s.discipline ? DISCIPLINE_LABELS[s.discipline] : '—'}</td>
                  <td>{s.qualification ?? '—'}</td>
                  <td>
                    <span className={`chip ${PCC_STATUS_CHIP_CLASS[s.pcc_status]}`}>
                      <span className="dot" />
                      {PCC_STATUS_LABELS[s.pcc_status]}
                    </span>
                  </td>
                  <td>{s.service_area ?? '—'}</td>
                  <td>
                    <span className={`chip ${EMPLOYMENT_STATUS_CHIP_CLASS[s.employment_status]}`}>
                      <span className="dot" />
                      {EMPLOYMENT_STATUS_LABELS[s.employment_status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @carebridge/admin test -- HumanResources`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/pages/HumanResources.tsx apps/admin/src/pages/HumanResources.test.tsx
git commit -m "feat(admin): add Human Resources staff directory page"
```

---

### Task 11: Admin — Staff Profile detail page

**Files:**
- Create: `apps/admin/src/pages/StaffProfile.tsx`
- Create: `apps/admin/src/pages/StaffProfile.test.tsx`

**Interfaces:**
- Consumes: `RATE_TYPE_LABELS`, `DISCIPLINE_LABELS`, `PCC_STATUS_LABELS`, `EMPLOYMENT_STATUS_LABELS`/`_CHIP_CLASS` from Task 9.
- Produces: page rendered at route `/human-resources/:id` (wired in Task 13).

- [ ] **Step 1: Write the failing test**

Create `apps/admin/src/pages/StaffProfile.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { StaffProfile } from './StaffProfile';

const tableResponses: Record<string, { data: unknown; error: unknown }> = {};

function mockTable() {
  const builder = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: () => Promise.resolve(tableResponses.staff_profiles ?? { data: null, error: null }),
  };
  return builder;
}

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn(() => mockTable()) },
}));

function renderPage(id = 's1') {
  return render(
    <MemoryRouter initialEntries={[`/human-resources/${id}`]}>
      <Routes>
        <Route path="/human-resources/:id" element={<StaffProfile />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('StaffProfile', () => {
  beforeEach(() => {
    delete tableResponses.staff_profiles;
  });

  it('shows a loading state before the fetch resolves', () => {
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows a not-found message when no matching row is readable', async () => {
    tableResponses.staff_profiles = { data: null, error: null };
    renderPage();
    expect(await screen.findByText(/not found/i)).toBeInTheDocument();
  });

  it('shows the staff member\'s profile, and payment settings', async () => {
    tableResponses.staff_profiles = {
      data: {
        id: 's1',
        discipline: 'nurse',
        qualification: 'BSc Nursing',
        pcc_status: 'verified',
        experience_years: 8,
        languages: ['Malayalam', 'English'],
        service_area: 'Kakkanad',
        service_radius_km: 10,
        employment_status: 'active',
        rate_type: 'per_visit',
        visit_rate: 400,
        emergency_duty_rate: 600,
        profiles: { full_name: 'Sree Rekha R.' },
      },
      error: null,
    };

    renderPage();

    expect(await screen.findByText('Sree Rekha R.')).toBeInTheDocument();
    expect(screen.getByText('BSc Nursing')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('Malayalam, English')).toBeInTheDocument();
    expect(screen.getByText('Per visit')).toBeInTheDocument();
    expect(screen.getByText('₹400')).toBeInTheDocument();
    expect(screen.getByText('₹600')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @carebridge/admin test -- StaffProfile`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `apps/admin/src/pages/StaffProfile.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  DISCIPLINE_LABELS,
  EMPLOYMENT_STATUS_CHIP_CLASS,
  EMPLOYMENT_STATUS_LABELS,
  PCC_STATUS_LABELS,
  RATE_TYPE_LABELS,
  type EmploymentStatus,
  type PccStatus,
  type StaffDiscipline,
  type StaffRateType,
} from '../lib/staff';
import { initialsFor } from '../lib/members';

interface StaffDetail {
  id: string;
  discipline: StaffDiscipline | null;
  qualification: string | null;
  pcc_status: PccStatus;
  experience_years: number | null;
  languages: string[];
  service_area: string | null;
  service_radius_km: number | null;
  employment_status: EmploymentStatus;
  rate_type: StaffRateType | null;
  visit_rate: number | null;
  emergency_duty_rate: number | null;
  profiles: { full_name: string } | null;
}

export function StaffProfile() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffDetail | null>(null);

  useEffect(() => {
    let ignore = false;
    if (!id) return;

    async function load() {
      const { data } = await supabase
        .from('staff_profiles')
        .select(
          'id, discipline, qualification, pcc_status, experience_years, languages, service_area, service_radius_km, employment_status, rate_type, visit_rate, emergency_duty_rate, profiles(full_name)',
        )
        .eq('id', id!)
        .maybeSingle();
      if (ignore) return;
      setLoading(false);
      setStaff((data as unknown as StaffDetail | null) ?? null);
    }

    load();
    return () => {
      ignore = true;
    };
  }, [id]);

  if (loading) {
    return <div className="card">Loading…</div>;
  }

  if (!staff || !staff.profiles) {
    return (
      <div className="card">
        <span>Staff member not found.</span>
      </div>
    );
  }

  const fullName = staff.profiles.full_name;

  return (
    <>
      <div className="breadcrumb">
        <Link to="/human-resources">Human Resources</Link>
        <span>{fullName}</span>
      </div>

      <div className="page-header">
        <div className="profile-hero">
          <span className="avatar-lg">{initialsFor(fullName)}</span>
          <div>
            <h2>{fullName}</h2>
            <div className="meta">
              {staff.discipline ? DISCIPLINE_LABELS[staff.discipline] : 'Discipline not set'}
              {staff.service_area ? ` · ${staff.service_area}` : ''}
            </div>
          </div>
        </div>
        <div className="page-header__actions">
          <span className={`chip ${EMPLOYMENT_STATUS_CHIP_CLASS[staff.employment_status]}`}>
            <span className="dot" />
            {EMPLOYMENT_STATUS_LABELS[staff.employment_status]}
          </span>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="section-card">
            <div className="section-card__head">
              <span className="section-card__title">Profile</span>
            </div>
            <div className="kv">
              <div className="kv__row">
                <span className="kv__k">Discipline</span>
                <span className="kv__v">
                  {staff.discipline ? DISCIPLINE_LABELS[staff.discipline] : '—'}
                </span>
              </div>
              <div className="kv__row">
                <span className="kv__k">Qualification</span>
                <span className="kv__v">{staff.qualification ?? '—'}</span>
              </div>
              <div className="kv__row">
                <span className="kv__k">PCC status</span>
                <span className="kv__v">{PCC_STATUS_LABELS[staff.pcc_status]}</span>
              </div>
              <div className="kv__row">
                <span className="kv__k">Experience</span>
                <span className="kv__v">
                  {staff.experience_years != null ? staff.experience_years : '—'}
                </span>
              </div>
              <div className="kv__row">
                <span className="kv__k">Languages</span>
                <span className="kv__v">
                  {staff.languages.length > 0 ? staff.languages.join(', ') : '—'}
                </span>
              </div>
              <div className="kv__row">
                <span className="kv__k">Service area</span>
                <span className="kv__v">
                  {staff.service_area ?? '—'}
                  {staff.service_radius_km != null ? ` · ${staff.service_radius_km} km` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        <aside className="detail-side">
          <div className="section-card">
            <div className="section-card__title" style={{ marginBottom: '8px' }}>
              Payment settings
            </div>
            <div className="kv">
              <div className="kv__row">
                <span className="kv__k">Rate type</span>
                <span className="kv__v">
                  {staff.rate_type ? RATE_TYPE_LABELS[staff.rate_type] : '—'}
                </span>
              </div>
              <div className="kv__row">
                <span className="kv__k">Visit rate</span>
                <span className="kv__v">
                  {staff.visit_rate != null ? `₹${staff.visit_rate}` : '—'}
                </span>
              </div>
              <div className="kv__row">
                <span className="kv__k">Emergency duty</span>
                <span className="kv__v">
                  {staff.emergency_duty_rate != null ? `₹${staff.emergency_duty_rate}` : '—'}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @carebridge/admin test -- StaffProfile`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/pages/StaffProfile.tsx apps/admin/src/pages/StaffProfile.test.tsx
git commit -m "feat(admin): add Staff Profile detail page"
```

---

### Task 12: Admin — Users & Roles page (users list, permission matrix, invite drawer)

**Files:**
- Create: `apps/admin/src/pages/UsersRoles.tsx`
- Create: `apps/admin/src/pages/UsersRoles.test.tsx`

**Interfaces:**
- Consumes: `supabase.functions.invoke('list-staff-users')` (Task 6), `supabase.functions.invoke('invite-staff', {...})` (Task 5), `ROLE_LABELS`/`INVITABLE_ROLES`/`sortUsersByRoleThenName` (Task 9).
- Produces: page rendered at route `/users-roles` (wired in Task 13, behind `RequireAdmin`).

- [ ] **Step 1: Write the failing test**

Create `apps/admin/src/pages/UsersRoles.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UsersRoles } from './UsersRoles';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <UsersRoles />
    </MemoryRouter>,
  );
}

describe('UsersRoles', () => {
  beforeEach(() => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { ok: true, users: [] },
      error: null,
    } as never);
  });

  it('shows a loading state before the initial fetch resolves', () => {
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('lists a user with role, and shows real totals in the metric row', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        ok: true,
        users: [
          {
            id: 'u1',
            full_name: 'Joel Abraham',
            email: 'joel@carebridge.in',
            role: 'admin',
            created_at: '2026-09-01T00:00:00Z',
            last_sign_in_at: '2026-09-08T10:00:00Z',
            invite_accepted: true,
          },
          {
            id: 'u2',
            full_name: 'Tom Sebastian',
            email: 'tom@carebridge.in',
            role: 'management',
            created_at: '2026-09-01T00:00:00Z',
            last_sign_in_at: null,
            invite_accepted: false,
          },
        ],
      },
      error: null,
    } as never);

    renderPage();

    expect(await screen.findByText('Joel Abraham')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Management')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Total users
    expect(screen.getByText('1')).toBeInTheDocument(); // Pending invites
  });

  it('switches to the Roles & permissions tab', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/total users/i);

    await user.click(screen.getByRole('tab', { name: /roles & permissions/i }));
    expect(screen.getByText('Members & care models')).toBeInTheDocument();
    expect(screen.getByText('Human Resources')).toBeInTheDocument();
  });

  it('shows a dismissible error banner when the fetch fails', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: { message: 'network error' },
    } as never);
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('invites a user via the drawer', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/total users/i);

    await user.click(screen.getByRole('button', { name: /invite user/i }));
    await user.type(screen.getByLabelText(/full name/i), 'Anu George');
    await user.type(screen.getByLabelText(/^email/i), 'anu@carebridge.in');

    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: { ok: true, user_id: 'new-1' },
      error: null,
    } as never);

    await user.click(screen.getByRole('button', { name: /send invite/i }));

    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'invite-staff',
      expect.objectContaining({
        body: expect.objectContaining({ full_name: 'Anu George', email: 'anu@carebridge.in' }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @carebridge/admin test -- UsersRoles`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `apps/admin/src/pages/UsersRoles.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { INVITABLE_ROLES, ROLE_LABELS, sortUsersByRoleThenName, type UserRole } from '../lib/staff';

interface StaffUser {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  created_at: string;
  last_sign_in_at: string | null;
  invite_accepted: boolean;
}

// Reflects what RLS actually enforces today (this phase and earlier) --
// a "—" means no policy exists yet for that module, not that access is
// denied by a real rule. Updated as each later phase ships real access
// control for its module.
const PERMISSION_MATRIX: { permission: string; access: Partial<Record<UserRole, string>> }[] = [
  {
    permission: 'Members & care models',
    access: { admin: 'Full', coordinator: 'Full', field_staff: 'Assigned' },
  },
  { permission: 'Emergency centre (SOS)', access: { admin: 'Full', coordinator: 'Full' } },
  {
    permission: 'Human Resources',
    access: { admin: 'Full', coordinator: 'View', field_staff: 'Own profile' },
  },
  { permission: 'Users, roles & settings', access: { admin: 'Full' } },
  { permission: 'Assessments', access: {} },
  { permission: 'Scheduling & visits', access: {} },
  { permission: 'Visit reports', access: {} },
  { permission: 'Billing & invoices', access: {} },
  { permission: 'Staff payments', access: {} },
  { permission: 'Reports & analytics', access: {} },
];

function InviteDrawer({
  open,
  onClose,
  onInvited,
}: {
  open: boolean;
  onClose: () => void;
  onInvited: () => void;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('field_staff');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const { error: inviteError } = await supabase.functions.invoke('invite-staff', {
      body: { full_name: fullName.trim(), email: email.trim(), role },
    });
    setSaving(false);
    if (inviteError) {
      setError('Something went wrong sending the invite.');
      return;
    }
    setFullName('');
    setEmail('');
    setRole('field_staff');
    onInvited();
    onClose();
  };

  return (
    <>
      <div className={`overlay${open ? ' is-open' : ''}`} onClick={onClose} />
      <aside className={`drawer${open ? ' is-open' : ''}`} aria-label="Invite user">
        <div className="drawer__head">
          <span className="drawer__title">Invite user</span>
          <button type="button" className="x-btn" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <form
          className="drawer__body"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="field field--full">
            <label htmlFor="invite-name">Full name</label>
            <div className="control">
              <input
                id="invite-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>
          <div className="field field--full">
            <label htmlFor="invite-email">Email</label>
            <div className="control">
              <input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="field field--full">
            <label htmlFor="invite-role">Role</label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              {INVITABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </form>
        <div className="drawer__foot">
          <button type="button" className="btn btn--outline btn--sm" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={saving || !fullName.trim() || !email.trim()}
            onClick={submit}
          >
            {saving ? 'Sending…' : 'Send invite'}
          </button>
        </div>
      </aside>
    </>
  );
}

export function UsersRoles() {
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [tab, setTab] = useState<'users' | 'roles'>('users');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function load() {
      const { data, error } = await supabase.functions.invoke('list-staff-users');
      if (ignore) return;
      setLoading(false);
      setFetchError(!!error);
      if (data && (data as { users: StaffUser[] }).users) {
        setUsers((data as { users: StaffUser[] }).users);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  if (loading) {
    return <div className="card">Loading…</div>;
  }

  const sorted = sortUsersByRoleThenName(
    users.map((u) => ({ ...u, full_name: u.full_name ?? 'Unnamed' })),
  );
  const pendingCount = users.filter((u) => !u.invite_accepted).length;

  return (
    <>
      {fetchError && (
        <div className="card" role="alert">
          <span>Something went wrong loading users.</span>
          <button type="button" onClick={() => setFetchError(false)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="page-header">
        <div className="page-header__txt">
          <h1>Users &amp; Roles</h1>
          <p>Admin access, role assignment and account status.</p>
        </div>
        <div className="page-header__actions">
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setDrawerOpen(true)}>
            Invite user
          </button>
        </div>
      </div>

      <div className="metric-row">
        <div className="metric">
          <div className="metric__label">Total users</div>
          <div className="metric__num">{users.length}</div>
        </div>
        <div className="metric metric--warn">
          <div className="metric__label">Pending invites</div>
          <div className="metric__num">{pendingCount}</div>
        </div>
        <div className="metric">
          <div className="metric__label">Roles</div>
          <div className="metric__num">5</div>
        </div>
      </div>

      <div className="tabs" role="tablist">
        <span
          role="tab"
          aria-selected={tab === 'users'}
          className={`tab${tab === 'users' ? ' is-active' : ''}`}
          onClick={() => setTab('users')}
        >
          Users
        </span>
        <span
          role="tab"
          aria-selected={tab === 'roles'}
          className={`tab${tab === 'roles' ? ' is-active' : ''}`}
          onClick={() => setTab('roles')}
        >
          Roles &amp; permissions
        </span>
      </div>

      {tab === 'users' ? (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Last active</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="u__txt">
                      <div className="name">{u.full_name}</div>
                      <div className="sub">{u.email ?? '—'}</div>
                    </div>
                  </td>
                  <td>{ROLE_LABELS[u.role]}</td>
                  <td>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : '—'}</td>
                  <td>
                    {u.invite_accepted ? (
                      <span className="chip chip--completed">
                        <span className="dot" />
                        Active
                      </span>
                    ) : (
                      <span className="chip chip--pending">
                        <span className="dot" />
                        Invite sent
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Permission</th>
                <th>Admin</th>
                <th>Coordinator</th>
                <th>Nurse / Caregiver</th>
                <th>Finance</th>
                <th>Management</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MATRIX.map((row) => (
                <tr key={row.permission}>
                  <td>{row.permission}</td>
                  <td>{row.access.admin ?? '—'}</td>
                  <td>{row.access.coordinator ?? '—'}</td>
                  <td>{row.access.field_staff ?? '—'}</td>
                  <td>{row.access.finance ?? '—'}</td>
                  <td>{row.access.management ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <InviteDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onInvited={() => setRefreshKey((k) => k + 1)}
      />
    </>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @carebridge/admin test -- UsersRoles`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/pages/UsersRoles.tsx apps/admin/src/pages/UsersRoles.test.tsx
git commit -m "feat(admin): add Users & Roles page (roster, permission matrix, invite)"
```

---

### Task 13: Admin — wire routes and enable the sidebar links

**Files:**
- Modify: `apps/admin/src/App.tsx`
- Modify: `apps/admin/src/shell/Sidebar.tsx`

**Interfaces:**
- Consumes: `HumanResources`, `StaffProfile`, `UsersRoles` (Tasks 10-12), `RequireAdmin` (Task 8).
- Produces: working routes `/human-resources`, `/human-resources/:id`, `/users-roles`; live sidebar links replacing 2 of the currently-disabled nav items.

- [ ] **Step 1: Add the routes**

In `apps/admin/src/App.tsx`, add the three new imports and routes:

```typescript
import { RedirectIfAuthenticated, RequireAdmin, RequireCoordinator } from './auth/RequireAuth';
// ...existing imports...
import { HumanResources } from './pages/HumanResources';
import { StaffProfile } from './pages/StaffProfile';
import { UsersRoles } from './pages/UsersRoles';
```

Inside the `<Route element={<RequireCoordinator />}><Route element={<AdminShell />}>` block, add:

```typescript
<Route path="/human-resources" element={<HumanResources />} />
<Route path="/human-resources/:id" element={<StaffProfile />} />
```

Add a separate `RequireAdmin`-gated block (still inside `AdminShell`, since the sidebar/topbar should render for a "not authorized" admin-only page the same way it does everywhere else) — nest it as a sibling route group:

```typescript
<Route element={<RequireAdmin />}>
  <Route element={<AdminShell />}>
    <Route path="/users-roles" element={<UsersRoles />} />
  </Route>
</Route>
```

(This duplicates the `<AdminShell />` wrapper rather than trying to share one across two different guard components — react-router route trees can't have a route match under two different parent guards, so this is the same pattern as the existing `RedirectIfAuthenticated`/`RequireCoordinator` split, applied once more.)

- [ ] **Step 2: Enable the sidebar links**

In `apps/admin/src/shell/Sidebar.tsx`, change the `Workforce` group and the `Admin` group's `Users & Roles` item from disabled to live:

```typescript
{
  name: 'Workforce',
  items: [
    { label: 'Human Resources', icon: 'hr', to: '/human-resources' },
    { label: 'Attendance & GPS', icon: 'gps' },
  ],
},
```

```typescript
{
  name: 'Admin',
  items: [
    { label: 'Users & Roles', icon: 'shield', to: '/users-roles' },
    { label: 'Settings', icon: 'cog' },
  ],
},
```

- [ ] **Step 3: Verify the build**

Run: `pnpm --filter @carebridge/admin build`
Expected: PASS, no type errors (unused-import or route-typing issues would surface here).

- [ ] **Step 4: Run the full test suite**

Run: `pnpm --filter @carebridge/admin test`
Expected: PASS, all tests (existing + new from Tasks 7, 8, 9, 10, 11, 12).

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/App.tsx apps/admin/src/shell/Sidebar.tsx
git commit -m "feat(admin): wire Human Resources / Staff Profile / Users & Roles routes"
```

---

### Task 14: Manual verification against the hosted project

**Files:** none — this is a checkpoint task, not a code task.

- [ ] **Step 1: Push the migrations to the hosted Mumbai project**

Run (from repo root):
```bash
supabase link --project-ref bbthbboakoicoyiuclll
supabase db push
```
Expected: both new migrations (`20260908000000_add_staff_roles.sql`, `20260908000001_staff_profiles.sql`) apply cleanly.

- [ ] **Step 2: Deploy the two new Edge Functions**

Run:
```bash
supabase functions deploy invite-staff
supabase functions deploy list-staff-users
```

- [ ] **Step 3: Promote the existing test coordinator to admin**

Using the Supabase Dashboard SQL editor against the hosted project (per the pattern already used to create the test coordinator — see `.claude-scratch/admin-test-coordinator-credentials.md`):

```sql
update public.profiles set role = 'admin'
where id = '<the test coordinator's auth.users id>'
returning id, role, full_name;
```

- [ ] **Step 4: Click through on the live site**

Log into `https://carebridge-czk.pages.dev` with the (now-admin) test coordinator account. Verify:
- The sidebar's Human Resources and Users & Roles links are live (not greyed out).
- Users & Roles shows the test admin account itself in the Users tab with role "Admin" and status "Active."
- Invite user creates a real account — invite a throwaway address you control, confirm the invite email arrives, confirm the new row appears in the Users tab (as "Invite sent" until accepted).
- Human Resources shows an empty state (no `staff_profiles` rows exist yet on the hosted project).
- Insert one `staff_profiles` row via SQL editor for the invited account (if it was invited as `field_staff`) and confirm it now appears in the Human Resources list and its Staff Profile page renders correctly.

- [ ] **Step 5: Update the credentials scratch file**

Add a note to `.claude-scratch/admin-test-coordinator-credentials.md` recording that this account is now `role = 'admin'`, not just `coordinator`, so a future session doesn't have to rediscover this.

---

### Task 15: Full-suite verification

**Files:** none — this is a checkpoint task, not a code task.

- [ ] **Step 1: Run the complete local verification, matching what CI runs**

```bash
cd ~/Projects/Carebridge
pnpm lint
pnpm test
pnpm build
pnpm format:check
```
Expected: all four pass across every workspace package.

- [ ] **Step 2: Run the pgTAP suite one more time**

```bash
cd supabase
supabase test db
```
Expected: `1..122` all `ok`.

- [ ] **Step 3: Run both new Edge Function test suites**

```bash
cd supabase/functions/invite-staff && deno test
cd ../list-staff-users && deno test
```
Expected: both PASS.

- [ ] **Step 4: Push and verify CI**

```bash
git push origin main
gh run watch
```
Expected: GitHub Actions (lint/test/build/format:check) reports green.

- [ ] **Step 5: Verify the Cloudflare Pages admin deploy picked up the new routes**

```bash
curl -s https://carebridge-czk.pages.dev/ | grep -oE 'assets/index-[^"]+'
```
Poll every ~15s until the asset hash changes from the pre-deploy value, then repeat Task 14 Step 4's click-through against the fresh deploy.
