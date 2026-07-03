# Wellness App — Check-in Screen Handover

For: Claude Code
From: Claude (Cowork)
Date: 2026-07-04
File: `wellness-app.html` — `<section id="checkInView">`, currently lines 518-589 (plus supporting CSS around lines 121-137, and JS around lines 1982-2000)
Reference: `HANDOFF_CLAUDE_CODE_wellness_home.md` (2026-07-03) for the Home screen this navigates back to; this doc covers the Check-in screen only.

This was designed through iterative visual mockups reviewed with the product owner (Santhosh). All decisions below were explicitly confirmed over the mockup session. Where I made a judgment call rather than getting explicit confirmation, it's flagged as **[ASSUMPTION]** — verify before treating as final.

---

## 1. Layout order (top to bottom)

1. Header: back breadcrumb ("‹ Home") + "Daily check-in" title + subtitle — more top padding than the current build (see §2)
2. **Mood** card — purple-bordered (see §3)
3. **Energy** card
4. **Breathing** card — NEW
5. **Appetite** card — NEW
6. **Aches & pains** card (existing, redesigned + conditional "Where?" tag row)
7. **Sleep last night** card
8. **Notes** card (renamed from "Notes for your care team") with a Save button — NEW
9. **Previous entries** — NEW collapsible log, capped at 30
10. Footer note: "Today's selections feed directly into your wellness score on the home screen."

This is a reorder from the current build (Mood, Energy, Sleep, Aches, Notes) — Sleep moves to the end, Breathing and Appetite are inserted after Energy.

---

## 2. Header

- Replace the current back-chevron-only `.tbar` with a two-row header: a small breadcrumb row (`‹ Home`, tappable, routes the same as the existing back button) sitting above the "Daily check-in" title.
- Increase top padding — the current build sits the title flush against the top edge; give it real headroom (roughly 20px top padding vs. the ~14px currently used elsewhere).
- The existing `CBH.back()` behavior is unchanged — this is a visual/copy change to the same control, not new navigation logic.

---

## 3. Card frame — one unified treatment for all cards

**Every card on this screen (including Notes and Previous entries) uses the same frame:**
- Background: light blue tint — reuse `var(--accent-soft)` in the family theme (`--blue-50` / `#EAF0FB`).
- Border: **2px solid Carebridge purple** — `var(--purple-600)` / `#57317E`. This is deliberately the brand purple, not the family app's blue accent, to make check-in visually distinct within the blue-accented app.
- Border-radius: `var(--radius-lg)`.

This replaces the current `.ci-card` (1.5px `var(--border)`, white background) — update the shared class rather than styling each card inline.

**[ASSUMPTION]** Using purple here is an intentional one-off accent for this screen, not a proposal to change the family app's overall accent color. Flag if that reads ambiguously in code comments.

---

## 4. Option pills — icon chip + severity-tinted background

Each card contains a row of 2-4 option buttons (`.ci-opt`, replace/extend existing class). New pattern for all of them:

- Each option shows an icon inside a circular white chip (44px diameter, 27px icon — for the 4-option Aches row use a smaller 38px chip / 22px icon so four fit comfortably), with the label below.
- **Icon color is always Carebridge purple** (`#6E3E97` / roughly `var(--purple-500)`), regardless of which option or state it represents. This is a deliberate identity choice — icons don't change color by severity, only the pill background does.
- **Unselected option:** white background, white border (i.e., blends into the card's blue fill).
- **Selected option:** background and border switch to one of three pastel severity tones:
  - **Green** (positive/good): bg `#E6FBF3`, border `#A8DEB0`, label text `#256D33`. Maps to `--success-soft` / mint family already in tokens.css — reuse those tokens where possible.
  - **Yellow** (middling/caution): bg `#FFF6D6`, border `#F4D77B`, label text `#8A6D1B`. **These are new hex values — tokens.css currently has no true yellow ramp** (only mint/green and amber/red-orange). Recommend adding `--caution-soft` / `--caution` / `--caution-text` tokens with these values rather than hardcoding, so they're reusable if another screen needs a 3-tier severity scale later.
  - **Orange** (concerning): bg `#FDEBDD`, border `#F0AE79`, label text `#B15A1E`. For 4-level fields (Aches) use a deeper orange for the worst tier: bg `#FBDCC2`, border `#E8935A`, label text `#8A3E10`. Also new hex values — same recommendation as above (e.g. `--concern-soft` / `--concern` / `--concern-text`, plus a `--concern-strong` variant for the 4th tier).

### Per-card severity mapping

| Card | Green (good) | Yellow (caution) | Orange (concern) |
|---|---|---|---|
| Mood | Good | Okay | Low |
| Energy | High | Medium | Low |
| Breathing | Normal | Slightly short | Very short |
| Appetite | Normal | Reduced | Skipped meals |
| Aches & pains | None | Mild | Moderate (orange) / Severe (deeper orange) |
| Sleep last night | Good | Fair | Poor |

Note Sleep's option order stays Poor → Fair → Good (matches current build) even though the severity color table reads best-to-worst above — just map colors to values, not to position.

---

## 5. Icons — new sprite entries needed

The mockup used Tabler's icon font for speed, but `wellness-app.html` uses its own sprite (`js/icons.js`, `<symbol>` defs, 24×24 viewBox, paths only — stroke/fill inherit `currentColor` via `.icon`). **These are not in the sprite yet and need to be added**, matching the existing outlined style (see existing entries for reference, e.g. `pulse`, `shield`, `heart`):

| New symbol name | Used for | Notes |
|---|---|---|
| `mood-happy` | Mood → Good | Circle face, upward smile arc, two dot eyes |
| `mood-empty` | Mood → Okay | Circle face, flat mouth line, two dot eyes (avoid `mood-neutral` — in testing that read as a face with no mouth at all, looked broken) |
| `mood-sad` | Mood → Low, Previous-entries chips | Circle face, downward frown arc, angled eyebrow marks, two dot eyes |
| `battery-4` | Energy → High | Battery outline, fully filled |
| `battery-2` | Energy → Medium | Battery outline, half filled |
| `battery-1` | Energy → Low | Battery outline, low sliver filled |
| `lungs` | Breathing (all 3 states) | See §6 for the fill-level technique — one glyph, reused three ways |
| `kitchen` | Appetite → Normal, Reduced | Fork + knife glyph |
| `kitchen-off` | Appetite → Skipped meals | Fork + knife glyph with a diagonal slash, matching the sprite's existing slash convention if any exists, otherwise a simple diagonal line overlay |
| `moon-stars` | Sleep → Fair | Crescent moon + 1-2 small stars |
| `zzz` | Sleep → Good | Stacked "Z" sleep glyph |
| `bandage` | Aches → Mild, Moderate | Simple adhesive bandage/plaster shape |
| `info` | Footer note icon | Circle with "i" — simple info-circle |

**Reuse existing sprite entries — do not duplicate these:**
- `moon` (already exists, line 68) → Sleep → Poor
- `star` (already exists, line 43) → can inform `moon-stars`, or reuse directly if a single star reads clearly enough at small size — designer's call
- `alert` (already exists, line 74 — already a triangle-with-exclamation) → Aches → Severe
- `mood-happy`/`mood-empty` also reused at smaller size for the "None" ache option (`mood-happy`) — no new symbol needed there, just reuse

---

## 6. Breathing — fill-level lungs icon (the one piece of custom rendering)

This was the most-iterated part of the screen. Tabler (used in the mockup) has no graduated/half-filled lungs icon, and the real sprite won't either, so build the fill visually rather than needing three separate glyphs:

- Render the `lungs` symbol **twice, stacked** inside a `position:relative` wrapper the size of the icon:
  1. Base copy: light muted color (e.g. `#DED0EA`, a pale purple tint), full opacity, `position:absolute; inset:0`.
  2. Overlay copy: full purple (`#6E3E97`), `position:absolute; inset:0`, with `clip-path: inset(<top>% 0 0 0)` to reveal only the bottom portion.
- Fill levels by clip-path top-inset:
  - **Normal**: `inset(0% 0 0 0)` — fully colored (100% fill)
  - **Slightly short**: `inset(50% 0 0 0)` — bottom half colored
  - **Very short**: `inset(82% 0 0 0)` — thin colored sliver at the base only
- This is pure CSS (`clip-path`), no JS needed, and works with the existing `<svg class="icon"><use>` pattern — just wrap two `<use>` instances instead of one.

---

## 7. Aches & pains — conditional "Where?" tag row

- Existing 4-level intensity scale (None/Mild/Moderate/Severe) is unchanged in structure, just restyled per §4.
- **New:** when any option other than "None" is selected, reveal an additional row below the option pills: label "Where? (optional)", followed by tag chips — Joints, Back, Head, Chest, Other. Multi-select, toggle on tap (selected = filled blue `--accent-soft` background + accent border + accent text; unselected = white).
- When "None" is selected, hide this row entirely (don't just disable it — remove from layout) and clear any selected tags.
- These tags are informational context for the care team, not scored — do not factor them into the wellness score calculation in §9.

---

## 8. Appetite (new field)

Three options: Normal / Reduced / Skipped meals. Same option-pill pattern as everything else, `kitchen`/`kitchen-off` icons per §5.

**[ASSUMPTION]** No sub-detail (e.g. "why") is captured beyond the three-level pick — kept intentionally lightweight, consistent with the other fields on this screen. If care coordination later wants a free-text reason, that's an additive change, not a redesign.

---

## 9. Notes — renamed + explicit save action

- Header changes from "Notes for your care team" to just **"Notes"**. Subtitle ("Optional · 100 characters max") and the existing `maxlength="100"` behavior are unchanged.
- **New: explicit "Save note" button** below the textarea — full-width, filled purple (`#57317E` background, white text), matching the card's border-accent color rather than the app's blue accent.
- **Behavior change from current build:** currently `submitCheckIn()` reads the comment field only when the whole screen's Submit button (top-right `tbar-submit`) is tapped, and always navigates back to Home. With the new "Save note" button:
  - Tapping **Save note** should save just the note text into the day's entry (see §10) and give lightweight confirmation (e.g. brief button state change or toast) — it should **not** navigate away from the check-in screen.
  - The top-right **Submit** button remains the action that finalizes the whole day's check-in (mood/energy/breathing/appetite/aches/sleep + whatever was saved in notes) and navigates back to Home, same as current `submitCheckIn()` behavior.
  - **[ASSUMPTION]** Exact relationship between "Save note" and the overall Submit flow (e.g. does Submit require Save note to have been tapped first, or does it just pick up whatever's currently in the textarea) — flagged as a judgment call. Recommended simplest approach: Submit always reads the current textarea value directly, same as today; "Save note" is a convenience/reassurance action for the user, not a hard gate.

---

## 10. Previous entries — new collapsible log, capped at 30

A new card at the bottom of the scroll, above the footer note.

- **Header row** (always visible, tappable to expand/collapse): "Previous entries" + subtitle "Last 30 kept · reviewed weekly by your care team" + chevron-down icon that rotates 180° when expanded. Use the existing `chevron-down` sprite entry.
- **Collapsed by default.**
- **Expanded**, shows a list of past entries, most recent first, each row containing:
  - Left column: date (e.g. "2 Jul") + time (e.g. "8:14 AM"), stacked, fixed width for alignment.
  - Right: a row of small (22px) icon chips — one per field that was answered that day (mood, energy, breathing, appetite, aches, sleep), each in its own tinted rounded-square background matching that entry's severity tier from §4. Below that, the note text in italic muted style if one was saved, or "No notes added" in a lighter muted tone if not.
- **Cap: 30 entries.** When a new check-in is submitted, prepend it to the list and drop the oldest entry once the list exceeds 30 — implement as a simple array operation (`unshift` + `slice(0, 30)`), not a display-only truncation, since this is meant to be the actual stored history.
- **Data written on Submit:** when the top-right Submit button is tapped (§9), construct one entry object containing: ISO timestamp, and the selected value for each of mood/energy/breathing/appetite/aches/aches-location-tags/sleep, plus the notes text if present. Prepend to the stored list per the cap logic above.
- **Persistence:** same caveat as the Home screen's quick-actions persistence (see `HANDOFF_CLAUDE_CODE_wellness_home.md` §4) — this app is currently a stateless static prototype with no backend. Implement using `localStorage` as an interim store, clearly commented `// TODO: replace with Care Bridge backend profile sync once auth/backend exists`. Do not fake a "syncing" state.
- Three dummy entries should ship in the initial `localStorage` seed data (or hardcoded fallback if `localStorage` is empty) purely so the log isn't empty on first load of the prototype — content doesn't matter, just needs realistic variety (one with a note, one without, one showing an elevated/concerning value) so reviewers can see the visual states.

---

## 11. Wellness score wiring (footer note + actual logic)

The footer note ("Today's selections feed directly into your wellness score on the home screen") is a **commitment to wire this up**, not just copy — confirmed with product owner that check-in answers should be the base data driving the score shown on Home (`applyScoreRing()`, currently hardcoded to `85` at both call sites, `wellness-app.html` lines ~2109-2110).

**[ASSUMPTION] — scoring formula not explicitly specified by product owner, this is a proposed starting point, confirm before building:**

- Map each field's selected option to a 0-100 sub-score using the same 3-tier severity logic as the card colors: green tier → 100, yellow tier → 60, orange tier → 25 (Aches' 4th "Severe" tier → 10).
- Overall daily score = simple average of all sub-scores from fields that were answered that day (skip unanswered fields rather than penalizing them, so the score isn't punished by an incomplete check-in — this matters once Appetite/Breathing are optional additions rather than required fields).
- `applyScoreRing()` already handles the color banding (≥80 success, ≥60 warning, ≥40 orange, else danger) — feed it the computed score instead of the hardcoded `85`.
- The Monthly Report's rolling score (currently also hardcoded) is out of scope for this handoff — that's an aggregate over many days' entries and deserves its own pass once daily scoring is confirmed working.

---

## 12. Component reuse (verified against actual codebase)

- Card frame: extend `.ci-card` rather than creating a new class — update its border/background per §3 so all six question cards plus Notes and Previous entries share one definition.
- Option pills: extend `.ci-opt` / `.ci-opt-em` — the icon-chip-plus-label structure replaces the current bare-emoji-plus-label structure, but the flex-row layout and selection toggle logic (`pickOpt()`, line ~2183) can largely stay, just extended to also swap severity-tinted backgrounds instead of a single accent tint.
- Tag chips (Aches "Where?" row): reuse the existing chip visual language from `mobile.css` rather than inventing new chip markup — confirm exact class name in `mobile.css` before implementing (per the Home handoff's note: verify `chip2--*` variants directly in the stylesheet, don't guess).
- Collapsible pattern (Previous entries): matches the existing `.inv-details` / `.inv-item.open` collapsible pattern already used in the Medicine Cabinet inventory rows (`wellness-app.html` ~line 264-268) — reuse that open/close CSS approach (class toggle + `display:none`/`block`) rather than a new implementation.

---

## 13. Open items for future passes (not blocking this handoff)

- New pastel yellow/orange design tokens (§4) need a home in `tokens.css` if reused elsewhere — flagging for a Cowork/Notion decision rather than deciding unilaterally in code.
- Exact Save-note / Submit interaction (§9) — simplest interpretation given, but worth a quick confirm.
- Wellness score formula (§11) is a proposed starting point, not a confirmed spec — needs sign-off before treating as final, especially the exact point values per tier.
- Monthly Report rolling score aggregation — separate pass.
- `kitchen-off` icon — sprite has no existing "slashed" icon convention to follow; designer's judgment call on how to render the slash cleanly at 24×24.
