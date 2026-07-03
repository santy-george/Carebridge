# Care Bridge Home — Project Context (CLAUDE.md)

Handoff context for **Claude Code**. High-level planning lives in **Cowork + Notion**; coding execution happens here. Read this before editing.

---

## 1. What this is

Care Bridge Home is a Kerala-based **coordinated home care + preventive wellness platform**. It is **one care system seen from three sides**:

| App | Who | Accent colour | Feel |
|---|---|---|---|
| **Admin Portal** (web) | Coordinators, admin | **Purple** `#57317E` | In control — full ops visibility |
| **Field Staff App** (mobile) | Nurses, caregivers, physios | **Cyan** `#06B6D4` | Fast, one clear next action |
| **Client & Family App** (mobile) | Members + families (incl. NRI) | **Blue** `#3E6FB8` (purple×cyan) | Reassurance-first |

The whole product revolves around the **Care Model** (see §4).

**Sources of truth**
- Planning + research + decisions: **Notion** — hub: https://app.notion.com/p/38447f2ba44581b68190ec0d8de1e56c
- Design system + screens (design): **Figma** — https://www.figma.com/design/HvDVbRXAKlUXhSXrJvgsMA/Care-Bridge-Home
- Code (this repo): the HTML/CSS/JS build below. **Build screens here, then round-trip to Figma for handover & final polish.**

---

## 2. Current status

**Done**
- Design tokens (colour, type, spacing, radius, shadow) — `css/tokens.css`.
- Per-app accent theming (Admin/Field/Family) via `data-app` — see §3.
- Reusable components — `css/components.css`.
- App shell (sidebar + topbar + grid) — `css/app.css`.
- Shared icon sprite — `js/icons.js`. Shared sidebar — `js/sidebar.js`.
- Screens: **`admin-dashboard.html`**, **`care-models.html`**.

**Next (priority order — the operational lifecycle)**
Members list → Member profile → Assessments → Scheduler → Visits & Duties → Visit Reports → Billing & Invoices → Staff Payments → Reports/Health Analytics → Emergency Centre. Then the Field and Family apps (set `data-app="field"` / `"family"`).

---

## 3. Architecture & conventions

**No build step.** Static HTML/CSS/JS. Open any `*.html` directly in a browser. Vanilla JS only, no framework, no bundler.

```
CBH-HTML/
  admin-dashboard.html      # screens (one file per screen)
  care-models.html
  css/
    tokens.css              # design tokens + per-app theming + Stack Sans @font-face
    components.css          # reusable UI: btn, chip, card, kpi, nav-item, info-card, input, tabs, table…
    app.css                 # app shell: sidebar, topbar, content grid, page-specific layout helpers
  js/
    icons.js                # injects the SVG icon sprite (single source). Use <svg class="icon"><use href="#i-NAME"/></svg>
    sidebar.js              # renders the Admin sidebar into #sidebar; active set via data-active
  assets/
    cbh-logo.svg            # brand lockup
```

**Every screen** links the three CSS files, sets `<html data-app="admin">` (or field/family), includes `js/icons.js` as the **first element in `<body>`** (so `<use>` resolves), an empty `<aside class="sidebar" id="sidebar" data-active="SCREEN_ID">`, and `js/sidebar.js` before `</body>`.

**Theming.** Components read `--accent-*` (and `--brand-*` aliases). Switching `data-app` remaps the accent ramp (purple→cyan→blue). Never hardcode a brand colour in a component — use `var(--accent)` etc. This mirrors the Figma "Brand" variable collection (modes: Admin/Field/Family).

**Tokens.** All colour/spacing/type/radius/shadow are CSS variables in `tokens.css`. Use them; don't introduce raw hex except inside illustrative SVG charts. White is the **base**; purple is an **accent**.

**Typography.** **Urbanist** (headings + body), loaded from Google Fonts with a system fallback. *(Replaced Stack Sans, June 2026.)* Use the `.t-*` utility classes (`.t-display-m`, `.t-heading-s`, `.t-body-m`, `.t-overline`, etc.).

**Icons.** Outlined, 24×24 viewBox, single sprite in `js/icons.js`. To add one: add a `name: '<path…>'` entry to the `S` map, then use `#i-name`. Stroke colour inherits `currentColor` via `.icon`.

**Sidebar.** Edit nav structure in the `GROUPS` array in `js/sidebar.js` — that is the single source for the Admin IA. Active state, badges (`badge`, `alert`) and groups are all data-driven there.

---

## 4. Care Model terminology (IMPORTANT — apply everywhere)

