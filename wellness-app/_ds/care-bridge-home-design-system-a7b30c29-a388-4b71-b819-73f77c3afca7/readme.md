# Care Bridge Home — Design System

Care Bridge Home is a Kerala-based **coordinated home care + preventive wellness platform**. It is one care system seen from three sides, sharing a single design language (Urbanist type, one token set, one icon sprite) with a per-app accent that shifts the meaning of "this is active/actionable":

- **Admin Portal** (web) — coordinators & admin. Accent: **Purple** `#57317E`. Feel: in control, full operational visibility, dense tables and modules.
- **Field Staff App** (mobile) — nurses, caregivers, physios. Accent: **Cyan** `#06B6D4`. Feel: fast, one clear next action, GPS-verified visits.
- **Wellness / Family & Client App** (mobile) — members (primarily older, self-managed "Self Care" tier adults) and their families, incl. NRI relatives abroad. Accent: **Blue** `#3E6FB8` (a purple×cyan blend). Feel: reassurance-first, calm, unhurried — "The Calm Companion."

The whole product revolves around the **Care Model**: every member sits in one of three tiers — **Self Care** (member self-managed, was "Digital Wellness"/"Tier 1"), **Virtual Care** (remote monitoring, was "Tier 2"), **Direct Care** (in-person nursing, was "Tier 3") — each with Basic/Standard/Premium plan levels. Display order is always Self Care → Virtual Care → Direct Care. This is the spine of onboarding, scheduling, billing and the upgrade path across all three apps.

## Sources

This design system was built from a mounted local codebase (attached as `Carebridge/`), a static HTML/CSS/JS build with no bundler or framework. It is **not** a Figma-first product — the codebase itself is the source of truth for screens; Figma and Notion are referenced by the codebase's own docs as design/planning hubs, unverified here:

- Codebase (source for all tokens, components, and screens in this design system): local folder `Carebridge/` — `css/tokens.css`, `css/components.css`, `css/mobile.css`, `css/app.css`, `js/icons.js`, `js/sidebar.js`, and screen HTML files (`admin-dashboard.html`, `wellness-app.html`, `nurse-app.html`, `family-app.html`, and ~30 other Admin screens).
- Design context docs in the codebase: `DESIGN.md` and `PRODUCT.md` (scoped to the Wellness/Self-Care app specifically — see `CLAUDE.md` §8), `AGENTS.md`/`CLAUDE.md` (platform-wide architecture & IA conventions).
- Referenced but not accessed in this pass — Figma: `https://www.figma.com/design/HvDVbRXAKlUXhSXrJvgsMA/Care-Bridge-Home`; Notion hub: `https://app.notion.com/p/38447f2ba44581b68190ec0d8de1e56c`.
- Planning docs (screenshots/briefs, referenced for context, not screen-accurate): `Carebridge/Planning Docs/`.

## Content fundamentals

**Tone across all three apps:** direct, plain-language, sentence case (never Title Case in UI labels), no jargon, no forced cheerfulness. Copy states facts and next actions — "Morning visit completed · vitals normal," "2 active emergencies — Immediate attention required," "Log today's check-in." Numbers and status are always named, never left to speak for themselves ("Blood sugar slightly elevated, nurse advised on diet" — not just a red number).

**Voice shifts by audience, not by brand:**
- *Admin Portal* — operational, terse, ownership-oriented: "Action centre," "Owned work ordered by clinical and operational urgency," "One acknowledgement overdue by 2 minutes." Speaks to a trained coordinator; assumes fluency with the domain (visits, dispatch, care models).
- *Field Staff App* — second person, encouraging, task-first: "Welcome back, Anjali," "Sign in to start your shift in Ernakulam," "View visit." Short imperative buttons.
- *Wellness/Family App* — warm, reassuring, never clinical or bureaucratic. "Good morning, Anita," "You're on track today," "Care Team" always named as people, not "support." Per `PRODUCT.md`, the emotional target is **"I'm looked after"** — confidence without alarm, warmth without infantilizing an adult managing their own care.

**Anti-references (explicitly rejected, per PRODUCT.md):** generic consumer fitness apps (MyFitnessPal/Fitbit-style data walls, gamification with no visible care team); clinical patient portals (cold, form-heavy, bureaucratic EHR tone); decorative gradient mockup styling that breaks the shared system.

**Emoji:** never used in UI copy or components. **Numerals:** used freely for stats/vitals but always paired with a unit and label. **Names:** the product uses real-feeling Kerala names throughout sample content (Anita Nair, Joel Abraham, Sree Nair, Anjali Thomas) — follow this convention rather than generic "John Doe" placeholders when writing new sample content.

## Visual foundations

**Color.** One shared neutral ramp (white base, near-black `#151632` heading text) and one shared status vocabulary (mint success / amber warning / red danger / blue info) across all three apps — only the **accent** (`--accent-*`) changes per app via `[data-app]`. Care Model identity colors (Self Care lavender, Virtual Care cyan, Direct Care deep purple) are a *separate* system from the operating accent — they identify a member's plan tier and appear as a tag, never as chrome, a button, or an active-state indicator. **The One-Purpose-Accent Rule:** the app's accent is the only color that means "act here" or "this is active."

