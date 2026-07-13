# Care Bridge Home — V1 Scope

Decided 13 Jul 2026, working from `HANDOFF.md`'s current build state. Revised same day after confirming Carebridge is a live, operating service in Ernakulam and Thiruvalla, Kerala — not a pre-launch prototype — which changes the weight of the safety-critical items below.

**V1 decisions:**
- **Family app** → full public launch on the App Store and Google Play. **This is now the entire V1 mobile scope.**
- **Field Staff app** → **deferred out of V1 entirely** (confirmed 13 Jul 2026). Not even an internal pilot for now — all engineering effort concentrates on Family app + the Admin wiring it needs. Revisit once Family app's core loop is proven.
- **Admin Portal** → stays web, no store publishing, but needs minimal backend wiring so there's a real coordinator on the other end of member check-ins, SOS, and medication data. Scope trimmed further now that Field app is deferred — no visit assignment/staff-facing features needed yet (Sec. 3).
- **Backend** → Supabase (managed Postgres + auth + file storage + realtime + edge functions) over Firebase. Full rationale in Sec. 0.
- **Mobile wrapper** → Capacitor, wrapping the existing `wellness-app.html` build rather than a rewrite.
- **Fall-detection *and* vitals wearable → app pipeline is now core V1**, elevated from the earlier deferred list. Driven by real incidents of fallen patients going undiscovered for hours, and by the recognition that most patients won't actively use a phone app — the wearable needs to feed both fall/SOS events and vitals readings into the app so the data is meaningful without requiring patient effort. See Sec. 1a for the revised hardware recommendation (cross-platform, iOS + Android).
- **Family app promotes Virtual Care and Direct Care to Self Care members** — confirmed scope: the upsell targets Self Care (unmanaged) members specifically, toward the two managed/staffed tiers. See Sec. 1b.

---

## 0. Why Supabase over Firebase (and over a from-scratch SQL server)

You asked to be walked through this rather than just told — here's the actual reasoning, not just the one-line summary from the first draft.

**The core question is data shape, not "SQL vs NoSQL" as a religious preference.** Carebridge's data — members, medications, visits, care team assignments, documents, SOS alerts, wearable readings — is deeply relational: a medication belongs to a member, is linked to a prescribing doctor in the care team, appears in a schedule, and rolls up into an adherence stat; an SOS alert belongs to a member, references a care team assignment, and needs a timestamped audit trail. This is exactly the shape relational databases (Postgres, MySQL, SQL Server) were built for — joins, foreign keys, transactions that guarantee a medication update and its adherence recalculation happen together or not at all.

**Firebase's default database, Firestore, is document/NoSQL.** It's excellent for apps whose data is mostly independent documents with simple lookups (chat messages, feed posts), but relational queries like "every check-in for members assigned to coordinator X, joined with their current care model" become awkward — you either denormalize data (duplicate it across documents, and now have to keep copies in sync by hand) or do multiple round-trip queries and stitch the joins together in your own application code. For a care-coordination app where a coordinator's dashboard is fundamentally "show me relationships between members, meds, visits, and alerts," that's fighting the database's grain on every screen. Firebase has recently added a Postgres-backed offering (Data Connect), but it's new and far less mature than what Supabase has been doing natively for years.

**Supabase is Postgres, full stop** — the same open-source relational database that's run production systems for decades, with a managed layer on top (auto-generated REST/GraphQL APIs, auth, file storage, realtime subscriptions, edge functions) so you're not standing up and patching a server yourself. You get real SQL, real joins, real transactions, and — this matters a lot for a health app — **row-level security enforced at the database layer**: you can write a rule like "a member can only ever read their own records" directly into Postgres, so it's enforced no matter which app or endpoint touches the data, not something every screen has to remember to check. That's a meaningfully stronger security posture for medication and SOS data than hoping every client-side query remembers to filter correctly.

