# Care Bridge Home — Wellness App: Tools Screen (final of the 5-tab plan)
For: Claude Code (record/continuity) · From: Claude (Cowork) · Date: 4 July 2026
File touched: `wellness-app.html`, `js/icons.js`

## Process for this pass
Santhosh asked a design question first ("How would you lay out tools?") rather than giving a build order outright. Answered with a proposed layout (flat list, drop the redundant Wearables entry, add Equipment Rental), then used `AskUserQuestion` to settle the one real open decision — the equipment request interaction model — before building. Direct implementation after that, no visual mockup.

## 1. Wellness Library icon fix
All 16 article tiles (`.lib-grid` cards across 5 category rows) and the `LIB` data object used raw emoji (💪🥗😴 etc.) via a `.lib-em` span and `data.em`, violating the project's standing no-emoji rule (see `CLAUDE.md` — the rest of the app uses the `js/icons.js` sprite exclusively). This predates the incremental Cowork passes; it shipped as-is in the original Codex PR and was never touched until now.

**Fix:** every `.lib-em` emoji span replaced with a `.lib-ic` icon chip (tinted rounded-square, same visual language as `.acard .a-ic`/`.tile .ic` elsewhere), each pointing at an existing sprite symbol — no new icons needed, all 16 map to icons already in `js/icons.js`:

| Article | Icon | Article | Icon |
|---|---|---|---|
| Exercise & Movement | `activity` | Cold & Flu | `shield` |
| Balanced Diet | `food` | Headaches & Migraines | `alert` |
| Sleep Health | `zzz` | Eye Care | `eye` |
| Stress & Relaxation | `brain` | Skin Care | `sun` |
| Diabetes Care | `lab` | Depression & Mood | `mood-sad` |
| Heart Health | `heart` | Anxiety Management | `mood-empty` |
| Blood Pressure | `heart-pulse` | ADHD & Focus | `target` |
| Joint & Bone Health | `walking` | Insomnia & Rest | `moon-stars` |

The `LIB` object's `em:'💪'` fields became `icon:'activity'` etc. The article detail view (`#libArticleView`) had a `32px`-emoji `#libEmoji` div — replaced with a `#libIcon` chip (48px, `.lib-ic` reused with an inline size bump), and the `CBH.go()` library-article branch now builds `<span class="icon"><svg><use href="#i-'+data.icon+'"/></svg></span>` into it instead of setting emoji text.

## 2. Tools list — dropped a redundancy, added the rental catalogue
**Removed:** the "Wearables" row (→ `wearableView`, i.e. Health Insights). That screen is already reachable from Records → History → 7-day vitals avg → Details — having a second identical entry point in Tools added nothing and was the "redundant information from other screens" Santhosh flagged. `wearableView` itself is untouched and still fully reachable via Records.

**Kept:** Wellness Library, Trackers (this one is a distinct tool — manual logging — not a duplicate of the wearable-synced Health Insights numbers), Calculators/Exercises (still "Coming soon" placeholders, out of scope this pass).

**Added:** Equipment Rental row → new `equipmentRentalView`.

## 3. Equipment Rental — cart-based request flow
Santhosh chose the cart-based option (mirrors Meds' Reorder→Cart, not a simpler one-item-at-a-time flow) via `AskUserQuestion`.

**Catalogue (5 items)**, each built from the exact same `.inv-item`/`.inv-ic`/`.inv-stock-row`/`.days-pill`/`.inv-reorder-row` components Medicine Cabinet already established — no new CSS classes needed, just reuse:
- Pair of crutches — ₹50/day, available
- Wheelchair (standard) — ₹150/day, available
- Oxygen cylinder (10L) — ₹300/day, limited stock (uses `.days-pill--warn`, same urgency-tint pattern as Meds' low-stock Reorder button)
- Inclined hospital bed — ₹250/day, available
- Walker (with wheels) — ₹80/day, available

Each item's `.inv-item-top` has no expand/collapse (no per-item details to hide, unlike Meds) — `cursor:default` inline, not clickable, only the "Add to cart" row is.

**New icons** in `js/icons.js`: `crutches`, `wheelchair`, `cylinder`, `bed` — the sprite had nothing for mobility/medical-equipment before this. Simple stroke-based glyphs matching the app's existing icon style (a two-crutch pair, a wheelchair silhouette, a gas cylinder with valve, a bed frame with headboard).

**Flow — deliberately parallel to Meds' Reorder/Cart, new ids so nothing collides:**
- `openEquipAddSheet(itemName)` → qty-stepper sheet (`equipAddSheet`/`equipAddOverlay`) → `addEquipToCart()` pushes `{name, qty}` into `equipCartItems` (merges qty if already in cart) and updates the tbar cart badge (`equipCartBadge`, same `.cart-btn`/`.cart-badge` component as Meds).
- Cart icon in the tbar → `openEquipCartSheet()` → renders the picked items (`renderEquipCartList()`, same `.tlog-row` line-item component Meds' cart uses) plus two new fields Meds' cart doesn't have: **Delivery address** (textarea) and **Needed from** (date input) — since this is a physical-goods delivery request, not a pharmacy dispatch to an existing address on file.
- `submitEquipRequest()` clears the cart, resets the address/date fields, closes the sheet, and shows a plain `alert()` confirming the request "has been sent to the Care Bridge office."

**Caveat:** same UI-only tier as everything else — `// TODO: replace with a real rental-request submission to Care Bridge ops once backend exists`. Nothing is actually dispatched or persisted.

## Caveats / not done
- Calculators and Exercises remain "Coming soon" placeholders — not scoped this pass.
- Trackers' own emoji icons (💧⚖️🩺 etc., a separate ~10-entry list) were **not** touched — Santhosh's ask was specifically "the wellness articles," which is the Library, not Trackers. Worth flagging as a similar cleanup opportunity if/when Trackers gets its own pass.
- Equipment rental has no availability/inventory backend — the "Limited stock" tag on the oxygen cylinder is static, not computed.

## Verification done
- Extracted the page's `<script>` block, ran through Node's `new Function()` — parses clean.
- Same check on `js/icons.js`.
- `<section>`/`</section>` balance: 23/23 (was 22/22 before adding `equipmentRentalView`).
- Grep-confirmed every new id and function related to the rental flow appears exactly once, and all four new icon symbols (`crutches`, `wheelchair`, `cylinder`, `bed`) are defined exactly once.
- Grep-confirmed zero remaining `em:` / `lib-em` / `libEmoji` references anywhere in the file.

This closes out the original 5-tab wellness-app plan (Home, Meds, Records, Care, Tools all built). Next steps are Santhosh's call — likely revisiting Nurse/Family apps to carry across patterns established here (per his stated intent at the start of this thread), or deeper passes on Trackers/Calculators/Exercises.
