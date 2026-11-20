# Care Bridge 360 — App Store Connect copy

Paste-ready text for App Store Connect. Demo password is NOT in this file —
it lives in `~/.carebridge-signing/app-review-demo-login.txt`.

## App information

- **Name:** Care Bridge 360  (fallback if taken: "Care Bridge 360 Wellness")
- **Subtitle (30 chars):** Home care, family reassurance
- **Bundle ID:** com.carebridgehome.wellness
- **SKU:** cb360-wellness-ios
- **Primary category:** Medical
- **Secondary category:** Health & Fitness
- **Privacy policy URL:** https://carebridge-wellness.pages.dev/privacy
- **Support URL:** https://carebridge-wellness.pages.dev/privacy  (swap for a real support page / carebridgehome.co.in when ready)
- **Price:** Free. No in-app purchases.
- **Availability:** India only for V1 (members are Care Bridge Home clients in Kerala).

## Promotional text (170 chars)

Daily check-ins, medicines, vitals and one-tap SOS, shared with your family and your Care Bridge care team.

## Description

Care Bridge 360 is the companion app for members of Care Bridge Home, a coordinated home-care and preventive wellness service in Kerala.

For members
- Log a daily check-in: mood, sleep, energy and pain, plus blood pressure readings
- Keep your medicines in one list with a simple taken/missed record
- See heart rate, blood oxygen, sleep and activity from Apple Health and Apple Watch
- Store lab reports, prescriptions and scans in one place
- Follow the preventive health plan your care team sets with you

For families, including those living abroad
- Link to a parent's record with an invite code from Care Bridge Home
- See how they are doing today without having to call

When it matters
- One-tap SOS sends an alert, with your location, straight to your care coordinator

Care Bridge 360 is used alongside Care Bridge Home's care team. An account is linked to a member record using an invite code from Care Bridge Home. It does not diagnose conditions and is not a substitute for emergency services; in an emergency call 112.

## Keywords (100 chars, comma-separated, no spaces)

home care,elder care,Kerala,family,SOS,medication,vitals,blood pressure,check-in,caregiver,wellness

## What's new (1.0)

First release.

## App Review information

- **Sign-in required:** Yes
- **User name:** appreview.demo@carebridgehome.co.in
- **Password:** (from ~/.carebridge-signing/app-review-demo-login.txt)
- **Contact:** Santhosh — phone + email (fill in App Store Connect)

**Notes:**

Care Bridge 360 is the member app for Care Bridge Home, a home-care provider in Kerala, India. Accounts are created by members and linked to their care record with an invite code issued by Care Bridge Home staff. The demo account above is already linked to a demo member with 7 days of sample data, so no invite code is needed.

Things to try: Home (today's summary), Check-in, Medications, Health (vitals), Records, More > Profile.

Apple Health: the app reads heart rate, blood oxygen, HRV, breathing rate, activity, sleep, walking steadiness and ECG classification to show the member and their care team. It does not write to Health. The demo data is server-side, so the Health tab shows data even without a paired Apple Watch.

SOS: tapping SOS sends a real alert (with location, if allowed) to our coordinator inbox. That's fine to test; we will mark it as a test. Location is only requested when SOS is used.

Account deletion: More > Profile > Withdraw consent. After a coordinator verifies the request, the member record and the login are permanently erased. Verification is required because the record holds clinical data shared with family members.

## App Privacy (nutrition label) answers

Tracking: **No** (no data used for tracking, no third-party ads).

Data collected — all **linked to the user**, purpose **App Functionality** only:

| Category | Type | Why |
|---|---|---|
| Health & Fitness | Health | Vitals, check-ins, conditions, medications, Apple Health readings |
| Health & Fitness | Fitness | Steps, activity, sleep |
| Contact Info | Name, Email address, Phone number | Account + care coordination |
| Location | Precise location | Attached to SOS alerts only |
| User Content | Photos or videos, Other user content | Uploaded records (lab reports, scans) |
| Identifiers | User ID | Account |
| Diagnostics | Crash data, Performance data | Sentry crash reports (user ID attached) |

Not collected: financial info, browsing/search history, contacts, purchases, audio, advertising data.

## Age rating

- Medical/Treatment Information: **Infrequent/Mild**
- Everything else: None
- Expected result: 12+ (fine)

## Other questions App Store Connect asks

- **Export compliance:** handled in Info.plist (`ITSAppUsesNonExemptEncryption = NO`, HTTPS only)
- **Content rights:** No third-party content
- **Regulated medical device:** No (care-coordination and wellness tracking, no diagnosis)
- **Sign in with Apple:** not needed (email+password only, no third-party social login)