**Type.** Single family, **Urbanist**, variable weight — no second typeface anywhere in the system. Headings/stats use the `--font-heading` alias at weight 600–700 with tight negative letter-spacing; body copy sits at 13–16px, 1.46–1.5 line-height. The Wellness app pushes the whole hierarchy a size up (24px greeting, 22px stat numbers, 2.2–2.5px icon strokes) for an older, potentially low-vision audience — Admin and Field stay comparatively compact and dense.

**Spacing.** Strict 4px grid (`--space-1` 4px … `--space-20` 80px). Admin content padding is roomy (26–32px); mobile screen padding is tighter (16–18px) to maximize content on a 390px-wide device.

**Backgrounds.** Flat surfaces only — no photography, no hand-drawn illustration, no repeating pattern/texture anywhere in the system. The only "decoration" is a soft circular accent-tint highlight bleeding off the corner of a hero/NRI card (`::before` radial blob), and a very subtle radial-gradient wash behind the mobile device stage (`--accent-soft` fading to neutral). Everything else is solid white/neutral surface.

**Elevation.** Soft and restrained everywhere — `--shadow-xs` (barely visible) is the *default* resting state for nearly all cards. The Wellness app is the one deliberate departure: it carries slightly more shadow presence (`shadow-md` on its hero/primary cards) because a card that visibly lifts reads as "safe to tap" faster for an older audience. **The Two-Tier Lift Rule:** exactly one card per mobile screen gets `shadow-md`; everything else is flat `shadow-xs`. No heavy/hard shadows, no glows except the intentional red SOS-button glow.

**Corners.** 4px (sm) through 24px (2xl) plus a `full` pill. Buttons are full-pill on desktop (`.btn`) but a *softer* 14px radius on mobile (`.mbtn`) — deliberately not a pill, so mobile distinguishes "tap this" (14px button) from "this is a status chip" (full pill `.chip2`). Cards run 16–24px depending on tier (standard card 16px, hero/NRI card 24px).

**Animation.** Minimal, functional, never decorative-looping. A single shared `rise` keyframe (fade + 8–12px translateY) staggers content in on load/view-change with `cubic-bezier(.4,0,.2,1)` easing; respects `prefers-reduced-motion` everywhere. A couple of purpose-built exceptions: a `ping` radar pulse during GPS verification, a `blink` live-indicator dot during an active visit timer, and a `voicePulse` glow while a voice-note is recording. No bouncy/springy easing anywhere.

**Hover / press states.** Hover: background shifts to a soft accent tint or one step darker neutral (`--surface-variant`/`--neutral-100`) — never an opacity fade. Press (mobile `:active`): `scale(.98)` or `translateY(.5px)`, plus a `filter:brightness(.96)` on solid-fill buttons — a tactile "settle," never a color inversion.

