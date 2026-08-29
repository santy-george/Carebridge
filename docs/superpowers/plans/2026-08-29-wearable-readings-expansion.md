# Wearable Readings Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing heart_rate/spo2-only HealthKit pipeline to the full set of readings Apple Watch can supply (HRV, resting HR, steps, sleep, ECG, rhythm events, walking steadiness, etc), wiring the two empty Home UI cells (Steps, Sleep) to real data and collecting everything else undisplayed for later use.

**Architecture:** Same pipeline shape as the existing HR/SpO2 path (`Watch → HealthKit → HealthKitBridge.swift → healthkit.ts → ingest-wearable → Postgres`), generalized from two hardcoded reading types to a per-type table, plus three new query shapes (daily-cumulative statistics, category/interval samples, ECG) and three new destination tables for data that doesn't fit `wearable_readings`' single-value-plus-timestamp shape.

**Tech Stack:** Swift/HealthKit (native Capacitor plugin, `apps/wellness/ios/App/App/`), TypeScript/Vitest (`apps/wellness/src/lib/healthkit.ts`), Deno/Supabase Edge Functions (`supabase/functions/ingest-wearable`), Postgres/pgTAP (`supabase/migrations/`, `supabase/tests/database/rls.test.sql`), React (`apps/wellness/src/pages/Home.tsx`).

**Spec:** `docs/superpowers/specs/2026-08-29-wearable-readings-expansion-design.md`

## Global Constraints

- `device_vendor` on every wearable table is always hardcoded server-side in the Edge Function, never accepted from the client.
- No table this plan touches gets an INSERT/UPDATE/DELETE RLS policy for `authenticated`/`anon` — every write goes through `ingest-wearable`'s service_role client, which bypasses RLS after its own ownership check. This matches `wearable_readings`' existing posture exactly.
- HealthKit authorization/observation failures are always a silent no-op — a member may not own a Watch, and Watch owners may decline individual read types. Never block app load or throw a user-facing error on this path.
- No raw ECG voltage is ever stored — only `classification` + `average_heart_rate`.
- Third-party apps cannot initiate an ECG. The ECG pipeline only observes samples the member already took via the Watch's own ECG app.
- Real fall-event capture stays a no-op stub in this plan — it needs Apple's `CMFallDetectionManager` entitlement, which is not obtainable in this session. Walking Steadiness (a fall-*risk* score) ships instead; it needs no special entitlement.
- Every native Swift task in this plan is verified on real hardware (Task 8), not simulator — matches the project's existing HealthKit precedent (2026-08-20), where real-device testing caught two bugs invisible to code review.

---

## Execution notes (2026-08-29)

Tasks 1-7 executed directly (not delegated to Ollama Cloud, despite the "Suggested executor" notes below) — the plan already contained complete code for every task, so delegating would only have meant an external model re-typing already-specified code with real regression risk (documented prior incidents of dropped spec/hallucination on DB-adjacent work), not added value. Task 8 needs Santhosh's physical Watch/iPhone and stays pending.

Real verification (not just review) caught 4 issues the written plan didn't anticipate, all fixed in the applied code:
- `HKElectrocardiogramType()` has no public initializer -- real API is `HKObjectType.electrocardiogramType()`. Caught by an actual `xcodebuild` simulator build (Task 4-6 code was also generalized: `loadAnchor`/`saveAnchor` take `HKObjectType`, not `HKQuantityType`, since sleep/rhythm/ECG anchors aren't quantity types).
- A new `.swift` file isn't picked up by Xcode just by existing on disk -- `HealthKitBridge+Expansion.swift` had to be registered in `project.pbxproj` (4 entries: PBXBuildFile, PBXFileReference, group membership, Sources build phase) before it compiled at all.
- `deno test` run from the repo root drags in the pnpm workspace and mis-resolves npm dependencies from the wrong `node_modules`, and can silently rewrite the root `package.json` in the process (reverted, not committed) -- run it from the function's own directory instead.
- Two existing shared Supabase query-builder test mocks (`Home.test.tsx`, `routing.integration.test.tsx`) only stubbed the query methods used up to now and threw on the new query's `.neq()`/`.gte()` calls -- extended both, matching their own stated "supports any chained method" intent.

---

### Task 1: Migrations — `daily_activity_totals`, `sleep_sessions`, `ecg_readings`, `rhythm_events` + RLS + pgTAP
**Suggested executor:** Ollama Cloud (GLM 5.1 implements, Kimi K3 verifies read-only) — mechanical SQL, per spec.

**Files:**
- Create: `supabase/migrations/20260829140000_wearable_expansion_tables.sql`
- Modify: `supabase/tests/database/rls.test.sql` (fixtures near line 51-55, new assertion block near line 168-170, plan count at line 14)

**Interfaces:**
- Produces: tables `public.daily_activity_totals(id, member_id, reading_type, day, value, device_vendor, updated_at)` unique on `(member_id, reading_type, day)`; `public.sleep_sessions(id, member_id, device_vendor, started_at, ended_at, stage, raw_payload, ingested_at)`; `public.ecg_readings(id, member_id, device_vendor, recorded_at, classification, average_heart_rate, raw_payload, ingested_at)`; `public.rhythm_events(id, member_id, device_vendor, recorded_at, raw_payload, ingested_at)`. All four reused by Task 2 (Edge Function inserts/upserts) and Task 7 (Home.tsx reads).

- [x] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260829140000_wearable_expansion_tables.sql

-- Daily-cumulative wearable types (step_count, active_energy_burned,
-- distance_walked_running, apple_stand_time) don't fit wearable_readings'
-- append-one-row-per-sample shape: Watch and iPhone can both log steps for
-- the same interval, so these need one upserted row per calendar day
-- instead. A dedicated table gives PostgREST a real (non-partial) unique
-- constraint to target via on_conflict -- a partial index scoped to just
-- these reading_types inside wearable_readings can't be used as an upsert
-- arbiter.
create table public.daily_activity_totals (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  device_vendor text not null,
  reading_type text not null check (reading_type in ('step_count', 'active_energy_burned', 'distance_walked_running', 'apple_stand_time')),
  day date not null,
  value numeric not null,
  updated_at timestamptz not null default now()
);
create unique index daily_activity_totals_member_type_day_unique
  on public.daily_activity_totals(member_id, reading_type, day);
create index daily_activity_totals_member_day_idx
  on public.daily_activity_totals(member_id, day desc);

-- Sleep sessions (HKCategoryTypeIdentifier.sleepAnalysis) -- interval data
-- with a stage enum, not a single value+timestamp.
create table public.sleep_sessions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  device_vendor text not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  stage text not null check (stage in ('in_bed', 'asleep_core', 'asleep_deep', 'asleep_rem', 'awake')),
  raw_payload jsonb,
  ingested_at timestamptz not null default now()
);
create index sleep_sessions_member_started_idx on public.sleep_sessions(member_id, started_at desc);

-- ECG readings (HKElectrocardiogramType) -- classification + averaged heart
-- rate only, never raw voltage. Third-party apps can't initiate an ECG;
-- this only ever observes a sample the member already took via the Watch's
-- own ECG app.
create table public.ecg_readings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  device_vendor text not null,
  recorded_at timestamptz not null,
  classification text not null,
  average_heart_rate numeric,
  raw_payload jsonb,
  ingested_at timestamptz not null default now()
);
create index ecg_readings_member_recorded_idx on public.ecg_readings(member_id, recorded_at desc);

-- Irregular rhythm notifications (HKCategoryTypeIdentifier.irregularHeartRhythmEvent)
-- -- a background PPG-based AFib-risk notification, not a metric or an ECG.
create table public.rhythm_events (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  device_vendor text not null,
  recorded_at timestamptz not null,
  raw_payload jsonb,
  ingested_at timestamptz not null default now()
);
create index rhythm_events_member_recorded_idx on public.rhythm_events(member_id, recorded_at desc);

alter table public.daily_activity_totals enable row level security;
alter table public.sleep_sessions enable row level security;
alter table public.ecg_readings enable row level security;
alter table public.rhythm_events enable row level security;

create policy "read own or assigned daily activity totals" on public.daily_activity_totals
  for select using (public.can_access_member(member_id));
create policy "read own or assigned sleep sessions" on public.sleep_sessions
  for select using (public.can_access_member(member_id));
create policy "read own or assigned ecg readings" on public.ecg_readings
  for select using (public.can_access_member(member_id));
create policy "read own or assigned rhythm events" on public.rhythm_events
  for select using (public.can_access_member(member_id));