**Two more reasons that matter specifically for you:** Supabase is open-source and can be self-hosted later if data-sovereignty requirements (India's DPDP Act, or a future hospital/insurance partner's compliance demands) ever require keeping patient data on infrastructure you fully control — Firebase has no such option, you're permanently on Google's infrastructure under Google's terms. And Supabase's pricing is a flat predictable tier structure; Firebase's Firestore pricing is metered per-read/per-write, which can produce surprising bills as usage scales in ways that are hard to forecast for a solo operator watching costs closely.

**Why not just stand up your own Postgres server instead of Supabase?** You could, and technically it's the same database underneath — but you'd be manually handling backups, auth, API generation, file storage, connection pooling, and security patching yourself, which is exactly the operational burden a solo builder plus AI shouldn't take on for a live service handling real patient data. Supabase gives you the same Postgres with that operational layer managed, while still letting you inspect and control the data model directly (it's not a black box) and migrate off later if you ever outgrow it. For where Carebridge is right now, that's the right tradeoff.

---

## 1. Family app — V1 feature cut

**In:**
- **Auth** — real member login/signup (currently `family-login.html` is decorative). Supabase Auth, email or phone OTP.
- **Home** — vitals card now wired to real wearable readings where available (Sec. 1a), manual entry as fallback for patients without a device yet, today's medications summary, quick actions grid **without** the edit/customize picker (ship the 2 defaults — Hydration, My journal — as fixed, not user-editable, for V1).
- **Check-in** — full daily check-in (mood/energy/breathing/appetite/aches/sleep/notes), wired to real storage, feeding the wellness score. Previous entries log, real not localStorage.
- **Meds** — schedule view, mark taken/untaken, add medication, Medicine Cabinet stock view. **Cut:** Reorder→cart→pharmacy dispatch, Add stock sheet, preferred-pharmacist dropdown — all deferred (Sec. 4).
- **Care** — Care Team tab (read-only, populated by the coordinator via Admin). **Cut for V1:** Own Contacts add/remove — nice but not essential, and it's real backend surface (a contacts table + CRUD) for a feature that doesn't affect care outcomes. Ship it in V1.1 once the core loop is proven.
- **Records** — document vault: view + upload (real file picker, not scan-first camera flow), 4 categories. **Cut:** multi-select/share via Email/WhatsApp/Save-to-Files — defer to V1.1, it's additive on top of a working vault.
- **SOS** — this stays in scope because it's the single highest-stakes feature in the app. V1 version: tapping SOS (after the existing hold-to-confirm flow) writes an alert record and pushes a real notification to the assigned care coordinator in Admin, plus an SMS fallback. A fall-triggered alert from the wearable (Sec. 1a) feeds the exact same alert pipeline as manual SOS — one inbox, one escalation path, not two parallel systems. Does **not** attempt to integrate with actual emergency services (ambulance dispatch, etc.) — that's a distinct, much larger undertaking with real liability implications and is explicitly out of scope for V1.

**Out (defer to V2+):**
- Native HealthKit/Health Connect deep sync (steps, sleep detail beyond what the chosen wearable vendor/aggregator already provides via their own API) — the wearable pipeline in Sec. 1a covers fall detection + core vitals (HR, SpO2); anything beyond what that vendor/aggregator surfaces is still deferred.
- Apple Watch `CMFallDetectionManager` native integration — investigate-only per Sec. 1a, not built in V1.
- Equipment Rental, Wellness Library, Trackers, Calculators, Exercises (all of Tools tab) — informational/nice-to-have, zero dependency on the core loop.
- Quick actions edit/customize picker.
- Records multi-select share.
- Own Contacts CRUD.
- Notification bell's full 3-category grouping — ship a single flat feed for V1, split into Alerts/Admin/Reminders later.

---

## 1a. Fall-detection + vitals wearable → app pipeline (revised, core V1)

**Why this is in V1, not deferred:** most Carebridge patients are elderly and not tech-savvy enough to reliably use a phone app — a passive device that detects falls and captures vitals on its own is the only realistic way to get meaningful health data and emergency response for this population. Carebridge has had real cases of a fallen patient going undiscovered for hours. Revised 13 Jul 2026 to also carry vitals readings (heart rate, SpO2, etc.) into the app, not just fall/SOS events, so the wearable is the primary data source for a population unlikely to self-report via Check-in.

