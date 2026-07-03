---
name: Care Bridge Home Wellness App
description: The Self Care mobile companion — reassuring, warm, unhurried.
colors:
  reassurance-blue: "#3E6FB8"
  reassurance-blue-hover: "#245A95"
  reassurance-blue-soft: "#EAF0FB"
  reassurance-blue-soft-strong: "#CFE0F4"
  reassurance-blue-emphasis: "#1C4675"
  self-care-lavender: "#A985CF"
  self-care-lavender-soft: "#F5F0FA"
  self-care-lavender-ink: "#69408F"
  virtual-care-cyan: "#06B6D4"
  virtual-care-cyan-soft: "#E8FAFD"
  virtual-care-cyan-ink: "#08778A"
  direct-care-purple: "#57317E"
  direct-care-purple-soft: "#F1EBF7"
  surface-white: "#FFFFFF"
  surface-sunken: "#F1F0EF"
  surface-variant: "#FAFAFB"
  text-heading: "#151632"
  text-body: "#4A4B60"
  text-muted: "#6A6B80"
  text-subtle: "#84828E"
  border-default: "#DFDDE0"
  border-strong: "#C9C7CC"
  success: "#0E9670"
  success-soft: "#E6FBF3"
  success-text: "#0B7357"
  warning: "#C77D11"
  warning-soft: "#FCF3E2"
  warning-text: "#92580A"
  danger: "#E5484D"
  danger-soft: "#FCEAEA"
  danger-strong: "#B4282D"
  danger-text: "#8C1D21"
typography:
  greeting:
    fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.4px"
  heading-l:
    fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.2
  heading-s:
    fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.3
  stat:
    fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1
  body:
    fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.48
  body-sm:
    fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.46
  overline:
    fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.4px"
rounded:
  sm: "8px"
  md: "12px"
  base: "14px"
  lg: "16px"
  xl: "18px"
  2xl: "24px"
  full: "999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
components:
  cta-primary:
    backgroundColor: "{colors.reassurance-blue}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.base}"
    padding: "14px 18px"
  cta-sos:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.base}"
    padding: "17px"
  chip-ok:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success-text}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  chip-warn:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning-text}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  chip-alert:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger-text}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
---

# Design System: Care Bridge Home Wellness App

## 1. Overview

**Creative North Star: "The Calm Companion"**

This is the Self Care face of Care Bridge Home — the one member-facing surface in the whole platform, and the only one built for someone who isn't a trained operator. Where the Admin Portal earns trust through operational gravity and the Field app through speed, the Wellness App earns trust through steadiness: it shows up the same way every day, never demands urgency it hasn't earned, and never makes a 68-year-old member feel like they're operating machinery. It explicitly rejects the two easy failure modes for a healthcare app: the cold clinical patient portal (paperwork energy, form-heavy, bureaucratic) and the gamified consumer wellness app (streak pressure, data-dump dashboards, no visible care team behind the numbers). A wellness score and a streak card exist here too — but they're framed as gentle encouragement, backed by a Care Team that's always one tap away, not competitive metrics standing alone.

