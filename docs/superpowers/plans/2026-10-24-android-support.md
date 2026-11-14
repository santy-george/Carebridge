# Android Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the Wellness app on Santhosh's Oppo A6X (ColorOS 16) with iOS-level parity including FCM push and email, then find out whether the Fitbit Versa 4 can feed Health Connect.

**Architecture:** One React/Capacitor codebase; the existing `apps/wellness/android/` shell is built and installed over USB. `send-push` gains an FCM HTTP v1 branch in a new, unit-tested `fcm.ts` module, reusing `device_push_tokens`. Wearable work (Stage 2) is gated on a phone-side check and is not planned past that gate.

**Tech Stack:** Capacitor 8 (`@capacitor/android`, `@capacitor/push-notifications`), Gradle/Android Studio, Supabase Edge Functions (Deno), Firebase Cloud Messaging HTTP v1, Vitest, `deno test`.

**Spec:** `docs/superpowers/specs/2026-10-24-android-support-design.md`

## Global Constraints

- App id `com.carebridgehome.wellness`; `minSdkVersion = 24`, `compileSdkVersion`/`targetSdkVersion = 36` (already in `android/variables.gradle`; do not lower targets).
- Test device: Oppo A6X, ColorOS 16 (user-reported; Android 16 equivalent is my inference, confirm with `adb shell getprop ro.build.version.release`).
- Android builds point at the hosted Mumbai Supabase only; `src/lib/supabase.ts` rejects loopback URLs in production builds. `.env.local` always wins in Vite, so use a temporary `.env.production.local` and delete it after the build (see memory `reference_ios_xcode_toolchain_gotchas`).
- Debug builds over USB only. No Play Console, no release signing, no DLT/SMS.
- The FCM service-account key lives only as a Supabase secret (`FCM_SERVICE_ACCOUNT_JSON`). Never commit it; never print it.
- `deno test` runs from the function's own directory with `--allow-net --node-modules-dir=none`, then `git diff package.json` must be empty (repo-root runs corrupt `package.json`).
- Prettier and the CI gate (lint/test/build/format) must stay green. Commit after each task.
- No screen redesigns; mockup-fidelity gaps stay deferred.
- Hard-device claims ("works on the Oppo") are only made after Santhosh confirms on the physical phone.

## Review Focus

- FCM returns 404 `UNREGISTERED` for an uninstalled app: that token must be pruned, and a 400 `INVALID_ARGUMENT` (bad payload) must NOT delete a valid token. (Spec said prune on both; corrected here because a payload bug would wipe every token.)
- A user with one iOS token and one Android token gets both sent; one platform failing must not block or mask the other.
- Malformed or missing `FCM_SERVICE_ACCOUNT_JSON` must produce a clear per-token failure, not a crash that stops the iOS sends.
- `data` values must be strings for FCM v1; non-string values in the request must not reach FCM unchanged.
- App swiped away on ColorOS with default battery settings: push may not arrive. Record the result honestly; do not mark it passing from an awake-screen test.

---

### Task 1: Android toolchain and device link

**Files:** none in the repo (machine setup). Record the versions used in a short note appended to `apps/wellness/README.md` under an "Android" heading.

**Interfaces:** Produces: `adb`, `java`, `ANDROID_HOME` available in a fresh zsh; `adb devices` lists the Oppo.

- [ ] **Step 1:** Install a JDK compatible with the Android Gradle plugin that `apps/wellness/android/build.gradle` declares (check its `com.android.tools.build:gradle` version; JDK 21 expected) and Android Studio (`brew install --cask android-studio`; JDK via `brew install --cask temurin@21`).
- [ ] **Step 2:** Santhosh opens Android Studio once to accept licences and let the SDK wizard install platform 36, build-tools and platform-tools (GUI step the agent cannot do). Then set `ANDROID_HOME=$HOME/Library/Android/sdk` and add `platform-tools` to `PATH` in `~/.zshrc`.
- [ ] **Step 3:** Santhosh enables Developer options on the Oppo (tap Build number 7 times), turns on USB debugging, connects by USB, and accepts the RSA prompt. On ColorOS also enable "Install via USB" if present.
- [ ] **Step 4:** Verify. Run `java -version && adb version && adb devices`. Expected: Java 21, an `adb` version, and one device line ending in `device` (not `unauthorized`). Run `adb shell getprop ro.build.version.release` and record the Android version in the README note.
- [ ] **Step 5:** Commit the README note. `git commit -m "docs(wellness): record Android toolchain setup"`

