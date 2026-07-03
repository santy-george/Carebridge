# Wellness App — Meds Screen Handover

For: Claude Code
From: Claude (Cowork)
Date: 2026-07-04
File: `wellness-app.html` — `<section id="medicationView">` (currently ~line 594-780) and `<section id="addMedView">` (currently ~line 1553-1647), plus supporting CSS in the inline `<style>` block (~lines 140-230, 313-318)
Reference: `HANDOFF_CLAUDE_CODE_wellness_checkin.md` (2026-07-04) and `HANDOFF_CLAUDE_CODE_wellness_wearable_config.md` (2026-07-04) — this screen reuses the purple-bordered card language and collapsible pattern established there. Read those docs' relevant sections before implementing; do not re-derive styling from scratch.

This was designed through iterative visual mockups reviewed with the product owner (Santhosh), starting from a design-system critique of the existing build (emoji icons, inline-styled buttons duplicating existing classes, care-model colors reused on unrelated content). All decisions below were explicitly confirmed over the mockup session. Where a judgment call was made rather than getting explicit confirmation, it's flagged **[ASSUMPTION]**.

---

## 0. Feasibility — read this before building

The **Reorder → cart → "Send order" flow** (§7) is UI-only in this static prototype, same principle as the Wearable device settings handoff's §0. Adding to cart and picking SMS/WhatsApp/Email works as local UI state; tapping "Send order" must **not** simulate an actual dispatch to a pharmacy — no fake "sent" confirmation implying a real message went out. This needs a backend + messaging integration that doesn't exist yet.

The **Preferred pharmacist dropdown** (§6) and the **prescription-to-Records link** (§8) both reference data from screens that don't exist yet (Care team / Care tab, and the Records tab). Ship these as populated with realistic placeholder options now; they should be wired to real data once those screens are built — do not block this handoff on them.

---

## 1. Tab toggle — reuse the existing vitals-source toggle, don't build a new component

The old "Today's Schedule" / "Medicine Cabinet" tabs (`.med-tabs` / `.med-tab`) read as table headers, not controls, and get replaced.

**Reuse `.vitals-toggle` / `.vtog` as-is** — this is the exact same component already built for Home's wearable/manual vitals source toggle (`wellness-app.html`, Home's `.vitals-toggle` block). Two buttons, pill radius, `1.5px solid var(--border)`, active state = `var(--accent)` border + `var(--accent-soft)` fill + `var(--accent-text)` label. Do not create a new `.seg`/`.med-tab` class for this — it would be a second implementation of the same pattern.

Only change from the base `.vtog`: font-size down to ~11px with `white-space:nowrap` so "Today's Schedule" and "Medicine Cabinet" each fit on one line at this width — everything else (radius, border, active-state colors) stays identical to Home's usage.

---

## 2. Adherence line — replaces the stock-ring summary card

Remove the current bordered card with the circular `.stock-ring` + bold count. Replace with a single thin line of **regular-weight, non-bold text**, sitting above the time bands with a bottom border as a separator:

`"2 of 4 medications taken today · next due Vitamin D3 at 12:00 PM"`

Only the numbers and the next-due medicine name are medium-weight for scannability; the rest of the sentence is regular body text. This is a deliberate space-saving change from the previous bold card+ring treatment — do not add back a ring or icon here.

---

## 3. Time-of-day bands — Morning / Noon / Evening / Night, purple-bordered, collapsible

Replace the current Morning/Noon/Evening bands (`.tod-band`) with **four** bands: Morning, Noon, Evening, Night (Night is new — currently nothing is scheduled there, but the band should still render with an empty-state message "Nothing scheduled for night" rather than being hidden, since medicines can be added there later).

**Card frame — important exception, read carefully:** every band uses the same **2px solid Carebridge purple** border (`var(--purple-600)` / `#57317E`) and `var(--radius-lg)` corners established in the Check-in handoff (§3 of that doc). However, **the fill color is NOT the single blue `--accent-soft` used everywhere else** — Santhosh explicitly asked for each band to have a distinct light tint so the four are visually distinguishable at a glance:
- Morning: `var(--amber-50)`
- Noon: `var(--blue-50)`
- Evening: `var(--purple-50)`
- Night: `var(--mint-50)`

