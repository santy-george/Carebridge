# Wearable Readings Expansion — Design

2026-08-29. Extends the 2026-08-20 HealthKit integration (heart rate + SpO2 only) to the rest of what Apple Watch can produce. Scope: collect everything HealthKit exposes without a special entitlement, plus scaffold the one thing that needs an entitlement (fall detection) behind a no-op capability check. Display stays minimal — only fills the two empty cells the Home UI already has; everything else lands in the database, undisplayed, for later use.

## Context

`Home.tsx`'s "My activity" card has three cells: Heart rate (wired 2026-08-20), Steps, Sleep — both still showing "Not tracked yet" placeholders. Separately, the product has a much larger untapped surface: Apple Watch/HealthKit can supply HRV, resting HR, respiratory rate, walking speed, VO2max, steps, active energy, distance, stand time, sleep stages, wrist temperature (Series 8+/Ultra), Walking Steadiness (a fall-*risk* score), ECG classification, and irregular-rhythm notifications. Only heart_rate/spo2 are wired today (`HealthKitBridge.swift`, `healthkit.ts`, `ingest-wearable`, `wearable_readings`).

User decisions locked for this pass (2026-08-29 conversation):
- Include ECG, irregular-rhythm (AFib) notifications, and fall-risk/fall-detection — reopening the prior "fall detection is V1.1, don't architect around it" note explicitly, not by drift.
- Non-numeric readings (sleep, ECG, rhythm events) get their own tables, not jammed into `wearable_readings`.
- Wire Home UI's two empty cells (Steps, Sleep) first; everything else is collect-only, no new UI, matching the product's own framing ("even if not displayed... decide to display elsewhere if required").

## Reading inventory

