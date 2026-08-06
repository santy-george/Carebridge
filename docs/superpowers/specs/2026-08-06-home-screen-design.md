# Home / Vitals Screen Design

**Goal:** Rebuild the Wellness App's Home screen (`wellness-app/Home.dc.html`) as a real React screen in `apps/wellness/src`, wired to Supabase — the first of six Phase 2 screen ports (Home, Check-in, Meds, Care, Records, SOS), each its own spec/plan/build cycle. Also establishes the authenticated app shell (top bar + bottom nav) that every subsequent screen reuses.

## Context

`apps/wellness/src/App.tsx` is currently a placeholder scaffold (a "design-system pipeline check" card) rendered at `/`. Auth (Login/Signup/LinkMember, `AuthProvider`, route guards) is already built and merged. This task replaces the placeholder with the real authenticated app shell and Home screen content.

The static mockup (`wellness-app/Home.dc.html`) mixes real, schema-backed data with hardcoded design flourish that has no real data source yet (wearable-fed metrics, an undefined scoring algorithm). This spec resolves each of those gaps explicitly rather than porting the mockup verbatim.

## Navigation IA (verified against the actual mockup set, not assumed)

Bottom nav is identical markup across every mockup screen that has one: **Summary (Home) / My Health / My Schedule / My Care / More**. This spec uses those exact labels and the same tab order — not the Notion rollout plan's shorthand ("Check-in", "Meds"), which doesn't match the actual design.

- **My Health** (`Health.dc.html`) — vitals/glucose/BMI *history* (graphs, past entries). Separate from Home, which only shows the latest snapshot + a quick-log form.
- **My Schedule** (`Medications.dc.html`) — medications.
- **My Care** (`Care.dc.html`) — care team.
- **More** (`More.dc.html`) — contains a "My documents" section (Records lives here, not as its own nav tab), plus profile/settings/sign-out.
- **Top bar** (from `Home.dc.html`): logo, Emergency icon → `Emergency.dc.html` (SOS), Meds bell (lit when any `med_stock` item is low) → `Medications.dc.html`, avatar → `Profile.dc.html`.

**Gap in the actual design:** `CheckIn.dc.html` is not linked from any other mockup screen — no nav entry, no CTA anywhere. This spec does not invent one. A Check-in entry point (e.g. a Home card) is added when Check-in's own spec/plan cycle happens, not here.

Every non-Home nav destination (`/health`, `/medications`, `/care`, `/more`, `/sos`, `/profile`) is a trivial stub route this cycle — a single shared `ComingSoon` component rendering a heading + "Coming soon" — so the nav is fully clickable and never breaks. Each screen's own future cycle replaces its stub; the shell itself does not change.

## Scope resolution (mockup vs. real data)

