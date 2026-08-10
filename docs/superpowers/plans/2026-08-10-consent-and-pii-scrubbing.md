# Consent Flow + Sentry PII Scrubbing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement DPDP-compliant in-app consent capture + withdrawal (with coordinator-verified erasure) for `apps/wellness`, a matching review/erase workflow in `apps/admin`, and Sentry `beforeSend` PII scrubbing in both apps.

**Architecture:** An append-only `consents` audit table plus a `profiles.consent_status` fast-path column, gated behind two SECURITY DEFINER RPCs (`request_consent_withdrawal`, `reactivate_consent`) so no client ever issues a raw privileged UPDATE. Actual data erasure runs in a new Supabase Edge Function (`erase-consent-withdrawal`) because deleting `auth.users` rows needs the service_role key, which must never reach a browser bundle. The erasure logic turns out to be almost entirely "delete the `members` row" — every *clinical/operational* table with a `member_id` foreign key already has `on delete cascade` (verified against every migration in `supabase/migrations/`); `consents.member_id` is the deliberate exception, `on delete set null`, so an erasure can't destroy its own audit trail. The function's own job is small: log the audit row, sweep any Storage blobs (no DB-level FK covers those), delete `members` (or nothing, for `scope: self`), and delete the relevant `auth.users` row(s) (which itself cascades `profiles` and `member_links`).

**Tech Stack:** Supabase (Postgres, pgTAP, Edge Functions on Deno), React 19 + Vite + TypeScript (`apps/wellness`, `apps/admin`), `@sentry/react` 10.69, Vitest + Testing Library.

## Global Constraints

- pgTAP suite (`supabase/tests/database/rls.test.sql`) currently asserts `plan(20)` — must stay green, and the new plan count after this work is `plan(34)`.
- CI runs `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm format:check` via turbo across all 4 workspace packages on every push to `main` — every task must leave the repo in a state where all four pass.
- No shared package for the Sentry scrubbing helper — per the approved spec, it lives directly in each app's `src/lib/sentry.ts` (two ~40-line files, not worth a `packages/` addition for two call sites).
- Migrations are additive only — never edit an already-applied migration file.
- After any migration, `packages/db-types/src/database.types.ts` must be regenerated (see `packages/db-types/README.md`) — a stale regeneration is caught by `packages/db-types/src/index.test.ts`.

---

### Task 1: Database schema — consent tracking, RPCs, coordinator RLS

**Files:**
- Create: `supabase/migrations/20260810120000_consent_tracking.sql`
- Create: `supabase/migrations/20260810120001_coordinator_reads_member_with_withdrawal_request.sql`
- Modify: `supabase/tests/database/rls.test.sql`

**Interfaces:**
- Produces: table `public.consents` (`id`, `user_id`, `member_id`, `event` — enum `'given' | 'withdrawal_requested' | 'withdrawal_verified'`, `scope` — enum `'self' | 'all'` nullable, `policy_version` text default `'v1'`, `created_at`); column `public.profiles.consent_status` (text, `'active' | 'withdrawal_pending'`, default `'active'`); function `public.request_consent_withdrawal(p_member_id uuid, p_scope public.consent_scope) returns void`; function `public.reactivate_consent(p_user_id uuid, p_member_id uuid) returns void` (coordinator-only, raises `42501` otherwise).

