# Android support for the Wellness app — design

Date: 2026-10-24
Status: approved by Santhosh 2026-10-24

## Intent and why

The Wellness app (`apps/wellness`) has only ever been verified on iOS. Santhosh has an Oppo A6X
(ColorOS) and a Fitbit Versa 4 for testing. Goal: everything that works on the iPhone also works
on the Oppo. "Works" means the behaviour verified on iOS, not pixel-identical native code.

Android is wanted because Carebridge's members and families in Kerala will not all be on iPhones.

## Current state (verified in the repo, 2026-10-24)

- `apps/wellness/android/` exists (Capacitor 8 shell, `appId com.carebridgehome.wellness`).
  `@capacitor/android` is installed. It has never been built or run.
- The Mac has no Java runtime, Android SDK, `adb` or Android Studio.
- `src/lib/push.ts` already registers for push on both platforms and upserts into
  `device_push_tokens` with `platform in ('ios','android')`.
- `supabase/functions/send-push` sends via APNs directly and filters `.eq('platform','ios')`.
  There is no FCM path. No `google-services.json` exists.
- Wearable path on iOS is a native HealthKit plugin feeding the `ingest-wearable` Edge Function.
  HealthKit does not exist on Android.
- No Firebase project, Google Play Console account or DLT SMS registration exists. These were
  deliberately parked on 2026-08-11. This design un-parks Firebase only (needed for Android push).
  Play Console and DLT stay parked.

- Links: the iOS app has no native deep-link handling (no URL scheme, no associated domains, no
  `appUrlOpen` listener). Password-reset and similar email links open the hosted web app
  (`/reset-password` route) in the browser; invite codes are typed in. Android parity therefore needs
  no App Links or `assetlinks.json` in Stage 1.
- Push today: `push.ts` only logs foreground and tap events (no tap routing). `send-push` is not
  wired to any trigger, including SOS, and already prunes dead tokens on APNs 410/BadDeviceToken.

- Test phone runs ColorOS 16 (user-reported); Health Connect is built into Android 14+.

## Goals

1. Build and run the Wellness app on the Oppo A6X from this Mac (USB debug build, no Play Store).
2. Android parity with iOS for: sign-up and sign-in, password reset, DPDP consent flow,
   invite-code and invite-link handling, all existing screens, SOS, persisted-sheet restore after
   backgrounding.
3. Push notifications on Android (FCM), reusing `device_push_tokens` and the existing sender.
4. Email behaviour unchanged (Resend, server-side, platform independent).
5. Stage 2: wearable readings from the Fitbit Versa 4 via Android Health Connect into the existing
   `ingest-wearable` pipeline.

## Non-goals

- Google Play Store submission, Play Console, signing for release, store listing.
- Android SMS or DLT registration.
- Fall detection (blocked on iOS by an Apple entitlement; the Versa 4 has no fall detection).
- Redesigning any screen. Mockup-fidelity gaps stay deferred, as on iOS.
- Admin Portal changes.
- Fitbit cloud APIs (see Constraints).

## Anti-goals

- A fork of the web code for Android. One React codebase; Android differences live in native
  plugins and small platform branches.
- Anything that looks like it works on the Oppo only because the screen was awake. Backgrounded
  and killed-app behaviour must be tested, since ColorOS aggressively kills background apps.
- Claiming Fitbit data works before it has been seen arriving from the physical watch.

## Constraints

- **Fitbit cloud route is closed.** Google ends legacy Fitbit Web API support 2026-09-30 and turns
  it off 2026-10-30. The replacement Google Health API has only Restricted scopes (security review)
  and is not onboarding new projects. Do not build on either. Source: Google Health API deprecation
  notes and Validic's Fitbit sunset notice (found via web search 2026-10-24; secondary sources, so
  re-check Google's own page when starting Stage 2).
- **Health Connect is the only viable wearable route**, and it is unconfirmed that the Fitbit app
  writes heart rate, SpO2 and HRV into it for the Versa 4. Stage 2 starts with a phone-side check,
  before any code.
- Region and data locality unchanged: hosted Supabase in Mumbai.
- Known device-only bug classes from iOS apply again: root height chain / bottom nav, build baked
  with localhost URL, WebView reload on backgrounding, local-date-vs-UTC bucketing. Verify each on
  the Oppo, do not assume the iOS fixes carry over.
- Repo conventions: pnpm monorepo, Prettier and CI gate must stay green, new native code needs
  tests where logic exists (Edge Function and TS side), RLS untouched unless a migration is needed.