**Group A — numeric, extend `wearable_readings`** (existing table already has `raw_payload jsonb`, `reading_type` is free text with no CHECK constraint — no schema migration needed for this group, only the Edge Function's allowlist and the Swift/TS types):

| reading_type | Query shape | Notes |
|---|---|---|
| `heart_rate` | streaming (done) | |
| `spo2` | streaming (done) | |
| `heart_rate_variability_sdnn` | streaming | ms |
| `resting_heart_rate` | streaming | bpm |
| `respiratory_rate` | streaming | breaths/min |
| `walking_speed` | streaming | m/s |
| `vo2_max` | streaming | infrequent samples |
| `apple_walking_steadiness` | streaming | %, fall-*risk* signal, no entitlement needed |
| `apple_sleeping_wrist_temperature` | streaming | Series 8+/Ultra only — availability-gated at authorization time |
| `step_count` | **daily cumulative** — own table | see below |
| `active_energy_burned` | **daily cumulative** — own table | kcal |
| `distance_walked_running` | **daily cumulative** — own table | km |
| `apple_stand_time` | **daily cumulative** — own table | hours |

Streaming types reuse the existing `HKObserverQuery` + `HKAnchoredObjectQuery` + per-type anchor pattern from `HealthKitBridge.swift`, generalized to a per-type unit/scale table instead of the current heart_rate/spo2 if-else.

Daily-cumulative types are a different query shape and a real correctness risk if built as a copy-paste of the streaming path: Watch and iPhone can both log steps for the same interval, and summing raw anchored samples double-counts. Use `HKStatisticsCollectionQuery` (day-bucketed by the iPhone's local calendar day/timezone — the phone the member actually carries, not UTC or server time, `.cumulativeSum`, HealthKit's own built-in dedup across overlapping sources), one row per calendar day, upserted as the day's total updates.

**Own table, not `wearable_readings`:** upserting needs a real unique constraint for PostgREST's `on_conflict` to target, and Postgres/PostgREST can't use a *partial* unique index as an upsert arbiter (which is what scoping the constraint to just these 4 `reading_type` values inside `wearable_readings` would require). A dedicated `daily_activity_totals` table (`member_id`, `reading_type`, `day date`, `value`, unique on `(member_id, reading_type, day)`) sidesteps that cleanly — same reasoning already applied to sleep/ECG/rhythm: shape doesn't fit, give it its own table. The client is unaffected: these 4 types still travel in the same `readings` array as every other Group A type: the Edge Function routes each row to `wearable_readings` (insert) or `daily_activity_totals` (upsert) based on its `reading_type`.

**Group B — non-numeric, own tables:**

| Table | Columns | Source HealthKit type |
|---|---|---|
| `sleep_sessions` | `member_id`, `device_vendor`, `started_at`, `ended_at`, `stage` (`in_bed`/`asleep_core`/`asleep_deep`/`asleep_rem`/`awake`), `raw_payload jsonb`, `ingested_at` | `HKCategoryTypeIdentifier.sleepAnalysis` |
| `ecg_readings` | `member_id`, `device_vendor`, `recorded_at`, `classification` (`sinus_rhythm`/`atrial_fibrillation`/`inconclusive_*`/etc), `average_heart_rate`, `raw_payload jsonb`, `ingested_at` | `HKElectrocardiogramType` — classification + averaged HR only, **not** raw voltage (no product need, meaningfully larger payload, no display use for it) |
| `rhythm_events` | `member_id`, `device_vendor`, `recorded_at`, `raw_payload jsonb`, `ingested_at` | `HKCategoryTypeIdentifier.irregularHeartRhythmEvent` |

All three get the same RLS shape already on `wearable_readings`: `can_access_member` for read, no client-writable insert policy (writes only via the Edge Function's service_role client, same check-first-then-bypass pattern as `ingest-wearable` and `erase-consent-withdrawal`).

**ECG mechanics** — third-party apps can never *initiate* an ECG; the member takes one via the Watch's own ECG app. Our pipeline only observes for new `HKElectrocardiogramType` samples passively, identical shape to every other streaming type. No ECG-taking UI in our app.

**Fall detection — entitlement-gated, not built this pass:** real fall-event capture needs Apple's `CMFallDetectionManager` entitlement, which requires an Apple-approved request — not obtainable in this session. This pass ships Walking Steadiness (Group A, no entitlement) as the fall-*risk* signal available today, and adds a capability-check stub in `HealthKitBridge.swift` (`if CMFallDetectionManager.isSupported && <entitlement present>`) that no-ops until the entitlement is granted. Filing the actual entitlement request with Apple is Santhosh's action (Developer account), not something this plan executes. Once granted, real fall events write to `sos_alerts` (`alert_type='fall_detected'`) per the original Workstream C scope note — not a new table, no design change needed later.

## Architecture

```
Apple Watch (stock apps + member-initiated ECG)
   ↓ Apple's own Watch↔iPhone HealthKit sync
iPhone HealthKit store
   ↓ HealthKitBridge.swift — per-type: streaming (anchored) | daily-cumulative (statistics) | category (sleep/rhythm) | ECG
Wellness iOS app (healthkit.ts — batches, routes by payload shape)
   ↓ authenticated POST, batched
ingest-wearable Edge Function
   ↓
wearable_readings (Group A streaming) | daily_activity_totals (Group A cumulative) | sleep_sessions | ecg_readings | rhythm_events
```

## Native plugin changes (`HealthKitBridge.swift`)

- `requestAuthorization()` — extend `readTypes` to the full Group A + B set. One authorization sheet, same call site (`AuthProvider.tsx`), still best-effort/silent-no-op on denial — a member may not own a Watch, and even Watch owners may decline individual types.
- Generalize the existing `observe(type:readingType:onBatch:)` to a per-type unit-conversion table instead of the current `readingType == "heart_rate" ? ... : ...` branch — adding a type should be a table entry, not a new if-branch.
- New `observeDailyCumulative(type:readingType:onBatch:)` using `HKStatisticsCollectionQuery`, day-anchored, emits one upsert-shaped row per day per type.
- New `observeCategory(type:readingType:onBatch:)` for sleep stages and rhythm events — different sample class (`HKCategorySample`, has a `value` enum and a start/end interval, not a single quantity+timestamp).
- New ECG observer on `HKElectrocardiogramType`, reading `classification` + `averageHeartRate` off each sample (no `HKElectrocardiogramQuery` voltage walk — not storing raw waveform).
- Availability guards: wrist-temperature type doesn't exist pre-Series 8; check `HKQuantityType(.appleSleepingWristTemperature)` availability before adding to `readTypes`, matching how the codebase already treats "may not own a Watch" as a normal state, not an error.

## `healthkit.ts` / bridge JS changes

- Extend `HealthKitReading` union to the full Group A `reading_type` list.
- Add `HealthKitSleepSession`, `HealthKitECGReading`, `HealthKitRhythmEvent` interfaces.
- Plugin emits are routed by payload shape into separate in-memory queues (numeric readings vs sleep vs ECG vs rhythm), each flushed on the same batch-size-20-or-background trigger as today, but as separate arrays in one `ingest-wearable` POST body (not four separate round-trips).

## `ingest-wearable` Edge Function changes

- Extend `ALLOWED_READING_TYPES` to the full Group A list.
- Payload becomes `{ member_id, readings?: [...], sleep_sessions?: [...], ecg_readings?: [...], rhythm_events?: [...] }` — all optional, at least one non-empty array required. Same ownership check (member_id ↔ caller JWT via `member_links`) gates all four before any insert. Client shape is unchanged for the daily-cumulative types — they still travel inside `readings`.
- Within `readings`, split server-side by `reading_type`: the 4 daily-cumulative types upsert into `daily_activity_totals` (`on_conflict: 'member_id,reading_type,day'`, `day` derived from each row's `recorded_at`), everything else inserts into `wearable_readings` as today.
- Each of the four payload arrays validated and inserted independently; a malformed row in one array doesn't block the others (matches the existing "HTTP 207 partial failure" posture used in `erase-consent-withdrawal`, applied here for consistency rather than an all-or-nothing 400).
- `device_vendor` still hardcoded server-side, never client-supplied, unchanged from today.

## Home UI (Phase 1 — do first)

`Home.tsx`'s Steps and Sleep cells get the exact display pattern the Heart rate cell already uses (`{value ? formatted : heartRate ? 'Not tracked yet' : 'Connect a wearable'}`): Steps from `daily_activity_totals`' latest `step_count` row. Sleep from the most recent night's `sleep_sessions` rows (all non-`awake` rows from the last 24h, summed) shown as total duration — stage breakdown not surfaced yet. No other Home changes.

## Everything else — collect only

HRV, resting HR, respiratory rate, walking speed, VO2max, walking steadiness, wrist temperature, active energy, distance, stand time, sleep stage detail, ECG, rhythm events: land in the database via the same pipeline, no UI this pass. Confirmed with the user as the explicit intent — decide what to surface, and where (Health screen vs Admin vs neither), later.

## Ollama Cloud delegation

Reuse the standing pattern (GLM 5.1 implements, Kimi K3 verifies read-only via `--disallowedTools`, isolated worktree, human merge call) for:
- The `daily_activity_totals`/`sleep_sessions`/`ecg_readings`/`rhythm_events` table migrations + RLS (mechanical SQL).
- `ingest-wearable` payload/allowlist extension.
- `healthkit.ts` type/interface extension and queue-routing.
- `Home.tsx` Steps/Sleep wiring.

**Not delegated — done directly, real-device verified:** all of `HealthKitBridge.swift` (unit conversions, per-type anchor persistence, the streaming/daily-cumulative/category/ECG query-shape split, availability guards, the fall-detection capability stub). No test coverage is possible for this layer without real hardware, and a prior GLM run fabricated patient vitals on a HealthKit-adjacent task — unacceptable on code that touches real member health data.

## Testing

- Unit: `ingest-wearable`'s per-array validation and ownership-check logic (valid member, wrong member, unlinked user, malformed row in one array not blocking others).
- pgTAP: RLS on the two new tables (member-owns-write-none, coordinator-reads-assigned, unrelated-member-denied) — same shape as the existing `wearable_readings` suite.
- Real-hardware pass on Santhosh's Watch/phone for every new Swift query type — matches the 2026-08-20 precedent, where real-device testing caught two bugs (plugin never registered, baked-in localhost URL) invisible to unit tests, code review, or an unsigned build. ECG and sleep specifically need real samples (Watch ECG app, actual sleep tracked overnight) — can't be faked in a simulator.

## Explicitly out of scope for this pass

Real fall-event capture (entitlement-gated, stub only), any UI beyond Home's Steps/Sleep cells, ECG-taking UI (impossible for a third-party app), raw ECG voltage storage, Android/Health Connect (separate device tier, already scoped separately in Workstream C), watchOS app target, multi-family rollout/feature-flagging.
