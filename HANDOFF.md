# Care Bridge Home — Wellness App: Consolidated Handoff

For: Claude Code (implementation/continuity)
From: Claude (Cowork)
Covers: `wellness-app.html` (Self Care / family-facing mobile surface) — Home, Meds, Records, Care, Tools tabs, plus the Check-in and Wearable Device Settings screens.
Period: 3–4 July 2026 (all passes below happened in that window; this file supersedes and replaces the 9 individual `HANDOFF_CLAUDE_CODE_wellness_*.md` files, which covered one screen or fix-pass each and are consolidated here in build order).

This app was designed through a mix of iterative visual mockups reviewed with the product owner (Santhosh) and, for later passes, direct implementation against his concrete corrections once no visual decision remained open. Where a judgment call was made rather than getting explicit confirmation, it's flagged **[ASSUMPTION]** — verify before treating as final. All five tabs of the original plan (Home, Meds, Records, Care, Tools) are now built.

---

## Status at a glance

| Screen/pass | Date | Process | State |
|---|---|---|---|
| Home | 3 Jul | Mockup → handoff | Built |
| Care | 4 Jul | Direct build (clear spec) | Built |
| Check-in | 4 Jul | Mockup → handoff | Built |
| Meds | 4 Jul | Mockup → handoff | Built |
| Home + Meds fix pass | 4 Jul | Direct (bug/UX corrections on shipped screens) | Built |
| Records | 4 Jul | Mockup → handoff | Built |
| Records multi-select/share + Check-in fixes | 4 Jul | Direct | Built |
| Tools | 4 Jul | Design Q&A → direct build | Built (closes the 5-tab plan) |
| Wearable device settings | 4 Jul | Mockup → handoff | Built |

**Standing rule across every pass:** this repo is a stateless static prototype — no backend, no auth. Anything that looks like it persists, syncs, dispatches an order, sends a message, or pairs a device is UI-only local state (mostly `localStorage` or pure DOM mutation) with a `// TODO: replace with real … once backend exists` comment in the code. Never build fake "syncing"/"pairing"/"sent" states that imply a real integration — this rule is repeated in nearly every section below because it was enforced consistently screen by screen.

---

## 1. Home screen

File: `<section id="homeView">`.

**Layout (top to bottom):** status bar → header (greeting + SOS icon + bell + avatar) → hero card (Self Care band, wellness ring, "Log today's check-in" CTA, unchanged) → Today's vitals card (unchanged) → **Today's medications** summary card (new, §1.3) → **Quick actions** grid (reworked, §1.4) → bottom nav, now 5 tabs (§1.5). The "Wellness Warrior" streak badge was removed — gamification is deferred, not deprioritized.

### 1.1 Header
- **SOS button relocated** from a full-width red bar near the bottom of Home into a small circular icon button in the top header (between greeting and bell), outlined danger red, not filled. Reason: accidental-tap risk for a bold full-width bar low in a scrolling list. Still routes to the existing `sosConfirmView` hold-to-confirm flow — only the entry point changed.
- **Notification bell** should surface three categories: Alerts (urgent — missed medication, abnormal vitals), Admin/coordination push messages, and Reminders (routine). **[ASSUMPTION]** exact grouping/visual treatment not yet specced — flag for a Notifications screen pass.
- **Avatar** taps directly into full Profile (no intermediate quick-menu).