**This is a deliberate, confirmed one-off exception to the Check-in card convention — do not "correct" it back to a single blue fill.** The purple border stays constant across all four; only the fill varies.

**Collapsible, default expanded:** each band has a header row (label, small `"n/m"` count, chevron) that toggles an open/closed state on tap. **All four bands start expanded when the screen opens** — this is different from the Check-in "Previous entries" pattern (which starts collapsed); confirm this default explicitly in code review since it's easy to copy the wrong default from the Check-in reference.

Band label styling: `font-family: var(--font-heading); font-weight:700; font-size:11.5px; letter-spacing:.4px; text-transform:uppercase` — this matches the existing `.tod-band-label` convention exactly (do not introduce a slightly different letter-spacing value).

---

## 4. Marking a medicine taken — checkmark, not strikethrough

Replace the current `<input type="checkbox">` + strikethrough-on-taken text with:
- A circular check control (24px, `2px solid var(--border-strong)`, white fill when unchecked).
- On tap: fills `var(--accent)`, border becomes `var(--accent)`, and shows the sprite's existing `check` symbol (`js/icons.js` line ~37, `<polyline points="5,12.5 10,17.5 19,7"/>`) in white — do not use a text/unicode checkmark character.
- **The medicine row itself drops to ~40% opacity when taken** (`opacity:.4` on the row). **Do not strike through the medicine name** — this was an explicit correction from the current build, which strikes through and dims. Opacity-only, no `text-decoration`.

---

## 5. Recent history — now collapsible

Wrap the existing "Recent history" list in the same collapsible header pattern as the time bands (chevron rotates, `display:none`/`block` toggle) — reuse the exact mechanic already established for `.inv-item`/`.inv-details` (Medicine Cabinet's existing expand pattern, referenced and reused again in Check-in's "Previous entries," §12 of that handoff). **Collapsed by default** (unlike the time bands, which are open by default — see §3).

---

## 6. Medicine Cabinet — remove stock card, add pharmacist select

- **Remove entirely:** the "Stock" summary card and its circular `.stock-ring` indicator that currently sits at the top of the Medicine Cabinet panel.
- **Add in its place:** a `<select>` with no visible field label (the label was removed per explicit feedback — don't add one back), placeholder/first option reading **"Select Preferred Pharmacist"**, font-size ~10.5px, regular weight (400), `color: var(--text-muted)`. Options are the member's care team pharmacists — **[ASSUMPTION / placeholder]** populate with 1-2 realistic dummy entries (e.g. "Apollo Pharmacy — Kochi (care team)") until the Care tab exists to source this list for real; flag in code as `// TODO: populate from care team once Care tab data model exists`.

---

## 7. Medicine Cabinet cards — twistie detail expand + Reorder button (not Refill)

Each cabinet card keeps its existing **twistie/expand behavior** — this was accidentally dropped in an earlier mockup pass and must be preserved: tapping the card header (icon + name + twistie chevron, or the days-left row beneath it) toggles `.inv-item.open`, revealing `.inv-details` rows: Dosage, Prescribed by, Date stocked, Expiry, In stock — same five rows and same row styling as the current build.

**What changes:**
- **Remove the "Refill" button entirely** — in the current build it's styled like a clickable pill but performs no different action than the row toggle, which is confusing. Delete it.
- **Add a full-width "Reorder" row at the bottom of each card**, outside the collapsible area (always visible, whether the card is expanded or not) — background `var(--surface-sunken)`, top border only, centered text, `var(--accent-text)` color, ~12.5px/700 weight.
- Tapping **Reorder** opens a bottom sheet (§0 covers the feasibility caveat) with a quantity stepper (`–` / count / `+`, starting at 1) and an "Add to cart" button. Reuse the app's **existing bottom-sheet component** (`.sheet` / `.scrim` / `.sheet__grip` — built for Home's quick-actions editor, see Home handoff §4/§7) rather than building a new sheet from scratch.
- A cart icon in the top bar (next to the existing back button, opposite side from the title) shows a small red count badge once anything's been added. Tapping it opens a second sheet: itemized cart list, a channel picker (SMS / WhatsApp / Email — single-select, same `.vtog`-style selected state), and a "Send order" button. Per §0, "Send order" is UI-only for this handoff — closes the sheet, no fake success state.