The palette shares its bones with the Admin Portal (same neutral ramp, same status vocabulary, same Urbanist type system) but swaps the operating accent from admin purple to **Reassurance Blue** — calmer, softer, less "control room," more "someone is looking out for you." Purple survives only as the Self Care model's own lavender identity color (the hero card's banner gradient), not as interface chrome. Icons run bold (2.2px stroke, bumped from the platform's original 1.8px) because this audience needs glanceable clarity more than any other face of the product — bigger touch targets, bigger numbers, less squinting.

**Key Characteristics:**
- Reassurance Blue as the single operating accent; Self Care lavender appears only as the hero card's model-identity banner, never as chrome
- Bold, high-contrast iconography (2.2–2.5px stroke) — this audience should never have to squint
- Soft-lifted primary cards (hero, wellness score) vs. flat-bordered secondary cards — a deliberate two-tier elevation hierarchy that spotlights what matters most on Home
- Time-of-day medication bands in warm, distinguishable tints (amber/blue/teal/lavender) rather than a single monotone list
- Status always paired with a label or icon, never color alone — critical given an older audience and colorblind-safe requirements
- Generous 44px+ touch targets throughout; nothing requires precision tapping

## 2. Colors

A calm, low-saturation palette anchored by a single soft blue, with the platform's shared status vocabulary carried through unchanged for cross-app consistency.

### Primary
- **Reassurance Blue** (#3E6FB8): The wellness app's only operating accent — primary CTA ("Log today's check-in"), active bottom-nav tab, focus rings, links, progress rings. Named for its job, not its hue: it's the color of "you're being looked after." Appears with intention, not as flood-fill decoration.
- **Reassurance Blue Soft** (#EAF0FB): Tinted backgrounds for accent-adjacent contexts — selected toggle states, soft icon tiles, info chips.
- **Reassurance Blue Soft Strong** (#CFE0F4): A step darker; selected-state emphasis (e.g. the "Wearables" source toggle when active).

### Secondary
- **Self Care Lavender** (#A985CF): The Care Model identity color for this member's tier (Self Care). Appears exactly once per screen at most — the hero card's banner gradient ("Self Care · Standard") — never as general interface chrome. It identifies *which plan the member is on*, not the app's brand.
- **Virtual Care Cyan** (#06B6D4) / **Direct Care Purple** (#57317E): Reserved identity colors for the other two Care Model tiers; only relevant if a member's tier or upgrade path is shown (e.g. plan comparison), not used elsewhere in this app.

### Neutral
- **Surface White** (#FFFFFF): Base screen and card background.
- **Surface Variant** (#FAFAFB) / **Surface Sunken** (#F1F0EF): Inner tile backgrounds (quick-action tiles, icon badges) and pressed states respectively.
- **Text Heading** (#151632): Headings, primary values (the "72" in a heart-rate reading).
- **Text Body** (#4A4B60): Body copy, form input text.
- **Text Muted** (#6A6B80): Secondary labels, timestamps, meta text.
- **Text Subtle** (#84828E): Tertiary/placeholder-level text only.
- **Border Default** (#DFDDE0): All card and row-divider borders.

### Status
- **Success** (#0E9670) / **Success Soft** (#E6FBF3): Medication taken, vitals normal, "On Track."
- **Warning** (#C77D11) / **Warning Soft** (#FCF3E2): Medication due soon, low refill stock, elevated-but-not-critical reading.
- **Danger** (#E5484D) / **Danger Soft** (#FCEAEA): Missed medication, critical vitals, Emergency SOS.

### Named Rules
**The One-Purpose-Accent Rule.** Reassurance Blue is the only color that means "act here" or "this is active." Self Care Lavender is never used for buttons, active states, or emphasis — it identifies a care tier, full stop. Confusing the two would make the interface lie about what's actionable.

**The Never-Color-Alone Rule.** Every status (taken/due/missed, normal/elevated/critical) pairs color with a label, icon, or strikethrough — never color alone. This isn't just an accessibility checkbox; a 68-year-old member should never have to parse a subtle hue difference to know if a medication is overdue.

## 3. Typography

**Font:** Urbanist (via Google Fonts; fallback: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif) — the single family shared across all three Care Bridge Home apps.

**Character:** Same geometric-humanist sans as Admin and Field, but leaned on harder here: bigger sizes, more weight contrast, because this is the one face of the product an untrained, potentially vision-impaired user reads unaided.

### Hierarchy
- **Greeting** (700, 24px, 1.2, −0.4px): The "Good morning, Anita" home greeting — the single largest, most personal text in the app. Appears once per screen, at the top.
- **Heading L** (700, 20px, 1.2): Section/page titles in the top bar ("Medications", "Trackers", "Daily Check-in").
- **Heading S** (600, 16px, 1.3): Card titles ("Wellness score", "Today's vitals", "Water intake today").
- **Stat** (700, 22px, 1.0): The distinctive large-number pattern — wellness score, heart rate, adherence percentage, tracker "latest" values. Always paired with a small unit/label directly beside or beneath it.
- **Body** (400, 14px, 1.48): Standard copy, form inputs, list item titles.
- **Body Small** (400, 12.5px, 1.46): Secondary/meta text — timestamps, sub-labels under a row title.
- **Overline** (700, 11px, 1.1, +0.4px, uppercase): Section headers ("QUICK ACTIONS", "CARE TEAM", "MORNING" medication band labels).

### Named Rules
**The One Number Per Glance Rule.** Every card has at most one **Stat**-weight number as its focal point (the wellness score, the heart rate, the adherence percentage). Supporting numbers step down to Body or smaller. A screen with two competing 22px numbers has no hierarchy.

## 4. Elevation

Soft-lifted, not flat. This app deliberately carries slightly more shadow presence than the Admin Portal's near-invisible xs-shadow default — a small, older-audience-motivated departure from "one care system, one shadow vocabulary." A card that visibly lifts off the page reads as "safe to tap" faster than a card defined by a hairline border alone.

### Shadow Vocabulary
- **xs** (`0 1px 2px rgba(21,22,50,.04)`): Default resting state for secondary cards (Care Team, This Month, tracker list rows).
- **sm** (`0 1px 2px rgba(21,22,50,.05), 0 1px 3px rgba(21,22,50,.04)`): Row-level tap targets, chips.
- **md** (`0 2px 8px rgba(21,22,50,.06)`): Primary/hero cards — the wellness-score hero, the "Today's vitals" card, the Medicine Cabinet stock summary. Anything meant to draw the eye first on a screen.
- **lg** (`0 6px 20px rgba(21,22,50,.08)`): Floating elements — the "Add New Data" FAB, toasts, bottom sheets.

### Named Rules
**The Two-Tier Lift Rule.** Exactly one card per screen gets `shadow-md` (the hero / primary answer). Everything else rests at `shadow-xs`. If two cards compete for `shadow-md` on the same screen, the hierarchy has failed — demote one.

## 5. Components

### Buttons
Rounded, high-contrast, generously padded — built for a thumb, not a cursor.
- **Shape:** 14px corner radius (`--radius-base`), not full-pill — softer than Admin's pill buttons, distinguishing "tap this" from "this is a status chip."
- **Primary** (`.mbtn--fill`): Reassurance Blue fill, white text, 14px 18px padding, 700 weight. Used for the single most important action per screen ("Log today's check-in", "Add medication").
- **SOS** (`.mbtn--sos`): Danger red fill, 800 weight, 16px text, heavier padding (17px) and a red glow shadow (`0 10px 26px -6px rgba(229,72,77,.6)`) — the one button in the app allowed to visually shout.
- **Line** (`.mbtn--line`): White fill, `border-strong` outline — secondary actions.
- **Soft** (`.mbtn--soft`): Reassurance-blue-soft fill, blue text — tertiary/low-emphasis actions.

### Chips
Small pill badges pairing a tinted background with a matching text color — never color-only.
- **Style:** Full pill radius, 4px 10px padding, 12px/600 text.
- **Variants:** `chip2--ok` (success), `chip2--warn` (warning), `chip2--alert` (danger), `chip2--accent` (reassurance blue), plus model-identity variants (`chip2--self`, `chip2--vc`, `chip2--direct`) for Care Model tags.

### Cards
Two-tier system per the Elevation section above.
- **Hero card** (`.hero-wellness`, `.hero-card`): White body with a colored banner header (Self Care Lavender gradient) or an accent-soft radial highlight; `shadow-md`; 24px corner radius (`--radius-2xl`).
- **Standard card** (`.card`): White, 1px `border-default`, 16px corner radius, `shadow-xs`, 16px padding.
- **Tracker card** (`.tracker-card`): Compact stat tile — icon, title, one Stat-weight number, unit, optional inline input. The grid unit for the Trackers screen.

### Icon Buttons
- **Style:** 40px circle (32px in dense row-action contexts like Care Team contact buttons), `surface` background, `border-default` outline, `text-muted` icon color by default.
- **Accent variant** (Care Team mail/chat/phone actions): `reassurance-blue-soft` fill, `reassurance-blue-text` icon — signals "this is a live action," not decoration.

### Time-of-Day Medication Bands
Signature component of the Medications screen. Each time-of-day group gets its own warm, distinguishable full-bleed tint rather than a flat list — Morning (amber), Noon (blue), Evening (teal/virtual-care soft), Night (lavender/self-care soft) — so a member can orient by color before reading a single word.

### Wellness Score Ring
Signature component (`.w-ring`). A conic-gradient ring (`--ring-color` at `--ring-pct`) with a soft inset gradient center and a Stat-weight number. Reused for any single-metric "how am I doing" moment — wellness score, adherence percentage, heart rate — so the visual language for "here's your one number" stays consistent app-wide.

### Bottom Navigation
- **Style:** Fixed bottom bar, translucent white with blur (`backdrop-filter: saturate(180%) blur(14px)`), 4 tabs (Home / Health / Meds / Trackers).
- **Active state:** Icon lifts 1px, sits inside a `reassurance-blue-soft` pill, label turns `reassurance-blue-text`. Never relies on color shift alone — the pill background and icon position both change too.

## 6. Do's and Don'ts

### Do:
- **Do** use Reassurance Blue (`var(--accent)`, #3E6FB8) for the single primary action per screen, active nav state, and focus rings — nothing else.
- **Do** give exactly one card per screen `shadow-md`; everything else rests at `shadow-xs`.
- **Do** pair every status color with a label, icon, or strikethrough. Never color alone.
- **Do** keep touch targets ≥44×44px and icon stroke-width ≥2.2px — this audience should never have to squint or aim precisely.
- **Do** use Self Care Lavender only for Care Model identity (the hero banner), never for buttons or active states.

### Don't:
- **Don't** treat this like the Admin Portal. No dense multi-column layouts, no data tables, no "operational gravity" urgency-first ordering — lead with reassurance, not with what's wrong.
- **Don't** build a generic consumer fitness-app dashboard (MyFitnessPal/Fitbit-style data walls). Every metric on screen should trace back to a care team that's watching, not float as an isolated number.
- **Don't** make this feel like a clinical patient portal — no dense forms, no bureaucratic tone, no EHR-style density.
- **Don't** let two competing large numbers (Stat-weight, 22px) appear on the same card. One focal number per card, always.
- **Don't** use `border-left` as a colored accent stripe. Use full borders, tinted backgrounds, or the time-of-day band pattern instead.
- **Don't** introduce a second typeface. Urbanist in multiple weights is the complete system, shared with Admin and Field.
- **Don't** reintroduce the neon `#00FFB0`/`#00DBFF` field/family accent pair that briefly lived in `css/mobile.css` — it directly contradicted the platform's documented brand accents and has been removed. Family is Reassurance Blue (#3E6FB8); Field is cyan (#06B6D4). Both live in `css/tokens.css` only.
