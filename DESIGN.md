---
name: Care Bridge Home Admin Portal
description: Operational command centre for coordinated home care — calm authority, zero noise.
colors:
  admin-purple: "#57317E"
  admin-purple-hover: "#45266A"
  admin-purple-soft: "#F4EFFA"
  admin-purple-soft-strong: "#E9DEF5"
  field-cyan: "#06B6D4"
  family-blue: "#3E6FB8"
  surface-white: "#FFFFFF"
  surface-sunken: "#F1F0EF"
  surface-variant: "#FAFAFB"
  surface-page: "#FFFFFF"
  text-heading: "#151632"
  text-body: "#4A4B60"
  text-muted: "#6A6B80"
  text-subtle: "#84828E"
  border-default: "#DFDDE0"
  border-strong: "#C9C7CC"
  success: "#0E9670"
  success-soft: "#E6FBF3"
  warning: "#C77D11"
  warning-soft: "#FCF3E2"
  danger: "#E5484D"
  danger-soft: "#FCEAEA"
  info: "#3E6FB8"
  info-soft: "#EAF0FB"
typography:
  display:
    fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.6px"
  heading-l:
    fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1.22
    letterSpacing: "-0.3px"
  heading-s:
    fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.32
    letterSpacing: "-0.1px"
  title:
    fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.48
  label:
    fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "0.4px"
rounded:
  sm: "4px"
  md: "8px"
  base: "12px"
  lg: "16px"
  xl: "18px"
  full: "999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
components:
  btn-primary:
    backgroundColor: "{colors.admin-purple}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.full}"
    padding: "10px 20px"
  btn-primary-hover:
    backgroundColor: "{colors.admin-purple-hover}"
  btn-outline:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.text-heading}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  btn-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.full}"
    padding: "10px 20px"
  chip-completed:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    rounded: "{rounded.full}"
    padding: "5px 12px 5px 10px"
  chip-inprogress:
    backgroundColor: "{colors.admin-purple-soft}"
    textColor: "{colors.admin-purple}"
    rounded: "{rounded.full}"
    padding: "5px 12px 5px 10px"
  chip-missed:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    rounded: "{rounded.full}"
    padding: "5px 12px 5px 10px"
---

# Design System: Care Bridge Home Admin Portal

## 1. Overview

**Creative North Star: "The Quiet Control Room"**

This is a purpose-built operations surface — not a generic dashboard, not an analytics suite. It feels like the instrument panel of an experienced coordinator who has everything visible without looking frantic. White space does the heavy lifting. Purple earns its presence. Information hierarchy follows operational urgency, not convention.

The palette is restrained: white surfaces, near-invisible borders, and a single purple accent that only fires when something demands attention or action. Semantic colour (success/warning/danger) is used for status communication only — never decoration. The result is a UI that feels calm even when the underlying operation is not.

Typography is a single family — Urbanist — running from 40px display down to 11px overline. One family in many weights; the hierarchy comes from size and weight contrast, not font pairing. Every heading is a decision, not a style.

**Key Characteristics:**
- White-first surface hierarchy (page → module → sub-card → lifted stat)
- Purple as accent only: active states, primary actions, module headings
- Semantic status vocabulary: green / amber / red / blue as signal, never style
- Single-family type system; weight contrast creates hierarchy
- Generous outer spacing; tight internal density in data rows
- No decorative shadows; elevation conveys interactive state

## 2. Colors

A minimal palette anchored by administrative purple, with a clean semantic vocabulary for operational status.

