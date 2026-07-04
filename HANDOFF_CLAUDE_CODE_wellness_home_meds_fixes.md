# Care Bridge Home — Wellness App Fix Pass: Home + Meds
For: Claude Code (record/continuity) · From: Claude (Cowork) · Date: 4 July 2026
Branch: continue on `feature/wellness-app-and-care-model-update` (or current working branch)
File touched: `wellness-app.html`, `css/mobile.css` (reverted — see note), `js/icons.js`

## Note on process for this pass
Per Santhosh's screen-by-screen workflow, new screens normally go mockup (visualize tool) → iterate → handoff doc → Claude Code implementation. This pass was different: Santhosh reviewed the **already-shipped** Home and Meds screens (screenshots) and gave direct, concrete bug/UX corrections — no visual design decision was open, so I implemented directly in `wellness-app.html` in this session rather than mocking up first. This doc exists purely so the change set is recorded for continuity, the same way a normal handoff would be. Nothing here is pending implementation — it's already done and passed a Node.js syntax check (`new Function()` on the extracted `<script>` block, plus `js/icons.js`).

## Changes made

### 1. Header headroom (all screens)
- **Problem:** first row of every screen (date/greeting, back button, screen title) sat right under the notch/status bar with almost no clearance.
- **Fix:** added a scoped override inside `wellness-app.html`'s own `<style>` block — `.tbar { padding-top: 18px; }` (was 4px via the shared `css/mobile.css` default). Also bumped `#checkInView`/`#wearableConfigView`'s inline `padding-top` from 20px to 22px for consistency.
- **Deliberately did NOT touch `css/mobile.css`** — that file is shared with `family-app.html`/`nurse-app.html`, which haven't been reviewed yet. Scoping the fix to wellness-app avoids an unreviewed layout change rippling into the other two apps. When Nurse/Family get their pass, decide then whether to promote this to the shared file.

### 2. Greeting font size
- `#home-greeting` ("Good morning, Anita") reduced from the generic 24px `.tbar__title h1` size to **18px** — 2pt over the 16px `.card__title` size used by "Today's vitals" etc., per Santhosh's spec.

### 3. Scroll position reset on navigation
- **Problem:** `CBH.go()` only reset `scrollTop` on the outer `<section class="view">`, which never actually scrolls (`position:absolute`, no overflow). The real scroll container is each view's inner `.vbody`, which was never reset — so a view reopened wherever it was last scrolled to.
- **Fix:** `CBH.go()` now also does `el.querySelector('.vbody').scrollTop = 0`. Applies globally to every view since they all share the same inner-`.vbody` structure.

### 4. "Today's vitals" card link
- Was a redundant "Wearables" text link (duplicating the Wearables/Manual source toggle directly below it) that also just opened the read-only Health Insights screen.
- Changed to a gear-icon **"Settings"** link, styled the same icon+label pattern as the Quick Actions "Edit" link, now pointing at `wearableConfigView` (the actual device settings screen).

### 5. Medication checkbox uncheck
- **Root cause:** `markTaken()` had an early return (`if (row.classList.contains('taken')) return;`) — it could only ever add the "taken" state, never remove it.
- **Fix:** rewrote `markTaken()` to toggle both ways, updating band counts, the adherence total (`adhCountNum`/`adhCountTotal`), the wellness-score ring text, and the Home card sync (`syncHomeMedCard()`) correctly in both directions.
- The two statically-pre-taken rows (Levothyroxine, Metformin in the Morning band) previously had no `onclick` at all — added `onclick="markTaken(this)"` so they're toggleable too.
- Per the standing dim-only rule (no strikethrough), unchecking just removes the `.taken` opacity state — no text styling changes needed.

### 6. Remove a medication from today's schedule
- Added a small circular ✕ button (`.tod-remove`, new `i-close` sprite symbol added to `js/icons.js`) to every row in Today's Schedule.
- `removeSchedItem()`: confirms, removes the row, recomputes the band's `x/y` count (and swaps in the "Nothing scheduled for …" empty state if the band goes to zero), and decrements the adherence total (and the taken count, if it was taken).
- "Add medication" was already present (bottom of the Schedule panel, routes to `addMedView`) — only "remove" was missing, so that's the only new affordance here.

### 7. Add stock (Medicine Cabinet)
- New action distinct from **Reorder** (which is the existing pharmacy-dispatch/cart flow). "+ Add stock" is for logging stock the member already has on hand (e.g. picked up a refill in person).
- New bottom sheet (`#addStockSheet`/`#addStockOverlay`), same qty-stepper pattern as the Reorder sheet. `confirmAddStock()` increments the item's stock-count text directly.
- **UI-only / local-state, same caveat as Reorder→Cart** — `// TODO: replace with real inventory sync once backend exists` is in the code. Does not persist across reload.
- Added to all 4 inventory items (Metformin, Vitamin D3, Atorvastatin, Levothyroxine) — each stock count now has a stable id (`inv-1-stock` … `inv-4-stock`) for the sheet to target.

### 8. Reorder urgency styling
- Removed the separate `chip2--warn` "Reorder now" badge next to Metformin's stock count (the only low-stock item).
- Instead, Metformin's **Reorder button itself** now carries a new `.inv-reorder-row--urgent` modifier (warning-soft background + warning text), so urgency reads from the actual action, not a separate badge. Other items' Reorder rows are untouched (default styling).

## Verification done
- Extracted the page's single `<script>` block and ran it through Node's `new Function()` — parses clean, no syntax errors.
- Same check on the updated `js/icons.js`.
- Grep counts confirm wiring: `id="inv-N-stock"` × 4 (one per inventory item), `onclick="removeSchedItem(this)"` × 4 (Morning×2 + Noon + Evening; the Night band is empty, nothing to remove there), `openAddStockSheet` × 5 (4 inline calls from the inventory rows + 1 function definition).

## Not done / explicitly out of scope this pass
- No visual mockup step — see note at top.
- `css/mobile.css` shared `.tbar` default left as-is (4px top padding) for Nurse/Family, pending their own review pass.
- Add-stock/remove-schedule state is not persisted (matches existing localStorage-only patterns elsewhere, but these two don't even do that — pure DOM mutation for the demo).
