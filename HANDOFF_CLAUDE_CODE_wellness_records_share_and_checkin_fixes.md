# Care Bridge Home — Wellness App: Records Multi-Select/Share + Check-in Fixes
For: Claude Code (record/continuity) · From: Claude (Cowork) · Date: 4 July 2026
File touched: `wellness-app.html`, `js/icons.js` (added `close` and `download` sprite symbols)

## Process for this pass
Direct implementation, no mockup — these were concrete corrections/feature requests against the already-built Records and Check-in screens, same tier as the earlier Home/Meds fix pass.

## 1. Records — multi-select and share (Documents + History tabs)

**Why:** Santhosh's use case — a member wants to hand a bundle of old records to a new doctor or medical institution, not one document at a time.

**Structure:** Both `rpanel-documents` and `rpanel-history` get a "Select" toggle button (`docSelectBtn` / `histSelectBtn`) and a `.rec-select-mode` class applied to the panel while active. Only one tab can be in select mode at a time — turning it on for one tab forces the other off and clears its picks (`toggleRecSelectMode()` handles this).

**Checkbox mechanic:** Every shareable item (`.rec-selectable`) gets a leading `.rec-check` circle, hidden via CSS (`display:none`) unless its panel has `.rec-select-mode`. The checkbox's own `onclick` calls `event.stopPropagation()` before `toggleRecItem(this)` — this was the key design choice: it means items that already have their own click behavior (the Monthly report card still opens `monthlyReportView`, the 7-day vitals avg card's "Details" link still works) don't need any special-casing. The checkbox intercepts its own click and never lets it reach the card's original handler.

**What's selectable:**
- Documents tab: every document row across all 4 categories (Lab reports, Prescriptions, Scans & imaging, Other) — including new uploads added via `saveNewDocument()`, which now also builds the `.rec-check` into its generated row.
- History tab: the Monthly report card, each of the 4 Recent check-in rows, and the 7-day vitals avg card (as one unit, checkbox sits next to its "7-day vitals avg" title).

**Selection count and Share:** `updateRecShareBar()` counts `.rec-panel .rec-picked` across the DOM (simple and correct since only one tab is ever in select mode at once) and shows/hides a floating pill bar (`recShareBar`, same positioning tier as the bottom nav) with a live count and a Share button. Share opens a bottom sheet (`recShareSheet`, same `.sheet`/`.overlay` mechanic as Reorder/Cart/Add stock) with three destinations: **Email**, **WhatsApp**, **Save to Files** (new `download` icon added to `js/icons.js` for this). Picking one calls `sendRecShare(channel)`, which exits select mode, clears picks, and shows a plain `alert()` confirming what was "sent" — no real email/WhatsApp/file-export integration exists.

**Caveat:** `// TODO: replace with real email/WhatsApp/file-export integration once available` is in `sendRecShare()`. This is UI-only, same tier as Reorder→Cart and Add stock — nothing is actually transmitted or saved anywhere.

## 2. Check-in screen fixes

**Poor sleep icon:** was `#i-moon` (a plain crescent), which read as a smile rather than communicating "poor sleep." Swapped to `#i-mood-sad` (the same frowning-face icon already used for Mood's "Low" option) — consistent glyph reuse rather than a new one-off icon.

**Submit button placement:** removed the top-right `.tbar-submit` button entirely (and its now-dead CSS rule). The "Save note" button at the bottom of the Notes card is repurposed as the actual submit action — relabeled **"Submit check-in"**, restyled from `mbtn--brand` to `mbtn--fill` (the app's primary-action fill, matching Home's "Log today's check-in"), and its `onclick` now calls `submitCheckIn()` directly instead of the old `saveNote()` toast function (which is now deleted — it had no other callers). `submitCheckIn()` already read the comment textarea directly regardless of which button called it, so no logic changes were needed there — this was purely a button relocation/relabeling.

## Verification done
- Extracted `<script>` block, ran through Node's `new Function()` — parses clean.
- Same check on `js/icons.js`.
- `<section>`/`</section>` balance: 21/21 (unchanged from the Records pass).
- Grep-confirmed every new id (`recShareBar`, `recShareOverlay`, `recShareSheet`, `recShareCount`, `recShareLead`) appears exactly once, and every new function (`toggleRecSelectMode`, `toggleRecItem`, `updateRecShareBar`, `openRecShareSheet`, `closeRecShareSheet`, `sendRecShare`) is defined exactly once.
- Confirmed `.tbar-submit` and `saveNote` have zero remaining references anywhere in the file (fully removed, not just unlinked).
