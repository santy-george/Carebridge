# Wellness App Feedback — Decisions & Plan (2026-07-10)

Carried over from a Cowork session reviewing user feedback on `wellness-app.html`. Not yet implemented — pick up here next session.

## Decisions made

1. **Appointments** — add ability to book/view appointments with a doctor/health professional (reviews, daily plans, activities, follow-ups). Scope as "view/request," not open self-service booking — Care Bridge is coordinator-led (assessment → care model → scheduled visits per project CLAUDE.md), so the coordinator stays the source of truth. Home screen must show today's schedule.
2. **BP & sugar in Daily Check-in** — make optional, not mandatory. BP stays default-on (common in this population); blood glucose is opt-in per member (diabetic members only), logged via the existing flexible "Vitals overview" log-type dropdown rather than forced into the daily check-in flow.
3. **Rename "Today's Vitals" → "Today's Health"** (drop clinical wording; fits Calm Companion brand tone). Applies to the Home card and the Profile "Vitals" row — check all label instances.
4. **Wellness Profile / risk alarm** — reframed from a self-computed "risk score" to threshold-based flagging: if a logged reading falls outside the range set for that member's care plan, show a flag with a clear action ("Share with health provider" / "Message coordinator"). No self-diagnosis, no invented scoring algorithm — thresholds come from the clinical/assessment side (Admin), the member app just displays and flags. Trend visualization (reading over time, e.g. "BP trending up over 2 weeks") supports this and was picked up from research (see below).
5. **Research: gcc-marketing.com article on health/wellness app features** — most standard features already exist in the app (wearables, push reminders, monthly reports). Three ideas worth adopting:
   - Goal tracking with visual progress (fits the exercise-tracking ask — steps/minutes toward a simple weekly target, non-competitive)
   - Telehealth/video option on the appointment type (in-person or video call — useful for NRI families)
   - Trend visualizations for readings over time (supports point 4's flagging)
   Explicitly rejected: gamification (badges/points), community/social feed — both cut against the reassurance-first, non-flippant tone for an elderly home-care audience.
6. **Care Team tab is being retired** — Care Bridge Home will not assign a dedicated care team, so the current bottom-nav "Care Team" destination (`careTeamView`, coordinator profile + message/consult actions, around line 1717+ in `wellness-app.html`) is free real estate. Plan: repurpose that bottom-nav slot into a single new tab — working name **"Health"** (or "My Care") — containing:
   - Upcoming appointments (book/view, from point 1)
   - Monthly wellness report
   - Preventive health calendar + annual check-up reminders
   - Wellness Profile / threshold alarm flags (from point 4)
   Home keeps a lightweight "Today's schedule" card that deep-links into this tab, satisfying point 1's "visible on home" requirement without duplicating the full feature on Home.

## Current-state notes (from code review, still accurate as of this session)

- No appointment/scheduling concept exists anywhere in `wellness-app.html` today.
- "Today's vitals" today shows BP, Pulse, SpO₂ only (no blood sugar tracked anywhere yet).
- No "Wellness Profile" section exists; there's a plain account "Profile" view and a single "Wellness score" number on Home — no risk screening/flagging logic.
- Monthly wellness report + check-in consistency already exist under the History tab — don't rebuild, just relocate/surface into the new "Health" tab.
- Care Team view (`careTeamView`) is a full bottom-nav tab (`bnav-care`) with coordinator "Joel Abraham," clinicians list, and two quick actions ("Message coordinator," "Book a consultation" — the latter already stubs toward `careTeamView`, will need to be repointed at the new Appointments feature).

## Done (this session, 2026-07-11)

Implemented the "structural" slice of the plan in `wellness-app.html`:
- New **Health** tab replaces Care Team in the bottom nav (`healthView`, `bnav-health`). Decision made this session: the read-only "Care Team" roster is dropped entirely (Care Bridge won't assign a dedicated team); "Own Contacts" survives, renamed **My Contacts**, moved inside the new Health tab as its second sub-panel.
- Health tab now contains: Upcoming appointments card, "Request an appointment" CTA, a surfaced link to the existing Monthly wellness report (not rebuilt, just linked), a Preventive health calendar placeholder (static due-date list), and the My Contacts panel.
- Home gained a "Today's schedule" card (lightweight, deep-links into Health → Appointments).
- New `appointmentRequestView` — view/request flow only (in-person / video call toggle, who/date/time/reason fields, submits via `alert()` confirmation consistent with the rest of the app's UI-only demo pattern — no real booking backend).
- Repointed "Message coordinator" and "Book a consultation" quick actions away from the retired `careTeamView`.

## Done (follow-up session, 2026-07-11 cont'd)

- Home's "Today's schedule" card now has a small "+ Schedule" link (reuses the existing `.card__link` component — same one "Today's vitals → Settings" uses, so no new UI pattern introduced).
- Appointment request form: "Who would you like to see" is now free text (`apptWith`), not tied to the app's contacts/address book — any name works.
- Added "Calendar & reminders" section: a real "Add to phone calendar" toggle that generates a `.ics` file client-side (with a `VALARM`) and hands it to the phone's default calendar app — not just a UI stub. Reminder choice is "No reminder" / "1 day before" / "Morning of" (2 hours before).
- Fixed the oversized in-person/video icons — they were inheriting the shared 20px `.icon` default meant for full-size buttons; scoped down to 15px with proper inline-flex alignment for both the appointment-type and reminder toggles.

## Done (final session, 2026-07-11 cont'd) — plan complete

- **Rename sweep**: "Today's Vitals" → "Today's Health" across Home, the Trackers card/section, Records History, Family Circle access labels, and related toast/share copy. Internal ids/JS fn names (`vitalsLogType`, `shareVitalsSheet`, etc.) were left alone — only user-facing strings changed.
- **BP/sugar optional**: BP stays default-on and always visible (Home + Trackers). Blood sugar is now a per-member opt-in switch (Profile → "Tracked readings" card). Off by default; when a member turns it on, a sugar tile appears on Home's Today's Health card, in the Trackers "Health overview" table, in its log-type dropdown, and in the new Wellness Profile panel. State persists via `localStorage` (`cbh_track_blood_sugar`).
- **Wellness Profile reframe**: added a third sub-tab to the Health tab ("Wellness") with (a) a plain "Latest readings" card showing each tracked vital with an in-range/out-of-range chip — no invented risk score, and (b) a threshold-flag card (shown for BP in the demo data) with a 2-week SVG trend sparkline and two actions: "Share with health provider" (wires into the existing share sheet) and "Message coordinator" (UI-only stub, same convention as the rest of the app).
- **Exercise goal tracking**: added a "Weekly activity goal" card in Trackers — a plain progress bar toward a 150 min/week target, +10/+30/+60 min quick-log buttons, resets automatically each Monday, persisted via `localStorage`. Explicitly no streaks, points, or badges, per the research decision above.

All items from this plan are now implemented. Anything further (real backend, actual coordinator messaging, live wearable data) is out of scope for this static-HTML build.
