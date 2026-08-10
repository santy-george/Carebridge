# In-App Consent Flow + Sentry PII Scrubbing — Design Spec

**Status:** Approved by user 2026-08-10, pending final spec review before implementation plan.

## Goal

Implement Phase 1 checklist items 3, 4, and 6 from `docs/dpdp-compliance-brief-for-saji.md`: in-app consent at signup, a self-service withdrawal path, and Sentry PII scrubbing — for `apps/wellness` and `apps/admin`.

## Context

- DPDP Act requires: notice before consent, unchecked-by-default affirmative action, logged proof of consent, and a withdrawal mechanism "as easy as" giving consent (brief, Section 3).
- `member_links` (see `2026-08-06-supabase-auth-wiring-design.md`) already models the many-to-many patient↔account relationship this design builds on: `member_id`, `user_id`, `is_self`, `relationship_label`.
- Existing route-guard pattern: `apps/wellness/src/auth/RequireAuth.tsx` (`RequireSession`/`RequireAuth`/`RedirectIfAuthenticated`, gated on `session`/`memberLinks`), `apps/admin/src/auth/RequireAuth.tsx` (`RequireCoordinator`). This design adds a `consent_status` gate to the wellness side.
- Existing coordinator-inbox pattern to follow: `apps/admin/src/pages/SosInbox.tsx` + `apps/admin/src/lib/sosInbox.ts` (Active/History two-table split, poll-based, narrowly-scoped RLS migration for coordinator read access). The new Consent Requests inbox follows the same shape.
- `apps/*/src/lib/sentry.ts` already exists (`2026-08-10`, this session) with a guarded `Sentry.init` off `VITE_SENTRY_DSN`. This design adds `beforeSend` PII scrubbing to it.

## Decisions (from brainstorming)