### Primary
- **Administrative Purple** (#57317E): The admin brand accent. Used for active sidebar states, primary buttons, module headings, links, and focus indicators. Appears on ≤15% of any screen.
- **Purple Soft** (#F4EFFA): The tinted surface for purple-adjacent contexts: hover states, chip backgrounds for in-progress status, soft highlights.
- **Purple Soft Strong** (#E9DEF5): A step darker than soft; used for active chip backgrounds, segmented control active pills, and strong accent fills.

### Secondary
- **Field Cyan** (#06B6D4): Reserved for the Field Staff app accent. In Admin, appears only in tier/care model chips for Virtual Care.
- **Family Blue** (#3E6FB8): Reserved for the Family app accent. In Admin, appears only in info-state semantics.

### Neutral
- **Surface White** (#FFFFFF): Base page and card background. The default.
- **Surface Variant** (#FAFAFB): Sub-card backgrounds in module grids — barely-there grey that separates inner containers from the white outer module.
- **Surface Sunken** (#F1F0EF): Pressed/sunken surfaces; used sparingly.
- **Text Heading** (#151632): Near-black with a blue-purple tint. All headings, primary labels.
- **Text Body** (#4A4B60): All body copy.
- **Text Muted** (#6A6B80): Secondary labels, meta text.
- **Text Subtle** (#84828E): Overlines, placeholder text, tertiary metadata.
- **Border Default** (#DFDDE0): All card and module borders.
- **Border Strong** (#C9C7CC): Dividers, table separators where emphasis is needed.

### Status
- **Success** (#0E9670) / **Success Soft** (#E6FBF3): Completed visits, positive deltas.
- **Warning** (#C77D11) / **Warning Soft** (#FCF3E2): Pending states, amounts overdue.
- **Danger** (#E5484D) / **Danger Soft** (#FCEAEA): Missed visits, SOS, critical alerts.
- **Info** (#3E6FB8) / **Info Soft** (#EAF0FB): Informational counts, scheduled status.

### Named Rules
**The One-Accent Rule.** Purple is the only brand colour on any Admin screen. Cyan and blue appear only as care model tier identifiers, not as interface chrome. This is a healthcare ops tool, not a brand campaign.

**The Status-Only Rule.** Green, amber, red, and blue are semantic signals: they appear on status chips, alert states, and numeric indicators only. Never as background decoration, hover states, or section styling.

## 3. Typography

**Display / Heading / Body Font:** Urbanist (via Google Fonts; fallback: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif)

**Character:** A single geometric-humanist sans at many weights. The system creates hierarchy through size and weight contrast alone — no font pairing, no serif accent, no decorative display face. Urbanist's slightly rounded geometry keeps the tool from feeling cold.

### Hierarchy
- **Display** (700, 40px, 1.12, −0.6px tracking): Page titles and hero figures only. Rare.
- **Heading XL** (700, 32px, 1.18, −0.4px): Dashboard greeting, major section titles.
- **Heading L** (600, 26px, 1.22, −0.3px): Primary card headings.
- **Heading M** (600, 22px, 1.26, −0.2px): Section subheadings.
- **Heading S** (600, 18px, 1.32, −0.1px): Card titles, navigation group labels.
- **Heading XS** (600, 16px, 1.36): Sub-card titles, drawer headings.
- **Title** (600, 15px, 1.4): Compact labels, table column names.
- **Body M** (400, 14px, 1.48): All body copy, form fields, table rows.
- **Body S** (400, 13px, 1.46): Meta text, secondary info.
- **Label M** (500, 12px, 1.2, +0.2px): Stat card labels, compact UI.
- **Label S / Overline** (600, 11px, 1.1, +0.4–0.6px, uppercase): Category headings, KPI labels, chip text.

### Named Rules
**The Single-Family Rule.** No second typeface is introduced for any reason. Hierarchy lives in weight and size. A second font would signal brand campaign, not ops tool.

**The Uppercase-Sparingly Rule.** Uppercase (`text-transform: uppercase`) is reserved for overlines and chip labels only. It must never appear on headings, body copy, or buttons.

## 4. Elevation

Flat-first with a thin shadow vocabulary. Surfaces are defined by border + background contrast, not by aggressive shadow. Shadows appear only to signal interactivity or to lift a floating element above the canvas.

### Shadow Vocabulary
- **xs** (`0 1px 2px rgba(21,22,50,.06), 0 1px 3px rgba(21,22,50,.05)`): Default card resting state. Nearly invisible — suggests surface, not depth.
- **sm** (`0 1px 3px rgba(21,22,50,.08), 0 2px 6px rgba(21,22,50,.06)`): Topbar, focused input, stat-mini cards.
- **md** (`0 2px 6px rgba(21,22,50,.08), 0 6px 16px rgba(21,22,50,.07)`): Dropdown panels, popovers.
- **lg** (`0 8px 20px rgba(21,22,50,.10), 0 4px 12px rgba(21,22,50,.06)`): Modals, side drawers.
- **xl** (`0 16px 32px rgba(21,22,50,.12), 0 8px 16px rgba(21,22,50,.08)`): Toast notifications, elevated overlays.

### Named Rules
**The Flat-By-Default Rule.** Resting surfaces have `shadow-xs` or no shadow. Shadows escalate with interaction depth (hover → focused → floating). No decorative depth, no ambient glow, no coloured shadows.

## 5. Components

### Buttons
Clean pill-shaped actions. Purple for primary, white-outline for secondary, red for destructive.
- **Shape:** Full pill (`border-radius: 999px`)
- **Primary** (`btn--primary`): Purple (#57317E) fill, white text, 10px 20px padding, 600 weight 14px
- **Outline** (`btn--outline`): White fill, border (#DFDDE0), text-heading colour
- **Danger** (`btn--danger`): Danger (#E5484D) fill, white text
- **Hover:** Primary darkens to #45266A; all transitions 150ms ease

### Chips (Status)
Pill badges with a coloured dot + centered label text. Fixed minimum width of ~108px in visit rows for column alignment.
- **Completed:** Success-soft (#E6FBF3) bg, success-text (#0B7357) label, green dot
- **In progress:** Purple-soft (#F4EFFA) bg, accent-text (#57317E) label, purple dot
- **Scheduled:** Info-soft (#EAF0FB) bg, info-text (#245A95) label, blue dot
- **Missed:** Danger-soft (#FCEAEA) bg, danger-text (#8C1D21) label, red dot
- **Pending:** Warning-soft (#FCF3E2) bg, warning-text (#92580A) label, amber dot
- All chip labels are `justify-content: center` inside the flex pill

### Cards / Module Containers
Two-level card hierarchy. Outer module is white with a border. Inner sub-cards are surface-variant with a border.
- **Outer module** (`.dash-module`): White (#FFFFFF), `border: 1px solid #DFDDE0`, `border-radius: 18px`, `shadow-xs`
- **Inner sub-card** (`.module-card`): Surface-variant (#FAFAFB), `border: 1px solid #DFDDE0`, `border-radius: 16px`, `padding: 16px 18px`
- **Stat mini** (`.stat-mini`): White (#FFFFFF), `border: 1px solid #DFDDE0`, `border-radius: 12px`, `padding: 12px`
- **Module heading colour:** Accent purple (`#57317E`) — not text-heading

### Inputs / Fields
Minimal stroke style.
- **Style:** White fill, `border: 1px solid #DFDDE0`, `border-radius: 8px`
- **Focus:** Border shifts to `#57317E` with a soft purple box-shadow
- **Placeholder:** text-subtle (#84828E)

### Navigation (Admin Sidebar)
Fixed-width sidebar (248px) with logo, group labels, and nav items.
- **Group labels:** 11px uppercase overline, text-subtle
- **Nav item default:** text-body colour, 13px, 600 weight
- **Nav item hover:** Purple-soft background (#F4EFFA)
- **Nav item active:** Purple left border (3px), purple-soft background, accent-text colour
- **Badges:** Circular pill; alert badges red (#E5484D); count badges neutral

### Dashboard Module
Signature component: a collapsible section of the dashboard containing one or more sub-cards.
- **Module head:** White bg, purple `dash-module__title` (20px, 700, accent colour), action links in accent-text
- **Module body:** White bg, 8px 12px 12px padding, sub-cards in a 2-column grid

### Emergency Hub
Compact alert bar at the top of the dashboard. White with standard border when active — danger communicates through icon, text, and badge colours, not background tint.
- **Container:** White (#FFFFFF), `border: 1px solid #DFDDE0`, `border-radius: 16px`
- **Bar:** Danger icon circle (red fill, white icon), bold danger-text label, red SOS badge, white "See all" outline pill, red "Open Emergency Centre" filled pill
- **Item row:** White bg, standard border divider, pulsing red dot, danger-text name

## 6. Do's and Don'ts

### Do:
- **Do** use `var(--accent)` (purple, #57317E) for module headings, active sidebar items, primary buttons, and focus rings. It's the only brand colour in Admin.
- **Do** use semantic status colours (success/warning/danger/info) for status chips, alerts, and numeric indicators only.
- **Do** use `surface-variant` (#FAFAFB) for inner sub-card backgrounds and `surface-white` (#FFFFFF) for outer module containers.
- **Do** add `border: 1px solid var(--border)` to all cards and sub-cards; depth comes from colour layering, not shadow alone.
- **Do** center chip content with `justify-content: center` so the dot + label sits centred within the pill's fixed width.
- **Do** use the `text-transform: uppercase` + `letter-spacing` overline style only for KPI labels and chip text.
- **Do** maintain the module heading hierarchy: module title in accent purple (20px, 700), sub-card title in text-heading (16px, 600).

### Don't:
- **Don't** use a pink or red background on the Emergency Hub container — the hub is white. Danger communicates through foreground colours only.
- **Don't** use `--surface-sunken` (#F1F0EF) for module sub-cards — use `--surface-variant` (#FAFAFB). Sunken is for pressed/inactive states.
- **Don't** use purple decoratively — only for the active state, primary action, or module identity. "Quiet but confident" means purple earns every appearance.
- **Don't** build interfaces that feel like generic SaaS dashboards (Salesforce, HubSpot, Monday.com): no configuration chrome, no "platform-y" widgets, no feature-marketing layouts.
- **Don't** use heavy data analytics aesthetics (dark mode, aggressive data density, BI-style colour drench) — this is an ops tool where data supports decisions, not dominates.
- **Don't** introduce a second typeface. Urbanist in multiple weights is the full type system.
- **Don't** use colour alone to communicate status — every status colour must be accompanied by a label or icon.
- **Don't** use `border-left` as a coloured accent stripe on cards or list items. Use full borders or background tints.
- **Don't** use `background-clip: text` gradient text effects. Solid colours only.
- **Don't** use glassmorphism or blurred card backgrounds for decorative purposes.
