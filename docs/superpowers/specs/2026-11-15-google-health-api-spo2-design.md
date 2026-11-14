# Google Health API: SpO2 (and background vitals) for Fitbit members — design

Date: 2026-11-15. Status: proposed, not approved.

## Why

The Fitbit Versa 4 records SpO2 (a nightly average; 96% on 14 Nov), but the Google Health
app never writes SpO2 to Health Connect, so the Android reader built today cannot get it
(verified on the Oppo A6X: permission granted, zero rows). The earlier spec called the Fitbit
cloud route "closed"; only the *legacy* Fitbit Web API closed. Its successor, the
**Google Health API**, serves SpO2 from Google's servers.

Second benefit: the cloud route is a server-side pull. Health Connect data only reaches us when
the member opens the app; a server pull runs on a schedule whether or not the phone is touched,
which is what family/coordinator monitoring needs.

## Facts (from Google's discovery document and docs, 2026-11-15)

- Base URL `https://health.googleapis.com/v4`, OAuth 2.0 bearer token.
- List: `GET /v4/users/me/dataTypes/{type}/dataPoints?filter=...&pageSize=...&pageToken=...`
  (default page 1,440, max 10,000; `nextPageToken` empty when done).
- SpO2 types:
  - `daily-oxygen-saturation` → `dailyOxygenSaturation { date{year,month,day}, averagePercentage,
    lowerBoundPercentage, upperBoundPercentage, standardDeviationPercentage }`, computed from
    validated sleep readings. Filter: `daily_oxygen_saturation.date >= "YYYY-MM-DD"`.
  - `oxygen-saturation` → minute samples `{ sampleTime, percentage }`, aggressively filtered
    (gaps expected). Filter: `oxygen_saturation.sample_time.physical_time >= "<RFC3339>"`.
- Scope: `https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly`
  (also covers heart rate, respiratory rate, temperature, glucose, weight). Sleep needs
  `googlehealth.sleep.readonly`; steps/activity `googlehealth.activity_and_fitness.readonly`.
- **Verification:** Google Health API scopes are restricted. **Unverified apps are capped at 100
  users** (enough for the pilot). Beyond 100: Trust & Safety review plus an annual CASA security
  assessment by a third-party assessor, US$500–4,500, 2–6 weeks, plus a required in-app
  disclosure. Not a blocker to start; a cost and timeline before scale.
- Legacy Fitbit Web API turn-off date varies across Google's pages (Sep 30 / Oct 30 / Nov 2, 2026);
  irrelevant here, we never use it.

## Goals

1. A member with a Fitbit links their Google account once, from the Wellness app.
2. Nightly SpO2 lands in `wearable_readings` (`reading_type = 'spo2'`) without the app being opened,
   and appears where SpO2 already shows (Home vitals ring, Health tab).
3. Member can disconnect; disconnect revokes the Google token and deletes it (DPDP erasure).

## Non-goals (this phase)

- Replacing the Health Connect reader. It stays for heart rate etc. (Revisit after the pilot: the
  same pull could carry those too and remove the app-open dependency; design the sync so adding a
  data type is a mapping entry, not new plumbing.)
- iOS. Apple Watch SpO2 already works via HealthKit; Fitbit-on-iPhone members could use this same
  route later with no extra backend work.
- Minute-level SpO2. Start with the daily average; the samples are sparse by design and the
  product shows one SpO2 value anyway.

## Anti-goals

- A Google refresh token readable by the app, a coordinator, or any client role. Ever.
- Silent failure: a broken link (revoked token) must surface as "Reconnect Fitbit", not as a
  member whose SpO2 quietly stopped.

## Design

**Google Cloud (manual, Santhosh):** project, enable Google Health API, OAuth consent screen
*External*, publishing status **In production** (an app left in *Testing* has refresh tokens that
expire after 7 days), Web OAuth client with the callback URL below. Privacy policy URL required
on the consent screen.

**Database (migration):** `wearable_connections`
(`member_id`, `provider = 'google_health'`, `refresh_token` encrypted at rest via Supabase Vault,
`scopes`, `status` ok|needs_reconnect, `connected_at`, `last_synced_at`, `last_error`).
RLS: the member (and linked family, read-only) can see `status`/`connected_at` through a
SECURITY DEFINER function that never returns the token; no client role can select the table.

**Edge Functions:**
- `google-health-connect` — authenticated member; returns the Google consent URL with a signed,
  single-use `state` (member id + nonce, short expiry) and PKCE.
- `google-health-callback` — Google redirects here; verifies `state`, exchanges the code, stores
  the refresh token, redirects back into the app (`carebridgehome://` deep link / web URL).
- `google-health-sync` — run by `pg_cron` hourly: for each `ok` connection, refresh the access
  token, list `daily-oxygen-saturation` from `last_synced` date minus 2 days (late-processed
  nights), map to `spo2` rows with `device_vendor = 'google_health'`, `recorded_at` = that local
  date at 12:00 in the member's timezone, insert with the existing `dropKnown` dedupe.
  `invalid_grant` → `status = needs_reconnect`.
- `google-health-disconnect` — revoke at Google, delete the row.

**App:** "Connect Fitbit" card on the Wearables/Profile area with Google's required disclosure
("Care Bridge Home collects health and fitness data to show your blood oxygen…"), a connected /
reconnect state, and Disconnect.

## Open decisions for Santhosh

1. Pilot under the 100-user unverified cap, and budget CASA (US$500–4,500, 2–6 weeks) before
   scaling past 100 Fitbit members? Recommended: yes.
2. Which Google account owns the Cloud project and consent screen (publisher name shown to
   members)? Same Individual-vs-Organization question as the Apple account.
3. After the pilot, move heart rate/HRV/sleep for Fitbit members onto this pull too (background
   sync, one code path), or keep Health Connect for those?

## Verification plan

Real account end to end: connect from the Oppo, confirm the 14 Nov 96% night appears as `spo2`
with `device_vendor = google_health`, run sync twice and confirm no duplicates, revoke access at
myaccount.google.com and confirm `needs_reconnect`, disconnect and confirm the token row is gone.