1. **Single consent, not granular multi-purpose.** The app has one real purpose — home-care coordination — with no separable opt-out-able features (check-ins/vitals aren't a distinct "wellness tracking" product from "care coordination"). Granular consent would be fake granularity that doesn't map to any real toggle.
2. **Consent captured at signup**, before `/link-member`, as an unchecked checkbox with a plain-language notice inline on the signup screen (no separate privacy-policy page needed for this flow — that's the separate, not-yet-drafted Phase 1 item 2).
3. **Withdrawal has two phases:** a self-service *request* (in-app, immediate sign-out) and a coordinator-verified *erasure* (Admin-side, after the coordinator confirms by contacting the family it wasn't accidental). Data is not touched at request time — only at verified-erasure time.
4. **Withdrawal is scoped by the requester's choice, not hardcoded by role.** At withdrawal time, the requester picks "everyone linked to this record" or "just my own access." This is deliberately not auto-derived from `is_self`, per explicit user direction.
5. **Erasure is real deletion**, not a soft flag — actual `DELETE` across all member-related tables (+ storage objects) for `scope: 'all'`, or just the requester's own `member_links` row + `auth.users` row for `scope: 'self'`.
6. **Erasure runs as a Supabase Edge Function**, not a client-side RPC — deleting `auth.users` rows requires the service_role key, which must never ship to the Admin SPA's browser bundle.

## Schema Changes

New migration, additive only.

**`consents`** — append-only audit log, no update/delete policy at all:
```sql
create type public.consent_event as enum ('given', 'withdrawal_requested', 'withdrawal_verified');
create type public.consent_scope as enum ('self', 'all');

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid references public.members(id) on delete cascade, -- null for 'given' at signup (no member linked yet)
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

create policy "user inserts own consent-given events"
  on public.consents for insert with check (user_id = auth.uid() and event = 'given');
```
Direct client inserts are restricted to `event = 'given'` only (used once, at signup) — `withdrawal_requested` and `withdrawal_verified` are written exclusively by the `request_consent_withdrawal` function and the erasure Edge Function respectively, both of which run with table-owner privileges and bypass this policy entirely. Without this restriction, any authenticated client could insert a fabricated `withdrawal_verified` row directly, polluting the audit trail even though it couldn't affect actual `consent_status` (caught in spec self-review — the "own events" policy as first drafted didn't restrict `event`, which would let a client forge audit-log entries even though it can't change real state).

No update/delete policy anywhere — the log is immutable. Reactivation after a false alarm is a new `given` row, not a mutation of the `withdrawal_requested` row.

**`profiles.consent_status`** — cheap current-state check for the route guard, avoids scanning `consents` on every page load:
```sql
alter table public.profiles
  add column consent_status text not null default 'active'
    check (consent_status in ('active', 'withdrawal_pending'));
```
Only two reachable states. There is no `'erased'` state: erasure hard-deletes the `auth.users`/`profiles` row entirely (see Edge Function below) rather than flagging it — a deleted row can't hold a status. (Caught in spec self-review — an earlier draft listed `'erased'` as a third value and had the wellness route guard check for it, which was unreachable dead logic since there's no profile left to read a status from once erasure has run. The guard only needs to check for `'withdrawal_pending'`; the post-erasure case is just "this login no longer exists," handled by normal auth failure, not a special gate.)
Coordinators can already update all profiles via existing policy; add a narrow policy allowing a user to set their own `consent_status` only via the withdrawal-request path (enforced in application logic — direct client writes to arbitrary `consent_status` values are blocked by only exposing the transition through one RPC, not a raw table update):
```sql
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
```
This is the only way `consent_status` transitions to `withdrawal_pending` — no direct client UPDATE policy on that column.

## Wellness App (`apps/wellness`)

### Signup consent (`Signup.tsx`)

- Add a notice block above the submit button: condensed plain-language purpose text (identity/medical/vitals/meds/SOS/preventive-goals, one purpose — home care coordination, visible to linked family + assigned coordinator).
- Unchecked checkbox: *"I agree to Care Bridge Home collecting and using this health and care-coordination data as described above."* Submit button stays disabled until checked.
- On successful `supabase.auth.signUp`, insert a `consents` row directly (`event: 'given'`, `member_id: null`, `policy_version: 'v1'`) before navigating to `/link-member`. If this insert fails, do not block navigation — log to Sentry and let the account creation succeed (auth succeeded; a missing consent log entry is a lesser failure than stranding a fresh signup, but Sentry needs to catch it for follow-up).

### Withdrawal (new: `apps/wellness/src/pages/WithdrawConsent.tsx`, linked from `Profile.tsx`)

- Entry point: a low-emphasis destructive-styled row at the bottom of Profile & settings, not in the top-level More menu.
- Full-screen confirmation flow (not a modal):
  1. Plain-language consequence text — if the member link `is_self`, explicitly warns linked family members lose monitoring too.
  2. Scope picker (radio, not preselected): *"Withdraw for everyone linked to this record"* / *"Just remove my own access."*
  3. Type-to-confirm field (must type `WITHDRAW`) before the submit button enables — real friction against accidental taps.
- On submit: call `request_consent_withdrawal(member_id, scope)` RPC, then `supabase.auth.signOut()` immediately.
- Route guard: `RequireSession`/`RequireAuth` (or a new lightweight check in `AuthProvider`) reads `profiles.consent_status` on login attempt; `withdrawal_pending` blocks entry to the app shell entirely, showing a dedicated message screen instead of the normal login flow: *"Your coordinator will contact you to confirm this wasn't accidental before anything is removed."* (No login form retry loop — this is a terminal state until a coordinator acts.) Once a coordinator actually erases the account, the login itself fails with normal invalid-credentials behavior — there's no profile row left to gate on, so this isn't a separate state to handle.

## Admin App (`apps/admin`)

### Consent Requests inbox (new: `apps/admin/src/pages/ConsentRequests.tsx` + `apps/admin/src/lib/consentRequests.ts`, route `/consent-requests`)

Same two-table shape as `SosInbox.tsx`:

- **Pending** — every profile with `consent_status = 'withdrawal_pending'`, oldest first. Row shows: requester name, linked member name, requested scope, requested timestamp. Two actions:
  - **False alarm — reactivate**: sets `consent_status = 'active'`, inserts a `consents` row (`event: 'given'`). No data touched.
  - **Verified — erase permanently**: opens a typed-confirm dialog (same `WITHDRAW`-style friction as the wellness side), then invokes the `erase-consent-withdrawal` Edge Function.
- **History** — resolved rows (reactivated or erased), read-only.

Needs a narrowly-scoped RLS migration so a coordinator can list `withdrawal_pending` profiles regardless of care-team assignment — same pattern as the SOS-inbox and upgrade-lead migrations already in the repo (`coordinator_reads_member_with_*`).

### Erasure Edge Function (new: `supabase/functions/erase-consent-withdrawal/`)

- Auth: verifies caller's JWT has `role: coordinator` (checked against `profiles`, using the function's own service_role client — not trusting a client-supplied claim).
- Input: `{ member_id: uuid, requester_user_id: uuid, scope: 'self' | 'all' }`.
- `scope: 'self'`: delete `member_links` row for `(member_id, requester_user_id)`; delete `auth.users` row for `requester_user_id` via the Auth Admin API (cascades to `profiles`, `consents.user_id` via existing FK `on delete cascade` — see note below on log-before-delete ordering).
- `scope: 'all'`: delete, in FK-safe order, all rows for `member_id` across `medical_profile`, `checkins`, `vitals_readings`, `glucose_readings`, `wearable_readings`, `medication_logs`, `medications`, `med_stock`, `sos_alerts`, `preventive_plan_goals`, `care_team`, `care_assignments`, `documents` (+ associated Storage objects), `member_invites`, `member_links`, then the `members` row itself; then delete every `auth.users` row that was linked via those `member_links` rows.
- **Audit ordering:** insert the final `consents` row (`event: 'withdrawal_verified'`) *before* deleting the triggering user's `auth.users` row, since `consents.user_id` has `on delete cascade` and would otherwise erase the very audit entry meant to record that the erasure happened. (Open implementation detail, not a design gap: the `withdrawal_verified` row for a fully-erased user won't be readable by anyone afterward once cascade fires anyway — acceptable, since the coordinator-side action itself is what's being audited, and Admin's own action log / Postgres statement logs are the durable trail for "who erased what, when," not this table once the referenced user is gone.)