**Icons — new sprite entries needed** (per the Check-in handoff's established no-emoji convention, `js/icons.js`, 24×24 viewBox, path-only, `currentColor`):

| New symbol name | Used for | Notes |
|---|---|---|
| `sun` | Vitamin D3 cabinet icon | Circle + 8 rays, matches existing stroke weight/style |
| `thyroid` (or similar) | Levothyroxine cabinet icon | Butterfly-ish two-wing shape with center line — thyroid is butterfly-shaped, hence the earlier emoji choice; needs a clean outline equivalent |

**Reuse existing sprite entries — do not duplicate:**
- `pill` (already exists, line 44) → Metformin cabinet icon
- `heart` (already exists, line 41) → Atorvastatin cabinet icon
- `check` (already exists, line 37) → taken checkmark, §4

All four cabinet items ship in this pass: Metformin, Vitamin D3, Atorvastatin, **and Levothyroxine** (this fourth item was dropped in an earlier mockup iteration and must be restored — confirm all four are present before calling this done).

---

## 8. Add Medication — full record capture, OTC/Prescription as a dropdown

The add-medication form (`addMedView`) keeps its existing sectioned structure (Medication details / Schedule / Stock / Notes) and existing fields — Name, What it's for, Dosage, Form, Frequency, When-to-take chips (`.when-btn`, already exists, unchanged), Date stocked, Expiry date, Qty in stock, Alert below, Notes. Two changes:

1. **New "Source" section**, between Schedule and Stock: a `<select>` labeled "Is this over-the-counter or prescription?" with two options, Over-the-counter / Prescription — **this replaces an earlier two-button toggle mockup; use a dropdown, not buttons**, per explicit direction.
2. **When "Prescription" is selected**, reveal two additional fields: "Prescribed by" (text input, doctor's name) and "Link to a prescription in Records" (`<select>`, placeholder options like "Dr. Rajeev Menon — 1 Jun 2026") — **[ASSUMPTION / placeholder]** same caveat as §6: this needs the Records tab to exist for real data; populate with realistic dummy entries and flag `// TODO: populate from Records once that tab's data model exists`. When "Over-the-counter" is selected, hide both fields and clear their values.

---

## 9. Component reuse (verified against actual codebase)

- Tab toggle: `.vitals-toggle` / `.vtog` (Home) — see §1. Do not create a new class.
- Bottom sheets: `.sheet` / `.scrim` / `.sheet__grip` (Home quick-actions editor) — see §7. Do not create a new class.
- Collapsible pattern: `.inv-item.open` / `.inv-details` (existing Medicine Cabinet mechanic, also reused by Check-in's "Previous entries") — see §5 and §7.
- Purple card border + radius: `var(--purple-600)`, `var(--radius-lg)`, established in Check-in §3 — see §3 for the fill-color exception specific to this screen.
- When-to-take chips: existing `.when-btn` class, unchanged.
- Checkmark icon: existing `check` sprite symbol — see §4.

---

## 10. Open items for future passes (not blocking this handoff)

- Pharmacist dropdown (§6) needs real care-team data once the Care tab exists — currently placeholder options.
- Prescription-to-Records link (§8) needs real Records data once that tab exists — currently placeholder options.
- Reorder → cart → dispatch (§7, §0) is UI-only; real SMS/WhatsApp/Email dispatch to a pharmacy requires backend + messaging integration, tracked separately.
- Two new sprite icons (`sun`, `thyroid`) need final outline artwork matching the existing 24×24 stroke style — placeholder paths were used in the mockup.