-- No insert/update/delete policy for authenticated/anon on any of the four
-- -- writes only via the service_role ingest-wearable edge function, same
-- posture as wearable_readings.
```

- [x] **Step 2: Apply the migration locally**

Run: `supabase db reset`
Expected: migration applies cleanly, `seed.sql` still loads without error.

- [x] **Step 3: Add pgTAP fixtures for the new tables**

In `supabase/tests/database/rls.test.sql`, immediately after the existing `insert into public.checkins (...)` block (ends at line 54, right before the `-- === Simulate Member A's session ===` comment on line 56), insert:

```sql
insert into public.sleep_sessions (member_id, device_vendor, started_at, ended_at, stage)
values
  ('aa000000-0000-0000-0000-00000000aaaa', 'apple_watch', now() - interval '8 hours', now() - interval '4 hours', 'asleep_core'),
  ('bb000000-0000-0000-0000-00000000bbbb', 'apple_watch', now() - interval '8 hours', now() - interval '4 hours', 'asleep_core');

insert into public.ecg_readings (member_id, device_vendor, recorded_at, classification, average_heart_rate)
values
  ('aa000000-0000-0000-0000-00000000aaaa', 'apple_watch', now(), 'sinus_rhythm', 68),
  ('bb000000-0000-0000-0000-00000000bbbb', 'apple_watch', now(), 'sinus_rhythm', 71);

insert into public.rhythm_events (member_id, device_vendor, recorded_at)
values
  ('aa000000-0000-0000-0000-00000000aaaa', 'apple_watch', now()),
  ('bb000000-0000-0000-0000-00000000bbbb', 'apple_watch', now());
```

- [x] **Step 4: Add pgTAP assertions**

In the same file, immediately after the assigned-coordinator block ends (after the `select is(... 'The coordinator''s care_model update actually applied');` assertion, currently ending at line 168, and before the `-- === Simulate the family "Son" user redeeming invite codes ===` comment at line 170), insert:

```sql
-- === Wearable expansion tables: sleep_sessions, ecg_readings, rhythm_events ===
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-00000000000a')::text, true);

select is(
  (select count(*)::int from public.sleep_sessions where member_id = 'aa000000-0000-0000-0000-00000000aaaa'),
  1,
  'Member A can SELECT their own sleep_sessions row'
);
select is(
  (select count(*)::int from public.sleep_sessions where member_id = 'bb000000-0000-0000-0000-00000000bbbb'),
  0,
  'Member A gets zero rows querying Member B sleep_sessions'
);
select throws_ok(
  $$ insert into public.sleep_sessions (member_id, device_vendor, started_at, ended_at, stage) values ('aa000000-0000-0000-0000-00000000aaaa', 'apple_watch', now(), now(), 'awake') $$,
  '42501',
  null,
  'Member A cannot INSERT into sleep_sessions -- writes are service_role-only via ingest-wearable'
);

select is(
  (select count(*)::int from public.ecg_readings where member_id = 'aa000000-0000-0000-0000-00000000aaaa'),
  1,
  'Member A can SELECT their own ecg_readings row'
);
select is(
  (select count(*)::int from public.ecg_readings where member_id = 'bb000000-0000-0000-0000-00000000bbbb'),
  0,
  'Member A gets zero rows querying Member B ecg_readings'
);
select throws_ok(
  $$ insert into public.ecg_readings (member_id, device_vendor, recorded_at, classification) values ('aa000000-0000-0000-0000-00000000aaaa', 'apple_watch', now(), 'sinus_rhythm') $$,
  '42501',
  null,
  'Member A cannot INSERT into ecg_readings -- writes are service_role-only via ingest-wearable'
);

select is(
  (select count(*)::int from public.rhythm_events where member_id = 'aa000000-0000-0000-0000-00000000aaaa'),
  1,
  'Member A can SELECT their own rhythm_events row'
);
select is(
  (select count(*)::int from public.rhythm_events where member_id = 'bb000000-0000-0000-0000-00000000bbbb'),
  0,
  'Member A gets zero rows querying Member B rhythm_events'
);
select throws_ok(
  $$ insert into public.rhythm_events (member_id, device_vendor, recorded_at) values ('aa000000-0000-0000-0000-00000000aaaa', 'apple_watch', now()) $$,
  '42501',
  null,
  'Member A cannot INSERT into rhythm_events -- writes are service_role-only via ingest-wearable'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'c0000000-0000-0000-0000-00000000000c')::text, true);

select is(
  (select count(*)::int from public.sleep_sessions where member_id = 'aa000000-0000-0000-0000-00000000aaaa'),
  1,
  'Assigned coordinator can SELECT Member A sleep_sessions'
);
select is(
  (select count(*)::int from public.ecg_readings where member_id = 'aa000000-0000-0000-0000-00000000aaaa'),
  1,
  'Assigned coordinator can SELECT Member A ecg_readings'
);
select is(
  (select count(*)::int from public.rhythm_events where member_id = 'aa000000-0000-0000-0000-00000000aaaa'),
  1,
  'Assigned coordinator can SELECT Member A rhythm_events'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '19000000-0000-0000-0000-000000000019')::text, true);

select is(
  (select count(*)::int from public.sleep_sessions where member_id = 'aa000000-0000-0000-0000-00000000aaaa'),
  0,
  'Unassigned coordinator gets zero rows querying Member A sleep_sessions'
);
select is(
  (select count(*)::int from public.ecg_readings where member_id = 'aa000000-0000-0000-0000-00000000aaaa'),
  0,
  'Unassigned coordinator gets zero rows querying Member A ecg_readings'
);
select is(
  (select count(*)::int from public.rhythm_events where member_id = 'aa000000-0000-0000-0000-00000000aaaa'),
  0,
  'Unassigned coordinator gets zero rows querying Member A rhythm_events'
);
```

This adds 15 assertions. Update line 14 from `select plan(75);` to `select plan(90);`.

- [x] **Step 5: Run the pgTAP suite**

Run: `supabase test db`
Expected: all 90 tests pass.

- [x] **Step 6: Commit**

```bash
git add supabase/migrations/20260829140000_wearable_expansion_tables.sql supabase/tests/database/rls.test.sql
git commit -m "feat(db): add daily_activity_totals, sleep_sessions, ecg_readings, rhythm_events tables"
```

---

### Task 2: `ingest-wearable` — accept the expanded reading set and new payload arrays
**Suggested executor:** Ollama Cloud (GLM 5.1 implements, Kimi K3 verifies read-only) — bounded, testable, per spec.

**Files:**
- Modify: `supabase/functions/ingest-wearable/index.ts`
- Create: `supabase/functions/ingest-wearable/index.test.ts`

**Interfaces:**
- Consumes: tables from Task 1 (`daily_activity_totals`, `sleep_sessions`, `ecg_readings`, `rhythm_events`); existing `member_links` ownership-check pattern.
- Produces: exported pure functions `isValidReading`, `isValidSleepSession`, `isValidEcgReading`, `isValidRhythmEvent`, `isDailyCumulativeType` (all `(r: unknown) => boolean` or `(reading_type: string) => boolean`) — consumed by this task's own test file. Request/response shape consumed by Task 3 (`healthkit.ts`'s `flush()`).

- [x] **Step 1: Write the failing test**