- [ ] **Step 1: Add the new pgTAP assertions to the existing test file (they will fail — the schema doesn't exist yet)**

Bump the plan count and add a new section. In `supabase/tests/database/rls.test.sql`, change:
```sql
select plan(20);
```
to:
```sql
select plan(34);
```

Then insert this whole block immediately before the line `-- === Simulate no session at all (anon) ===` (i.e. after the existing `redeem_invite_code` assertions, before the final anon-role section):

```sql
-- === Simulate consent tracking: Member A gives consent, then requests withdrawal ===
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-00000000000a')::text, true);

select lives_ok(
  $$ insert into public.consents (user_id, member_id, event) values ('a0000000-0000-0000-0000-00000000000a', 'aa000000-0000-0000-0000-00000000aaaa', 'given') $$,
  'Member A can insert their own consent-given event'
);

select throws_ok(
  $$ insert into public.consents (user_id, member_id, event, scope) values ('a0000000-0000-0000-0000-00000000000a', 'aa000000-0000-0000-0000-00000000aaaa', 'withdrawal_requested', 'self') $$,
  '42501',
  null,
  'Member A cannot insert a withdrawal_requested event directly -- only event=''given'' is allowed via direct client insert'
);

select lives_ok(
  $$ select public.request_consent_withdrawal('aa000000-0000-0000-0000-00000000aaaa', 'self') $$,
  'Member A can call request_consent_withdrawal for their own member record'
);

select is(
  (select consent_status from public.profiles where id = 'a0000000-0000-0000-0000-00000000000a'),
  'withdrawal_pending',
  'request_consent_withdrawal moved Member A''s profile to withdrawal_pending'
);

select is(
  (select count(*)::int from public.consents where user_id = 'a0000000-0000-0000-0000-00000000000a' and event = 'withdrawal_requested' and scope = 'self'),
  1,
  'request_consent_withdrawal logged a withdrawal_requested/self row for Member A'
);

select lives_ok(
  $$ update public.consents set scope = 'all' where user_id = 'a0000000-0000-0000-0000-00000000000a' and event = 'withdrawal_requested' $$,
  'An UPDATE statement against consents does not itself error (no policy just means it matches zero rows)'
);

select is(
  (select scope::text from public.consents where user_id = 'a0000000-0000-0000-0000-00000000000a' and event = 'withdrawal_requested'),
  'self',
  'The consents row is unchanged after the UPDATE attempt -- no update policy exists, so RLS silently filters it to zero affected rows (immutable audit log)'
);

select is(
  (select count(*)::int from public.consents where user_id = 'b0000000-0000-0000-0000-00000000000b'),
  0,
  'Member A gets zero rows querying Member B''s consent history (RLS filters silently)'
);

-- Member B requests withdrawal too, so the coordinator visibility check
-- below has a real member-without-assignment case to prove against.
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'b0000000-0000-0000-0000-00000000000b')::text, true);

select lives_ok(
  $$ select public.request_consent_withdrawal('bb000000-0000-0000-0000-00000000bbbb', 'all') $$,
  'Member B (self-linked to Member B) can also request withdrawal for their own record'
);

-- === Simulate the assigned coordinator's session again, after both withdrawal requests ===
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'c0000000-0000-0000-0000-00000000000c')::text, true);

select is(
  (select count(*)::int from public.consents where user_id in ('a0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-00000000000b')),
  3,
  'Coordinator reads all consent history regardless of assignment -- Member A''s given + withdrawal_requested rows, plus Member B''s withdrawal_requested row'
);

select is(
  (
    select array_agg(id order by id) from public.members
    where id in ('aa000000-0000-0000-0000-00000000aaaa', 'bb000000-0000-0000-0000-00000000bbbb')
  ),
  array['aa000000-0000-0000-0000-00000000aaaa'::uuid, 'bb000000-0000-0000-0000-00000000bbbb'::uuid],
  'The assigned coordinator now also sees Member B (not their assignment) because Member B has a withdrawal_requested consents row -- the narrow coordinator-reads-member-with-withdrawal-request policy'
);

select lives_ok(
  $$ select public.reactivate_consent('a0000000-0000-0000-0000-00000000000a', 'aa000000-0000-0000-0000-00000000aaaa') $$,
  'The coordinator can reactivate Member A''s consent (false-alarm path)'
);

select is(
  (select consent_status from public.profiles where id = 'a0000000-0000-0000-0000-00000000000a'),
  'active',
  'reactivate_consent moved Member A''s profile back to active'
);

-- === Simulate a non-coordinator trying to reactivate someone else's consent ===
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'd0000000-0000-0000-0000-00000000000d')::text, true);

select throws_ok(
  $$ select public.reactivate_consent('b0000000-0000-0000-0000-00000000000b', 'bb000000-0000-0000-0000-00000000bbbb') $$,
  '42501',
  'only coordinators can reactivate consent',
  'A non-coordinator (the family "Son" user) cannot reactivate someone else''s consent'
);

```

That's 14 new assertions (20 + 14 = 34), matching the `plan(34)` set in this step.

- [ ] **Step 2: Run the test suite and confirm it fails**

Run: `cd supabase && supabase test db` (requires local Docker Postgres via `supabase start` — see `docs/superpowers/specs/2026-08-06-ci-cd-design.md` if it's not already running).
Expected: FAIL — errors like `relation "public.consents" does not exist` or `function public.request_consent_withdrawal does not exist`.

- [ ] **Step 3: Write the schema migration**

Create `supabase/migrations/20260810120000_consent_tracking.sql`:
```sql
-- DPDP Act consent tracking: an append-only audit log of consent events
-- (given at signup, withdrawal requested, withdrawal verified/erased by a
-- coordinator) plus a cheap current-state column on profiles so route
-- guards don't need to scan the log on every page load. See
-- docs/superpowers/specs/2026-08-10-consent-and-pii-scrubbing-design.md.

create type public.consent_event as enum ('given', 'withdrawal_requested', 'withdrawal_verified');
create type public.consent_scope as enum ('self', 'all');

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- on delete SET NULL, not CASCADE: the whole point of this table is an
  -- audit trail that survives the events it records. A `scope: 'all'`
  -- erasure deletes the `members` row -- if this FK cascaded, that single
  -- DELETE would wipe out every consents row ever logged for that member
  -- (across every person who was ever linked to it), destroying the exact
  -- audit trail DPDP requires proof of consent/withdrawal via. (Caught in
  -- plan self-review -- the first draft used ON DELETE CASCADE here,
  -- copying the pattern every other member_id FK in this schema uses, but
  -- this table's whole purpose makes that pattern wrong specifically here.)
  member_id uuid references public.members(id) on delete set null, -- null for 'given' at signup (no member linked yet) or after the referenced member is erased
  event public.consent_event not null,
  scope public.consent_scope, -- only set for withdrawal_requested / withdrawal_verified
  policy_version text not null default 'v1',
  created_at timestamptz not null default now()
);
create index consents_user_id_idx on public.consents(user_id);
create index consents_member_id_idx on public.consents(member_id);

alter table public.consents enable row level security;

create policy "user reads own consent history"
  on public.consents for select using (user_id = auth.uid());

create policy "coordinators read all consent history"
  on public.consents for select using (public.is_coordinator());

-- Direct client inserts are restricted to event = 'given' (used once, at
-- signup). withdrawal_requested/withdrawal_verified are written only by
-- request_consent_withdrawal() below and the erase-consent-withdrawal Edge
-- Function, both of which run with table-owner privileges and bypass this
-- policy -- so this restriction only closes off what an ordinary
-- authenticated client can forge directly via supabase-js .insert().
create policy "user inserts own consent-given events"
  on public.consents for insert with check (user_id = auth.uid() and event = 'given');

-- No update/delete policy anywhere on this table -- the log is immutable.

alter table public.profiles
  add column consent_status text not null default 'active'
    check (consent_status in ('active', 'withdrawal_pending'));

-- The only path that can move a profile into 'withdrawal_pending'. Client
-- code never issues a raw UPDATE on profiles.consent_status directly.
create or replace function public.request_consent_withdrawal(p_member_id uuid, p_scope public.consent_scope)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.consents (user_id, member_id, event, scope)
  values (auth.uid(), p_member_id, 'withdrawal_requested', p_scope);

  update public.profiles set consent_status = 'withdrawal_pending' where id = auth.uid();
end;
$$;

-- Coordinator-only: reactivates a profile after confirming a withdrawal
-- request was accidental. Operates on an arbitrary p_user_id (not
-- auth.uid()), so it must self-check the caller's role -- unlike
-- request_consent_withdrawal, which is safe by construction because it
-- only ever touches the caller's own row.
create or replace function public.reactivate_consent(p_user_id uuid, p_member_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_coordinator() then
    raise exception 'only coordinators can reactivate consent' using errcode = '42501';
  end if;

  update public.profiles set consent_status = 'active' where id = p_user_id;

  insert into public.consents (user_id, member_id, event)
  values (p_user_id, p_member_id, 'given');
end;
$$;
```

- [ ] **Step 4: Write the coordinator-visibility migration**

Create `supabase/migrations/20260810120001_coordinator_reads_member_with_withdrawal_request.sql`:
```sql
-- The Admin Consent Requests inbox must show which member a withdrawal
-- request belongs to (name, phone) regardless of whether the viewing
-- coordinator happens to be that member's assigned coordinator -- same
-- reasoning as 20260807040000_coordinator_reads_member_with_sos_alert.sql
-- and 20260807050000_coordinator_reads_member_with_upgrade_lead.sql.
--
-- Scoped to members with at least one withdrawal_requested consents row,
-- not "any coordinator reads any member" -- keeps this as narrow as the
-- two existing precedents.
create policy "any coordinator reads member with withdrawal request"
  on public.members for select using (
    public.is_coordinator()
    and exists (
      select 1 from public.consents c
      where c.member_id = members.id and c.event = 'withdrawal_requested'
    )
  );
```

- [ ] **Step 5: Run the test suite and confirm it passes**

Run: `cd supabase && supabase test db`
Expected: `1..34` with all 34 assertions `ok`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260810120000_consent_tracking.sql supabase/migrations/20260810120001_coordinator_reads_member_with_withdrawal_request.sql supabase/tests/database/rls.test.sql
git commit -m "feat(db): add consent tracking schema, withdrawal RPCs, and coordinator RLS"
```

---

### Task 2: Regenerate `@carebridge/db-types`

**Files:**
- Modify: `packages/db-types/src/database.types.ts`

**Interfaces:**
- Consumes: the schema from Task 1, applied to the local Supabase instance.
- Produces: TypeScript types for `consents`, `profiles.consent_status`, and the two new RPC functions, used by every later task's Supabase queries.

- [ ] **Step 1: Push the migration to local (if `supabase test db` in Task 1 didn't already apply it to your running local stack) and regenerate**

Run:
```bash
cd supabase
supabase db reset   # re-applies all migrations including the two new ones, and re-runs seed.sql
cd ../packages/db-types
supabase gen types typescript --local > src/database.types.ts
```

- [ ] **Step 2: Run the existing type-check test**

Run: `pnpm --filter @carebridge/db-types test`
Expected: PASS — `src/index.test.ts` confirms `members`, `profiles`, `checkins` are still present; the new `consents` table and `consent_status` column don't need their own assertion there (that test only guards against a stale/wrong-project regeneration).

- [ ] **Step 3: Commit**

```bash
git add packages/db-types/src/database.types.ts
git commit -m "chore(db-types): regenerate types for consent tracking schema"
```

---

### Task 3: Wellness — Signup consent checkbox + consent-log insert

**Files:**
- Modify: `apps/wellness/src/pages/Signup.tsx`
- Modify: `apps/wellness/src/pages/Signup.test.tsx`

**Interfaces:**
- Consumes: `supabase.from('consents').insert(...)` (Task 1's schema), `Sentry.captureException` (existing `@sentry/react` dependency, Sentry init itself is wired in Task 7 but `captureException` is a static export that's safe to call regardless of whether `Sentry.init` ran).
- Produces: nothing new consumed by later tasks — this is a leaf change.

- [ ] **Step 1: Write the failing tests**

Add to `apps/wellness/src/pages/Signup.test.tsx`, inside the existing `vi.mock('../lib/supabase', ...)` block, add `from: vi.fn()` alongside `auth: { signUp: vi.fn() }`:
```ts
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
    },
    from: vi.fn(),
  },
}));
```
Add a mock for Sentry near the top of the file, alongside the existing `vi.mock` calls:
```ts
vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
}));
```
Then add these test cases inside the `describe('Signup', ...)` block, after the existing tests:
```ts
  it('disables the submit button until the consent checkbox is checked', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), 'new-user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    expect(screen.getByRole('button', { name: /sign up/i })).toBeDisabled();

    await user.click(screen.getByLabelText(/i agree to care bridge home/i));
    expect(screen.getByRole('button', { name: /sign up/i })).not.toBeDisabled();
  });

  it('logs a consent-given event after a successful signup', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: { id: 'user-1', identities: [{ id: 'identity-1' }] } },
      error: null,
    } as never);
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as never);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), 'new-user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByLabelText(/i agree to care bridge home/i));
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('consents');
      expect(insertMock).toHaveBeenCalledWith({ user_id: 'user-1', event: 'given' });
    });
    expect(mockNavigate).toHaveBeenCalledWith('/link-member');
  });

  it('still navigates to /link-member and reports to Sentry if the consent-log insert fails', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: { id: 'user-1', identities: [{ id: 'identity-1' }] } },
      error: null,
    } as never);
    const consentError = { message: 'insert failed' };
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: consentError }),
    } as never);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), 'new-user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByLabelText(/i agree to care bridge home/i));
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/link-member');
    });
    expect(Sentry.captureException).toHaveBeenCalledWith(consentError);
  });
```
Add the Sentry import at the top of the test file: `import * as Sentry from '@sentry/react';`

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @carebridge/wellness test -- Signup`
Expected: FAIL — no consent checkbox exists yet, `screen.getByLabelText(/i agree to care bridge home/i)` throws.

- [ ] **Step 3: Implement the consent checkbox and consent-log insert**