"Care Tier" / "Tier 1-2-3" is **retired**. "Digital Wellness" is also **retired** — use **Self Care**. The canonical Care Model names and display order are:

| Care Model | Was | Colour token | CSS chip class | Self/remote/in-person |
|---|---|---|---|---|
| **Self Care** | Digital Wellness / Tier 1 | `--model-digital-wellness` | `.model-chip--self` | Member self-managed |
| **Virtual Care** | Tier 2 | `--model-virtual-care` | `.model-chip--virtual` | Remote monitoring |
| **Direct Care** | Tier 3 | `--model-direct-care` | `.model-chip--direct` | In-person nursing |

Display order is always: **Self Care → Virtual Care → Direct Care**.

Each model has **Basic / Standard / Premium** plan levels. Care model is the **output of clinical assessment** and the spine of onboarding, scheduling, billing and the upgrade path. Use `.model-chip--self|virtual|direct` for chips (note: `--self`, not `--digital`).

Other renames: **Members** (was Clients), **Leads & Enquiries** (Enquiries), **Human Resources** (Staff), **Service Catalogue** (Add-Ons), **Billing & Invoices** (Billing), **Reports & Analytics** (Reports), **Care Model Distribution** (Care Tier Distribution).

---

## 5. Admin sidebar IA (lifecycle order)

> Lead → Member → Assessment → Care Model → Schedule → Visit → Report → Billing → Staff Payment → Analytics

- **Overview** — Dashboard, Emergency Centre *(red badge on active SOS)*
- **Membership & Care** — Leads & Enquiries, Members, Assessments, Care Models, Service Catalogue
- **Operations** — Scheduler, Visits & Duties, Visit Reports, Area Allocation
- **Workforce** — Human Resources, Attendance & GPS
- **Finance** — Billing & Invoices, Staff Payments
- **Insights** — Reports & Analytics, Health Analytics
- **Admin** — Users & Roles, Settings
- **Bottom (separate)** — User profile, Help & Support, Log out

Active = purple left border + pale-purple bg. Hover = subtle pale purple. Badges only where action is required (Emergency, Leads, Visit Reports, Billing, Staff Payments).

---

## 6. How to add a new screen (recipe)

1. Copy `admin-dashboard.html` as the skeleton.
2. Set `data-app`, the `<title>`, and `data-active="SCREEN_ID"` (ID must match an item in `sidebar.js` GROUPS).
3. Build content inside `<main class="content">` using existing components from `components.css`. Add screen-only layout in a scoped `<style>` (see `care-models.html`) or extend `app.css` if reusable.
4. Reuse: `.card`, `.kpi`, `.chip`/`.tier-chip`/`.model-chip`/`.risk`, `.btn--*`, `.info-card--*`, `.table`, `.tabs`, `.field`, `.avatar`, `.segmented`.
5. Keep sentence case, token colours, and run the cohesion check (consistent status/colour/entity representation across apps).

---

## 7. Working agreement

- **Cowork/Notion** = product decisions, IA, terminology, research, screen priorities. Treat Notion as canonical for *what* and *why*.
- **Claude Code** = implement screens against this design system. Don't invent new colours/fonts/terminology — if something's missing, flag it for a planning decision rather than improvising.
- After building screens, they get re-created in Figma for stakeholder handover and final polish (keep markup clean and component-driven to make that round-trip easy).

Key Notion pages: Project Brief & Goals · Design Principles & Cohesion Standards · The Design Process · **05 Care Models & Plans** · **07 Admin Navigation, Terminology & Visual System** · databases: Master Task Tracker, Screen Inventory, User Flows, Decisions Log.

---

## 8. Design Context (impeccable)

`PRODUCT.md` and `DESIGN.md` at the repo root are scoped to the **Wellness App** (`wellness-app.html`, the Self Care / Family-facing mobile surface) — not the Admin Portal. They cover: register (product), the member/family user profile, the "Calm Companion" brand personality (reassuring, warm, unhurried — distinct from Admin's "quiet authority"), and the visual system (Reassurance Blue `#3E6FB8` accent, Urbanist type, soft-lifted card hierarchy, bold 2.2px icon strokes). `.impeccable/design.json` carries the extended token metadata (tonal ramps, component snippets) for the `/impeccable live` visual-iteration mode, which is pre-configured for this repo (`.impeccable/live/config.json`).

If future work documents the Admin Portal or Field Staff app design systems, either re-scope these files or split into per-app variants — they are currently wellness-app-specific, not platform-wide.