```typescript
// supabase/functions/ingest-wearable/index.test.ts
import { assertEquals } from 'jsr:@std/assert@1';
import {
  isValidReading,
  isValidSleepSession,
  isValidEcgReading,
  isValidRhythmEvent,
  isDailyCumulativeType,
} from './index.ts';

Deno.test('isValidReading accepts a known reading_type with a numeric value and valid timestamp', () => {
  assertEquals(
    isValidReading({ reading_type: 'heart_rate_variability_sdnn', value: 42.5, recorded_at: '2026-08-29T04:00:00Z' }),
    true,
  );
});

Deno.test('isValidReading rejects an unknown reading_type', () => {
  assertEquals(
    isValidReading({ reading_type: 'made_up_type', value: 1, recorded_at: '2026-08-29T04:00:00Z' }),
    false,
  );
});

Deno.test('isValidReading rejects a non-numeric value', () => {
  assertEquals(
    isValidReading({ reading_type: 'step_count', value: 'lots', recorded_at: '2026-08-29T04:00:00Z' }),
    false,
  );
});

Deno.test('isDailyCumulativeType is true for the 4 daily-cumulative types and false for streaming types', () => {
  assertEquals(isDailyCumulativeType('step_count'), true);
  assertEquals(isDailyCumulativeType('active_energy_burned'), true);
  assertEquals(isDailyCumulativeType('distance_walked_running'), true);
  assertEquals(isDailyCumulativeType('apple_stand_time'), true);
  assertEquals(isDailyCumulativeType('heart_rate'), false);
  assertEquals(isDailyCumulativeType('heart_rate_variability_sdnn'), false);
});

Deno.test('isValidSleepSession accepts a known stage with valid timestamps', () => {
  assertEquals(
    isValidSleepSession({ started_at: '2026-08-29T02:00:00Z', ended_at: '2026-08-29T04:00:00Z', stage: 'asleep_deep' }),
    true,
  );
});

Deno.test('isValidSleepSession rejects an unknown stage', () => {
  assertEquals(
    isValidSleepSession({ started_at: '2026-08-29T02:00:00Z', ended_at: '2026-08-29T04:00:00Z', stage: 'dreaming' }),
    false,
  );
});

Deno.test('isValidEcgReading accepts a classification with no average_heart_rate', () => {
  assertEquals(isValidEcgReading({ recorded_at: '2026-08-29T04:00:00Z', classification: 'sinus_rhythm' }), true);
});

Deno.test('isValidEcgReading rejects an empty classification', () => {
  assertEquals(isValidEcgReading({ recorded_at: '2026-08-29T04:00:00Z', classification: '' }), false);
});

Deno.test('isValidRhythmEvent accepts a valid timestamp', () => {
  assertEquals(isValidRhythmEvent({ recorded_at: '2026-08-29T04:00:00Z' }), true);
});

Deno.test('isValidRhythmEvent rejects a missing timestamp', () => {
  assertEquals(isValidRhythmEvent({}), false);
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `deno test --allow-net supabase/functions/ingest-wearable/index.test.ts`
Expected: FAIL — `isValidSleepSession`, `isValidEcgReading`, `isValidRhythmEvent`, `isDailyCumulativeType` are not exported yet (only `isValidReading` exists, and it isn't exported either).

- [x] **Step 3: Rewrite `index.ts`**

```typescript
// supabase/functions/ingest-wearable/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Phase C wearable ingestion. Different trust model than send-push/send-email:
// those are service_role-only-caller functions, invoked only by privileged
// server-side code. This function's legitimate caller IS the member's own
// phone, reporting the member's own HealthKit data -- so it takes the
// member's normal user JWT, not a service_role JWT. It verifies which
// member_id that user is linked to before writing, then uses its own
// service_role client to bypass RLS (none of the tables here have a
// client-writable insert policy) -- same check-first-then-bypass shape as
// erase-consent-withdrawal.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const STREAMING_READING_TYPES = new Set([
  'heart_rate',
  'spo2',
  'heart_rate_variability_sdnn',
  'resting_heart_rate',
  'respiratory_rate',
  'walking_speed',
  'vo2_max',
  'apple_walking_steadiness',
  'apple_sleeping_wrist_temperature',
]);
const DAILY_CUMULATIVE_READING_TYPES = new Set([
  'step_count',
  'active_energy_burned',
  'distance_walked_running',
  'apple_stand_time',
]);
const ALLOWED_READING_TYPES = new Set([...STREAMING_READING_TYPES, ...DAILY_CUMULATIVE_READING_TYPES]);
const ALLOWED_SLEEP_STAGES = new Set(['in_bed', 'asleep_core', 'asleep_deep', 'asleep_rem', 'awake']);

export function isDailyCumulativeType(readingType: string): boolean {
  return DAILY_CUMULATIVE_READING_TYPES.has(readingType);
}

interface ReadingInput {
  reading_type: string;
  value: number;
  recorded_at: string;
}
interface SleepSessionInput {
  started_at: string;
  ended_at: string;
  stage: string;
}
interface EcgReadingInput {
  recorded_at: string;
  classification: string;
  average_heart_rate?: number;
}
interface RhythmEventInput {
  recorded_at: string;
}
interface IngestRequest {
  member_id: string;
  readings?: ReadingInput[];
  sleep_sessions?: SleepSessionInput[];
  ecg_readings?: EcgReadingInput[];
  rhythm_events?: RhythmEventInput[];
}

function isValidTimestamp(v: unknown): v is string {
  return typeof v === 'string' && !Number.isNaN(Date.parse(v));
}

export function isValidReading(r: unknown): r is ReadingInput {
  if (typeof r !== 'object' || r === null) return false;
  const c = r as Record<string, unknown>;
  return (
    typeof c.reading_type === 'string' &&
    ALLOWED_READING_TYPES.has(c.reading_type) &&
    typeof c.value === 'number' &&
    Number.isFinite(c.value) &&
    isValidTimestamp(c.recorded_at)
  );
}

export function isValidSleepSession(r: unknown): r is SleepSessionInput {
  if (typeof r !== 'object' || r === null) return false;
  const c = r as Record<string, unknown>;
  return (
    isValidTimestamp(c.started_at) &&
    isValidTimestamp(c.ended_at) &&
    typeof c.stage === 'string' &&
    ALLOWED_SLEEP_STAGES.has(c.stage)
  );
}

export function isValidEcgReading(r: unknown): r is EcgReadingInput {
  if (typeof r !== 'object' || r === null) return false;
  const c = r as Record<string, unknown>;
  return (
    isValidTimestamp(c.recorded_at) &&
    typeof c.classification === 'string' &&
    c.classification.length > 0 &&
    (c.average_heart_rate === undefined ||
      (typeof c.average_heart_rate === 'number' && Number.isFinite(c.average_heart_rate)))
  );
}