## Sentry PII Scrubbing (`apps/*/src/lib/sentry.ts`)

Mechanical config, not a design decision — add to the existing guarded `Sentry.init` in both apps:
```ts
Sentry.init({
  dsn,
  beforeSend(event) {
    delete event.user?.email;
    delete event.user?.ip_address;
    if (event.request?.headers) {
      delete event.request.headers['Authorization'];
      delete event.request.headers['Cookie'];
    }
    // redact common PII-shaped keys in extra/breadcrumb data by name,
    // not a full allowlist rewrite -- low-maintenance, catches the
    // fields this codebase actually uses (full_name, phone, email,
    // address, medical fields) without hand-listing every call site.
    return scrubPiiKeys(event);
  },
});
```
`scrubPiiKeys` is a small shared helper (new file, `packages/design-system` is the wrong home for it — put it in each app's `lib/sentry.ts` directly since it's a ~15-line function, not worth a shared package for two call sites) that walks `event.extra` and breadcrumb `data` objects, redacting values for keys matching a fixed list (`full_name`, `phone`, `email`, `address`, `conditions`, `allergies`, `notes`, `emergency_contact_name`, `emergency_contact_phone`). Stack traces and error messages are left untouched — scrubbing those would defeat the point of having Sentry.

## Testing

- pgTAP additions to `supabase/tests/database/rls.test.sql`: `consents` insert/select policies (own rows only, coordinator sees all, no update/delete possible), `request_consent_withdrawal` RPC sets `consent_status` correctly and is the only path that can.
- Wellness: `Signup.test.tsx` extended for the checkbox-gates-submit behavior and the consent-log insert; new `WithdrawConsent.test.tsx` for the scope picker + type-to-confirm gate + sign-out.
- Admin: new `ConsentRequests.test.tsx` mirroring `SosInbox.test.tsx`'s structure.
- Edge Function: not unit-testable the same way as the rest of this stack (no existing Edge Function test harness in the repo yet) — verify manually against local `supabase functions serve` with seed data before considering this shippable; flag in the implementation plan as the one piece needing hands-on verification rather than automated coverage.

## Out of scope (explicitly, not oversights)

- Drafting the actual privacy-policy document/page (Phase 1 item 2 — separate task).
- Granular multi-purpose consent (no real second purpose exists in the shipped product today).
- Automated re-notification / re-consent flow when the policy text changes (`policy_version` is captured now so this is buildable later, but the re-consent trigger itself isn't built in this cycle).