Replace the full contents of `apps/wellness/src/pages/Signup.tsx`:
```tsx
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { supabase } from '../lib/supabase';

export function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

    setSubmitting(false);

    if (signUpError) {
      // With this project's actual V1 setting ("Confirm email" OFF), a
      // duplicate signup returns a real error -- HTTP 422 with
      // error_code "user_already_exists" (surfaced by supabase-js as
      // `.code`), message "User already registered". Check that first;
      // fall back to matching the message text in case of an SDK version
      // where `.code` isn't populated.
      const isDuplicateEmail =
        signUpError.code === 'user_already_exists' ||
        /already registered/i.test(signUpError.message);

      if (isDuplicateEmail) {
        setError('An account already exists for this email — sign in instead.');
        return;
      }

      setError('Something went wrong creating your account. Please try again.');
      return;
    }

    // Secondary fallback: with "Confirm email" enabled (not this project's
    // current setting), a duplicate signup instead succeeds with an empty
    // `identities` array rather than an error. Harmless to keep checking.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError('An account already exists for this email — sign in instead.');
      return;
    }

    // Log the consent event given at this exact moment. If this write
    // fails, don't strand a successfully created account -- report to
    // Sentry and let signup proceed regardless.
    if (data.user) {
      const { error: consentError } = await supabase
        .from('consents')
        .insert({ user_id: data.user.id, event: 'given' });
      if (consentError) {
        Sentry.captureException(consentError);
      }
    }

    navigate('/link-member');
  };

  return (
    <div className="login">
      <div className="login__art">
        <span className="login__app">
          <svg className="icon">
            <use href="#i-pulse" />
          </svg>
          Wellness App
        </span>
        <h1>Create your account</h1>
        <p>Sign up to link your family&apos;s Care Bridge Home account.</p>
      </div>
      <form className="login__form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
          />
        </div>
        <div className="field field--full">
          <p style={{ fontSize: '13px', marginBottom: '8px' }}>
            Care Bridge Home will collect and use your name, contact details, medical
            information, vitals, medications, and location during SOS alerts to coordinate your
            home care. This is visible to your linked family members and assigned care
            coordinator.
          </p>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(event) => setConsentChecked(event.target.checked)}
            />
            <span>
              I agree to Care Bridge Home collecting and using this health and care-coordination
              data as described above.
            </span>
          </label>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="mbtn mbtn--fill mbtn--block"
          type="submit"
          disabled={submitting || !consentChecked}
        >
          {submitting ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <div className="login__foot">
        <span>
          Already have an account? <Link to="/login">Sign in</Link>
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @carebridge/wellness test -- Signup`
Expected: PASS — all existing tests plus the 3 new ones.

- [ ] **Step 5: Commit**

```bash
git add apps/wellness/src/pages/Signup.tsx apps/wellness/src/pages/Signup.test.tsx
git commit -m "feat(wellness): add consent checkbox and consent-log insert to signup"
```

---

### Task 4: Wellness — AuthProvider exposes `consentStatus`

**Files:**
- Modify: `apps/wellness/src/auth/AuthProvider.tsx`
- Modify: `apps/wellness/src/auth/AuthProvider.test.tsx`