export function isValidRhythmEvent(r: unknown): r is RhythmEventInput {
  if (typeof r !== 'object' || r === null) return false;
  const c = r as Record<string, unknown>;
  return isValidTimestamp(c.recorded_at);
}

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

    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    const claimsSegment = jwt.split('.')[1];
    let callerId: string | undefined;
    try {
      callerId = claimsSegment
        ? JSON.parse(atob(claimsSegment.replace(/-/g, '+').replace(/_/g, '/')))?.sub
        : undefined;
    } catch {
      callerId = undefined;
    }
    if (!callerId) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const body = (await req.json()) as IngestRequest;
    const hasAnyArray =
      (body.readings?.length ?? 0) > 0 ||
      (body.sleep_sessions?.length ?? 0) > 0 ||
      (body.ecg_readings?.length ?? 0) > 0 ||
      (body.rhythm_events?.length ?? 0) > 0;
    if (!body.member_id || !hasAnyArray) {
      return new Response(
        JSON.stringify({ error: 'member_id and at least one non-empty reading array are required' }),
        { status: 400, headers: corsHeaders },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Ownership check: the caller may only ingest readings for a member
    // they're actually linked to, never an arbitrary id.
    const { data: link, error: linkError } = await adminClient
      .from('member_links')
      .select('member_id')
      .eq('user_id', callerId)
      .eq('member_id', body.member_id)
      .maybeSingle();
    if (linkError) {
      return new Response(JSON.stringify({ error: linkError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }
    if (!link) {
      return new Response(JSON.stringify({ error: 'not linked to this member' }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const results: Record<string, { inserted: number; error?: string }> = {};

    if (body.readings?.length) {
      if (!body.readings.every(isValidReading)) {
        results.readings = { inserted: 0, error: 'invalid reading_type, value, or recorded_at' };
      } else {
        const streamingRows = body.readings
          .filter((r) => !isDailyCumulativeType(r.reading_type))
          .map((r) => ({
            member_id: body.member_id,
            device_vendor: 'apple_watch',
            device_id: null,
            reading_type: r.reading_type,
            value: r.value,
            recorded_at: r.recorded_at,
          }));
        const dailyRows = body.readings
          .filter((r) => isDailyCumulativeType(r.reading_type))
          .map((r) => ({
            member_id: body.member_id,
            device_vendor: 'apple_watch',
            reading_type: r.reading_type,
            day: r.recorded_at.slice(0, 10),
            value: r.value,
            updated_at: new Date().toISOString(),
          }));

        let inserted = 0;
        let firstError: string | undefined;
        if (streamingRows.length) {
          const { error } = await adminClient.from('wearable_readings').insert(streamingRows);
          if (error) firstError = error.message;
          else inserted += streamingRows.length;
        }
        if (dailyRows.length) {
          const { error } = await adminClient
            .from('daily_activity_totals')
            .upsert(dailyRows, { onConflict: 'member_id,reading_type,day' });
          if (error) firstError = firstError ?? error.message;
          else inserted += dailyRows.length;
        }
        results.readings = firstError ? { inserted, error: firstError } : { inserted };
      }
    }

    if (body.sleep_sessions?.length) {
      if (!body.sleep_sessions.every(isValidSleepSession)) {
        results.sleep_sessions = { inserted: 0, error: 'invalid started_at, ended_at, or stage' };
      } else {
        const rows = body.sleep_sessions.map((s) => ({
          member_id: body.member_id,
          device_vendor: 'apple_watch',
          started_at: s.started_at,
          ended_at: s.ended_at,
          stage: s.stage,
        }));
        const { error } = await adminClient.from('sleep_sessions').insert(rows);
        results.sleep_sessions = error ? { inserted: 0, error: error.message } : { inserted: rows.length };
      }
    }

    if (body.ecg_readings?.length) {
      if (!body.ecg_readings.every(isValidEcgReading)) {
        results.ecg_readings = { inserted: 0, error: 'invalid recorded_at, classification, or average_heart_rate' };
      } else {
        const rows = body.ecg_readings.map((e) => ({
          member_id: body.member_id,
          device_vendor: 'apple_watch',
          recorded_at: e.recorded_at,
          classification: e.classification,
          average_heart_rate: e.average_heart_rate ?? null,
        }));
        const { error } = await adminClient.from('ecg_readings').insert(rows);
        results.ecg_readings = error ? { inserted: 0, error: error.message } : { inserted: rows.length };
      }
    }

    if (body.rhythm_events?.length) {
      if (!body.rhythm_events.every(isValidRhythmEvent)) {
        results.rhythm_events = { inserted: 0, error: 'invalid recorded_at' };
      } else {
        const rows = body.rhythm_events.map((e) => ({
          member_id: body.member_id,
          device_vendor: 'apple_watch',
          recorded_at: e.recorded_at,
        }));
        const { error } = await adminClient.from('rhythm_events').insert(rows);
        results.rhythm_events = error ? { inserted: 0, error: error.message } : { inserted: rows.length };
      }
    }

    const anyError = Object.values(results).some((r) => r.error);
    return new Response(JSON.stringify({ ok: !anyError, results }), {
      status: anyError ? 207 : 200,
      headers: corsHeaders,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
```

- [x] **Step 4: Run the test to verify it passes**

Run: `deno test --allow-net supabase/functions/ingest-wearable/index.test.ts`
Expected: PASS, all 10 tests.

- [x] **Step 5: Commit**

```bash
git add supabase/functions/ingest-wearable/index.ts supabase/functions/ingest-wearable/index.test.ts
git commit -m "feat(edge-function): expand ingest-wearable to full reading set + new tables"
```

---

### Task 3: `healthkit.ts` — new types and queue routing for sleep/ECG/rhythm
**Suggested executor:** Ollama Cloud (GLM 5.1 implements, Kimi K3 verifies read-only) — bounded TS, per spec.

**Files:**
- Modify: `apps/wellness/src/lib/healthkit.ts`
- Modify: `apps/wellness/src/lib/healthkit.test.ts`

**Interfaces:**
- Consumes: `ingest-wearable`'s request shape from Task 2 (`{ member_id, readings?, sleep_sessions?, ecg_readings?, rhythm_events? }`).
- Produces: `HealthKitReading['reading_type']` union (extended), `HealthKitSleepSession`, `HealthKitECGReading`, `HealthKitRhythmEvent` types, and plugin event names `healthKitSamples` / `healthKitSleepSessions` / `healthKitEcgReadings` / `healthKitRhythmEvents` — consumed by Task 6 (`HealthKitBridgePlugin.swift`, which must `notifyListeners` under these exact names).

- [x] **Step 1: Write the failing tests**

Add to `apps/wellness/src/lib/healthkit.test.ts`, inside the existing `describe('registerHealthKit', ...)` block, after the last `it(...)`:

```typescript
  it('flushes sleep_sessions separately from readings', async () => {
    await registerHealthKit('user-1', 'member-1');
    const sessions = Array.from({ length: FLUSH_BATCH_SIZE }, (_, i) => ({
      started_at: `2026-08-2${i % 9}T22:00:00Z`,
      ended_at: `2026-08-2${i % 9}T23:00:00Z`,
      stage: 'asleep_core' as const,
    }));
    listeners.healthKitSleepSessions({ sessions });
    await Promise.resolve();
    await Promise.resolve();
    expect(invokeMock).toHaveBeenCalledWith('ingest-wearable', {
      body: { member_id: 'member-1', sleep_sessions: sessions },
    });
  });

  it('flushes ecg_readings separately from readings', async () => {
    await registerHealthKit('user-1', 'member-1');
    const readings = Array.from({ length: FLUSH_BATCH_SIZE }, () => ({
      recorded_at: '2026-08-29T04:00:00Z',
      classification: 'sinus_rhythm' as const,
      average_heart_rate: 68,
    }));
    listeners.healthKitEcgReadings({ readings });
    await Promise.resolve();
    await Promise.resolve();
    expect(invokeMock).toHaveBeenCalledWith('ingest-wearable', {
      body: { member_id: 'member-1', ecg_readings: readings },
    });
  });

  it('flushes rhythm_events separately from readings', async () => {
    await registerHealthKit('user-1', 'member-1');
    const events = Array.from({ length: FLUSH_BATCH_SIZE }, () => ({
      recorded_at: '2026-08-29T04:00:00Z',
    }));
    listeners.healthKitRhythmEvents({ events });
    await Promise.resolve();
    await Promise.resolve();
    expect(invokeMock).toHaveBeenCalledWith('ingest-wearable', {
      body: { member_id: 'member-1', rhythm_events: events },
    });
  });
```

- [x] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter wellness test healthkit`
Expected: FAIL — `listeners.healthKitSleepSessions` etc. are `undefined` (only `healthKitSamples` is registered today).

- [x] **Step 3: Rewrite `healthkit.ts`**

```typescript
import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import * as Sentry from '@sentry/react';
import { supabase } from './supabase';

// Read-only HealthKit integration: streams new samples from the native
// HealthKitBridge plugin (apps/wellness/ios/App/App/HealthKitBridge.swift)
// into ingest-wearable. Never writes to HealthKit. Best-effort, same posture
// as push.ts -- a member may not own a Watch at all, so permission denial or
// any failure here must never block the app.

export const FLUSH_BATCH_SIZE = 20;

type NumericReadingType =
  | 'heart_rate'
  | 'spo2'
  | 'heart_rate_variability_sdnn'
  | 'resting_heart_rate'
  | 'respiratory_rate'
  | 'walking_speed'
  | 'vo2_max'
  | 'apple_walking_steadiness'
  | 'apple_sleeping_wrist_temperature'
  | 'step_count'
  | 'active_energy_burned'
  | 'distance_walked_running'
  | 'apple_stand_time';

interface HealthKitReading {
  reading_type: NumericReadingType;
  value: number;
  recorded_at: string;
}

interface HealthKitSleepSession {
  started_at: string;
  ended_at: string;
  stage: 'in_bed' | 'asleep_core' | 'asleep_deep' | 'asleep_rem' | 'awake';
}

interface HealthKitECGReading {
  recorded_at: string;
  classification: string;
  average_heart_rate?: number;
}

interface HealthKitRhythmEvent {
  recorded_at: string;
}

interface HealthKitBridgePlugin {
  requestAuthorization(): Promise<{ granted: boolean }>;
  startObserving(): Promise<void>;
  addListener(
    eventName: 'healthKitSamples',
    listenerFunc: (data: { readings: HealthKitReading[] }) => void,
  ): Promise<{ remove: () => void }>;
  addListener(
    eventName: 'healthKitSleepSessions',
    listenerFunc: (data: { sessions: HealthKitSleepSession[] }) => void,
  ): Promise<{ remove: () => void }>;
  addListener(
    eventName: 'healthKitEcgReadings',
    listenerFunc: (data: { readings: HealthKitECGReading[] }) => void,
  ): Promise<{ remove: () => void }>;
  addListener(
    eventName: 'healthKitRhythmEvents',
    listenerFunc: (data: { events: HealthKitRhythmEvent[] }) => void,
  ): Promise<{ remove: () => void }>;
}

const HealthKitBridge = registerPlugin<HealthKitBridgePlugin>('HealthKitBridge');

let readingsQueue: HealthKitReading[] = [];
let sleepQueue: HealthKitSleepSession[] = [];
let ecgQueue: HealthKitECGReading[] = [];
let rhythmQueue: HealthKitRhythmEvent[] = [];
let activeUserId: string | null = null;
let activeMemberId: string | null = null;
let listenersAttached = false;

export function __resetHealthKitStateForTests(): void {
  readingsQueue = [];
  sleepQueue = [];
  ecgQueue = [];
  rhythmQueue = [];
  activeUserId = null;
  activeMemberId = null;
  listenersAttached = false;
}

function queuedCount(): number {
  return readingsQueue.length + sleepQueue.length + ecgQueue.length + rhythmQueue.length;
}

async function flush(): Promise<void> {
  if (queuedCount() === 0 || !activeMemberId) return;
  const body: Record<string, unknown> = { member_id: activeMemberId };
  if (readingsQueue.length) body.readings = readingsQueue;
  if (sleepQueue.length) body.sleep_sessions = sleepQueue;
  if (ecgQueue.length) body.ecg_readings = ecgQueue;
  if (rhythmQueue.length) body.rhythm_events = rhythmQueue;
  readingsQueue = [];
  sleepQueue = [];
  ecgQueue = [];
  rhythmQueue = [];

  const { data, error } = await supabase.functions.invoke('ingest-wearable', { body });
  if (error || !data?.ok) {
    console.error('Failed to ingest wearable readings:', error ?? data);
    Sentry.withScope((scope) => {
      if (activeUserId) {
        scope.setUser({ id: activeUserId });
      }
      scope.setTag('member_id', activeMemberId);
      Sentry.captureException(error ?? new Error('ingest-wearable returned not-ok'));
    });
  }
}

function flushIfBatchFull(): void {
  if (queuedCount() >= FLUSH_BATCH_SIZE) {
    void flush();
  }
}

function attachListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;

  void HealthKitBridge.addListener('healthKitSamples', (data) => {
    readingsQueue.push(...data.readings);
    flushIfBatchFull();
  });
  void HealthKitBridge.addListener('healthKitSleepSessions', (data) => {
    sleepQueue.push(...data.sessions);
    flushIfBatchFull();
  });
  void HealthKitBridge.addListener('healthKitEcgReadings', (data) => {
    ecgQueue.push(...data.readings);
    flushIfBatchFull();
  });
  void HealthKitBridge.addListener('healthKitRhythmEvents', (data) => {
    rhythmQueue.push(...data.events);
    flushIfBatchFull();
  });

  void App.addListener('appStateChange', (state) => {
    if (!state.isActive) {
      void flush();
    }
  });
}

// Called once per signed-in session (see AuthProvider), same call-site shape
// as registerPushToken. No-op on the web build.
export async function registerHealthKit(userId: string, memberId: string): Promise<void> {
  activeUserId = userId;
  activeMemberId = memberId;

  if (!Capacitor.isNativePlatform()) return;

  attachListeners();

  try {
    const { granted } = await HealthKitBridge.requestAuthorization();
    if (!granted) return;
    await HealthKitBridge.startObserving();
  } catch (error) {
    console.error('HealthKit registration failed:', error);
    Sentry.captureException(error);
  }
}
```

- [x] **Step 4: Update the plugin mock and run tests to verify they pass**

In `apps/wellness/src/lib/healthkit.test.ts`, the `mockPlugin.addListener` mock (line 14-17) already keys `listeners` by `eventName` generically, so no change is needed there — it will register `healthKitSleepSessions`/`healthKitEcgReadings`/`healthKitRhythmEvents` the same way it already registers `healthKitSamples`.

Run: `pnpm --filter wellness test healthkit`
Expected: PASS, all tests (the 4 original + 3 new).

- [x] **Step 5: Commit**

```bash
git add apps/wellness/src/lib/healthkit.ts apps/wellness/src/lib/healthkit.test.ts
git commit -m "feat(wellness): route sleep/ECG/rhythm-event batches separately from numeric readings"
```

---

### Task 4: `HealthKitBridge.swift` — generalize streaming quantity types
**Suggested executor:** Claude directly, not delegated — native HealthKit code with no test coverage possible without hardware, per spec.

**Files:**
- Modify: `apps/wellness/ios/App/App/HealthKitBridge.swift`

**Interfaces:**
- Produces: `HealthKitBridge.requestAuthorization(completion:)` (unchanged signature, expanded `readTypes`), `HealthKitBridge.startObserving(onBatch:)` (unchanged signature) — both still consumed by `HealthKitBridgePlugin.swift` (Task 6 extends the plugin further, this task doesn't touch it).

No automated test — HealthKit query behavior cannot be exercised without real hardware (no simulator equivalent for live sensor data or background delivery). Verified in Task 8's real-device pass.

- [x] **Step 1: Rewrite the streaming portion of `HealthKitBridge.swift`**

```swift
import Foundation
import HealthKit

struct HealthKitReading {
    let readingType: String
    let value: Double
    let recordedAt: Date
}

private struct QuantityTypeConfig {
    let type: HKQuantityType
    let unit: HKUnit
    let scale: Double // applied after unit conversion, e.g. fraction -> percent
}

final class HealthKitBridge {
    private let store = HKHealthStore()

    // Streaming types: passively recorded samples, emitted individually via
    // an anchored-object query as they arrive (same shape HR/SpO2 already
    // used). Daily-cumulative, category, and ECG types have their own query
    // shapes -- see the extension in HealthKitBridge+Expansion.swift.
    private lazy var streamingConfigs: [String: QuantityTypeConfig] = [
        "heart_rate": QuantityTypeConfig(
            type: HKQuantityType(.heartRate),
            unit: HKUnit.count().unitDivided(by: .minute()),
            scale: 1.0
        ),
        "spo2": QuantityTypeConfig(
            type: HKQuantityType(.oxygenSaturation),
            unit: HKUnit.percent(),
            scale: 100.0
        ),
        "heart_rate_variability_sdnn": QuantityTypeConfig(
            type: HKQuantityType(.heartRateVariabilitySDNN),
            unit: HKUnit.secondUnit(with: .milli),
            scale: 1.0
        ),
        "resting_heart_rate": QuantityTypeConfig(
            type: HKQuantityType(.restingHeartRate),
            unit: HKUnit.count().unitDivided(by: .minute()),
            scale: 1.0
        ),
        "respiratory_rate": QuantityTypeConfig(
            type: HKQuantityType(.respiratoryRate),
            unit: HKUnit.count().unitDivided(by: .minute()),
            scale: 1.0
        ),
        "walking_speed": QuantityTypeConfig(
            type: HKQuantityType(.walkingSpeed),
            unit: HKUnit.meter().unitDivided(by: HKUnit.second()),
            scale: 1.0
        ),
        "vo2_max": QuantityTypeConfig(
            type: HKQuantityType(.vo2Max),
            unit: HKUnit(from: "ml/(kg*min)"),
            scale: 1.0
        ),
        "apple_walking_steadiness": QuantityTypeConfig(
            type: HKQuantityType(.appleWalkingSteadiness),
            unit: HKUnit.percent(),
            scale: 100.0
        ),
    ]

    // Series 8+/Ultra only -- guarded separately since the type itself can
    // throw on unsupported hardware/OS versions, unlike the types above.
    private var wristTemperatureConfig: QuantityTypeConfig? {
        guard #available(iOS 16.0, *) else { return nil }
        return QuantityTypeConfig(
            type: HKQuantityType(.appleSleepingWristTemperature),
            unit: HKUnit.degreeCelsius(),
            scale: 1.0
        )
    }

    private var allStreamingConfigs: [String: QuantityTypeConfig] {
        var configs = streamingConfigs
        if let wristTemp = wristTemperatureConfig {
            configs["apple_sleeping_wrist_temperature"] = wristTemp
        }
        return configs
    }

    // Anchors persist which samples have already been emitted, so a
    // relaunch resumes from the last-seen sample instead of re-emitting
    // history. UserDefaults is the same underlying storage Capacitor's own
    // Preferences plugin uses on iOS -- this just talks to it directly
    // rather than round-tripping the JS bridge for an internal detail.
    let defaults = UserDefaults.standard
    private func anchorKey(for type: HKQuantityType) -> String {
        "healthkit_anchor_\(type.identifier)"
    }

    func loadAnchor(for type: HKQuantityType) -> HKQueryAnchor? {
        guard let data = defaults.data(forKey: anchorKey(for: type)) else { return nil }
        return try? NSKeyedUnarchiver.unarchivedObject(ofClass: HKQueryAnchor.self, from: data)
    }

    func saveAnchor(_ anchor: HKQueryAnchor?, for type: HKQuantityType) {
        guard let anchor = anchor,
              let data = try? NSKeyedArchiver.archivedData(withRootObject: anchor, requiringSecureCoding: true)
        else { return }
        defaults.set(data, forKey: anchorKey(for: type))
    }

    var healthStore: HKHealthStore { store }

    func requestAuthorization(completion: @escaping (Bool, Error?) -> Void) {
        guard HKHealthStore.isHealthDataAvailable() else {
            completion(false, nil)
            return
        }
        var readTypes: Set<HKObjectType> = Set(allStreamingConfigs.values.map { $0.type })
        readTypes.formUnion(expansionReadTypes())
        store.requestAuthorization(toShare: [], read: readTypes) { granted, error in
            completion(granted, error)
        }
    }

    // Calls back on every new batch of samples for any observed type,
    // forever, until the process ends -- background delivery wakes the app
    // for this.
    func startObserving(onBatch: @escaping ([HealthKitReading]) -> Void) {
        for (readingType, config) in allStreamingConfigs {
            observeStreaming(config: config, readingType: readingType, onBatch: onBatch)
        }
        startExpansionObserving(onBatch: onBatch)
    }

    private func observeStreaming(config: QuantityTypeConfig, readingType: String, onBatch: @escaping ([HealthKitReading]) -> Void) {
        let observerQuery = HKObserverQuery(sampleType: config.type, predicate: nil) { [weak self] _, completionHandler, _ in
            self?.fetchNewStreamingSamples(config: config, readingType: readingType, onBatch: onBatch)
            completionHandler()
        }
        store.execute(observerQuery)
        store.enableBackgroundDelivery(for: config.type, frequency: .immediate) { _, _ in }
    }

    private func fetchNewStreamingSamples(
        config: QuantityTypeConfig,
        readingType: String,
        onBatch: @escaping ([HealthKitReading]) -> Void
    ) {
        let anchor = loadAnchor(for: config.type)
        let query = HKAnchoredObjectQuery(
            type: config.type,
            predicate: nil,
            anchor: anchor,
            limit: HKObjectQueryNoLimit
        ) { [weak self] _, samples, _, newAnchor, _ in
            guard let self, let quantitySamples = samples as? [HKQuantitySample], !quantitySamples.isEmpty else { return }

            let readings = quantitySamples.map {
                HealthKitReading(
                    readingType: readingType,
                    value: $0.quantity.doubleValue(for: config.unit) * config.scale,
                    recordedAt: $0.startDate
                )
            }
            self.saveAnchor(newAnchor, for: config.type)
            onBatch(readings)
        }
        store.execute(query)
    }
}
```

- [x] **Step 2: Commit**

```bash
git add apps/wellness/ios/App/App/HealthKitBridge.swift
git commit -m "feat(ios): generalize HealthKit streaming query to a per-type config table"
```

---

### Task 5: `HealthKitBridge.swift` — daily-cumulative, category, ECG, and fall-risk stub
**Suggested executor:** Claude directly, not delegated — same reasoning as Task 4.

**Files:**
- Create: `apps/wellness/ios/App/App/HealthKitBridge+Expansion.swift`

**Interfaces:**
- Consumes: `HealthKitBridge`'s internal `store`/`healthStore`, `loadAnchor`/`saveAnchor` (now `internal` per Task 4, not `private`, so this extension file in the same module can call them), `HealthKitReading` struct.
- Produces: `HealthKitBridge.expansionReadTypes() -> Set<HKObjectType>` (consumed by Task 4's `requestAuthorization`, already wired), `HealthKitBridge.startExpansionObserving(onBatch:)` (consumed by Task 4's `startObserving`, already wired), plus new struct types `HealthKitSleepSample`, `HealthKitEcgSample`, `HealthKitRhythmSample` and callback-based methods `startObservingSleep(onBatch:)`, `startObservingEcg(onBatch:)`, `startObservingRhythmEvents(onBatch:)` — all consumed by Task 6 (`HealthKitBridgePlugin.swift`).

No automated test — same hardware-only constraint as Task 4. Verified in Task 8.

- [x] **Step 1: Write the extension file**

```swift
// apps/wellness/ios/App/App/HealthKitBridge+Expansion.swift
import Foundation
import HealthKit

struct HealthKitSleepSample {
    let startedAt: Date
    let endedAt: Date
    let stage: String
}

struct HealthKitEcgSample {
    let recordedAt: Date
    let classification: String
    let averageHeartRate: Double?
}

struct HealthKitRhythmSample {
    let recordedAt: Date
}

extension HealthKitBridge {
    // MARK: - Daily-cumulative (steps, active energy, distance, stand time)

    private var dailyCumulativeTypes: [String: HKQuantityType] {
        [
            "step_count": HKQuantityType(.stepCount),
            "active_energy_burned": HKQuantityType(.activeEnergyBurned),
            "distance_walked_running": HKQuantityType(.distanceWalkingRunning),
            "apple_stand_time": HKQuantityType(.appleStandTime),
        ]
    }

    private var dailyCumulativeUnits: [String: HKUnit] {
        [
            "step_count": .count(),
            "active_energy_burned": .kilocalorie(),
            "distance_walked_running": .meterUnit(with: .kilo),
            "apple_stand_time": .minute(),
        ]
    }

    private var sleepType: HKCategoryType { HKCategoryType(.sleepAnalysis) }
    private var rhythmEventType: HKCategoryType { HKCategoryType(.irregularHeartRhythmEvent) }
    private var ecgType: HKElectrocardiogramType { HKElectrocardiogramType() }

    // Called from HealthKitBridge.requestAuthorization -- folds every
    // expansion read type into the same single authorization sheet.
    func expansionReadTypes() -> Set<HKObjectType> {
        var types: Set<HKObjectType> = Set(dailyCumulativeTypes.values)
        types.insert(sleepType)
        types.insert(rhythmEventType)
        types.insert(ecgType)
        return types
    }

    // Called from HealthKitBridge.startObserving.
    func startExpansionObserving(onBatch: @escaping ([HealthKitReading]) -> Void) {
        for (readingType, type) in dailyCumulativeTypes {
            observeDailyCumulative(type: type, readingType: readingType, unit: dailyCumulativeUnits[readingType]!, onBatch: onBatch)
        }
    }

    private func observeDailyCumulative(
        type: HKQuantityType,
        readingType: String,
        unit: HKUnit,
        onBatch: @escaping ([HealthKitReading]) -> Void
    ) {
        let anchorDate = Calendar.current.startOfDay(for: Date())
        let dailyInterval = DateComponents(day: 1)

        let statsQuery = HKStatisticsCollectionQuery(
            quantityType: type,
            quantitySamplePredicate: nil,
            options: .cumulativeSum,
            anchorDate: anchorDate,
            intervalComponents: dailyInterval
        )
        statsQuery.initialResultsHandler = { [weak self] _, results, _ in
            self?.emitTodayStatistic(results, unit: unit, readingType: readingType, onBatch: onBatch)
        }
        statsQuery.statisticsUpdateHandler = { [weak self] _, _, results, _ in
            self?.emitTodayStatistic(results, unit: unit, readingType: readingType, onBatch: onBatch)
        }
        healthStore.execute(statsQuery)
        healthStore.enableBackgroundDelivery(for: type, frequency: .immediate) { _, _ in }
    }

    private func emitTodayStatistic(
        _ results: HKStatisticsCollection?,
        unit: HKUnit,
        readingType: String,
        onBatch: @escaping ([HealthKitReading]) -> Void
    ) {
        guard let results else { return }
        let today = Calendar.current.startOfDay(for: Date())
        guard let stats = results.statistics(for: today), let sum = stats.sumQuantity() else { return }
        onBatch([HealthKitReading(readingType: readingType, value: sum.doubleValue(for: unit), recordedAt: today)])
    }

    // MARK: - Sleep sessions (HKCategoryTypeIdentifier.sleepAnalysis)

    func startObservingSleep(onBatch: @escaping ([HealthKitSleepSample]) -> Void) {
        let observerQuery = HKObserverQuery(sampleType: sleepType, predicate: nil) { [weak self] _, completionHandler, _ in
            self?.fetchNewSleepSamples(onBatch: onBatch)
            completionHandler()
        }
        healthStore.execute(observerQuery)
        healthStore.enableBackgroundDelivery(for: sleepType, frequency: .immediate) { _, _ in }
    }

    private func stageLabel(for value: Int) -> String? {
        switch HKCategoryValueSleepAnalysis(rawValue: value) {
        case .inBed: return "in_bed"
        case .asleepCore: return "asleep_core"
        case .asleepDeep: return "asleep_deep"
        case .asleepREM: return "asleep_rem"
        case .awake: return "awake"
        default: return nil // .asleepUnspecified and any future case -- skip rather than guess
        }
    }

    private func fetchNewSleepSamples(onBatch: @escaping ([HealthKitSleepSample]) -> Void) {
        let anchor = loadAnchor(for: sleepType)
        let query = HKAnchoredObjectQuery(
            type: sleepType,
            predicate: nil,
            anchor: anchor,
            limit: HKObjectQueryNoLimit
        ) { [weak self] _, samples, _, newAnchor, _ in
            guard let self, let categorySamples = samples as? [HKCategorySample], !categorySamples.isEmpty else { return }
            let sessions = categorySamples.compactMap { sample -> HealthKitSleepSample? in
                guard let stage = self.stageLabel(for: sample.value) else { return nil }
                return HealthKitSleepSample(startedAt: sample.startDate, endedAt: sample.endDate, stage: stage)
            }
            self.saveAnchor(newAnchor, for: sleepType)
            if !sessions.isEmpty { onBatch(sessions) }
        }
        healthStore.execute(query)
    }

    // MARK: - Irregular rhythm notifications

    func startObservingRhythmEvents(onBatch: @escaping ([HealthKitRhythmSample]) -> Void) {
        let observerQuery = HKObserverQuery(sampleType: rhythmEventType, predicate: nil) { [weak self] _, completionHandler, _ in
            self?.fetchNewRhythmEvents(onBatch: onBatch)
            completionHandler()
        }
        healthStore.execute(observerQuery)
        healthStore.enableBackgroundDelivery(for: rhythmEventType, frequency: .immediate) { _, _ in }
    }

    private func fetchNewRhythmEvents(onBatch: @escaping ([HealthKitRhythmSample]) -> Void) {
        let anchor = loadAnchor(for: rhythmEventType)
        let query = HKAnchoredObjectQuery(
            type: rhythmEventType,
            predicate: nil,
            anchor: anchor,
            limit: HKObjectQueryNoLimit
        ) { [weak self] _, samples, _, newAnchor, _ in
            guard let self, let categorySamples = samples as? [HKCategorySample], !categorySamples.isEmpty else { return }
            let events = categorySamples.map { HealthKitRhythmSample(recordedAt: $0.startDate) }
            self.saveAnchor(newAnchor, for: rhythmEventType)
            onBatch(events)
        }
        healthStore.execute(query)
    }

    // MARK: - ECG (classification + averaged heart rate only, never raw voltage)
    //
    // Third-party apps can never initiate an ECG -- this only observes a
    // sample the member already took via the Watch's own ECG app.

    func startObservingEcg(onBatch: @escaping ([HealthKitEcgSample]) -> Void) {
        let observerQuery = HKObserverQuery(sampleType: ecgType, predicate: nil) { [weak self] _, completionHandler, _ in
            self?.fetchNewEcgSamples(onBatch: onBatch)
            completionHandler()
        }
        healthStore.execute(observerQuery)
        healthStore.enableBackgroundDelivery(for: ecgType, frequency: .immediate) { _, _ in }
    }

    private func classificationLabel(for classification: HKElectrocardiogram.Classification) -> String {
        switch classification {
        case .sinusRhythm: return "sinus_rhythm"
        case .atrialFibrillation: return "atrial_fibrillation"
        case .inconclusiveLowHeartRate: return "inconclusive_low_heart_rate"
        case .inconclusiveHighHeartRate: return "inconclusive_high_heart_rate"
        case .inconclusivePoorReading: return "inconclusive_poor_reading"
        case .inconclusiveOther: return "inconclusive_other"
        case .unrecognized: return "unrecognized"
        case .notSet: return "not_set"
        @unknown default: return "unknown"
        }
    }

    private func fetchNewEcgSamples(onBatch: @escaping ([HealthKitEcgSample]) -> Void) {
        let anchor = loadAnchor(for: ecgType)
        let query = HKAnchoredObjectQuery(
            type: ecgType,
            predicate: nil,
            anchor: anchor,
            limit: HKObjectQueryNoLimit
        ) { [weak self] _, samples, _, newAnchor, _ in
            guard let self, let ecgSamples = samples as? [HKElectrocardiogram], !ecgSamples.isEmpty else { return }
            let readings = ecgSamples.map { sample in
                HealthKitEcgSample(
                    recordedAt: sample.startDate,
                    classification: self.classificationLabel(for: sample.classification),
                    averageHeartRate: sample.averageHeartRate?.doubleValue(for: .count().unitDivided(by: .minute()))
                )
            }
            self.saveAnchor(newAnchor, for: ecgType)
            onBatch(readings)
        }
        healthStore.execute(query)
    }

    // MARK: - Fall risk / fall detection
    //
    // Walking Steadiness (Group A streaming type, see HealthKitBridge.swift)
    // is the fall-*risk* signal that ships in this pass -- it needs no
    // special entitlement. Real fall-*event* capture needs Apple's
    // CMFallDetectionManager (Core Motion) entitlement, which is a
    // request-and-wait process with Apple -- not obtainable in this
    // session, and its exact API surface (instance vs. type methods,
    // delegate protocol shape) needs verifying against the real SDK in
    // Xcode, not guessed here. Deliberately hardcoded false: this is the
    // one honest no-op stub in this plan, not a shortcut on a task this
    // plan could otherwise finish -- CMFallDetectionManager wiring is a
    // separate, future task gated on Apple's approval, at which point
    // implement it against the actual SDK with autocomplete/docs in hand.
    func fallDetectionAvailable() -> Bool {
        return false
    }
}
```

- [x] **Step 2: Commit**

```bash
git add apps/wellness/ios/App/App/HealthKitBridge+Expansion.swift
git commit -m "feat(ios): add daily-cumulative, sleep, ECG, and rhythm-event HealthKit queries"
```

---

### Task 6: `HealthKitBridgePlugin.swift` — bridge the new query types to JS
**Suggested executor:** Claude directly, not delegated — thin but still native bridging code, same reasoning as Task 4.

**Files:**
- Modify: `apps/wellness/ios/App/App/HealthKitBridgePlugin.swift`

**Interfaces:**
- Consumes: `HealthKitBridge.startObserving(onBatch:)` (Task 4), `startObservingSleep/Ecg/RhythmEvents(onBatch:)` (Task 5).
- Produces: `notifyListeners` events `healthKitSamples` / `healthKitSleepSessions` / `healthKitEcgReadings` / `healthKitRhythmEvents` — must match the event names and payload shapes Task 3's `healthkit.ts` already listens for exactly (`{ readings: [...] }` / `{ sessions: [...] }` / `{ readings: [...] }` / `{ events: [...] }`).

No automated test — thin bridging code, exercised end-to-end in Task 8's real-device pass.

- [x] **Step 1: Rewrite the plugin**

```swift
import Foundation
import Capacitor

@objc(HealthKitBridgePlugin)
public class HealthKitBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthKitBridgePlugin"
    public let jsName = "HealthKitBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startObserving", returnType: CAPPluginReturnPromise),
    ]

    private let healthKitBridge = HealthKitBridge()
    private let isoFormatter = ISO8601DateFormatter()

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        healthKitBridge.requestAuthorization { granted, error in
            if let error = error {
                call.reject(error.localizedDescription)
            } else {
                call.resolve(["granted": granted])
            }
        }
    }

    @objc func startObserving(_ call: CAPPluginCall) {
        healthKitBridge.startObserving { [weak self] readings in
            guard let self else { return }
            let payload = readings.map { reading -> [String: Any] in
                [
                    "reading_type": reading.readingType,
                    "value": reading.value,
                    "recorded_at": self.isoFormatter.string(from: reading.recordedAt),
                ]
            }
            self.notifyListeners("healthKitSamples", data: ["readings": payload])
        }

        healthKitBridge.startObservingSleep { [weak self] sessions in
            guard let self else { return }
            let payload = sessions.map { session -> [String: Any] in
                [
                    "started_at": self.isoFormatter.string(from: session.startedAt),
                    "ended_at": self.isoFormatter.string(from: session.endedAt),
                    "stage": session.stage,
                ]
            }
            self.notifyListeners("healthKitSleepSessions", data: ["sessions": payload])
        }

        healthKitBridge.startObservingEcg { [weak self] readings in
            guard let self else { return }
            let payload = readings.map { reading -> [String: Any] in
                var row: [String: Any] = [
                    "recorded_at": self.isoFormatter.string(from: reading.recordedAt),
                    "classification": reading.classification,
                ]
                if let avgHr = reading.averageHeartRate {
                    row["average_heart_rate"] = avgHr
                }
                return row
            }
            self.notifyListeners("healthKitEcgReadings", data: ["readings": payload])
        }

        healthKitBridge.startObservingRhythmEvents { [weak self] events in
            guard let self else { return }
            let payload = events.map { event -> [String: Any] in
                ["recorded_at": self.isoFormatter.string(from: event.recordedAt)]
            }
            self.notifyListeners("healthKitRhythmEvents", data: ["events": payload])
        }

        call.resolve()
    }
}
```

- [x] **Step 2: Commit**

```bash
git add apps/wellness/ios/App/App/HealthKitBridgePlugin.swift
git commit -m "feat(ios): bridge daily-cumulative, sleep, ECG, and rhythm-event samples to JS"
```

---

### Task 7: `Home.tsx` — wire Steps and Sleep cells
**Suggested executor:** Ollama Cloud (GLM 5.1 implements, Kimi K3 verifies read-only) — bounded UI wiring, per spec.

**Files:**
- Modify: `apps/wellness/src/pages/Home.tsx:41-44` (interfaces), `:82` (state), `:84-156` (fetch), `:431-442` (JSX)

**Interfaces:**
- Consumes: `daily_activity_totals` and `sleep_sessions` tables from Task 1 (read directly via `supabase.from(...)`, same pattern as the existing `heartRate` fetch — no new library code needed).

- [x] **Step 1: Add the new interfaces**

In `apps/wellness/src/pages/Home.tsx`, after the existing `HeartRateRow` interface (lines 41-44):

```typescript
interface StepsRow {
  value: number;
  day: string;
}

interface SleepSegment {
  started_at: string;
  ended_at: string;
}
```

- [x] **Step 2: Add state and a duration formatter**

After `const [heartRate, setHeartRate] = useState<HeartRateRow | null>(null);` (line 82):

```typescript
  const [steps, setSteps] = useState<StepsRow | null>(null);
  const [sleepMinutes, setSleepMinutes] = useState<number | null>(null);
```

After the `latestByType` function (line 55), add:

```typescript
function formatSleepDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}
```

- [x] **Step 3: Add the two queries to the existing `Promise.all`**

In the `Promise.all([...])` array (lines 88-121), after the `wearable_readings` heart-rate query, add two more entries:

```typescript
      supabase
        .from('daily_activity_totals')
        .select('value, day')
        .eq('member_id', selectedMemberId)
        .eq('reading_type', 'step_count')
        .order('day', { ascending: false })
        .limit(1),
      supabase
        .from('sleep_sessions')
        .select('started_at, ended_at')
        .eq('member_id', selectedMemberId)
        .neq('stage', 'awake')
        .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('started_at', { ascending: false }),
```

Update the `.then(([membersRes, profileRes, checkinsRes, vitalsRes, glucoseRes, hrRes]) => {` destructure (line 122) to:

```typescript
    ]).then(([membersRes, profileRes, checkinsRes, vitalsRes, glucoseRes, hrRes, stepsRes, sleepRes]) => {
```

Update the `anyError` check (lines 125-131) to also include `stepsRes.error || sleepRes.error ||`.

After the existing `setHeartRate(hrRows[0] ?? null);` line (142), add:

```typescript
      const stepsRows = (stepsRes.data as StepsRow[] | null) ?? [];
      setSteps(stepsRows[0] ?? null);
      const sleepRows = (sleepRes.data as SleepSegment[] | null) ?? [];
      const totalSleepMinutes = sleepRows.reduce(
        (sum, seg) => sum + (new Date(seg.ended_at).getTime() - new Date(seg.started_at).getTime()) / 60000,
        0,
      );
      setSleepMinutes(sleepRows.length > 0 ? totalSleepMinutes : null);
```

- [x] **Step 4: Wire the JSX cells**

Replace the Steps cell (lines 431-436):

```tsx
        <div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Steps</div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              marginTop: 2,
              color: steps ? undefined : 'var(--text-muted)',
            }}
          >
            {steps ? `${Math.round(steps.value).toLocaleString()} steps` : heartRate ? 'Not tracked yet' : 'Connect a wearable'}
          </div>
        </div>
```

Replace the Sleep cell (lines 437-442):

```tsx
        <div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Sleep</div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              marginTop: 2,
              color: sleepMinutes ? undefined : 'var(--text-muted)',
            }}
          >
            {sleepMinutes
              ? formatSleepDuration(sleepMinutes)
              : heartRate
                ? 'Not tracked yet'
                : 'Connect a wearable'}
          </div>
        </div>
```

- [x] **Step 5: Run the existing test suite**

Run: `pnpm --filter wellness test Home`
Expected: PASS. If no `Home.test.tsx` exists, run `pnpm --filter wellness build` instead to confirm the type changes compile.

- [x] **Step 6: Manual verification against local Supabase**

Insert a fake row via the local Docker stack (`supabase db reset` then `psql` or the Studio UI) into `daily_activity_totals` (`reading_type='step_count'`) and `sleep_sessions` for the seeded member, reload the Wellness app locally, confirm the Home "My activity" card shows real values instead of "Not tracked yet" / "Connect a wearable".

- [x] **Step 7: Commit**

```bash
git add apps/wellness/src/pages/Home.tsx
git commit -m "feat(wellness): wire Home's Steps and Sleep cells to real data"
```

---

### Task 8: Real-device verification pass
**Suggested executor:** Claude directly (or Santhosh) — real-device verification, cannot be delegated to a cloud model with no device access.

**Files:** none (manual verification only)

This task has no automated test by design — HealthKit background delivery, real Watch samples, and a real ECG reading cannot be produced or verified in a simulator. This mirrors the existing 2026-08-20 precedent, where real-device testing caught two bugs (unregistered plugin, baked-in localhost URL) invisible to unit tests, code review, and an unsigned build.

- [ ] **Step 1: Build and install on a real device**

Run: `pnpm --filter wellness build && npx cap sync ios`, then build/run `apps/wellness/ios/App` on Santhosh's paired iPhone from Xcode (not the simulator).

- [ ] **Step 2: Verify the HealthKit authorization sheet lists every new type**

Sign in, trigger `registerHealthKit` (existing call site, `AuthProvider.tsx:199`), confirm the system permission sheet lists HRV, resting heart rate, respiratory rate, walking speed, VO2 max, walking steadiness, wrist temperature (if the device supports it), step count, active energy, distance, stand time, sleep analysis, ECG, and irregular rhythm notifications, in addition to the existing heart rate and SpO2.

- [ ] **Step 3: Verify streaming quantity types (Task 4)**

For each of HRV, resting heart rate, respiratory rate, walking speed, VO2 max, walking steadiness: confirm the Watch's stock Health app has recorded at least one sample recently (or trigger one, e.g. a short walk for walking speed), then query the corresponding table directly:

```sql
select reading_type, value, recorded_at from wearable_readings
where member_id = '<real member id>' and reading_type in
  ('heart_rate_variability_sdnn','resting_heart_rate','respiratory_rate','walking_speed','vo2_max','apple_walking_steadiness')
order by recorded_at desc limit 20;
```

Expected: rows appear within a few minutes of the Watch recording a sample (subject to iOS's own background-delivery batching, same caveat as HR/SpO2 today).

- [ ] **Step 4: Verify daily-cumulative types (Task 5)**

Walk around with the Watch on, then query:

```sql
select reading_type, day, value from daily_activity_totals where member_id = '<real member id>' order by day desc;
```

Expected: `step_count` and `distance_walked_running` rows for today, updating (not duplicating) as the day progresses — confirm by querying twice, an hour apart, and checking the row count for today's `day` stays at exactly one per `reading_type`.

- [ ] **Step 5: Verify sleep sessions (Task 5)**

After a real night's sleep with the Watch worn, query:

```sql
select started_at, ended_at, stage from sleep_sessions where member_id = '<real member id>' order by started_at desc;
```

Expected: multiple rows covering the night with a mix of `asleep_core`/`asleep_deep`/`asleep_rem`/`awake` stages. Then reload the Wellness app's Home screen and confirm the Sleep cell shows a real duration (e.g. "7h 20m"), not "Not tracked yet".

- [ ] **Step 6: Verify ECG (Task 5)**

Take a real ECG via the Watch's own ECG app (not this app — confirm the app has no ECG-taking UI, per the design's explicit constraint), then query:

```sql
select recorded_at, classification, average_heart_rate from ecg_readings where member_id = '<real member id>' order by recorded_at desc limit 5;
```

Expected: one row with a real classification (e.g. `sinus_rhythm`) and a plausible `average_heart_rate`. Confirm `raw_payload` is null/absent — no voltage data stored.

- [ ] **Step 7: Verify Home's Steps cell with real data**

Reload the Home screen after Step 4's walk, confirm the Steps cell shows the real step count matching what the Watch's own Fitness/Health app reports for today (within a reasonable margin — exact parity isn't guaranteed since HealthKit's own dedup logic, not this pipeline, resolves Watch/iPhone overlap).

- [ ] **Step 8: Confirm rhythm-event and fall-risk paths don't crash**

Irregular rhythm notifications and real fall events are rare/hard to trigger on demand — full functional verification of `rhythm_events` ingestion isn't possible in a single session. Instead: confirm `fallDetectionAvailable()` (Task 5) returns `false` on the test device (expected, since the entitlement hasn't been granted) and that this does not crash, throw, or block `startObserving` from completing for every other type.

- [ ] **Step 9: Fix any bugs found, then re-run the relevant steps above**

If any step above fails, fix the code in the relevant task's file, re-run that step, and re-verify neighboring steps that share the same query/observer path before considering this task done.

- [ ] **Step 10: Commit any fixes**

```bash
git add -A
git commit -m "fix(ios): real-device fixes found during wearable-expansion verification pass"
```