**Borders & dividers.** 1px hairlines in `--border`/`--border-strong` throughout; the system explicitly avoids colored left-border accent stripes as a "status" device (see Don'ts in the Wellness DESIGN.md) — status is a full chip/tinted background instead.

**Transparency & blur.** Used in exactly two places, both structural: the sticky Admin topbar (`backdrop-filter: saturate(140%) blur(8px)` over a translucent surface) and the mobile bottom nav / bottom sheet scrim. Never used decoratively over imagery (there is no imagery).

**Imagery.** None shipped in the codebase — no photography, no stock imagery, no hand-drawn illustrations. Icon-tile placeholders (a colored round/rounded-square tile with a single centered icon) stand in wherever a thumbnail or illustration might otherwise go (e.g. `educard__thumb`). If a UI kit needs a photo (member avatar, staff photo), it falls back to initials in an `.avatar` circle.

**Cards.** Two families: desktop `.card` (16–18px radius, 1px border, `shadow-xs`, 16–22px padding) and mobile `.card`/`.hero-card` (16–24px radius, optionally border-less with just `shadow-md` for the one hero per screen). No colored left-border accent variant exists or should be introduced.

## Iconography

Single outlined SVG sprite, hand-authored (not a third-party icon font/library) — `js/icons.js` in the source codebase, copied here as `assets/icons/icons.js`. ~90 glyphs, 24×24 viewBox, `currentColor` stroke, default 2.2px stroke weight (2.5px at `--sm`, 2px at `--lg`) — bumped up from a typical 1.5–2px icon-font weight for glanceable clarity, especially in the Wellness app. A small number of glyphs (`more`, battery icons) render solid-fill via `data-fill`. No emoji, no Unicode-character icons, and no per-screen one-off SVGs anywhere in the source — every icon in every screen comes from this one sprite. Load `assets/icons/icons.js` once per page (it injects a hidden `<svg><symbol>` defs block into `<body>`); reference glyphs via `<Icon name="...">` or raw `<svg><use href="#i-name"></svg>`.

## Fonts

**Urbanist** (variable, weight 100–900, incl. italic) is shipped as local `.ttf` files in `assets/fonts/` (sourced directly from the codebase's own `assets/` folder) with `@font-face` declared in `tokens/fonts.css`. The source project also loads Urbanist from Google Fonts as a CDN fallback (`css/tokens.css`); that CDN `@import` was intentionally **not** carried into this system's `styles.css` — local files are the canonical source here, so no substitution or Google Fonts fallback is needed.

## Components

Desktop and mobile share a token system but intentionally have **different primitive shapes** in a few places (pill `Button` vs. 14px-radius `MobileButton`; `.chip` vs `.chip2`) — this is a deliberate platform distinction in the source, not an inconsistency to fix.

- **Icons** — `Icon`
- **Buttons** — `Button` (desktop pill), `MobileButton` (mobile, incl. `sos` variant)
- **Chips & badges** — `StatusChip`, `ModelChip` (Care Model identity), `RiskBadge`, `MobileChip`
- **Cards** — `Card`, `KpiCard`, `HeroCard` (mobile, one per screen), `InfoCard` (desktop alert), `Banner` (mobile alert)
- **Forms** — `Field`, `Segmented`, `Switch`
- **Data display** — `Table`, `ProgressBar`, `Avatar`
- **Navigation** — `NavItem`, `Sidebar` (full Admin IA shell), `Tabs`
- **Mobile shell** — `StatusBar`, `MobileTopBar`, `BottomNav`, `Tile`, `ListRow`, `VisitCard`
- **Wellness signatures** — `WellnessRing`, `MedicationItem`, `CheckinCard`, `Toast`

**Intentional additions:** none of the above were invented — every component wraps an existing CSS component class already shipped in the codebase's `components.css`/`mobile.css`. `Icon` is the one thin wrapper added purely to make the sprite's `<use>` pattern reusable from React; it has no visual invention of its own.

**Intentional omissions — not promoted to standalone components:** the codebase's `mobile.css` ships many more narrow, single-use screen compositions (NRI watch card, monthly report, concern report, care-request form stepper, onboarding flow, GPS radar verification, challenge card, education card, chat thread, document list, upgrade prompt, condition pathway, home-safety checklist, voice-note button, language toggle, accordion report stepper, service-request card, care-circle row). These are real, shipped CSS classes — fully available globally via `styles.css` — but each is used on exactly one screen in the source, so they're composed directly with plain markup + the primitives above inside the UI kits rather than wrapped in a dedicated `.jsx`. See the Wellness UI kit for examples using several of these classes directly.

## UI kits

- `ui_kits/admin-portal/` — Dashboard, Members, Member Profile, Scheduler, Visit Reports (Admin Portal, purple, web).
- `ui_kits/field-app/` — Login, Today, Visit Detail, GPS check-in, Visit Report (Field Staff App, cyan, mobile).
- `ui_kits/wellness-app/` — Login, Home, Medications, Trackers, Family Circle (Wellness / Family App, blue, mobile).

## Index

- `styles.css` — the global stylesheet entry point (import this one file). Pulls in:
  - `tokens/fonts.css`, `tokens/colors.css`, `tokens/typography.css`, `tokens/spacing.css`, `tokens/radius.css`, `tokens/shadow.css`, `tokens/reset.css`
  - `styles/components.css` (shared desktop components), `styles/app-shell.css` (Admin sidebar/topbar/grid), `styles/mobile.css` (Field + Wellness mobile components)
- `assets/logos/cbh-logo.svg` — the one brand lockup provided (wordmark + heart/leaf mark). No icon-only mark exists separately.
- `assets/fonts/` — Urbanist variable TTFs (regular + italic).
- `assets/icons/icons.js` — the shared outlined icon sprite (~90 glyphs).
- `components/` — see the Components section above; each subfolder has a `.jsx`/`.d.ts`/`.prompt.md` per component plus one `@dsCard`-tagged `.html`.
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Brand groups in the Design System tab).
- `ui_kits/` — the three product recreations, see above.
- `SKILL.md` — portable skill file for using this system in Claude Code / other agent contexts.

## Caveats

- Figma and Notion links in the source docs were not accessed in this pass (no connector attached) — the codebase's own HTML/CSS was treated as ground truth throughout, per the source's own working agreement ("build screens here, then round-trip to Figma for handover").
- `wellness-app.html` (canonical Self Care/Family app, per `CLAUDE.md` §8) and the older `family-home.html`/`family-app.html` screens in the source codebase use two different, non-overlapping sets of CSS classes for the same "member home screen" concept — this design system follows the newer, documented `wellness-app.html` + `mobile.css` "family app component extensions" as canonical, since that's what `DESIGN.md`/`PRODUCT.md`/`CLAUDE.md` explicitly describe. The older screens were not ported.
- No photography, illustration, or icon-font substitution was needed — every asset (logo, fonts, icons) came directly from the source codebase.
