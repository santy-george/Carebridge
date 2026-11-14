# Minister explainer video — design

Date: 2026-11-04. Status: draft, awaiting approval.

## Intent

A ~4 minute English explainer for the Kerala Health Minister. Desired outcome: the minister **endorses Care Bridge Home and funds expansion into other districts**. The video must make one idea land: a family far away can see, and trust, how an elderly parent in Kerala is doing, and a coordinated care team acts when something goes wrong.

Audience cares about public-health impact (ageing population, NRI families, avoidable emergencies), not features. Tone: calm, warm, credible. Not a tech demo, not hype.

## Goals

- Show the problem in human terms (parent at home, child abroad).
- Show one care system seen from three sides: Family, Field Staff, Coordinator.
- Show an emergency end to end (SOS reaches family and care team).
- Close with an honest ask: endorse, fund district rollout.

## Non-goals

- Feature tour of every screen.
- Pricing, business model, technical architecture.
- Malayalam version (English only, per Santhosh).

## Anti-goals (would make this a failure even if it renders)

- **No invented numbers.** Pilot only, no real metrics. No stats, no "X families served", no fake testimonials.
- **No overclaiming product status.** Wellness app and Admin portal are live. The Field Staff app exists only as a prototype (`field-app/nurse-app.html`), so the video says "next phase" or "in design", never "live".
- **No fall-detection claim.** Apple's fall-event entitlement is not approved. Wearable claim is limited to heart rate and SpO2 readings, verified on hardware.
- No real member data or real faces in app screenshots. Use seeded demo data only.
- AI-generated people must not be presented as real patients or real pilot families. A small on-screen note "Illustrative scenes" appears in the intro and the closing slide.

## Constraints

- Length: 3:30–4:30. Landscape 16:9, 1080p MP4.
- Narration: English, calm warm voice, burned-in captions.
- App visuals: screenshots only (no screen-recorded motion). Gentle pan/zoom for movement.
- Human moments: AI-generated clips, about 5–8 s each, 8–12 clips.
- Credit budget: Higgsfield balance is 1200 credits. Santhosh approved spending. Cap this project at **~600 credits**, quote before each batch. Stop and report if a batch would exceed it.
- Assembly with local ffmpeg (installed at `/opt/homebrew/bin/ffmpeg`), or Higgsfield sandbox montage tools for captions.

## Structure (script outline, ~560 words narration)

| # | Time | Section | Visual |
|---|------|---------|--------|
| 1 | 0:00–0:30 | The problem. Elderly parent alone in Kerala, child in Gulf/abroad, worry and no visibility. | AI clips: parent at home, child checking phone abroad |
| 2 | 0:30–0:50 | One care system, three sides. | Simple animated title card, three colour-coded app icons (purple/cyan/blue) |
| 3 | 0:50–1:50 | **Family & Wellness app.** Daily check-in, medications, vitals, wearable HR/SpO2, care team, records. Family sees reassurance remotely. | Screenshots: Home, Check-in, Medications, Health, Care. AI clip: parent taking daily check-in |
| 4 | 1:50–2:30 | **Field Staff app (next phase).** Nurse gets one clear next action: visit, vitals, report. | AI clip: nurse visit. Screenshots from prototype `nurse-app.html`, labelled "prototype" |
| 5 | 2:30–3:10 | **Coordinator / Admin portal.** Members, care-team assignment, SOS inbox. | Screenshots: Member dashboard, SOS inbox, Human Resources |
| 6 | 3:10–3:40 | **Emergency moment.** SOS pressed, family notified, coordinator and care team respond. | AI clip + screenshots: Sos screen, SosInbox, push notification |
| 7 | 3:40–4:10 | Why Kerala, why now, and the ask. Pilot is running; funding takes the model to more districts. Endorse and fund. | AI clips: family video call; closing card with logo and ask. No numbers |

## Production plan (my calls)

1. Seed demo data in a hosted or local environment, then capture screenshots with `ego-browser` at phone viewport (wellness) and desktop (admin). Wellness uses `apps/wellness`, admin uses `apps/admin`, field uses the static prototype.
2. Generate AI clips on Higgsfield (image-to-video where a consistent character matters). Generate a character reference first for the parent, nurse and child, for consistency. Model chosen via `models_explore recommend`.
3. Generate voiceover from the final script, then caption it.
4. Assemble in ffmpeg: screenshots with slow zoom, clips, VO, soft background music (low, ducked), captions burned in.
5. Deliver one MP4 in `docs/video/` plus the script file. Preview a rough cut before final render.

## Decided by Santhosh

- Audience: Kerala Health Minister. Ask: endorse plus fund district expansion.
- Pilot stage, no real numbers.
- English narration.
- AI footage for human moments, screenshots for the apps.
- Credits may be spent.

## My calls (override any)

- 4 min target, 7 sections above.
- Field app shown honestly as prototype and next phase.
- "Illustrative scenes" disclaimer on AI footage.
- ~600 credit cap.
- Background music: soft, instrumental, ducked under voice.
- Kerala setting cues in AI prompts (home interiors, attire, greenery) kept respectful and non-stereotyped.

## Open for the builder

- Exact voice and music choice (preview a sample before committing).
- Shot-by-shot prompts and timing, derived from the final script.
- Which seeded demo member and care team names to use (fictional, Kerala-appropriate).