## Stage 1 — App parity (push and email included)

1. **Toolchain** (outside the repo): install a JDK and Android Studio (SDK, platform tools, build
   tools) on the Mac; enable USB debugging on the Oppo; confirm `adb devices` sees it.
2. **First build**: `vite build` with the hosted-Mumbai env vars (guard in `src/lib/supabase.ts`
   rejects loopback URLs), `cap sync android`, run on the Oppo. Fix whatever breaks.
3. **Parity pass** against the iOS-verified checklist: signup, consent capture, invite code and
   invite link, password reset link, every tab, SOS, sheet restore after backgrounding, bottom nav
   scroll behaviour, safe-area and status-bar handling, hardware back button.
4. **Push**: create a Firebase project (Santhosh's account, matching the Individual-account
   decision used for Apple), add the Android app, add `google-services.json` to the Android
   project, grant `POST_NOTIFICATIONS` (Android 13+). Extend `send-push` to read `platform='android'`
   tokens and send via FCM HTTP v1 using a service-account secret stored as a Supabase secret.
   The service-account key never enters the repo.
5. **ColorOS background behaviour**: test push delivery with the app backgrounded and swiped away,
   with default Oppo battery settings. Document what the user must toggle (auto-launch, battery
   optimisation) if delivery fails, and decide whether the app should deep-link users to those
   settings.
6. **Email**: confirm Resend emails still arrive and links open correctly on Android.

Stage 1 is done when the parity checklist passes on the Oppo and a real FCM push and a real email
are received on it, verified by Santhosh on the physical device.

## Stage 2 — Fitbit Versa 4 via Health Connect

1. **Phone-side check first (no code)**: install the Fitbit app on the Oppo, pair the Versa 4,
   open Health Connect, and record which data types Fitbit writes and how fresh they are.
2. If HR and SpO2 arrive: build a Capacitor plugin (Kotlin) reading Health Connect, mirroring the
   iOS HealthKit plugin's contract so `ingest-wearable` needs minimal or no change. Reading set to
   match the iOS reading expansion where Health Connect has the equivalent type.
3. Add the Health Connect permission declarations and the privacy-policy rationale activity that
   Health Connect requires.
4. Verify end to end on the physical watch and phone, as was done for the Apple Watch.

If the Fitbit app does not write the needed types to Health Connect, stop and bring the options
back to Santhosh rather than improvising (candidates: a different watch with Health Connect
support; Google Health API once access opens).

## Resolved from the repo (reviewer questions)

- Deep links: none on iOS, none needed on Android Stage 1 (see Current state).
- Push is informational only for now, so Stage 1's bar is best-effort delivery documented honestly,
  not a safety guarantee. If SOS ever depends on push, that raises the reliability bar (high-priority
  FCM, `IMPORTANCE_HIGH` channel) and is a separate decision.
- FCM payload mirrors the existing APNs `data` map; the FCM branch prunes tokens on `UNREGISTERED` only
  (not `INVALID_ARGUMENT`, which can mean a bad payload and would delete valid tokens), like the APNs branch does. No schema migration expected.
- Environment: Android tests run against hosted Mumbai Supabase with test accounts, as on iOS.
  A phone cannot reach the Mac's local stack without extra setup, and iOS device testing used the
  hosted backend too.
- Stage 2 `ingest-wearable` contract and acceptable Fitbit sync lag are decided after the phone-side
  check, not before.

## Decided by Santhosh

- Android must have everything iOS has.
- Test hardware: Oppo A6X, Fitbit Versa 4.
- Two stages: parity first, wearable second.

## My calls (not yet agreed)

- Un-park Firebase only; keep Play Console and DLT parked.
- Debug builds installed over USB; no signing or store work now.
- Firebase project under Santhosh's own Google account for now, same reasoning as the Apple account.
- Reuse `device_push_tokens` and `send-push` rather than a new function.

## Left to the builder

- Exact JDK and Android Studio versions; Gradle and AGP compatibility with Capacitor 8.
- Android-specific handling of deep links and invite links (check how iOS does it first).
- Notification channel setup, icons and sound.
- Health Connect plugin structure, once Stage 2 starts.
- Tests: Edge Function FCM branch gets unit tests mirroring the APNs ones.

## Open questions

- Does the Fitbit app write HR, SpO2, HRV to Health Connect for the Versa 4? Answered only by
  the phone check in Stage 2 step 1.
- Will ColorOS deliver FCM to a swiped-away app with default settings? Answered in Stage 1 step 5.
