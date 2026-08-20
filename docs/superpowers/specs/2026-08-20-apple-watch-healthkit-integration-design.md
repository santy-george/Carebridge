# Apple Watch HealthKit Integration — Design

2026-08-20. Workstream C (wearable pipeline), first real build. Scope: **vitals only** (heart rate, SpO2) for V1 — fall detection explicitly deferred to V1.1 per the existing Notion note not to architect V1 around `CMFallDetectionManager`. Ships to Santhosh's own paired Watch/iPhone only; not gated behind a feature flag since no other pilot family has hardware yet.

## Context

Care Bridge Home's wearable plan (Notion, Workstream C) recommends Apple Watch SE2 via a Carebridge-built HealthKit companion app for iOS families. `wearable_readings` (schema, `20260805091900_checkins_vitals_wearables.sql`) already exists for this: `member_id`, `device_vendor`, `device_id`, `reading_type`, `value`, `raw_payload`, `recorded_at`, RLS'd read-only for members/coordinators, with an explicit comment that writes only ever come from a service_role Edge Function, never the app directly. This design fills that Edge Function in, plus the client-side path that feeds it.

## Approach

Apple Watch already passively records heart rate continuously and SpO2 periodically into HealthKit via its own stock apps — no custom watchOS app is required to produce this data. So this integration is **read-only HealthKit access from the existing Wellness iOS app**, not a new watchOS app target. Two alternatives were considered and rejected for V1:
- A custom watchOS companion app (WatchConnectivity relay) — more control/live-on-watch-face display, but a second Xcode target and App Store surface not justified until Approach A's background-delivery latency proves insufficient in practice.
- A standalone cellular watchOS app talking to Supabase directly — removes iPhone-proximity dependency, but requires the cellular SE2 variant (not guaranteed for pilot families) and its own on-watch auth; overkill for vitals monitoring.

## Architecture

```
Apple Watch (stock Health/Blood Oxygen apps, passive sampling)
   ↓ (Apple's own Watch↔iPhone HealthKit sync — nothing we build)
iPhone HealthKit store
   ↓ (new: native Capacitor plugin, HKObserverQuery + background delivery)
Wellness iOS app (JS side, via new plugin bridge)
   ↓ (new: authenticated POST, batched)
ingest-wearable Edge Function
   ↓
wearable_readings table (existing, RLS'd, already feeds the Health screen path)
```

## Native plugin

No third-party Capacitor HealthKit plugin — a small custom one in `ios/App`, same pattern used for the `AppDelegate.swift` push-relay fix (`748399e`). Health data going through an unaudited community plugin is a trust decision, not a convenience one, and the actual surface needed here is small.

`HealthKitBridge.swift` + `HealthKitBridgePlugin.swift`, registered alongside the existing Push/Preferences native plugins:
- `requestAuthorization()` — **read-only** access to `HKQuantityType.heartRate` and `HKQuantityType.oxygenSaturation`. Never writes to HealthKit.
- `startObserving()` — `HKObserverQuery` + `HKAnchoredObjectQuery` per type with `enableBackgroundDelivery`; emits new-sample batches to JS via a Capacitor plugin event (matches the existing `addListener` pattern in `push.ts`), since samples can arrive while backgrounded.

JS side: `apps/wellness/src/lib/healthkit.ts`, mirrors the shape of `push.ts`. Listens for the plugin event, batches, POSTs to `ingest-wearable`. Registration triggers once per signed-in session from `AuthProvider.tsx`, same call site as `registerPushToken()` — best-effort, never blocks app load, permission denial is a silent no-op (a member may not own a Watch at all).

**Entitlements/capability check before assuming this works:** `com.apple.developer.healthkit` + `com.apple.developer.healthkit.background-delivery` entitlements, `NSHealthShareUsageDescription` in `Info.plist`, and — per the exact bug just hit with push — verify the HealthKit capability is actually enabled on the `com.carebridgehome.wellness` App ID in the Developer portal, not just requested in the local entitlements file.

## Ingestion Edge Function (`ingest-wearable`)

Different trust model than `send-push`/`send-email`. Those are service_role-*only*-caller functions, invoked only by privileged server-side code, never by a member's own client. `ingest-wearable`'s legitimate caller **is** the member's own phone, reporting the member's own health data — so it takes the member's normal user JWT, not a service_role JWT, as input. Internally:

1. Verify the JWT is a real signed-in user (platform `verify_jwt`).
2. Look up which `member_id` that user is linked to (`member_links`) and confirm it matches the `member_id` in the payload — a member can only ingest readings for the member(s) they're actually linked to, never an arbitrary id.
3. Only then insert via its own service_role client — check-first-then-bypass-RLS, same pattern as `erase-consent-withdrawal`.

Payload: `{ member_id, readings: [{ reading_type: 'heart_rate' | 'spo2', value, recorded_at }] }`, batched — the plugin batches client-side (every N samples or on a foreground/background transition, whichever first), not one request per sample. Server-side: `device_vendor` is hardcoded to `'apple_watch'`, never client-supplied. `reading_type` is allowlisted to exactly `heart_rate`/`spo2` — this endpoint is not a general wearable intake, only what this specific integration produces.

## Sync, dedup, and error handling

- Background delivery frequency is OS-controlled (`HKUpdateFrequency.immediate` requested, but iOS still batches/throttles per its own background power budget) — readings arrive in bursts, not real-time. Expected, not a bug.
- Dedup: the plugin persists each query's HealthKit anchor via Capacitor Preferences (same storage already used for session/member-selection), so relaunches resume from the last-seen sample instead of re-emitting history.
- HealthKit permission denied → silent no-op, same posture as push.
- `ingest-wearable` ownership-check failure → 403, logged to Sentry (mirrors `service_role required` in `send-push`).
- Anchor-persistence failure → falls back to HealthKit's earliest-available-date bound rather than crashing; a duplicate ingest is assumed harmless since the Health screen aggregates by day, not exact sample count — **confirm this assumption during implementation**, not a hard blocker on the design.
- Network failure on flush → batch stays queued in memory, retried on next flush trigger. Not persisted across app kills for V1 — a missed batch during an offline period is an acceptable loss for vitals monitoring (unlike SOS-grade data, which has its own separate path).

## Testing

- Unit: `ingest-wearable`'s ownership-check logic (valid member, wrong member, unlinked user).
- Real-hardware test on Santhosh's Watch/phone is the actual proof — no meaningful simulator equivalent for HealthKit background delivery.

## Explicitly out of scope for this pass

Fall detection (deferred to V1.1 per existing Notion note), Android/Health Connect bridge (separate device tier, already scoped separately in Workstream C), any watchOS app target, live data display on the watch face, multi-family rollout/feature-flagging.