| Mockup section | Resolution |
|---|---|
| "My activity" (heart rate/steps/sleep) | **Static placeholder cards**, no query, no manual entry — wearable-fed data with no pipeline yet (Workstream C, separate). Card text: "Connect a wearable to see this." |
| "Overall Score" hero ring | **Built with empty state.** Reads latest `checkins.wellness_score`; shows "No check-in yet" / empty ring when none exists (Check-in screen that populates this doesn't exist yet). |
| "My vitals" row (BP/Glucose/SpO2 gauge rings) | **Built as real gauge rings** against defined clinical bands (below) — not the mockup's undefined hardcoded percentages. |
| Blood glucose card | **Built as-is**, reusing the mockup's own fasting/pre-meal/post-meal/bedtime classification thresholds verbatim (medically reasonable ADA-style cutoffs already present in the mockup's JS). |
| "My Body" (BMI) card | **Built as-is**, reusing the mockup's BMI formula and WHO category thresholds (Underweight <18.5, Normal 18.5–24.9, Overweight 25–29.9, Obese ≥30) verbatim. |
| "Fixed quick actions (Hydration, Journal)" (mentioned in Notion's plan text, absent from the mockup) | **Cut.** No mockup, no schema table, no spec for behavior. |

### Vital gauge clinical bands (new — not in the mockup, needed for real gauges)

- **Blood pressure** (systolic only shown, matches mockup's single-value display): <120 Normal, 120–139 Elevated, ≥140 High. Gauge fill = `min(value, 180) / 180` for visual purposes only (not a clinical percentage).
- **SpO2**: ≥95% Normal, <95% Low. Gauge fill = reading value directly (already a percentage).
- **Glucose** (in the vitals-row ring only — the dedicated glucose card below has its own full context-aware chip): status computed via the same `classifyGlucose(value, context)` logic as the glucose card, using the most recent `glucose_readings` row's own context. Gauge fill = `min(value, 200) / 200`.

## Data model (all queries scoped to `selectedMemberId` from `useAuth()`)

- `medical_profile` — `select conditions, conditions_other, allergies where member_id = :id` (`.maybeSingle()`)
- `checkins` — `select wellness_score, checkin_date where member_id = :id order by checkin_date desc limit 1`
- `vitals_readings` — `select vital_type, value, value_secondary, recorded_at where member_id = :id and vital_type in ('blood_pressure','spo2_pct','weight_kg','height_cm') order by recorded_at desc` (client picks the latest row per `vital_type` from the result set)
- `glucose_readings` — `select value_mg_dl, context, reading_date, reading_time where member_id = :id order by reading_date desc, reading_time desc limit 1` (latest, for both the vitals-row ring and the dedicated card)
- `med_stock` — `select qty, doses_per_day where member_id = :id` (client computes `hasLowStockAlert` via `floor(qty / doses_per_day) <= 7`, same rule as the mockup)

All five queries fire in parallel via `Promise.all` inside a `useEffect` keyed on `selectedMemberId`, re-running whenever the member switcher changes selection.

**Writes** (all via the existing `member_owns` + `source='manual'` RLS policies, no new policies needed):
- Glucose log form → insert into `glucose_readings` (`member_id`, `reading_date` = today, `reading_time` = now, `value_mg_dl`, `context`)
- BMI form → insert two `vitals_readings` rows (`vital_type='weight_kg'` and `'height_cm'`, `source='manual'`, `recorded_at` = now) on one submit

## Components

- `apps/wellness/src/shell/AppShell.tsx` — new. Top bar + bottom nav + `<Outlet />`. Wraps all authenticated routes in `main.tsx`, replacing the current bare `RequireAuth` → `App` mount. Reads `memberLinks`/`selectedMemberId`/`selectMember` from `useAuth()` for the bell's low-stock query (member-scoped) — the member switcher itself moves into the More stub page, not the top bar.
- `apps/wellness/src/shell/ComingSoon.tsx` — new. Trivial shared stub: heading (passed as a prop) + "Coming soon" body text.
- `apps/wellness/src/pages/Home.tsx` — new. All the data-fetching and card rendering described above. Replaces `App.tsx`'s current placeholder content.
- `apps/wellness/src/pages/Home.module.css` or additions to `packages/design-system` — gauge ring, score ring, and card layout styles ported from the mockup's inline styles into real CSS, following this repo's existing convention (`packages/design-system/src/mobile.css`, no raw hex, use existing tokens) — no new design tokens invented, only reuse of what's already in `packages/design-system`.

`App.tsx` itself is deleted; `main.tsx`'s route tree mounts `AppShell` (with `Home` as its index route) instead.

## Error handling

- Per-card independence: a missing row for one query (e.g. no medical profile yet) renders that card's empty state without blocking the others — no single `if (loading) return null` gate for the whole screen beyond the very first paint.
- One skeleton state during the initial parallel fetch (all five queries), then cards render independently from there.
- A thrown/rejected query (network failure, unexpected RLS denial) surfaces as a dismissible inline banner at the top of the scroll area — shell chrome (top bar, bottom nav) stays interactive regardless.
- Form submission failures (glucose/BMI insert) show an inline error under the relevant form, matching the `form-error` class pattern already established in `Login.tsx`/`Signup.tsx`/`LinkMember.tsx`.

## Testing

Vitest + React Testing Library, mocking the `supabase` client the same way `AuthProvider.test.tsx` and `LinkMember.test.tsx` already do (no real network calls). Coverage:
- Each card's empty-state rendering (no medical profile, no check-in, no vitals, no glucose, no weight/height)
- Each card's populated-state rendering with representative fixture data
- Glucose form submit → correct `glucose_readings` insert payload (value, context, date/time)
- BMI form submit → correct two-row `vitals_readings` insert payload
- BMI category function: boundary values at 18.5 / 25 / 30
- Blood-pressure/SpO2/glucose gauge status classification: boundary values at each band edge
- Low-stock bell dot: on/off at the `floor(qty/doses_per_day) <= 7` boundary
- `AppShell` nav: all 5 tabs render, correct `href`/route targets, active-tab styling on the current route
- `ComingSoon` stub: renders for each of the 5 stub routes without crashing