### Task 2: First debug build running on the Oppo

**Files:**
- Modify: `apps/wellness/android/` only as needed to get a clean build (record any change in the commit message).
- Temporary: `apps/wellness/.env.production.local` (gitignored, deleted after build).

**Interfaces:** Consumes: Task 1 `adb`. Produces: a debug APK installed on the Oppo that launches to the Login screen against hosted Supabase.

- [ ] **Step 1:** Create `.env.production.local` with hosted `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN` (values from Santhosh's existing hosted config; ask if not at hand). Run `pnpm --filter wellness build`. Verify: `grep -l <hosted-project-ref> apps/wellness/dist/assets/*.js` returns a file and `grep -l 127.0.0.1 apps/wellness/dist/assets/*.js` returns nothing. Delete `.env.production.local`.
- [ ] **Step 2:** `cd apps/wellness && npx cap sync android`, then `cd android && ./gradlew assembleDebug`. Expected: `BUILD SUCCESSFUL`. Fix build errors (Gradle/AGP/JDK mismatches) minimally.
- [ ] **Step 3:** `adb install -r app/build/outputs/apk/debug/app-debug.apk` then `adb shell am start -n com.carebridgehome.wellness/.MainActivity`. Santhosh confirms the Login screen shows on the phone.
- [ ] **Step 4:** Capture `adb logcat -d | grep -iE "chromium|capacitor|FATAL"` and note any JS errors. Fix blocking ones; list non-blocking ones for Task 6.
- [ ] **Step 5:** Commit. `git commit -m "build(wellness): first working Android debug build"`

### Task 3: FCM sender module (TDD)

**Files:**
- Create: `supabase/functions/send-push/fcm.ts`
- Test: `supabase/functions/send-push/fcm.test.ts` (follow the style of `supabase/functions/ingest-wearable/index.test.ts`)

**Interfaces:** Produces (all exported from `fcm.ts`):
- `interface FcmServiceAccount { project_id: string; client_email: string; private_key: string }`
- `interface PushSendResult { token: string; ok: boolean; status: number; reason?: string }`
- `parseServiceAccount(json: string | undefined): FcmServiceAccount` — throws `Error` whose message contains `FCM_SERVICE_ACCOUNT_JSON` when undefined, not JSON, or missing a field.
- `buildFcmPayload(token: string, title: string, body: string, data?: Record<string, unknown>): { message: object }` — `message.notification = {title, body}`, `message.android = {priority: 'HIGH', notification: {channel_id: 'default'}}`, `message.data` contains only entries whose value is a string (others dropped), omitted entirely when empty.
- `isDeadFcmToken(r: { status: number; reason?: string }): boolean` — true only when `reason === 'UNREGISTERED'`.
- `getFcmAccessToken(sa: FcmServiceAccount, deps?: { fetch?: typeof fetch; now?: () => number }): Promise<string>` — RS256 JWT (`iss`=client_email, `scope`=`https://www.googleapis.com/auth/firebase.messaging`, `aud`=`https://oauth2.googleapis.com/token`, 1h expiry) POSTed as a `jwt-bearer` grant; module-cached for 50 minutes like the APNs JWT.
- `sendToFcmDevice(token: string, title: string, body: string, data: Record<string, unknown> | undefined, deps?: { fetch?: typeof fetch; getAccessToken?: () => Promise<string>; serviceAccountJson?: string }): Promise<PushSendResult>` — POSTs to `https://fcm.googleapis.com/v1/projects/{project_id}/messages:send`; on non-2xx returns `{ok:false,status,reason}` where `reason` is the error `details[].errorCode` if present else `error.status`; never throws on config error (returns `{ok:false,status:0,reason:'FCM not configured'}`).

- [ ] **Step 1:** Write failing tests with these names and assertions: `buildFcmPayload drops non-string data values`; `buildFcmPayload omits data when none survive`; `buildFcmPayload sets HIGH priority and default channel`; `isDeadFcmToken is true for UNREGISTERED only` (false for `INVALID_ARGUMENT`, false for 500); `parseServiceAccount throws naming FCM_SERVICE_ACCOUNT_JSON on missing field`; `sendToFcmDevice returns not-configured result instead of throwing`; `sendToFcmDevice maps a 404 UNREGISTERED body to reason UNREGISTERED` (injected `fetch` and `getAccessToken`); `sendToFcmDevice posts to the project's messages:send URL with bearer token`.
- [ ] **Step 2:** Run `cd supabase/functions/send-push && deno test --allow-net --node-modules-dir=none fcm.test.ts`. Expected: FAIL (module missing). Then `git diff --stat ../../../package.json` is empty.
- [ ] **Step 3:** Implement `fcm.ts` to the signatures above. Reuse the PEM-to-CryptoKey approach from `index.ts` `importApnsSigningKey` but with `RSASSA-PKCS1-v1_5`/`SHA-256`; do not move APNs code in this task.
- [ ] **Step 4:** Re-run the command from Step 2. Expected: all PASS. Run `deno fmt --check fcm.ts fcm.test.ts` if the other functions use it, else run repo Prettier.
- [ ] **Step 5:** Commit. `git commit -m "feat(send-push): add tested FCM HTTP v1 sender module"`

### Task 4: Route Android tokens through `send-push`

**Files:**
- Modify: `supabase/functions/send-push/index.ts:20-24` (replace the "Android/FCM is out of scope" comment with a short note that FCM is handled via `fcm.ts`), `:223-227` (token query), `:241-254` (send and prune).
- Test: `supabase/functions/send-push/index.test.ts` (new; same style as sibling function tests) — only if the handler can be exercised without a real APNs call; otherwise extract a pure `partitionResults` helper into `fcm.ts`'s sibling `routing.ts` and test that.

**Interfaces:** Consumes: Task 3 `sendToFcmDevice`, `isDeadFcmToken`, `PushSendResult`. Produces: `POST /send-push` response unchanged in shape; `results` entries now also include android tokens; `sent` counts both platforms.

- [ ] **Step 1:** Write failing tests: `routes ios rows to APNs and android rows to FCM`; `a failing FCM send does not change APNs results`; `prunes android token only on UNREGISTERED`; `prunes ios token on 410 or BadDeviceToken (unchanged behaviour)`.
- [ ] **Step 2:** Run the new tests (same `deno test` form as Task 3). Expected: FAIL.
- [ ] **Step 3:** Change the token query to select `token, platform` for `platform in ('ios','android')` and dispatch per row by `platform`. Dead-token pruning uses the per-platform predicate (`410`/`BadDeviceToken` for ios, `isDeadFcmToken` for android). APNs code stays as is.
- [ ] **Step 4:** Run all `send-push` tests. Expected: PASS. `git diff package.json` empty.
- [ ] **Step 5:** Commit. `git commit -m "feat(send-push): deliver to Android tokens via FCM"`

### Task 5: Firebase, notification channel and a real push on the Oppo

**Files:**
- Create: `apps/wellness/android/app/google-services.json` (from Firebase console; check `.gitignore`, and keep it untracked unless Santhosh decides otherwise since it ties the app to the Firebase project)
- Modify: `apps/wellness/src/lib/push.ts` (Android channel creation inside `registerPushToken`)
- Test: `apps/wellness/src/lib/push.test.ts` (new, Vitest, mock `@capacitor/core` and `@capacitor/push-notifications`)

**Interfaces:** Consumes: Task 2 build, Task 4 deployed function. Produces: Android devices register a token with `platform='android'` and a channel with id `default` exists before first push.

- [ ] **Step 1:** Santhosh creates a Firebase project (own Google account), registers the Android app `com.carebridgehome.wellness`, downloads `google-services.json` into `apps/wellness/android/app/`. Santhosh creates a service-account key (Project settings → Service accounts → Generate) and the agent sets it with `supabase secrets set FCM_SERVICE_ACCOUNT_JSON="$(cat <path>)"`; delete the downloaded key file afterwards.
- [ ] **Step 2:** Write failing tests: `registerPushToken creates the default channel on android` (`PushNotifications.createChannel` called with `{id:'default', name:'Care Bridge alerts', importance:4}` before `register()`); `registerPushToken does not create a channel on ios`; `registerPushToken does nothing on web`. Run `pnpm --filter wellness test push`; expected FAIL.
- [ ] **Step 3:** Implement the channel call in `registerPushToken`, android only, after permission is granted and before `register()`.
- [ ] **Step 4:** Rebuild per Task 2 (temporary env file again), `npx cap sync android`, reinstall. Open `apps/wellness/android/app/build/intermediates/merged_manifests/debug/*/AndroidManifest.xml` and confirm `android.permission.POST_NOTIFICATIONS` is present; if absent add it to `AndroidManifest.xml`. Santhosh signs in on the Oppo and allows notifications; confirm a row appears in `device_push_tokens` with `platform='android'`.
- [ ] **Step 5:** Deploy `supabase functions deploy send-push`, then invoke it with the service-role key for Santhosh's user id. Expected response `{"ok":true,"sent":N,...}` and the notification appears on the Oppo. Santhosh confirms.
- [ ] **Step 6:** Run `pnpm --filter wellness test`, lint, build, then commit. `git commit -m "feat(wellness): Android push channel and FCM wiring"`

### Task 6: Parity pass against the iOS-verified behaviours

**Files:** whichever web or Android files each defect requires; each fix is its own commit.

**Interfaces:** Consumes: Task 2 install. Produces: a filled-in checklist appended to the spec under "Stage 1 results".

- [ ] **Step 1:** Santhosh runs this checklist on the Oppo, reporting pass/fail for each: sign-up; sign-in; consent capture; invite-code entry; password-reset (email link opens in the browser, reset completes); Home, Check-in, Health, Medications, Care, Assessment, Risk Screening, Preventive Plan, Emergency, Education, Reports, Profile, More; SOS; bottom nav stays fixed while content scrolls (the iOS root-height bug); status bar and safe-area do not overlap content; hardware Back button behaviour; opening a sheet then backgrounding and returning restores it (10-minute TTL); a check-in saved today appears under today's local date.
- [ ] **Step 2:** For each failure, reproduce with `adb logcat`/Chrome `chrome://inspect` remote debugging, fix at the root, and add a Vitest test when the defect is in TS logic. One commit per fix.
- [ ] **Step 3:** Run `pnpm --filter wellness test && pnpm lint && pnpm build`. Expected: green.
- [ ] **Step 4:** Append the filled checklist to the spec and commit. `git commit -m "docs: record Android Stage 1 parity results"`

### Task 7: ColorOS background push and email

**Files:** none unless a defect forces a change; results go in the spec.

**Interfaces:** Consumes: Task 5 push path.

- [ ] **Step 1:** With default battery settings, send a push (Task 5 Step 5 command) in each state and record whether and how fast it arrives: app foreground; app in background; app removed from recents; screen off for 10 minutes. Santhosh reports results.
- [ ] **Step 2:** If delivery fails when the app is removed, test again after enabling Auto-launch and unrestricted battery for the app (Settings → Apps → Care Bridge Wellness). Record exactly which toggles fix it.
- [ ] **Step 3:** Trigger one real Resend email (existing flow) and confirm it arrives and any link in it opens correctly on the Oppo.
- [ ] **Step 4:** Append findings to the spec. If toggles are required, add a follow-up note proposing an in-app prompt; do not build it without Santhosh's go-ahead. Commit. `git commit -m "docs: record ColorOS push and email results"`

### Task 8: Stage 2 gate — Fitbit to Health Connect check (no code)

**Files:** none. Result appended to the spec.

- [ ] **Step 1:** Santhosh installs the Fitbit app on the Oppo and pairs the Versa 4. Health Connect is built into Android 14+, so it is under Settings → Health Connect (or Privacy on some ColorOS builds).
- [ ] **Step 2:** In the Fitbit app, enable the Health Connect connection if offered. In Health Connect → App permissions → Fitbit, record which data types are listed as written, and under Data and access check whether heart rate, oxygen saturation (SpO2) and heart rate variability have recent entries and how long after the watch syncs they appear.
- [ ] **Step 3:** Record the findings in the spec's open questions and **stop**. Bring the result to Santhosh: if HR and SpO2 arrive, write a separate Stage 2 plan (Kotlin Health Connect Capacitor plugin matching the iOS reading contract in `docs/superpowers/specs/2026-08-20-apple-watch-healthkit-integration-design.md`); if not, present the alternatives from the spec's Stage 2 section.
- [ ] **Step 4:** Commit the result. `git commit -m "docs: record Fitbit Health Connect findings"`