### 1.2 Header fix pass (4 Jul)
- Every screen's top row sat flush under the notch. Fixed with a wellness-app-scoped `.tbar { padding-top: 18px; }` override (was 4px via shared `css/mobile.css`). Also bumped `#checkInView`/`#wearableConfigView` inline padding-top 20px → 22px. **Deliberately did not touch `css/mobile.css`** — shared with `family-app.html`/`nurse-app.html`, unreviewed; promote later if/when those get their own pass.
- `#home-greeting` font size reduced from 24px to 18px (2pt over `.card__title`'s 16px, per spec).
- `CBH.go()` only reset `scrollTop` on the outer `.view` (which never scrolls). Fixed to also reset each view's inner `.vbody.scrollTop = 0`, so reopening a view doesn't land mid-scroll.
- "Today's vitals" card's redundant "Wearables" text link (duplicated the source toggle right below it) changed to a gear-icon "Settings" link routing to the real `wearableConfigView`.

### 1.3 Today's medications (new summary card)
Single summary card, not a full list — avoids duplicating state with the Meds tab. Progress ring (`n/m`, colored via existing `--success`/`--warning` `.stock-ring` token logic) + "X of Y medications taken" (bold) + "Next due: name, time" (muted) + chevron. Entire card is one tap target → `medicationView`; no checkboxes here, all tick-off logic stays in Meds. Reuse the Meds tab's existing adherence computation (`adhRingNum`, `adhCountNum`, `adhCountTotal`, `adhNote`) rather than recomputing.

### 1.4 Quick actions — dynamic, user-editable grid
Most significant behavioral change on Home.
- **Default:** 2-column grid, Hydration (tap increments a counter, wraps at the user's target) and My journal (opens a journal flow — **[ASSUMPTION]** journal screen not yet designed).
- **Edit mode:** "Edit" link next to the section label opens a checklist of all action types (Hydration/My journal pre-checked; Upload a record, Message coordinator, Request refill, Book a consultation available unchecked). Data-driven array (`{id, label, sub, icon}`), not hardcoded markup, so Tools-tab actions can be added later. **Hard cap of 4 selected** — remaining items dim/disable once 4 are picked. Grid re-renders live (2→1 row, 4→2 rows). "Done" closes the picker.
- **Persistence:** confirmed direction is member-profile sync with the Care Bridge backend, but that backend doesn't exist yet. Interim: `localStorage` placeholder, commented `// TODO: replace with Care Bridge backend profile sync once auth/backend exists`. No fake "syncing" UI.
- "Upload a record"/"Message coordinator"/"Request refill"/"Book a consultation" are opt-in via the Edit picker, not defaults — a space-saving decision, not a feature removal.

### 1.5 Bottom navigation — reworked to 5 tabs
Old: Home, Meds, Wearables, Profile. **New: Home, Meds, Records, Care, Tools.**
- **Records** — personal medical records vault (labs, ECGs, prescriptions); Monthly Report is a sub-section within Records, not a separate destination.
- **Care** — merges Care Team + check-in-related content.
- **Tools** — Calculators, Wearables (moved off the nav bar), Exercises.
- **Profile** — no longer a nav tab; reached only via header avatar (confirmed, not an oversight).
- Flag: 5 items is dense at 320–375px width; mockup fits at 18px icons/8.5px labels — confirm real rendering isn't cramped (fallback discussed was folding Tools into "More," but build 5 tabs first).

### 1.6 Layout/sizing
Tighter padding on hero/vitals cards (~12–14px vs 16px); Quick actions defaults to 2-column specifically to save vertical space. Target: full Home content fits one viewport with no scroll on mid+ phones, close to fitting on iPhone SE class (~667pt). Validated only in an approximate CSS mockup — confirm against real rendering.

### 1.7 Component reuse
Icon chip = existing `.acard .a-ic` (don't reinvent). Medication ring = existing `.stock-ring`. Chip/status tokens: `chip2--alert` (not `chip2--danger`, which doesn't exist), `chip2--ok` — verify any unlisted variant against `css/mobile.css` directly before using.

### 1.8 Open (Home)
Journal/notes flow design; notification feed grouping; Care tab full scope (see §2); Tools full scope (see §7); Records restructure (see §5); native wearable integration (HealthKit/Health Connect) is out of scope for this static build.

---

## 2. Care screen

File: `wellness-app.html` only. Direct build — spec was clear and complete (two-part: admin-arranged Care Team + member-owned Own Contacts).

**Before:** `careTeamView` was a single flat card, 2 rows (coordinator, physician), no member-added contacts.

**Now:** two tabs, same pattern as Meds/Records but on its own namespace (`ctab-team`/`ctab-own`, `cpanel-team`/`cpanel-own`, `switchCareTab()`) — every view's DOM persists simultaneously, so sharing class names with `.med-*`/`.rec-*` would let one screen's tab switch bleed into another's panels via global `querySelectorAll`.

- **Care Team tab** (default) — read-only, office-arranged. Expanded 2→4 rows: Care coordinator (Joel Abraham), Family physician (Dr. Rajeev Menon), Physiotherapist (Sarah Mathew), Home nurse (Reshma Thomas). No add/remove.
- **Own Contacts tab** — member-managed, seeded with 4 examples (Dr. Priya Varma/Ophthalmologist, Ravi Kumar/Physiotherapist, Sunitha Nair/Home nurse backup, Suresh Kumar/Chauffeur). Each row has chat/phone icons plus a remove (✕) button (`removeOwnContact()`, `confirm()`-gated). "+ Add a contact" row activates the pre-existing but previously unused `.add-contact-row` class.

**New view `addContactView`** (modeled on Add Medication's form pattern): Name (required), Category (select — Doctor/Physiotherapist/Counsellor/Pharmacist/Nurse/Chauffeur/Other), Phone 1 + Phone 2 (2 optional), Email (optional), Address (textarea, optional), Notes (100-word cap, live-counted via `updateContactNotesWordCount()`). `saveNewContact()` builds a row with derived initials (`initialsForName()`) and a category-keyed avatar tint (`_contactCategoryColor`), then returns to Care → Own Contacts (`CBH.goTab(...)`, same pattern as `saveNewMed()`). Back/Cancel call `resetAddContactForm()` first.

**Caveats:** UI-only, no persistence (`// TODO: replace with real contacts sync once backend exists`). Phone/email/address/notes are captured but not displayed anywhere in the row (name + category only) — chat/phone icon buttons across Care Team and Own Contacts have never had real onclick handlers, consistent with the existing decorative-icon pattern elsewhere. Tools was not touched in this pass.

**Verified:** script parses clean via Node `new Function()`; `<section>` balance 22/22; all new ids/functions appear exactly once; old single `acPhone` id fully removed.

---

## 3. Check-in screen

File: `<section id="checkInView">` plus supporting CSS/JS. Mockup → handoff process.

**Layout:** breadcrumb header → Mood → Energy → **Breathing** (new) → **Appetite** (new) → Aches & pains (redesigned + conditional tag row) → Sleep (moved to the end) → **Notes** (renamed, own Save action) → **Previous entries** (new, collapsible, capped at 30) → footer note.

### 3.1 Header
Two-row header: `‹ Home` breadcrumb above "Daily check-in" title, more top padding (~20px vs ~14px). `CBH.back()` behavior unchanged.

### 3.2 Card frame
Every card (including Notes and Previous entries) shares one frame: `var(--accent-soft)`/`#EAF0FB` fill, **2px solid Carebridge purple** border (`var(--purple-600)`/`#57317E` — deliberate one-off brand accent, not a change to the family app's blue), `var(--radius-lg)` radius. Replaces the old `.ci-card` (1.5px `var(--border)`, white bg) — update the shared class, don't style each card inline.

### 3.3 Option pills — icon chip + severity tint
Each option: icon in a circular white chip (44px/27px icon; 38px/22px for Aches' 4-option row), label below. **Icon color is always purple** (`#6E3E97`) regardless of state — only the pill background/border/label color shift by severity:
- Green (good): `#E6FBF3` / `#A8DEB0` / `#256D33` — maps to existing `--success-soft` family.
- Yellow (caution): `#FFF6D6` / `#F4D77B` / `#8A6D1B` — **new**, no yellow ramp exists in `tokens.css`; recommend adding `--caution-soft`/`--caution`/`--caution-text`.
- Orange (concern): `#FDEBDD` / `#F0AE79` / `#B15A1E`; deeper orange for Aches' 4th tier: `#FBDCC2` / `#E8935A` / `#8A3E10` — also new, recommend `--concern-soft`/`--concern`/`--concern-text`/`--concern-strong`.

Per-card mapping: Mood (Good/Okay/Low), Energy (High/Medium/Low), Breathing (Normal/Slightly short/Very short), Appetite (Normal/Reduced/Skipped meals), Aches (None/Mild/Moderate·orange/Severe·deeper orange), Sleep (Good/Fair/Poor — display order stays Poor→Fair→Good, map colors to values not position).

### 3.4 New sprite icons
`mood-happy`, `mood-empty` (avoid `mood-neutral` — read as broken in testing), `mood-sad`, `battery-4/2/1`, `lungs` (fill technique below), `kitchen`, `kitchen-off`, `moon-stars`, `zzz`, `bandage`, `info`. Reuse existing `moon` (Sleep→Poor), `star`, `alert` (Aches→Severe), and reuse `mood-happy` again for Aches→None.

### 3.5 Breathing — fill-level lungs icon
No graduated lungs glyph exists (Tabler or the app sprite), so render `lungs` twice stacked in a `position:relative` wrapper: pale base copy (`#DED0EA`, full opacity, `inset:0`) + purple overlay copy (`#6E3E97`, `inset:0`, `clip-path: inset(<top>% 0 0 0)`). Fill by top-inset: Normal 0% (full), Slightly short 50% (half), Very short 82% (thin sliver). Pure CSS, no JS, works with existing `<use>` pattern.

### 3.6 Aches & pains — conditional "Where?" row
Structure unchanged, restyled per §3.3. When any option but "None" is picked, reveal a "Where? (optional)" tag row — Joints/Back/Head/Chest/Other, multi-select toggle (selected = filled `--accent-soft` + accent border/text). "None" hides the row entirely (remove from layout, clear tags). Tags are informational context only — not scored (§3.9).

### 3.7 Appetite (new)
Normal/Reduced/Skipped meals, same pill pattern, `kitchen`/`kitchen-off` icons. **[ASSUMPTION]** no sub-detail beyond the 3-level pick, kept lightweight; a free-text reason would be additive later.

### 3.8 Notes — renamed + explicit save, then simplified again
Renamed "Notes for your care team" → "Notes" (subtitle/100-char max unchanged). Originally added a separate "Save note" button below the textarea, distinct from the top-right Submit button. **Superseded by the 4 Jul fix pass:** the top-right `.tbar-submit` button was removed entirely (dead CSS also removed); the bottom button is now the single submit action, relabeled **"Submit check-in"**, restyled `mbtn--brand` → `mbtn--fill` (matches Home's primary CTA), `onclick` → `submitCheckIn()` directly (the old `saveNote()` toast function was deleted, no other callers). `submitCheckIn()` already read the textarea directly regardless of caller, so no logic change was needed — purely a relocation/relabel.

### 3.9 Previous entries — collapsible log, capped at 30
New card, collapsed by default, header row ("Previous entries" + "Last 30 kept · reviewed weekly by your care team" + rotating chevron). Expanded: rows of date/time (left) + small severity-tinted icon chips per answered field (right) + italic note text or "No notes added". Cap enforced as a real array op (`unshift` + `slice(0,30)`), not display-only truncation. On Submit: build one entry (ISO timestamp + each field's value + aches tags + notes) and prepend. Persistence: `localStorage` interim store, `// TODO: replace with Care Bridge backend profile sync once auth/backend exists`, no fake syncing state. Ship 3 dummy seed entries (one with a note, one without, one showing an elevated value) so the log isn't empty on first load.

### 3.10 Wellness score wiring
Footer note ("Today's selections feed directly into your wellness score on the home screen") is a real commitment, confirmed with product owner — `applyScoreRing()` is currently hardcoded to `85` at both call sites (~lines 2109–2110) and should be driven by check-in answers. **[ASSUMPTION, not confirmed as final]** proposed formula: map each field's tier to a sub-score (green=100, yellow=60, orange=25, Aches "Severe"=10), overall = simple average of sub-scores from *answered* fields only (skip unanswered rather than penalize). `applyScoreRing()`'s existing color banding (≥80/60/40) stays, just feed it the computed score. Monthly Report's rolling score (also hardcoded) is a separate future pass.

### 3.11 Fixes (4 Jul, Records/Check-in fix pass)
Poor sleep icon swapped from `#i-moon` (read as a smile) to `#i-mood-sad` (reused from Mood→Low) — glyph reuse, not a new icon.

### 3.12 Component reuse
`.ci-card` extended (not a new class) for all cards. `.ci-opt`/`.ci-opt-em` extended, `pickOpt()` (~line 2183) kept, extended for severity-tinted backgrounds. Aches tag chips: reuse `mobile.css` chip language — confirm exact class name before implementing. Previous entries collapsible: reuse `.inv-details`/`.inv-item.open` mechanic (Medicine Cabinet).

### 3.13 Open (Check-in)
New yellow/orange tokens need a `tokens.css` home if reused elsewhere — flag for a Cowork/Notion decision. Wellness score formula (§3.10) needs sign-off. Monthly Report rolling aggregation — separate pass. `kitchen-off` slash rendering — designer's call, no existing slash convention in the sprite.

---

## 4. Meds screen

Files: `<section id="medicationView">`, `<section id="addMedView">`. Mockup → handoff, started from a design-system critique of the existing build (emoji icons, inline-styled buttons duplicating existing classes, care-model colors reused on unrelated content). Reuses the purple-bordered card language (§3.2) and collapsible pattern (§3.9) — read those before implementing here.

### 4.1 Feasibility
Reorder→cart→"Send order" (§4.7) is UI-only — adding to cart and picking a channel is real local state, but "Send order" must not simulate an actual pharmacy dispatch (no fake "sent" confirmation). Preferred pharmacist dropdown (§4.6) and prescription-to-Records link (§4.8) reference screens that didn't exist yet at time of writing — ship with realistic placeholder options, wire to real data once Care/Records existed (both now do, see §2/§5 — **confirm at implementation time whether these were subsequently wired for real or are still placeholders**).

### 4.2 Tab toggle
Old "Today's Schedule"/"Medicine Cabinet" tabs (`.med-tabs`/`.med-tab`, read as table headers) replaced by **reusing Home's `.vitals-toggle`/`.vtog`** exactly (same radius/border/active-state colors) rather than a new `.seg`/`.med-tab` class. Only change: font-size ~11px + `white-space:nowrap` so both labels fit on one line.

### 4.3 Adherence line
Stock-ring summary card removed; replaced with one thin regular-weight text line above the time bands with a bottom-border separator: "2 of 4 medications taken today · next due Vitamin D3 at 12:00 PM" (only the numbers and next-due name are medium-weight). Deliberate space-saving change — no ring/icon here.

### 4.4 Time-of-day bands
Four bands now (Morning/Noon/Evening/**Night**, Night new — empty-state "Nothing scheduled for night" rather than hidden). All bands share the same 2px purple border + `var(--radius-lg)`, but **fill color varies per band** (a deliberate, confirmed exception to the Check-in single-blue-fill convention — do not "correct" it): Morning `--amber-50`, Noon `--blue-50`, Evening `--purple-50`, Night `--mint-50`. Collapsible, header row (label + "n/m" count + chevron), **all four start expanded** (opposite default from Check-in's Previous entries — verify this in review, easy to copy the wrong default). Band label: `font-family: var(--font-heading); font-weight:700; font-size:11.5px; letter-spacing:.4px; text-transform:uppercase` — matches existing `.tod-band-label` exactly.

### 4.5 Marking taken
Old `<input type="checkbox">` + strikethrough replaced with a 24px circular check control (`2px solid var(--border-strong)`, white when unchecked; fills `var(--accent)` + shows the sprite's `check` symbol in white when tapped). Row drops to `opacity:.4` when taken — **no `text-decoration` strikethrough**, explicit correction from the prior build.

**Fix pass:** `markTaken()` had an early return that could only ever add the "taken" state, never remove it — rewritten to toggle both ways, updating band counts, adherence total, wellness-score ring text, and `syncHomeMedCard()` correctly either direction. The two statically-pre-taken rows (Levothyroxine, Metformin/Morning) had no `onclick` at all — added.

### 4.6 Medicine Cabinet header
Stock summary card + `.stock-ring` removed. Replaced with a label-less `<select>`, placeholder "Select Preferred Pharmacist", ~10.5px/400 weight, `var(--text-muted)`. **[ASSUMPTION/placeholder]** 1–2 dummy care-team pharmacist entries until Care tab data exists to source this for real (`// TODO: populate from care team once Care tab data model exists`).

### 4.7 Medicine Cabinet cards
Twistie/expand behavior preserved (had been accidentally dropped in an earlier mockup pass) — tapping header/days-left toggles `.inv-item.open`, revealing Dosage/Prescribed by/Date stocked/Expiry/In stock. "Refill" button removed (was decorative, same action as the row toggle). **Added:** full-width "Reorder" row at card bottom (always visible), opens a bottom sheet (reuse `.sheet`/`.scrim`/`.sheet__grip` from Home's quick-actions editor) with a qty stepper + "Add to cart". A cart icon in the top bar shows a red count badge; tapping opens a second sheet (itemized list, SMS/WhatsApp/Email channel picker using `.vtog`-style selection, "Send order" — UI-only per §4.1, no fake success state).

New sprite icons: `sun` (Vitamin D3), `thyroid` (Levothyroxine, butterfly-shape outline). Reuse existing `pill` (Metformin), `heart` (Atorvastatin), `check`. All four cabinet items ship: Metformin, Vitamin D3, Atorvastatin, **and Levothyroxine** (this fourth item had been dropped in an earlier iteration and was restored).

**Fix pass — Add stock:** new action distinct from Reorder, for logging stock already on hand. New sheet (`#addStockSheet`/`#addStockOverlay`), same qty-stepper pattern; `confirmAddStock()` increments the item's stock count directly. UI-only/local-state (`// TODO: replace with real inventory sync once backend exists`), does not persist. Added to all 4 items with stable ids (`inv-1-stock`…`inv-4-stock`).

**Fix pass — Reorder urgency:** removed the separate `chip2--warn` "Reorder now" badge next to Metformin's stock count; urgency now reads from the Reorder button itself via a new `.inv-reorder-row--urgent` modifier (warning-soft bg/text). Other items unaffected.

**Fix pass — Remove from schedule:** added a circular ✕ button (`.tod-remove`, new `i-close` sprite symbol) to every Today's Schedule row. `removeSchedItem()` confirms, removes the row, recomputes the band count (swaps in empty-state if it hits zero), and decrements adherence/taken totals as needed.

### 4.8 Add Medication
Existing sectioned structure/fields kept (Name, What it's for, Dosage, Form, Frequency, when-to-take chips, Date stocked, Expiry, Qty in stock, Alert, Notes). Two additions: a new "Source" section (dropdown, not a button toggle per explicit direction) — Over-the-counter/Prescription; selecting Prescription reveals "Prescribed by" (text) and "Link to a prescription in Records" (select, placeholder options) — **[ASSUMPTION/placeholder]** needs real Records data, `// TODO: populate from Records once that tab's data model exists`. Selecting Over-the-counter hides and clears both fields.

### 4.9 Component reuse
`.vitals-toggle`/`.vtog` (tabs), `.sheet`/`.scrim`/`.sheet__grip` (bottom sheets), `.inv-item.open`/`.inv-details` (collapsible), purple border/radius from Check-in §3.2, `.when-btn` (unchanged), `check` sprite symbol.

### 4.10 Open (Meds)
Pharmacist dropdown and prescription-to-Records link need real data now that Care/Records exist — confirm wiring status. Reorder→cart→dispatch is UI-only pending backend + messaging integration. `sun`/`thyroid` icons need final outline artwork (placeholder paths used in the mockup).

---

## 5. Records screen

File: `wellness-app.html` only. Mockup (Documents/History structure, then scan-first upload flow) → sign-off ("Capture page looks good") → direct implementation.

**Before:** single-panel `recordsView`, 3 cards (Monthly report link, Recent check-ins, 7-day vitals avg), no real document storage despite an existing "Upload a record" quick action pointing at it.

**Now — two tabs:** reuses the `.vitals-toggle`/`.vtog` component (same one Meds uses) but on **separate classes/ids** — `.rec-vtoggle`/`.rec-panel`, `rtab-*`/`rpanel-*`, `switchRecordsTab()` — for the same DOM-collision reason given in §2 (Care).

- **Documents tab** (default) — the real vault. "Upload a document" CTA → `addDocumentView`. Four collapsible categories (`.inv-item`/`toggleInv()`, same mechanic as Medicine Cabinet): Lab reports (3 seeded), Prescriptions (2), Scans & imaging (1), Other (empty, "Nothing here yet"). Rows use the existing generic `.row`/`.ic`/`.m`/`.val` component.
- **History tab** — the screen's entire previous content unchanged (Monthly report card, Recent check-ins, 7-day vitals avg), now nested under its own tab, satisfying the standing IA rule that Monthly Report is a Records sub-section, not standalone.

**New view `addDocumentView` — scan-first upload**, two steps (`.adoc-step`/`.adoc-step.show`, same show/hide mechanic as Meds' panels):
1. Capture (`adocStep1`): placeholder capture area, "Scan document" primary button, "Choose a file instead" as a quiet secondary link (scan-first per explicit direction). Caption states plainly this is UI-only — no real camera/file picker, both buttons just advance to confirm.
2. Confirm (`adocStep2`): placeholder thumbnail + Category (select)/Name/Date, modeled on Add Medication's field pattern. "Save to records" appends a row into the matching category, recomputes its count, resets the form, returns to Records → Documents (`CBH.goTab(...)`, mirrors `saveNewMed()`).
3. Back calls `resetAddDocFlow()` before `CBH.back()` so mid-flow exits don't leave stale values.

`QA_CATALOG`'s "Upload a record" quick action repointed from `recordsView` to `addDocumentView`.

**Caveats:** UI-only, no real capture/storage (`saveNewDocument()` → `// TODO: replace with real document upload/storage once backend exists`); pure in-memory (Records doesn't even use the `localStorage` trick Quick Actions uses). Seeded documents are static placeholders reusing names already referenced elsewhere (Dr Rajeev Menon, Kims Diagnostics, existing ECG reference). Care and Tools tabs not touched in this pass.

**Verified:** script parses clean; id pairs line up (`rtab-*`↔`rpanel-*`, all four `doc-cat-*-list`/`doc-cat-*-count`); `<section>` balance 21/21, new blocks 2/2 each.

### 5.1 Multi-select and share (4 Jul fix pass)
Files touched: `wellness-app.html`, `js/icons.js` (added `close`/`download` symbols). Direct implementation, no mockup. Why: member wants to hand a bundle of old records to a new doctor, not one document at a time.

Both `rpanel-documents` and `rpanel-history` get a "Select" toggle (`docSelectBtn`/`histSelectBtn`) and a `.rec-select-mode` class; only one tab can be in select mode at once (`toggleRecSelectMode()` forces the other off and clears its picks). Every shareable item (`.rec-selectable`) gets a `.rec-check` circle, hidden unless its panel has `.rec-select-mode`; the checkbox's own `onclick` calls `event.stopPropagation()` before `toggleRecItem(this)` so cards with their own existing click behavior (Monthly report → `monthlyReportView`, 7-day vitals "Details" link) don't need special-casing.

Selectable: all document rows across all 4 categories (including new uploads, which now also build `.rec-check`); on History, the Monthly report card, all 4 Recent check-in rows, and the 7-day vitals avg card (as one unit).

`updateRecShareBar()` counts `.rec-panel .rec-picked` (safe since only one tab is ever in select mode) and shows a floating pill bar (`recShareBar`) with live count + Share button. Share opens a bottom sheet (`recShareSheet`, same `.sheet`/`.overlay` mechanic as Reorder/Cart/Add stock) with three destinations: Email, WhatsApp, Save to Files (new `download` icon). `sendRecShare(channel)` exits select mode, clears picks, shows a plain `alert()` — no real integration (`// TODO: replace with real email/WhatsApp/file-export integration once available`).

**Verified:** script and icons.js parse clean; `<section>` balance 21/21 (unchanged); new ids/functions each appear exactly once.

---

## 6. Home + Meds fix pass (4 Jul, standalone)

Branch: `feature/wellness-app-and-care-model-update` (or current working branch). Files: `wellness-app.html`, `css/mobile.css` (reverted, no net change), `js/icons.js`. Process note: this pass reviewed already-shipped screens via screenshots and got direct concrete corrections, so implementation happened without a mockup step — all content folded into §1.2, §4.5, §4.7 above by topic. Verified via Node `new Function()` on the extracted script and `js/icons.js`; grep-confirmed id/onclick counts (`inv-N-stock` ×4, `removeSchedItem` ×4, `openAddStockSheet` ×5).

---

## 7. Tools screen (closed out the 5-tab plan)

Files: `wellness-app.html`, `js/icons.js`. Process: Santhosh asked a design question first ("How would you lay out tools?") rather than a build order — answered with a proposed layout, then used `AskUserQuestion` to settle the one open decision (equipment request interaction model) before building. Direct implementation after that, no visual mockup.

### 7.1 Wellness Library icon fix
All 16 article tiles (`.lib-grid`, 5 category rows) and the `LIB` data object used raw emoji via `.lib-em`/`data.em`, violating the project's standing no-emoji rule — this predates the Cowork passes, shipped as-is in the original build and was never touched until now. Fixed: every `.lib-em` replaced with a `.lib-ic` icon chip (same visual language as `.acard .a-ic`/`.tile .ic`), all 16 mapped to icons already in the sprite (Exercise→`activity`, Balanced Diet→`food`, Sleep Health→`zzz`, Stress→`brain`, Diabetes→`lab`, Heart→`heart`, Blood Pressure→`heart-pulse`, Joint & Bone→`walking`, Cold & Flu→`shield`, Headaches→`alert`, Eye Care→`eye`, Skin Care→`sun`, Depression & Mood→`mood-sad`, Anxiety→`mood-empty`, ADHD & Focus→`target`, Insomnia→`moon-stars`) — no new icons needed. `LIB`'s `em:'💪'` fields became `icon:'activity'` etc.; the article detail view's 32px-emoji `#libEmoji` div became a 48px `#libIcon` chip, built dynamically from `data.icon`.

### 7.2 Tools list changes
**Removed:** "Wearables" row (→ `wearableView`) — redundant with the existing Records → History → 7-day vitals avg → Details entry point; `wearableView` itself is untouched, still reachable via Records. **Kept:** Wellness Library, Trackers (distinct — manual logging, not a duplicate of wearable-synced numbers), Calculators/Exercises ("Coming soon" placeholders, out of scope). **Added:** Equipment Rental row → new `equipmentRentalView`.

### 7.3 Equipment Rental — cart-based flow
Santhosh chose the cart-based option (mirrors Meds' Reorder→Cart) over a simpler one-item-at-a-time flow, via `AskUserQuestion`. Catalogue (5 items, built from Medicine Cabinet's exact `.inv-item`/`.inv-ic`/`.inv-stock-row`/`.days-pill`/`.inv-reorder-row` components, no new CSS): crutches ₹50/day, wheelchair ₹150/day, oxygen cylinder ₹300/day (limited stock, `.days-pill--warn`), inclined hospital bed ₹250/day, walker ₹80/day. No per-item expand (no details to hide) — only "Add to cart" is clickable.

New icons: `crutches`, `wheelchair`, `cylinder`, `bed` — no prior mobility/medical-equipment glyphs existed. Flow parallels Meds' Reorder/Cart with new, non-colliding ids: `openEquipAddSheet()` → qty sheet → `addEquipToCart()` (merges qty if already in cart, updates `equipCartBadge`). Cart icon → `openEquipCartSheet()` → `renderEquipCartList()` (reuses Meds' `.tlog-row`) plus two fields Meds' cart doesn't have — Delivery address (textarea) and Needed from (date), since this is a delivery request, not a dispatch to an address on file. `submitEquipRequest()` clears the cart/fields, closes the sheet, shows a plain `alert()` — UI-only (`// TODO: replace with a real rental-request submission to Care Bridge ops once backend exists`).

### 7.4 Not done
Calculators/Exercises remain placeholders. Trackers' own ~10-entry emoji icon list was **not** touched (the ask was specifically the Library) — flag as a similar future cleanup. Equipment Rental has no real availability backend — "Limited stock" on the oxygen cylinder is static.

**Verified:** script and icons.js parse clean; `<section>` balance 23/23 (was 22/22 before `equipmentRentalView`); new ids/functions/icons each appear exactly once; zero remaining `em:`/`lib-em`/`libEmoji` references.

This closed out the original 5-tab wellness-app plan (Home, Meds, Records, Care, Tools all built). Next steps per Santhosh: likely a pass carrying these patterns across to Nurse/Family apps, or deeper passes on Trackers/Calculators/Exercises.

---

## 8. Wearable device settings screen

File: new `<section id="wearableConfigView">`, added after the existing `<section id="wearableView">`. One mockup pass, approved with an explicit feasibility caveat. Reuses the Check-in card language (§3.2/§3.3) — do not re-derive.

### 8.1 Feasibility
This screen is a **visual/interaction demo only** — nothing on it does what it appears to. "Forget this device," "Start pairing," sync frequency, and background-sync toggle all need native iOS/Android work (Bluetooth pairing, HealthKit/Health Connect) plus a backend that doesn't exist in this repo. Every control is local UI state only — visual response is fine (segmented selection, toggle flips, a brief demo state on "Start pairing"), but must never imply a real device connection is made or broken, and must not simulate real Bluetooth discovery (same principle as Home's fake-syncing guidance, §1.4). All readings (battery %, last synced, connection status) are hardcoded demo values, matching the existing `wearableView`.

### 8.2 Entry point
Settings/gear icon added to `wearableView`'s `.tbar` (near the "Synced" chip), routes to `wearableConfigView` via `CBH.go(...)`. **[ASSUMPTION]** reuses existing `settings` sprite symbol.

### 8.3 Header
Same two-row pattern as Check-in: `‹ Wearables` breadcrumb (→ `wearableView` via `CBH.back()`) above "Device settings" title, subtitle "Manage your connected wearable and what it shares".

### 8.4 Card frame
Identical to Check-in's (§3.2) — extend the same class so both stay in lockstep if it changes later. One card ("Pair another device", §8.7) uses a **dashed** version of the same border.

### 8.5 Your device (card 1)
48px white icon chip (new `device-watch` symbol, purple) + device name (bold demo placeholder, e.g. "Apple Watch Series 8") + status row (green dot/text "Connected"; **[ASSUMPTION]** disconnected state not mocked — reuse Check-in's concern-red tone with "Disconnected" label and swap "Forget this device" for "Reconnect") + right-aligned battery pill + divider + Last synced/Paired two-column row + full-width "Forget this device" button (white bg, thin danger-red border/text `#F09595`/`#8C1D21` — not a solid destructive fill, since it needs confirmation). Tapping "Forget this device" must show a confirm step before clearing the demo connection state.

### 8.6 Sync frequency (card 2)
Three-option pill row (Real-time/Every 15 min/Manual only), same interaction as Check-in's option pills but single-tier (no severity coloring) — selected state reuses the green tier purely as "the active choice." **[ASSUMPTION]** flag if that double-use reads confusingly. Below: divider + "Sync in background" toggle row (see §8.8 for the switch component).

### 8.7 What we share (card 3)
5 rows (icon chip + label + toggle): Heart rate (`heart`), Sleep (`moon-stars`, shared with Check-in — add once), Blood oxygen/SpO2 (`lungs`, shared with Check-in, static single-fill here, no clip-path), Steps & activity (`walking`), Stress level (`brain`). Default demo state: Heart rate/Sleep/SpO2/Steps on, Stress off — arbitrary, just needs both toggle states visible. **[ASSUMPTION]** no privacy/consent copy included this pass — that's a content pass, not layout.

### 8.8 Pair another device (card 4)
Dashed purple border, centered. Row of 3 device-type icon chips: watch (`device-watch`), Android/Wear OS (new `android`), Bluetooth-generic (new `bluetooth`). "+ Start pairing" — solid purple fill, can show a brief demo-only state change but must not simulate real discovery/pairing (§8.1).

**Toggle switch component (new, reusable):** pill track (38×22px list rows, 42×24px standalone), white knob, track `#57317E` on / `var(--border)`/`#DFDDE0` off. **[ASSUMPTION]** flagged as a candidate for the shared component library (notification preferences, profile settings will likely need the same control) rather than a one-off — no existing equivalent to reuse.

### 8.9 New sprite icons
`device-watch`, `android`, `bluetooth`. Reuse existing `settings`, `heart`, `walking`, `brain`, `chevron`. `lungs`/`moon-stars`/`info` are shared with Check-in (§3.4) — add once, use on both screens, do not duplicate.

### 8.10 Footer note
Same visual treatment as Check-in's info strip: "No device? You can always log readings manually from Check-in." Conceptual link to Home's existing manual vitals toggle — not a tappable link this pass. **[ASSUMPTION]** deep-linking would be a small additive change if wanted later.

### 8.11 Open (Wearable config)
Entire screen is UI-only (§8.1) pending native app + backend work. Data-sharing consent copy — content pass. Disconnected-device state is an assumption, confirm once built. Toggle switch component — promote to shared class once a second screen needs it.

---

## 9. Consolidated open items (not blocking any handoff, tracked for future passes)

- **Journal/notes entry flow** — no screen designed yet (Home §1.4).
- **Notification feed** — grouping/visual treatment of Alerts vs Admin messages vs Reminders (Home §1.1).
- **Wellness score formula** (Check-in §3.10) — proposed starting point, needs sign-off before treating as final.
- **Monthly Report rolling score aggregation** — separate pass, currently hardcoded.
- **New severity color tokens** (`--caution-*`, `--concern-*`) — need a `tokens.css` home if reused beyond Check-in; flag for a Cowork/Notion decision rather than deciding unilaterally in code.
- **Toggle switch component** (Wearable config §8.8) — promote to shared class once reused elsewhere.
- **Native wearable integration** (HealthKit/Health Connect, Bluetooth pairing) — requires native iOS/Android app work plus backend; out of scope for this static build throughout.
- **Backend-dependent placeholders still to wire up once real data models exist:** Meds' pharmacist dropdown and prescription-to-Records link (§4.6/§4.8 — confirm current wiring status against live Care/Records tabs); Reorder→cart→dispatch (Meds), rental request submission (Tools), document share via Email/WhatsApp/Save to Files (Records), Own Contacts persistence (Care), Quick Actions and Previous-entries persistence (Home/Check-in) — all currently `localStorage`/DOM-only with `// TODO` comments in the code.
- **Trackers tab** emoji icons (~10 entries) — not yet cleaned up to the sprite convention (Tools §7.4), same class of fix as the Wellness Library pass.
- **Calculators and Exercises** (Tools) — still "Coming soon" placeholders.
- **`css/mobile.css` shared `.tbar` top-padding** — left at 4px default for Nurse/Family; wellness-app's 18px override is scoped locally pending their own review pass.
- **New icon artwork needing final polish:** `sun`/`thyroid` (Meds), `kitchen-off` slash rendering (Check-in) — placeholder paths in current build.
- **Next likely direction (Santhosh's call, stated intent):** carry the patterns established here (purple-bordered cards, `.vtog` tabs, bottom-sheet cart flows, icon-chip severity pills) across to the Nurse and Family apps, or deepen Trackers/Calculators/Exercises.