**Interfaces:**
- Produces: `AuthContextValue.consentStatus: 'active' | 'withdrawal_pending' | null` — consumed by Task 5 (`RequireAuth`) and Task 6 (`WithdrawConsent`, to know the selected member's `is_self`, already available via existing `memberLinks`).

- [ ] **Step 1: Write the failing test**

In `apps/wellness/src/auth/AuthProvider.test.tsx`, the existing `mockMemberLinksQuery` helper mocks `supabase.from` with one fixed return shape. Replace it with a version that routes by table name, since we're adding a second query shape:
```ts
function mockSupabaseQueries(
  memberLinkRows: Array<{ member_id: string; relationship_label: string; is_self: boolean }>,
  consentStatus: string | null,
) {
  vi.mocked(supabase.from).mockImplementation((table: string) => {
    if (table === 'member_links') {
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: memberLinkRows, error: null }),
          }),
        }),
      } as never;
    }
    if (table === 'profiles') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: consentStatus ? { consent_status: consentStatus } : null,
                error: null,
              }),
          }),
        }),
      } as never;
    }
    throw new Error(`unexpected table in test: ${table}`);
  });
}
```
Replace every call site of `mockMemberLinksQuery(rows)` in the file with `mockSupabaseQueries(rows, 'active')` (existing tests don't care about consent status, so default it to `'active'`).

Update the `Probe` component to also surface `consentStatus`:
```tsx
function Probe() {
  const { loading, linksLoaded, session, memberLinks, selectedMemberId, consentStatus } =
    useAuth();
  if (loading) return <p>loading</p>;
  return (
    <div>
      <p data-testid="session">{session ? 'has-session' : 'no-session'}</p>
      <p data-testid="links-loaded">{linksLoaded ? 'true' : 'false'}</p>
      <p data-testid="link-count">{memberLinks.length}</p>
      <p data-testid="selected">{selectedMemberId ?? 'none'}</p>
      <p data-testid="consent-status">{consentStatus ?? 'none'}</p>
    </div>
  );
}
```
Add a new test to the `describe('AuthProvider', ...)` block:
```ts
  it('exposes the fetched consent_status alongside member links', async () => {
    mockSupabaseQueries(
      [{ member_id: 'm1', relationship_label: 'Self', is_self: true }],
      'withdrawal_pending',
    );
    const { trigger } = mockAuthStateChange();
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
    } as never);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('session')).toHaveTextContent('no-session'));
    trigger('SIGNED_IN', { user: { id: 'user-1' } });

    await waitFor(() =>
      expect(screen.getByTestId('consent-status')).toHaveTextContent('withdrawal_pending'),
    );
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @carebridge/wellness test -- AuthProvider`
Expected: FAIL — `consentStatus` is `undefined`/`none` never becomes `withdrawal_pending` because `AuthProvider` doesn't fetch it yet, and the other pre-existing tests fail too since `mockMemberLinksQuery` no longer exists (renamed).

- [ ] **Step 3: Implement `consentStatus` fetching in `AuthProvider`**

In `apps/wellness/src/auth/AuthProvider.tsx`, add to `AuthContextValue`:
```ts
export interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  linksLoaded: boolean;
  memberLinks: MemberLink[];
  selectedMemberId: string | null;
  selectMember: (memberId: string) => void;
  refreshMemberLinks: () => Promise<void>;
  consentStatus: 'active' | 'withdrawal_pending' | null;
}
```
Add a fetch helper alongside `fetchMemberLinks`:
```ts
async function fetchConsentStatus(userId: string): Promise<'active' | 'withdrawal_pending' | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('consent_status')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data.consent_status as 'active' | 'withdrawal_pending';
}
```
Add state:
```ts
const [consentStatus, setConsentStatus] = useState<'active' | 'withdrawal_pending' | null>(null);
```
In `applySession`, fetch it alongside `memberLinks` (replace the existing `const links = await fetchMemberLinks(newSession.user.id);` line and everything through `if (!isMounted) return;` right after it):
```ts
      setLinksLoaded(false);
      const [links, status] = await Promise.all([
        fetchMemberLinks(newSession.user.id),
        fetchConsentStatus(newSession.user.id),
      ]);
      if (!isMounted) return;
      setConsentStatus(status);
```
(the rest of `applySession` — the Capacitor Preferences read and `setMemberLinks`/`setSelectedMemberId`/`setLinksLoaded` calls — stays exactly as-is below this).
In the `if (!newSession)` early-return branch, also reset it:
```ts
      if (!newSession) {
        setMemberLinks([]);
        setSelectedMemberId(null);
        setConsentStatus(null);
        setLinksLoaded(true);
        return;
      }
```
Add `consentStatus` to the context value object at the bottom of the component:
```tsx
    <AuthContext.Provider
      value={{
        session,
        loading,
        linksLoaded,
        memberLinks,
        selectedMemberId,
        selectMember,
        refreshMemberLinks,
        consentStatus,
      }}
    >
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @carebridge/wellness test -- AuthProvider`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/wellness/src/auth/AuthProvider.tsx apps/wellness/src/auth/AuthProvider.test.tsx
git commit -m "feat(wellness): expose consent_status from AuthProvider"
```

---

### Task 5: Wellness — `RequireAuth` blocks on `withdrawal_pending`

**Files:**
- Modify: `apps/wellness/src/auth/RequireAuth.tsx`
- Modify: `apps/wellness/src/auth/RequireAuth.test.tsx`

**Interfaces:**
- Consumes: `AuthContextValue.consentStatus` (Task 4).
- Produces: nothing new consumed by later tasks.

- [ ] **Step 1: Write the failing test**

In `apps/wellness/src/auth/RequireAuth.test.tsx`, every existing `vi.mocked(useAuth).mockReturnValue({...})` call is missing the new `consentStatus` field — add `consentStatus: 'active'` to every one of them (so existing behavior is unaffected by default). Then add a new test to `describe('RequireAuth', ...)`:
```ts
  it('shows the consent-pending screen instead of the app when consentStatus is withdrawal_pending', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {},
      loading: false,
      linksLoaded: true,
      memberLinks: [{ memberId: 'm1', relationshipLabel: 'Self', isSelf: true }],
      consentStatus: 'withdrawal_pending',
    } as never);
    renderGuard(<RequireAuth />, '/protected');
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    expect(screen.getByText(/withdrawal request received/i)).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @carebridge/wellness test -- RequireAuth`
Expected: FAIL — every test errors because `consentStatus` isn't destructured/used yet in the guard components, and the new test can't find the pending-screen text since `RequireAuth` doesn't render it.

- [ ] **Step 3: Implement the gate**

Replace the full contents of `apps/wellness/src/auth/RequireAuth.tsx`:
```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';

function LoadingScreen() {
  return (
    <main className="content">
      <p className="t-body-m">Loading…</p>
    </main>
  );
}

function ConsentPendingScreen() {
  return (
    <div
      className="vbody"
      style={{ alignItems: 'center', textAlign: 'center', justifyContent: 'center' }}
    >
      <h2>Withdrawal request received</h2>
      <p style={{ maxWidth: '280px', margin: '0 auto' }}>
        Your coordinator will contact you to confirm this wasn&apos;t accidental before anything
        is removed.
      </p>
      <button
        type="button"
        className="mbtn mbtn--ghost mbtn--block"
        style={{ marginTop: '16px' }}
        onClick={() => supabase.auth.signOut()}
      >
        Sign out
      </button>
    </div>
  );
}

export function RequireSession() {
  const { session, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RequireAuth() {
  const { session, loading, linksLoaded, memberLinks, consentStatus } = useAuth();
  if (loading || (session && !linksLoaded)) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (consentStatus === 'withdrawal_pending') return <ConsentPendingScreen />;
  if (memberLinks.length === 0) return <Navigate to="/link-member" replace />;
  return <Outlet />;
}

export function RedirectIfAuthenticated() {
  const { session, loading, linksLoaded, memberLinks } = useAuth();
  if (loading || (session && !linksLoaded)) return <LoadingScreen />;
  if (session) {
    return <Navigate to={memberLinks.length === 0 ? '/link-member' : '/'} replace />;
  }
  return <Outlet />;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @carebridge/wellness test -- RequireAuth`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/wellness/src/auth/RequireAuth.tsx apps/wellness/src/auth/RequireAuth.test.tsx
git commit -m "feat(wellness): block app access while a consent withdrawal is pending"
```

---

### Task 6: Wellness — withdrawal flow UI

**Files:**
- Create: `apps/wellness/src/pages/WithdrawConsent.tsx`
- Create: `apps/wellness/src/pages/WithdrawConsent.test.tsx`
- Create: `apps/wellness/src/pages/WithdrawalReceived.tsx`
- Modify: `apps/wellness/src/pages/Profile.tsx`
- Modify: `apps/wellness/src/main.tsx`

**Interfaces:**
- Consumes: `supabase.rpc('request_consent_withdrawal', { p_member_id, p_scope })` (Task 1), `useAuth().selectedMemberId` / `.memberLinks` (existing).
- Produces: routes `/withdraw-consent` and `/consent-withdrawn`, consumed only by navigation (no other task imports these components).

- [ ] **Step 1: Write the failing test**

Create `apps/wellness/src/pages/WithdrawConsent.test.tsx`:
```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WithdrawConsent } from './WithdrawConsent';
import { useAuth } from '../auth/useAuth';
import { supabase } from '../lib/supabase';

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    auth: { signOut: vi.fn() },
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('WithdrawConsent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      selectedMemberId: 'member-1',
      memberLinks: [{ memberId: 'member-1', relationshipLabel: 'Self', isSelf: true }],
    } as never);
  });

  it('keeps the submit button disabled until WITHDRAW is typed', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <WithdrawConsent />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /withdraw consent/i })).toBeDisabled();
    await user.type(screen.getByLabelText(/type withdraw to confirm/i), 'WITHDRAW');
    expect(screen.getByRole('button', { name: /withdraw consent/i })).not.toBeDisabled();
  });

  it('calls the RPC with the chosen scope, signs out, and navigates on success', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ error: null } as never);
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as never);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <WithdrawConsent />
      </MemoryRouter>,
    );

    await user.click(screen.getByLabelText(/withdraw for everyone linked to this record/i));
    await user.type(screen.getByLabelText(/type withdraw to confirm/i), 'WITHDRAW');
    await user.click(screen.getByRole('button', { name: /withdraw consent/i }));

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('request_consent_withdrawal', {
        p_member_id: 'member-1',
        p_scope: 'all',
      });
    });
    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/consent-withdrawn', { replace: true });
  });

  it('shows an error and does not sign out if the RPC fails', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ error: { message: 'boom' } } as never);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <WithdrawConsent />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/type withdraw to confirm/i), 'WITHDRAW');
    await user.click(screen.getByRole('button', { name: /withdraw consent/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });

  it('warns about family members losing monitoring when the selected member is_self', () => {
    render(
      <MemoryRouter>
        <WithdrawConsent />
      </MemoryRouter>,
    );
    expect(screen.getByText(/pauses monitoring for anyone linked to your account/i)).toBeInTheDocument();
  });

  it('does not show the family-monitoring warning for a non-self linked account', () => {
    vi.mocked(useAuth).mockReturnValue({
      selectedMemberId: 'member-1',
      memberLinks: [{ memberId: 'member-1', relationshipLabel: 'Daughter', isSelf: false }],
    } as never);
    render(
      <MemoryRouter>
        <WithdrawConsent />
      </MemoryRouter>,
    );
    expect(
      screen.queryByText(/pauses monitoring for anyone linked to your account/i),
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @carebridge/wellness test -- WithdrawConsent`
Expected: FAIL — `./WithdrawConsent` module doesn't exist.

- [ ] **Step 3: Implement `WithdrawConsent.tsx`**

Create `apps/wellness/src/pages/WithdrawConsent.tsx`:
```tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';

type Status = 'confirm' | 'submitting' | 'error';
type Scope = 'self' | 'all';

export function WithdrawConsent() {
  const { selectedMemberId, memberLinks } = useAuth();
  const navigate = useNavigate();
  const [scope, setScope] = useState<Scope>('self');
  const [confirmText, setConfirmText] = useState('');
  const [status, setStatus] = useState<Status>('confirm');

  const selectedLink = memberLinks.find((link) => link.memberId === selectedMemberId);
  const isSelf = selectedLink?.isSelf ?? false;
  const canSubmit = confirmText.trim().toUpperCase() === 'WITHDRAW';

  const handleWithdraw = async () => {
    if (!selectedMemberId || !canSubmit) return;
    setStatus('submitting');
    const { error: rpcError } = await supabase.rpc('request_consent_withdrawal', {
      p_member_id: selectedMemberId,
      p_scope: scope,
    });
    if (rpcError) {
      setStatus('error');
      return;
    }
    await supabase.auth.signOut();
    navigate('/consent-withdrawn', { replace: true });
  };

  return (
    <>
      <div className="tbar">
        <Link className="backbtn" to="/profile" aria-label="Back to profile">
          <span className="icon">
            <svg>
              <use href="#i-chevron" />
            </svg>
          </span>
        </Link>
        <div className="tbar__title">
          <h1 className="sm">Withdraw consent</h1>
        </div>
      </div>

      <div className="vbody has-cta">
        <p>
          Withdrawing consent stops Care Bridge Home and your care team from receiving your
          health updates.
          {isSelf &&
            ' Because this is your own record, it also pauses monitoring for anyone linked to your account.'}{' '}
          This can&apos;t be undone in the app — you&apos;d need to contact your coordinator to
          resume.
        </p>

        <div className="field field--full" style={{ marginTop: '16px' }}>
          <label>What should be withdrawn?</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <input
              type="radio"
              name="withdraw-scope"
              value="self"
              checked={scope === 'self'}
              onChange={() => setScope('self')}
            />
            Just remove my own access
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <input
              type="radio"
              name="withdraw-scope"
              value="all"
              checked={scope === 'all'}
              onChange={() => setScope('all')}
            />
            Withdraw for everyone linked to this record
          </label>
        </div>

        <div className="field field--full" style={{ marginTop: '16px' }}>
          <label htmlFor="confirm-text">Type WITHDRAW to confirm</label>
          <input
            id="confirm-text"
            type="text"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
          />
        </div>

        {status === 'error' && (
          <p className="form-error" role="alert">
            Something went wrong submitting your request — try again.
          </p>
        )}
      </div>

      <div className="cta-bar">
        <button
          type="button"
          className="mbtn mbtn--danger mbtn--block"
          disabled={!canSubmit || status === 'submitting'}
          onClick={handleWithdraw}
        >
          {status === 'submitting' ? 'Submitting…' : 'Withdraw consent'}
        </button>
        <Link to="/profile">
          <button
            type="button"
            className="mbtn mbtn--ghost mbtn--block"
            style={{ marginTop: '8px' }}
          >
            Cancel
          </button>
        </Link>
      </div>
    </>
  );
}
```

Create `apps/wellness/src/pages/WithdrawalReceived.tsx`:
```tsx
import { Link } from 'react-router-dom';

export function WithdrawalReceived() {
  return (
    <div
      className="vbody"
      style={{ alignItems: 'center', textAlign: 'center', justifyContent: 'center' }}
    >
      <h2>Request received</h2>
      <p style={{ maxWidth: '280px', margin: '0 auto' }}>
        You&apos;ve been signed out. Your coordinator will contact you to confirm this
        wasn&apos;t accidental before anything is removed.
      </p>
      <Link to="/login">
        <button
          type="button"
          className="mbtn mbtn--ghost mbtn--block"
          style={{ marginTop: '16px' }}
        >
          Back to sign in
        </button>
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @carebridge/wellness test -- WithdrawConsent`
Expected: PASS.

- [ ] **Step 5: Wire the routes and the Profile entry point**

In `apps/wellness/src/main.tsx`, add imports:
```tsx
import { WithdrawConsent } from './pages/WithdrawConsent';
import { WithdrawalReceived } from './pages/WithdrawalReceived';
```
Add a standalone (ungated) route alongside `/login`/`/signup`, and a gated route inside the existing `<Route element={<AppShell />}>` block:
```tsx
          <Route path="/consent-withdrawn" element={<WithdrawalReceived />} />
          <Route element={<RedirectIfAuthenticated />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>
          <Route element={<RequireSession />}>
            <Route path="/link-member" element={<LinkMember />} />
          </Route>
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<Home />} />
              <Route path="/check-in" element={<CheckIn />} />
              <Route path="/health" element={<Health />} />
              <Route path="/medications" element={<Medications />} />
              <Route path="/care" element={<Care />} />
              <Route path="/more" element={<More />} />
              <Route path="/sos" element={<Sos />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/education" element={<Education />} />
              <Route path="/preventive-plan" element={<PreventivePlan />} />
              <Route path="/withdraw-consent" element={<WithdrawConsent />} />
            </Route>
          </Route>
```

In `apps/wellness/src/pages/Profile.tsx`, add the import `import { Link } from 'react-router-dom';` if not already present (it already is, per the existing file), and add this block right before the closing `</>` / at the end of the component's returned JSX (after the medical-profile form):
```tsx
      <div className="card" style={{ marginTop: '24px' }}>
        <Link to="/withdraw-consent" style={{ color: 'var(--danger)', fontSize: '13px' }}>
          Withdraw consent
        </Link>
      </div>
```

- [ ] **Step 6: Run the full wellness test suite and build**

Run: `pnpm --filter @carebridge/wellness test && pnpm --filter @carebridge/wellness build`
Expected: PASS / builds clean.

- [ ] **Step 7: Commit**

```bash
git add apps/wellness/src/pages/WithdrawConsent.tsx apps/wellness/src/pages/WithdrawConsent.test.tsx apps/wellness/src/pages/WithdrawalReceived.tsx apps/wellness/src/pages/Profile.tsx apps/wellness/src/main.tsx
git commit -m "feat(wellness): add consent withdrawal flow and entry point in Profile"
```

---

### Task 7: Wellness — Sentry PII scrubbing

**Files:**
- Modify: `apps/wellness/src/lib/sentry.ts`
- Create: `apps/wellness/src/lib/sentry.test.ts`

**Interfaces:**
- Produces: `sanitizeEvent<T>(event: T): T` — a pure, exported function, not consumed by any other task (each app gets its own copy per the approved spec).

- [ ] **Step 1: Write the failing test**

Create `apps/wellness/src/lib/sentry.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { sanitizeEvent } from './sentry';

describe('sanitizeEvent', () => {
  it('redacts known PII keys from event.extra', () => {
    const event = {
      extra: { full_name: 'Jane Doe', phone: '+91123', unrelated: 'keep me' },
    };
    expect(sanitizeEvent(event).extra).toEqual({
      full_name: '[redacted]',
      phone: '[redacted]',
      unrelated: 'keep me',
    });
  });

  it('redacts PII keys inside breadcrumb data without dropping other breadcrumb fields', () => {
    const event = {
      breadcrumbs: [
        { message: 'clicked', category: 'ui.click', data: { email: 'a@b.com', action: 'submit' } },
      ],
    };
    const result = sanitizeEvent(event);
    expect(result.breadcrumbs?.[0]).toEqual({
      message: 'clicked',
      category: 'ui.click',
      data: { email: '[redacted]', action: 'submit' },
    });
  });

  it('strips user email and ip_address but keeps other user fields', () => {
    const event = { user: { id: 'user-1', email: 'a@b.com', ip_address: '1.2.3.4' } };
    expect(sanitizeEvent(event).user).toEqual({ id: 'user-1' });
  });

  it('strips Authorization and Cookie request headers', () => {
    const event = {
      request: { headers: { Authorization: 'Bearer x', Cookie: 'session=y', 'User-Agent': 'test' } },
    };
    expect(sanitizeEvent(event).request?.headers).toEqual({ 'User-Agent': 'test' });
  });

  it('leaves an event with none of the above fields untouched', () => {
    const event = { message: 'some error' };
    expect(sanitizeEvent(event)).toEqual({ message: 'some error' });
  });

  it('recurses into nested objects and arrays within extra', () => {
    const event = {
      extra: { patient: { full_name: 'Jane', history: [{ notes: 'private' }] } },
    };
    expect(sanitizeEvent(event).extra).toEqual({
      patient: { full_name: '[redacted]', history: [{ notes: '[redacted]' }] },
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @carebridge/wellness test -- sentry`
Expected: FAIL — `sanitizeEvent` isn't exported yet.

- [ ] **Step 3: Implement `sanitizeEvent` and wire it into `Sentry.init`**

Replace the full contents of `apps/wellness/src/lib/sentry.ts`:
```ts
import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN;

const PII_KEYS = [
  'full_name',
  'phone',
  'email',
  'address',
  'conditions',
  'conditions_other',
  'allergies',
  'notes',
  'emergency_contact_name',
  'emergency_contact_phone',
];

interface ScrubbableEvent {
  user?: { email?: string; ip_address?: string; [key: string]: unknown };
  request?: { headers?: Record<string, string> };
  extra?: Record<string, unknown>;
  breadcrumbs?: Array<{ data?: Record<string, unknown>; [key: string]: unknown }>;
  [key: string]: unknown;
}

function scrubValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrubValue);
  if (value && typeof value === 'object') return scrubObject(value as Record<string, unknown>);
  return value;
}

function scrubObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = PII_KEYS.includes(key) ? '[redacted]' : scrubValue(value);
  }
  return result;
}

// Strips known-PII fields from a Sentry event before it leaves the device --
// stack traces and error messages are left untouched, since scrubbing those
// would defeat the point of having Sentry. Exported (not just used inline in
// beforeSend) so it's unit-testable as plain data in/data out, without
// needing to mock Sentry.init's side effects.
export function sanitizeEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
  }
  if (event.request?.headers) {
    delete event.request.headers['Authorization'];
    delete event.request.headers['Cookie'];
  }
  if (event.extra) {
    event.extra = scrubObject(event.extra);
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) =>
      crumb.data ? { ...crumb, data: scrubObject(crumb.data) } : crumb,
    );
  }
  return event;
}

if (dsn) {
  Sentry.init({
    dsn,
    beforeSend: sanitizeEvent,
  });
}
```
`Sentry.init`'s `beforeSend` option expects `(event: Sentry.ErrorEvent, hint: EventHint) => ...` (confirmed against the installed `@sentry/core@10.69.0` type definitions). `sanitizeEvent`'s generic `<T extends ScrubbableEvent>` signature is structurally compatible since every field it touches (`user`, `request.headers`, `extra`, `breadcrumbs`) exists as an optional field on the real `Event` type. If `pnpm build` in Step 4 surfaces a type mismatch here anyway (SDK type surfaces do shift between versions), the fix is a local cast at the call site — `beforeSend: sanitizeEvent as Sentry.BrowserOptions['beforeSend']` — not a redesign of `sanitizeEvent` itself.

- [ ] **Step 4: Run the tests and the build to verify they pass**

Run: `pnpm --filter @carebridge/wellness test -- sentry && pnpm --filter @carebridge/wellness build`
Expected: PASS / builds clean. If the build step surfaces a `beforeSend` type error, apply the cast noted in Step 3 and rebuild.

- [ ] **Step 5: Commit**

```bash
git add apps/wellness/src/lib/sentry.ts apps/wellness/src/lib/sentry.test.ts
git commit -m "feat(wellness): scrub PII from Sentry events before send"
```

---

### Task 8: Admin — Sentry PII scrubbing

**Files:**
- Modify: `apps/admin/src/lib/sentry.ts`
- Create: `apps/admin/src/lib/sentry.test.ts`

**Interfaces:**
- Identical to Task 7, duplicated per-app per the approved spec (not shared).

- [ ] **Step 1: Write the failing test**

Create `apps/admin/src/lib/sentry.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { sanitizeEvent } from './sentry';

describe('sanitizeEvent', () => {
  it('redacts known PII keys from event.extra', () => {
    const event = {
      extra: { full_name: 'Jane Doe', phone: '+91123', unrelated: 'keep me' },
    };
    expect(sanitizeEvent(event).extra).toEqual({
      full_name: '[redacted]',
      phone: '[redacted]',
      unrelated: 'keep me',
    });
  });

  it('redacts PII keys inside breadcrumb data without dropping other breadcrumb fields', () => {
    const event = {
      breadcrumbs: [
        { message: 'clicked', category: 'ui.click', data: { email: 'a@b.com', action: 'submit' } },
      ],
    };
    const result = sanitizeEvent(event);
    expect(result.breadcrumbs?.[0]).toEqual({
      message: 'clicked',
      category: 'ui.click',
      data: { email: '[redacted]', action: 'submit' },
    });
  });

  it('strips user email and ip_address but keeps other user fields', () => {
    const event = { user: { id: 'user-1', email: 'a@b.com', ip_address: '1.2.3.4' } };
    expect(sanitizeEvent(event).user).toEqual({ id: 'user-1' });
  });

  it('strips Authorization and Cookie request headers', () => {
    const event = {
      request: { headers: { Authorization: 'Bearer x', Cookie: 'session=y', 'User-Agent': 'test' } },
    };
    expect(sanitizeEvent(event).request?.headers).toEqual({ 'User-Agent': 'test' });
  });

  it('leaves an event with none of the above fields untouched', () => {
    const event = { message: 'some error' };
    expect(sanitizeEvent(event)).toEqual({ message: 'some error' });
  });

  it('recurses into nested objects and arrays within extra', () => {
    const event = {
      extra: { patient: { full_name: 'Jane', history: [{ notes: 'private' }] } },
    };
    expect(sanitizeEvent(event).extra).toEqual({
      patient: { full_name: '[redacted]', history: [{ notes: '[redacted]' }] },
    });
  });
});
```
(Same test cases as `apps/wellness/src/lib/sentry.test.ts` from Task 7 — the two apps' scrubbing behavior must be identical, so the coverage is deliberately duplicated, not shared.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @carebridge/admin test -- sentry`
Expected: FAIL — `sanitizeEvent` isn't exported yet.

- [ ] **Step 3: Implement `sanitizeEvent` in the admin app**

Replace the full contents of `apps/admin/src/lib/sentry.ts`:
```ts
import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN;

const PII_KEYS = [
  'full_name',
  'phone',
  'email',
  'address',
  'conditions',
  'conditions_other',
  'allergies',
  'notes',
  'emergency_contact_name',
  'emergency_contact_phone',
];

interface ScrubbableEvent {
  user?: { email?: string; ip_address?: string; [key: string]: unknown };
  request?: { headers?: Record<string, string> };
  extra?: Record<string, unknown>;
  breadcrumbs?: Array<{ data?: Record<string, unknown>; [key: string]: unknown }>;
  [key: string]: unknown;
}

function scrubValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrubValue);
  if (value && typeof value === 'object') return scrubObject(value as Record<string, unknown>);
  return value;
}

function scrubObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = PII_KEYS.includes(key) ? '[redacted]' : scrubValue(value);
  }
  return result;
}

// Strips known-PII fields from a Sentry event before it leaves the device --
// stack traces and error messages are left untouched, since scrubbing those
// would defeat the point of having Sentry. Exported (not just used inline in
// beforeSend) so it's unit-testable as plain data in/data out, without
// needing to mock Sentry.init's side effects.
export function sanitizeEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
  }
  if (event.request?.headers) {
    delete event.request.headers['Authorization'];
    delete event.request.headers['Cookie'];
  }
  if (event.extra) {
    event.extra = scrubObject(event.extra);
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) =>
      crumb.data ? { ...crumb, data: scrubObject(crumb.data) } : crumb,
    );
  }
  return event;
}

if (dsn) {
  Sentry.init({
    dsn,
    beforeSend: sanitizeEvent,
  });
}
```
Same `beforeSend` type-compatibility note as Task 7, Step 3 applies here too: if `pnpm build` surfaces a mismatch, cast at the call site (`beforeSend: sanitizeEvent as Sentry.BrowserOptions['beforeSend']`) rather than redesigning `sanitizeEvent`.

- [ ] **Step 4: Run the tests and the build to verify they pass**

Run: `pnpm --filter @carebridge/admin test -- sentry && pnpm --filter @carebridge/admin build`
Expected: PASS / builds clean (apply the same `beforeSend` cast fallback as Task 7 if needed).

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/sentry.ts apps/admin/src/lib/sentry.test.ts
git commit -m "feat(admin): scrub PII from Sentry events before send"
```

---

### Task 9: Edge Function — `erase-consent-withdrawal`

**Files:**
- Create: `supabase/functions/erase-consent-withdrawal/index.ts`

**Interfaces:**
- Consumes: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (auto-injected by the Supabase Edge Functions runtime, no manual secret configuration needed — same as any Supabase-hosted function).
- Produces: an HTTP endpoint invoked by Task 11 via `supabase.functions.invoke('erase-consent-withdrawal', { body: { member_id, requester_user_id, scope } })`.

This is the first Edge Function in this repo (`supabase/functions/` doesn't exist yet), and it isn't unit-testable the same way the rest of this stack is — there's no existing Edge Function test harness. Task 12 covers manual verification against the local stack before this is considered shippable.

- [ ] **Step 1: Create the function directory and file**

```bash
mkdir -p supabase/functions/erase-consent-withdrawal
```

Create `supabase/functions/erase-consent-withdrawal/index.ts`:
```ts
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
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

  // Verify the caller's JWT and role using an RLS-respecting client first --
  // confirms who is calling and that they're a coordinator before the
  // service-role client below does anything privileged.
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
  if (callerProfile?.role !== 'coordinator') {
    return new Response(JSON.stringify({ error: 'coordinator role required' }), {
      status: 403,
      headers: corsHeaders,
    });
  }

  const body = await req.json();
  const memberId: string | undefined = body.member_id;
  const requesterUserId: string | undefined = body.requester_user_id;
  const scope: 'self' | 'all' | undefined = body.scope;

  if (!memberId || !requesterUserId || (scope !== 'self' && scope !== 'all')) {
    return new Response(
      JSON.stringify({
        error: 'member_id, requester_user_id, and scope (self|all) are required',
      }),
      { status: 400, headers: corsHeaders },
    );
  }

  // Elevated client for the actual erasure -- bypasses RLS by design, since
  // this whole endpoint is a coordinator-authorized action already gated
  // above.
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Log the verification BEFORE deleting anything -- consents.user_id has
  // `on delete cascade`, so logging this after deleteUser() would erase the
  // very audit row meant to record that the erasure happened.
  await adminClient.from('consents').insert({
    user_id: requesterUserId,
    member_id: memberId,
    event: 'withdrawal_verified',
    scope,
  });

  if (scope === 'self') {
    // profiles.id -> auth.users(id) and member_links.user_id -> auth.users(id)
    // are both `on delete cascade` -- deleting the auth user is enough, the
    // rest cascades automatically. The patient's `members` row and other
    // linked accounts are untouched.
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(requesterUserId);
    if (deleteUserError) {
      return new Response(JSON.stringify({ error: deleteUserError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }
    return new Response(JSON.stringify({ ok: true, scope: 'self' }), {
      status: 200,
      headers: corsHeaders,
    });
  }

  // scope === 'all': every clinical/operational table with a member_id FK
  // already cascades from `members` (verified against every migration in
  // supabase/migrations/ -- checkins, vitals_readings, glucose_readings,
  // wearable_readings, medication_logs, medications, med_stock, sos_alerts,
  // preventive_plan_goals, care_team, care_assignments, documents (table
  // rows), member_links, member_invites are all `on delete cascade` from
  // members). Deleting the members row handles all of that in one
  // statement. `consents` is the deliberate exception -- its member_id FK
  // is `on delete set null`, not cascade, specifically so this erasure
  // doesn't destroy its own audit trail (see the migration in Task 1).
  // Two other things this DELETE does NOT reach: the actual Storage blobs
  // behind any documents rows (no DB-level FK to storage.objects), and the
  // linked accounts' auth.users logins.
  const { data: docs } = await adminClient
    .from('documents')
    .select('storage_path')
    .eq('member_id', memberId);
  const storagePaths = (docs ?? []).map((doc: { storage_path: string }) => doc.storage_path);
  if (storagePaths.length > 0) {
    await adminClient.storage.from('documents').remove(storagePaths);
  }

  const { data: links } = await adminClient
    .from('member_links')
    .select('user_id')
    .eq('member_id', memberId);
  const linkedUserIds = (links ?? []).map((link: { user_id: string }) => link.user_id);

  const { error: deleteMemberError } = await adminClient
    .from('members')
    .delete()
    .eq('id', memberId);
  if (deleteMemberError) {
    return new Response(JSON.stringify({ error: deleteMemberError.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  for (const userId of linkedUserIds) {
    await adminClient.auth.admin.deleteUser(userId);
  }

  return new Response(
    JSON.stringify({ ok: true, scope: 'all', erased_accounts: linkedUserIds.length }),
    { status: 200, headers: corsHeaders },
  );
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/erase-consent-withdrawal/index.ts
git commit -m "feat(functions): add erase-consent-withdrawal Edge Function"
```

(Deployment to the hosted project and local manual verification happen in Task 12, after the Admin UI in Task 11 exists to actually call this.)

---

### Task 10: Admin — `consentRequests.ts` lib

**Files:**
- Create: `apps/admin/src/lib/consentRequests.ts`
- Create: `apps/admin/src/lib/consentRequests.test.ts`

**Interfaces:**
- Produces: `scopeLabel(scope: ConsentScope): string`, `sortPending<T extends PendingRequestLike>(rows: T[]): T[]`, `sortHistoryRows<T extends HistoryRowLike>(rows: T[]): T[]` — consumed by Task 11's `ConsentRequests.tsx`.

- [ ] **Step 1: Write the failing test**

Create `apps/admin/src/lib/consentRequests.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { scopeLabel, sortHistoryRows, sortPending } from './consentRequests';

describe('scopeLabel', () => {
  it('labels self scope', () => {
    expect(scopeLabel('self')).toBe('Just their own access');
  });

  it('labels all scope', () => {
    expect(scopeLabel('all')).toBe('Everyone linked to this record');
  });
});

describe('sortPending', () => {
  it('sorts oldest requested_at first', () => {
    const rows = [
      { id: 'a', requested_at: '2026-08-10T10:00:00Z' },
      { id: 'b', requested_at: '2026-08-10T08:00:00Z' },
      { id: 'c', requested_at: '2026-08-10T09:00:00Z' },
    ];
    expect(sortPending(rows).map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('sortHistoryRows', () => {
  it('sorts most recent resolved_at first', () => {
    const rows = [
      { id: 'a', resolved_at: '2026-08-10T10:00:00Z' },
      { id: 'b', resolved_at: '2026-08-10T08:00:00Z' },
      { id: 'c', resolved_at: '2026-08-10T09:00:00Z' },
    ];
    expect(sortHistoryRows(rows).map((r) => r.id)).toEqual(['a', 'c', 'b']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @carebridge/admin test -- consentRequests`
Expected: FAIL — `./consentRequests` module doesn't exist.

- [ ] **Step 3: Implement the lib**

Create `apps/admin/src/lib/consentRequests.ts`:
```ts
export type ConsentScope = 'self' | 'all';

export function scopeLabel(scope: ConsentScope): string {
  return scope === 'all' ? 'Everyone linked to this record' : 'Just their own access';
}

export interface PendingRequestLike {
  requested_at: string;
}

// Oldest first -- the longest-waiting request is the most overdue for a callback.
export function sortPending<T extends PendingRequestLike>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.requested_at.localeCompare(b.requested_at));
}

export interface HistoryRowLike {
  resolved_at: string;
}

// Most recent first -- history is a log, read newest-to-oldest.
export function sortHistoryRows<T extends HistoryRowLike>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.resolved_at.localeCompare(a.resolved_at));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @carebridge/admin test -- consentRequests`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/consentRequests.ts apps/admin/src/lib/consentRequests.test.ts
git commit -m "feat(admin): add consentRequests lib (scope labels, sorting)"
```

---

### Task 11: Admin — Consent Requests inbox page

**Files:**
- Create: `apps/admin/src/pages/ConsentRequests.tsx`
- Create: `apps/admin/src/pages/ConsentRequests.test.tsx`
- Modify: `apps/admin/src/App.tsx`
- Modify: `apps/admin/src/shell/AdminShell.tsx`

**Interfaces:**
- Consumes: `scopeLabel`/`sortPending`/`sortHistoryRows` (Task 10), `supabase.rpc('reactivate_consent', {...})` (Task 1), `supabase.functions.invoke('erase-consent-withdrawal', {...})` (Task 9).

- [ ] **Step 1: Write the failing test**

Create `apps/admin/src/pages/ConsentRequests.test.tsx`:
```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsentRequests } from './ConsentRequests';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

function mockQueries({
  pendingProfiles = [] as Array<{ id: string; full_name: string | null; email: string | null }>,
  requestedConsents = [] as Array<{
    user_id: string;
    member_id: string;
    scope: string;
    created_at: string;
    members: { full_name: string } | null;
  }>,
  historyConsents = [] as Array<{
    id: string;
    user_id: string;
    member_id: string | null;
    event: string;
    scope: string | null;
    created_at: string;
    members: { full_name: string } | null;
  }>,
} = {}) {
  vi.mocked(supabase.from).mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: pendingProfiles, error: null }),
        }),
      } as never;
    }
    if (table === 'consents') {
      return {
        select: () => ({
          eq: (col: string) => {
            if (col === 'event') {
              return {
                in: () => ({
                  order: () => Promise.resolve({ data: requestedConsents, error: null }),
                }),
                order: () => Promise.resolve({ data: historyConsents, error: null }),
              };
            }
            return { order: () => Promise.resolve({ data: [], error: null }) };
          },
          in: () => ({
            order: () => Promise.resolve({ data: requestedConsents, error: null }),
          }),
        }),
      } as never;
    }
    throw new Error(`unexpected table in test: ${table}`);
  });
}

describe('ConsentRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an empty state when there are no pending requests', async () => {
    mockQueries();
    render(<ConsentRequests />);
    expect(await screen.findByText(/no pending consent requests/i)).toBeInTheDocument();
  });

  it('lists a pending request with the requester, member, and scope', async () => {
    mockQueries({
      pendingProfiles: [{ id: 'user-1', full_name: 'Jane Doe', email: 'jane@example.com' }],
      requestedConsents: [
        {
          user_id: 'user-1',
          member_id: 'member-1',
          scope: 'all',
          created_at: '2026-08-10T10:00:00Z',
          members: { full_name: 'John Doe' },
        },
      ],
    });
    render(<ConsentRequests />);

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Everyone linked to this record')).toBeInTheDocument();
  });

  it('reactivates via the RPC when "False alarm" is confirmed', async () => {
    mockQueries({
      pendingProfiles: [{ id: 'user-1', full_name: 'Jane Doe', email: 'jane@example.com' }],
      requestedConsents: [
        {
          user_id: 'user-1',
          member_id: 'member-1',
          scope: 'self',
          created_at: '2026-08-10T10:00:00Z',
          members: { full_name: 'John Doe' },
        },
      ],
    });
    vi.mocked(supabase.rpc).mockResolvedValue({ error: null } as never);
    const user = userEvent.setup();

    render(<ConsentRequests />);
    await screen.findByText('Jane Doe');

    await user.click(screen.getByRole('button', { name: /false alarm/i }));

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('reactivate_consent', {
        p_user_id: 'user-1',
        p_member_id: 'member-1',
      });
    });
  });

  it('invokes the erasure Edge Function after typed confirmation on "Verified — erase permanently"', async () => {
    mockQueries({
      pendingProfiles: [{ id: 'user-1', full_name: 'Jane Doe', email: 'jane@example.com' }],
      requestedConsents: [
        {
          user_id: 'user-1',
          member_id: 'member-1',
          scope: 'all',
          created_at: '2026-08-10T10:00:00Z',
          members: { full_name: 'John Doe' },
        },
      ],
    });
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ error: null } as never);
    const user = userEvent.setup();

    render(<ConsentRequests />);
    await screen.findByText('Jane Doe');

    await user.click(screen.getByRole('button', { name: /verified.*erase permanently/i }));
    await user.type(screen.getByLabelText(/type withdraw to confirm/i), 'WITHDRAW');
    await user.click(screen.getByRole('button', { name: /confirm erasure/i }));

    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith('erase-consent-withdrawal', {
        body: { member_id: 'member-1', requester_user_id: 'user-1', scope: 'all' },
      });
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @carebridge/admin test -- ConsentRequests`
Expected: FAIL — `./ConsentRequests` module doesn't exist.

- [ ] **Step 3: Implement `ConsentRequests.tsx`**

Create `apps/admin/src/pages/ConsentRequests.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { scopeLabel, sortHistoryRows, sortPending, type ConsentScope } from '../lib/consentRequests';

interface PendingRow {
  user_id: string;
  member_id: string;
  scope: ConsentScope;
  requested_at: string;
  requester_name: string;
  requester_email: string;
  member_name: string;
}

interface HistoryRow {
  id: string;
  resolved_at: string;
  requester_name: string;
  member_name: string;
  outcome: 'reactivated' | 'erased';
}

const REFRESH_INTERVAL_MS = 20000;

export function ConsentRequests() {
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [eraseTargetUserId, setEraseTargetUserId] = useState<string | null>(null);
  const [eraseConfirmText, setEraseConfirmText] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function load() {
      const { data: pendingProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('consent_status', 'withdrawal_pending');

      if (ignore) return;

      if (profilesError || !pendingProfiles) {
        setLoading(false);
        setFetchError(true);
        return;
      }

      const pendingIds = pendingProfiles.map((p) => p.id);
      const [{ data: requested }, { data: resolved }] = await Promise.all([
        pendingIds.length > 0
          ? supabase
              .from('consents')
              .select('user_id, member_id, scope, created_at, members(full_name)')
              .eq('event', 'withdrawal_requested')
              .in('user_id', pendingIds)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] as never[] }),
        supabase
          .from('consents')
          .select('id, user_id, member_id, event, scope, created_at, members(full_name)')
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      if (ignore) return;
      setLoading(false);

      const nameByProfileId = new Map(pendingProfiles.map((p) => [p.id, p]));
      const latestRequestByUser = new Map<string, (typeof requested)[number]>();
      for (const row of requested ?? []) {
        if (!latestRequestByUser.has(row.user_id)) {
          latestRequestByUser.set(row.user_id, row);
        }
      }

      const pendingRows: PendingRow[] = pendingIds.flatMap((id) => {
        const req = latestRequestByUser.get(id);
        const profile = nameByProfileId.get(id);
        if (!req || !profile) return [];
        return [
          {
            user_id: id,
            member_id: req.member_id,
            scope: req.scope as ConsentScope,
            requested_at: req.created_at,
            requester_name: profile.full_name ?? 'Unknown',
            requester_email: profile.email ?? '—',
            member_name: req.members?.full_name ?? 'Unknown member',
          },
        ];
      });

      const historyRows: HistoryRow[] = (resolved ?? [])
        .filter((row) => row.event === 'withdrawal_verified' || (row.event === 'given' && row.member_id))
        .map((row) => ({
          id: row.id,
          resolved_at: row.created_at,
          requester_name: 'requester',
          member_name: row.members?.full_name ?? 'Unknown member',
          outcome: row.event === 'withdrawal_verified' ? 'erased' : 'reactivated',
        }));

      setPending(sortPending(pendingRows));
      setHistory(sortHistoryRows(historyRows));
    }

    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [refreshKey]);

  const reactivate = async (row: PendingRow) => {
    setBusyUserId(row.user_id);
    const { error } = await supabase.rpc('reactivate_consent', {
      p_user_id: row.user_id,
      p_member_id: row.member_id,
    });
    setBusyUserId(null);
    if (error) {
      setFetchError(true);
      return;
    }
    setRefreshKey((k) => k + 1);
  };

  const confirmErase = async () => {
    const row = pending.find((p) => p.user_id === eraseTargetUserId);
    if (!row) return;
    setBusyUserId(row.user_id);
    const { error } = await supabase.functions.invoke('erase-consent-withdrawal', {
      body: { member_id: row.member_id, requester_user_id: row.user_id, scope: row.scope },
    });
    setBusyUserId(null);
    setEraseTargetUserId(null);
    setEraseConfirmText('');
    if (error) {
      setFetchError(true);
      return;
    }
    setRefreshKey((k) => k + 1);
  };

  if (loading) {
    return <div className="card">Loading…</div>;
  }

  return (
    <>
      {fetchError && (
        <div className="card" role="alert">
          <span>Something went wrong loading consent requests.</span>
          <button type="button" onClick={() => setFetchError(false)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="page-header">
        <div className="page-header__txt">
          <h1>Consent Requests</h1>
          <p>Withdrawal requests awaiting verification, oldest first.</p>
        </div>
        <div className="page-header__actions">
          <span className="freshness">Refreshes every 20s</span>
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="section-card">
        <div className="section-card__head">
          <span className="section-card__title">Pending ({pending.length})</span>
        </div>
        {pending.length === 0 ? (
          <p className="t-body-m">No pending consent requests.</p>
        ) : (
          pending.map((row) => (
            <div key={row.user_id} className="info-card" style={{ marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <h4>{row.requester_name}</h4>
                <p>
                  {row.requester_email} · Member: {row.member_name}
                </p>
                <p>
                  Requested: {scopeLabel(row.scope)} ·{' '}
                  {new Date(row.requested_at).toLocaleString()}
                </p>

                {eraseTargetUserId === row.user_id ? (
                  <div className="field field--full" style={{ marginTop: '8px' }}>
                    <label htmlFor={`erase-confirm-${row.user_id}`}>
                      Type WITHDRAW to confirm
                    </label>
                    <input
                      id={`erase-confirm-${row.user_id}`}
                      type="text"
                      value={eraseConfirmText}
                      onChange={(e) => setEraseConfirmText(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button
                        type="button"
                        className="btn btn--danger btn--sm"
                        disabled={
                          eraseConfirmText.trim().toUpperCase() !== 'WITHDRAW' ||
                          busyUserId === row.user_id
                        }
                        onClick={confirmErase}
                      >
                        Confirm erasure
                      </button>
                      <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        onClick={() => {
                          setEraseTargetUserId(null);
                          setEraseConfirmText('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button
                      type="button"
                      className="btn btn--outline btn--sm"
                      disabled={busyUserId === row.user_id}
                      onClick={() => reactivate(row)}
                    >
                      False alarm — reactivate
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger btn--sm"
                      disabled={busyUserId === row.user_id}
                      onClick={() => setEraseTargetUserId(row.user_id)}
                    >
                      Verified — erase permanently
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="section-card">
        <div className="section-card__head">
          <span className="section-card__title">History</span>
        </div>
        {history.length === 0 ? (
          <p className="t-body-m">No resolved requests yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Outcome</th>
                <th>Resolved</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id}>
                  <td>{row.member_name}</td>
                  <td>{row.outcome === 'erased' ? 'Erased' : 'Reactivated'}</td>
                  <td>{new Date(row.resolved_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @carebridge/admin test -- ConsentRequests`
Expected: PASS. If the mocked query-chaining in the test's `mockQueries` helper doesn't match the exact chain shape the implementation ends up using (a real risk with hand-mocked Supabase builders), adjust the mock's chain to match — the behavioral assertions (which table, which RPC, which body) are what matter, not the exact intermediate mock shape.

- [ ] **Step 5: Wire the route and nav link**

In `apps/admin/src/App.tsx`, add the import and route:
```tsx
import { ConsentRequests } from './pages/ConsentRequests';
```
```tsx
              <Route path="/leads" element={<Leads />} />
              <Route path="/consent-requests" element={<ConsentRequests />} />
```

In `apps/admin/src/shell/AdminShell.tsx`, add the nav link:
```tsx
              <Link to="/leads">Leads</Link>
              <Link to="/consent-requests">Consent Requests</Link>
```

- [ ] **Step 6: Run the full admin test suite and build**

Run: `pnpm --filter @carebridge/admin test && pnpm --filter @carebridge/admin build`
Expected: PASS / builds clean.

- [ ] **Step 7: Commit**

```bash
git add apps/admin/src/pages/ConsentRequests.tsx apps/admin/src/pages/ConsentRequests.test.tsx apps/admin/src/App.tsx apps/admin/src/shell/AdminShell.tsx
git commit -m "feat(admin): add Consent Requests inbox (reactivate + erase)"
```

---

### Task 12: Manual verification of the Edge Function

**Files:** none (verification only, no code changes expected unless a bug is found — if so, fix it in `supabase/functions/erase-consent-withdrawal/index.ts` and re-run this task).

- [ ] **Step 1: Serve the function locally**

```bash
cd supabase
supabase start   # if not already running
supabase functions serve erase-consent-withdrawal --no-verify-jwt
```

- [ ] **Step 2: Seed a real withdrawal-pending scenario**

In a second terminal, using `supabase db query --local` (matching the pattern in `docs/superpowers/plans/../project_wellness_local_dev_workflow.md`):
```bash
supabase db query --local "select public.request_consent_withdrawal('10000000-0000-0000-0000-000000000001', 'self');" 
```
Note: this needs a real `auth.uid()` session context, which `supabase db query` doesn't simulate — instead, call it as the seeded member user directly via SQL role simulation, matching `rls.test.sql`'s technique:
```bash
supabase db query --local "
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000002')::text, true);
select public.request_consent_withdrawal('10000000-0000-0000-0000-000000000001', 'self');
"
```
(user id `00000000-0000-0000-0000-000000000002` and member id `10000000-0000-0000-0000-000000000001` are `seed.sql`'s fixture member/user — see `supabase/seed.sql`.)

- [ ] **Step 3: Get a coordinator JWT and call the function**

```bash
# Get the coordinator's access token (seed.sql's coordinator: coordinator.seed@carebridgehome.test / seed-password)
curl -s -X POST 'http://127.0.0.1:54321/auth/v1/token?grant_type=password' \
  -H "apikey: $(supabase status -o env | grep ANON_KEY | cut -d= -f2)" \
  -H "Content-Type: application/json" \
  -d '{"email":"coordinator.seed@carebridgehome.test","password":"seed-password"}' \
  | tee /tmp/coordinator-token.json

ACCESS_TOKEN=$(python3 -c "import json; print(json.load(open('/tmp/coordinator-token.json'))['access_token'])")

curl -s -X POST 'http://127.0.0.1:54321/functions/v1/erase-consent-withdrawal' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"member_id":"10000000-0000-0000-0000-000000000001","requester_user_id":"00000000-0000-0000-0000-000000000002","scope":"self"}'
```
Expected response: `{"ok":true,"scope":"self"}`.

- [ ] **Step 4: Verify the erasure actually happened**

```bash
supabase db query --local "select count(*)::int from auth.users where id = '00000000-0000-0000-0000-000000000002';"
```
Expected: `0` — the user is gone. Also confirm `member_links` for that user_id is gone (cascade), and that the seeded member's own row (`10000000-0000-0000-0000-000000000001`) and its `checkins`/`medical_profile`/etc. rows are **untouched** (this was a `scope: 'self'` erasure, not `'all'`).

- [ ] **Step 5: Reset local state and re-seed for the next task/developer**

```bash
supabase db reset
```

- [ ] **Step 6: Deploy the function to the hosted project**

```bash
supabase functions deploy erase-consent-withdrawal --project-ref bbthbboakoicoyiuclll
```

No manual secret configuration needed — `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by the Supabase Edge Functions runtime for every deployed function.

---

### Task 13: Full-suite verification

**Files:** none — this is a checkpoint task, not a code task.

- [ ] **Step 1: Run the complete local verification, matching what CI runs**

```bash
cd ~/Projects/Carebridge
pnpm lint
pnpm test
pnpm build
pnpm format:check
```
Expected: all four pass across all workspace packages (`apps/wellness`, `apps/admin`, `packages/design-system`, `packages/db-types`).

- [ ] **Step 2: Run the pgTAP suite one more time to confirm 34/34**

```bash
cd supabase
supabase test db
```
Expected: `1..34` all `ok`.

- [ ] **Step 3: Push and verify CI**

```bash
git push origin main
gh run watch
```
Expected: the GitHub Actions workflow (lint/test/build/format:check) reports green.

- [ ] **Step 4: Verify the Cloudflare Pages admin deploy picked up the new route**

Cloudflare auto-deploys `apps/admin` on push to `main` (see `docs/superpowers/specs/2026-08-06-ci-cd-design.md`). After the push in Step 3 lands, confirm at `https://carebridge-czk.pages.dev/consent-requests` that the page loads (will show "Not authorized" or redirect to `/login` without a real coordinator session — that's expected, just confirms the route exists in the deployed bundle rather than 404ing).