### Market context confirmed by research
- **India is ~92–95% Android** (vs. iOS's 4–8%, concentrated in the premium segment) — confirmed via Statcounter/Statista, so any hardware recommendation has to work for an Android-majority household by default, not assume iPhone ownership. [Statcounter](https://gs.statcounter.com/os-market-share/mobile/india), [Statista](https://www.statista.com/statistics/262157/market-share-held-by-mobile-operating-systems-in-india/)
- **NRI-sponsored patients are a real exception worth designing for separately.** Where the paying family member is abroad, an Apple Watch purchase isn't a cost barrier, and that segment can be pointed at a richer iPhone-based option later. But Apple Watch's fall detection has a real limitation even there: the on-device flow always dials local emergency services first and only afterward notifies the *wearer's own* Health-app contacts — it does **not** natively route into Carebridge's coordinator system. A lower-level API (`CMFallDetectionManager`) may allow a companion app to catch the raw fall event independently, but it requires a special entitlement from Apple whose approval process/availability to a company like Carebridge is unconfirmed — this needs a direct inquiry to Apple, not an assumption, before any engineering time goes toward it. Treat as **investigate, not build** for now.

### Hardware recommendation — two tracks

**Primary track (default for all patients, cross-platform by design):** a dedicated elder-care smartwatch/band that combines fall detection *and* vitals (heart rate, SpO2, sometimes blood pressure/ECG) with a companion app that explicitly supports both iOS and Android, plus cellular or Bluetooth+phone connectivity. Categories found worth evaluating (not yet vetted for India availability, pricing, or reliability — this is a starting list for the vendor evaluation step, not a commitment):
- **Purpose-built elder-care smartwatches** (e.g. MorePro PulseMax-class devices) — fall detection plus HR/SpO2/BP/ECG in one device, companion app confirmed to support both iOS and Android.
- **Aggregator/platform approach** (e.g. Bitwell-class services) — rather than committing to one hardware vendor, these sit on top of *multiple* devices via Google Health Connect (Android) and Apple Health (iOS) and expose their own API for real-time vitals and fall data. This is architecturally attractive because it decouples Carebridge's backend from any single hardware vendor — families could use whichever compatible device they already own or prefer, and Carebridge integrates once against the aggregator's API instead of once per device brand. Worth serious evaluation alongside single-vendor options.
- **Standalone cellular SOS pendants** (SmartKavach/SOS SmartCare-class, found in the India market search) — no vitals, fall + SOS only, no phone pairing at all. Keep as a fallback/lower-cost option for patients who specifically don't want a watch-form-factor device or whose families want the simplest, cheapest safety net without vitals.

**Secondary track (NRI/iPhone households, investigate only):** Apple Watch + `CMFallDetectionManager` entitlement, pending Apple's answer on availability. Do not architect V1's primary pipeline around this — treat it as a potential V1.1 enhancement for a specific customer segment.

**Important framing correction from the earlier draft:** "does it work with Android and iOS" is the right question for the watch/band + companion-app category above, but doesn't really apply to standalone cellular pendants — those have their own embedded SIM and talk directly to a monitoring platform, so there's no phone in the loop for the patient at all, and the family's phone OS is irrelevant to whether the device works.

### Vendor evaluation criteria (Sec. 5, step 0)
Fall-detection accuracy/false-positive rate; vitals accuracy for the readings that matter most (HR, SpO2 at minimum); whether the vendor/platform exposes a real API or webhook Carebridge can integrate against (unconfirmed for any specific vendor — needs direct technical due diligence, don't assume one exists); confirmed India availability and support in Ernakulam/Thiruvalla specifically; monthly cost at Carebridge's real patient volume; whether it requires an ongoing SIM/data plan per patient; and, for the aggregator-platform option, what devices it actually supports today versus on a roadmap.

**Architecture:** device/vendor or aggregator platform → their API/webhook → Supabase edge function → (a) fall/SOS events write to the same `sos_alerts` table and Admin inbox as manual SOS, one pipeline not two; (b) vitals readings write to a `wearable_readings` table that feeds Home's vitals card, replacing the manual-entry-only version originally planned for V1. **[ASSUMPTION]** the registered family member should also get a push notification via the Family app when a fall alert fires, not just the coordinator — fits the reassurance-first brand personality, but confirm before building since some families may prefer coordinator triage first.

## 1b. Managed-care promotion (new, core V1)

Confirmed: the Family app should promote **Virtual Care and Direct Care to Self Care members** — i.e., surface the two managed/staffed tiers as an upgrade path within the self-managed experience, using the project's canonical Care Model names and display order (Self Care → Virtual Care → Direct Care, per `CLAUDE.md` Sec. 4).

**V1 scope:** a promotional surface on Home and/or Care (exact placement is a design decision, not yet mocked) presenting Virtual Care and Direct Care with plan-level framing (Basic/Standard/Premium per the existing Care Model system) and a clear "Talk to us about upgrading" call to action that routes to a contact/coordinator request — **not** a self-serve plan-switch or payment flow in V1, since that's real billing/contract complexity outside this scope. This is a lead-generation surface within the app, not a checkout flow.

**Open design question:** this needs its own mockup pass (screen doesn't exist yet) — worth a Cowork session to work out placement, tone, and how hard to push the upsell without undermining the "reassurance-first" brand personality documented in `DESIGN.md`.

---

## 2. Field Staff app — deferred entirely from V1

Confirmed 13 Jul 2026: not even an internal pilot for now. `nurse-app.html` stays as-is; no backend wiring, no Capacitor wrap, no staff-facing Admin features this round. Revisit once the Family app's core loop (auth, check-in, meds, care team, records, SOS, wearable pipeline) is live and proven — at that point the earlier plan (staff login, visit list, check-in/out with GPS log, structured visit report, TestFlight/Play internal testing only) is still the right shape for a first pass, just not now.

---

## 3. Admin Portal — minimum backend wiring for V1

Admin stays a web app, not store-bound, but it can't stay a static mockup — someone has to be able to see and act on what the Family app produces. Scope trimmed further now that the Field app is fully deferred (Sec. 2) — no staff/visit-facing features needed yet.

**In:**
- Coordinator login.
- Member list with real profile data (seeded/entered by you or a coordinator, not self-service signup for now).
- View of each member's check-ins, medication adherence, and wearable vitals/fall history (read-only dashboard, reusing `admin-dashboard.html`/`member-profile.html` layouts wired to real data).
- **SOS alert inbox** — this is the one Admin feature that's non-negotiable for V1, since Family app's SOS is meaningless without someone to receive it. Handles both manual SOS taps and fall-triggered alerts from the wearable pipeline (Sec. 1a) through the same inbox.
- **Managed-care upgrade requests** — coordinator-side view of "talk to us about upgrading" leads generated by the Family app's Virtual Care/Direct Care promotion (Sec. 1b), so there's someone to actually follow up with interested members.
- Care team assignment (coordinator assigns Care coordinator/physician/etc. to a member — populates the Family app's Care Team tab).

**Out:** Field staff visit assignment and visit report views (no Field app to feed them, Sec. 2), Billing & Invoices, Staff Payments, Reports & Analytics, Leads & Enquiries, Human Resources, Service Catalogue, Area Allocation, Users & Roles beyond a single coordinator role. All of these stay as designed static screens until the Family app's core loop is proven with real people.

---

## 4. Explicitly deferred to V2+

- Medication reorder → pharmacy dispatch (SMS/WhatsApp/Email integration).
- Equipment Rental cart/order flow.
- Records multi-select share.
- Own Contacts (member-managed) CRUD.
- Quick actions customization.
- **Field Staff app entirely** (Sec. 2) — no pilot, no internal testing, revisit once the Family app's core loop is proven.
- Native HealthKit/Health Connect deep sync and Apple Watch `CMFallDetectionManager` integration — beyond what the chosen wearable vendor/aggregator already provides (Sec. 1a).
- Wellness Library, Trackers, Calculators, Exercises.
- Notification feed grouping (Alerts/Admin/Reminders).
- Billing & Invoices, Staff Payments, full Reports & Analytics, Leads & Enquiries, HR, Service Catalogue, Area Allocation.
- Real emergency-services integration for SOS (beyond coordinator notification) — ambulance dispatch etc.
- Self-serve care-model plan switching/payment flow — V1's promotion (Sec. 1b) generates a lead for the coordinator to follow up with, not an in-app checkout.

---

## 5. Build sequence

0. **Wearable vendor/aggregator evaluation** — start immediately, in parallel with backend foundation, since it gates both the SOS pipeline and Home's vitals card design, and has real procurement lead time (device sourcing, SIM/data plans, per-vendor API confirmation, India availability check). Don't let backend work get ahead of knowing what integration surface the chosen device or aggregator actually offers.
1. **Backend foundation** — Supabase project, schema for members, medications, check-ins, care team, documents, SOS alerts (manual + wearable-triggered), wearable vitals readings, managed-care upgrade leads. Auth setup (member + coordinator roles — no staff role needed yet, Sec. 2).
2. **Wire Family app screens to real data**, one at a time, in this order: auth → Home/vitals → Check-in → Meds → Care (read-only) → Records → SOS.
3. **Wire minimal Admin** in parallel once there's real data to display: coordinator login → member dashboard → SOS inbox (manual + fall-triggered) → care team assignment → upgrade-lead follow-up.
4. **Integrate the chosen wearable vendor/aggregator's API** into both the SOS pipeline (fall events) and Home's vitals card (readings) once Sec. 0 lands on a choice — this is likely the highest-risk integration in V1 and deserves its own testing pass with real hardware before trusting it with real patients.
5. **Design + build the managed-care promotion surface** (Sec. 1b) — needs a quick mockup pass in Cowork before implementation, since the screen doesn't exist yet.
6. **Capacitor-wrap the Family app**, add push notification plugin (needed for SOS + reminders) and file/camera plugin (needed for Records upload).
7. **Security review pass** before any real member data goes in — check every Supabase row-level security policy, confirm no endpoint returns another member's data, confirm both manual and wearable-triggered SOS actually reach a real coordinator reliably under real network conditions.
8. **TestFlight/Play internal testing** for the Family app with a small group of real families if possible. Given this is a live service, prioritize testing the wearable pipeline with real hardware before any real patient relies on it.
9. **Store submission** for the Family app — privacy policy, data handling disclosures, screenshots, listing copy.

---

## 7. Resolved / no longer open

- Whether V1 needs real coordinators/staff/members to pilot with: resolved by the live-service context — Carebridge is already operating in Ernakulam and Thiruvalla with real patients, so this isn't a demo-first build. That raises the bar on Sec. 5's security review and the wearable pipeline's reliability testing — treat both as gating, not optional polish.
- Whether the Field Staff app is in V1: resolved 13 Jul 2026 — deferred entirely (Sec. 2), not even an internal pilot. All engineering effort concentrates on the Family app and the Admin wiring it needs.
- Whether the wearable is fall-detection-only or also carries vitals: resolved — both (Sec. 1a), since it's now the primary data source for a patient population unlikely to actively use Check-in.
- Backend choice (Supabase vs. Firebase vs. custom): resolved with full rationale in Sec. 0.
- Mobile wrapper choice (Capacitor vs. React Native): resolved 13 Jul 2026 — staying with Capacitor for V1. React Native's performance edge (native rendering, smoother scrolling) matters most for complex list virtualization, real-time data, or gesture-heavy interactions — none of which describe the Family app's actual UI (cards, forms, tabs, schedules). Rebuilding every screen from `HANDOFF.md` in React Native now would cost weeks-to-months with zero new functionality, at the expense of shipping the fall-detection pipeline. Backend and business logic are unaffected by this choice either way, so a future React Native migration remains additive, not wasted, if real post-launch performance complaints ever justify it.
