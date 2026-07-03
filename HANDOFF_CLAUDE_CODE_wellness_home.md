# Wellness App — Home Screen Handover

For: Claude Code
From: Claude (Cowork)
Date: 2026-07-03
File: `wellness-app.html` — `<section id="homeView">`, currently lines 382-497
Reference: `HANDOFF_CLAUDE_COWORK.md` (June 30, 2026) for prior context; this doc supersedes the Home-view portion of that handoff.

This was designed through iterative visual mockups reviewed with the product owner (Santhosh). All decisions below were explicitly confirmed. Where I made a judgment call rather than getting explicit confirmation, it's flagged as **[ASSUMPTION]** — verify before treating as final.

---

## 1. Layout order (top to bottom)

1. Status bar (existing pattern, unchanged)
2. Header: date/greeting + **SOS icon** + notification bell + avatar (see §2)
3. Hero card: Self Care band, wellness ring, note, "Log today's check-in" CTA (unchanged from current build)
4. Today's vitals card (unchanged from current build — wearable/manual toggle, BP/Pulse/SpO2)
5. **Today's medications** — NEW summary card, moved to directly below vitals (see §3)
6. **Quick actions** — reworked into a dynamic, user-editable grid (see §4)
7. Bottom nav — **now 5 tabs**: Home, Meds, Records, Care, Tools (see §5)

**Removed from the current build:** the "Wellness Warrior" streak badge card (7-day streak counter). Not wanted at this stage — gamification is explicitly deferred, not just deprioritized.

---

## 2. Header changes

- **SOS button relocated.** Currently a full-width red `mbtn--sos` bar near the bottom of Home (line 492-495). Move it to a small circular icon button in the top header, between the greeting block and the notification bell — same visual weight as the bell/avatar icons, outlined in a danger red, not filled.
  - **Why:** product owner is concerned about accidental taps — this app targets able-bodied self-care members, and a bold full-width red bar low in a scrolling list is an easy mis-tap. A compact top-bar icon preserves access without visual dominance.
  - Tapping it still routes to the existing `sosConfirmView` (hold-to-confirm flow) — no change to that screen's behavior, just the entry point.
- **Notification bell** should surface three categories: **Alerts** (urgent — missed medication, abnormal vitals), **push messages from the Care Bridge Admin/coordination team**, and **Reminders** (routine, e.g. check-in nudges). **[ASSUMPTION]** exact grouping/visual treatment (tabs vs. unified feed) not yet specced — flag for the Notifications screen pass.
- **Avatar** taps directly into the full Profile view (no intermediate quick-menu).

---

## 3. Today's medications (new section)

A single **summary card**, not a full medication list — this intentionally avoids duplicating state with the Meds tab.

- Left: small progress ring (e.g. `2/4` in the center), colored to match adherence (use existing `--success`/`--warning` token logic from the real Medications view's `.stock-ring`).
- Middle: `"X of Y medications taken"` (bold) + `"Next due: <name>, <time>"` (muted, small).
- Right: chevron.
- **Entire card is a single tap target** → navigates to `medicationView` (existing screen, unchanged). No checkboxes or tick-off interaction on Home — all tick-off logic and state stays exclusively in the Meds tab to avoid two disconnected sources of truth.
- Data: pull the same counts/next-due logic already computed for the Meds tab's adherence ring (`adhRingNum`, `adhCountNum`, `adhCountTotal`, `adhNote` in the existing `medicationView` — reuse, don't recompute independently).

---

## 4. Quick actions — dynamic, user-editable grid

This is the most significant behavioral change on this screen.

### Default state
Two cards, shown side-by-side (2-column grid, not full-width stacked):
- **Hydration** — icon in a filled accent-colored chip (glass icon), small counter badge top-right of the icon. Tapping the card increments a counter; **wraps to 0 after the user's set target** (not hardcoded — see below). Subtitle: `"<n> glasses · tap"`.
- **My journal** — icon chip (notebook icon), subtitle `"Log a note"`. Tapping opens a journal/notes entry flow **[ASSUMPTION: exact journal screen not yet designed — needs its own pass]**.

### Edit mode
- An "Edit" link (small, with an adjustments/sliders icon) sits next to the "Quick actions" section label, top-right.
- Tapping it reveals a checklist of all available quick-action types:
  - Hydration, My journal (defaults, pre-checked)
  - Upload a record, Message coordinator, Request refill, Book a consultation (available, unchecked by default)
  - Future actions from the Tools tab may be added to this list later — build the list as data-driven (array of `{id, label, sub, icon}`), not hardcoded markup, so it's easy to extend.
- **Hard cap of 4 selected actions.** Once 4 are selected, remaining unchecked items are disabled (visually dimmed) until the user deselects one.
- Grid re-renders live as selections change — 2 items → 1 row of 2, up to 4 items → 2 rows of 2.
- A "Done" button closes the picker and returns to the normal Quick actions view.

### Persistence
- **Confirmed direction:** the user's selected quick actions should persist as part of their **member profile, synced with the Care Bridge backend** — not a local/device-only setting.
- **This cannot be built yet.** Per the project's own status (see root `CLAUDE.md`), `wellness-app.html` is currently a stateless static prototype with no backend or auth. There is nowhere to sync a profile to.
- **Recommended interim approach:** implement the picker UI and grid behavior now, with selection state held in a simple local persistence layer (e.g. `localStorage`) as a placeholder, clearly commented in the code as `// TODO: replace with Care Bridge backend profile sync once auth/backend exists`. This keeps the UI fully functional and demoable without pretending the sync problem is solved.
- Do not build any fake "syncing..." UI or spinner for this — that would misrepresent a capability that doesn't exist yet.

### Removed from this screen
"Upload a record," "Message coordinator," "Request refill," and "Book a consultation" are **not** default quick actions but remain available as opt-in choices via the Edit picker described above. This was a deliberate space-saving decision, not a removal of the features themselves.

---

## 5. Bottom navigation — reworked to 5 tabs

**Old:** Home, Meds, Wearables, Profile
**New:** Home, Meds, Records, Care, Tools

Reasoning behind each tab, confirmed with product owner:

- **Records** — repositioned as a personal medical records vault: labs, ECGs, blood work, prescriptions — user-owned documents, easily shareable with the care team. **Monthly Report becomes a sub-section within Records**, not a separate nav destination or standalone screen.
- **Care** — merges Care Team + check-in related content (exact scope of what else lives here beyond care team contacts is still open — needs its own screen pass).
- **Tools** — new tab, houses Calculators, Wearables (moved off the nav bar into here), and Exercises.
- **Profile** — no longer a nav tab; reached only via the avatar tap in the header (confirmed, not an oversight).

**Flag for engineering:** 5 items in a bottom nav is dense on small screens (320-375px width). The mockup fits at 18px icons / 8.5px labels, but confirm real rendering doesn't feel cramped once built — if it does, the fallback discussed was folding Tools into a "More" affordance, but that's not the current direction; build 5 tabs as specified first.

---

## 6. Layout/sizing notes (for scroll-fit)

Product owner was concerned about excessive scrolling. Compaction agreed:
- Hero card and vitals card use slightly tighter internal padding than the original build (see mockup reference — roughly 12-14px vs 16px).
- Quick actions defaults to 2 cards side-by-side (2-column), not full-width stacked, specifically to save vertical space.
- Target: full Home content (excluding the fixed bottom nav bar) should fit within a single viewport with no scrolling on mid-size and larger phones, and come close to fitting on the smallest common screen (iPhone SE class, ~667pt height).
- **Caveat:** this was validated in an approximate CSS mockup, not the real rendering engine — confirm against actual device/browser rendering once built, and adjust padding/spacing as needed rather than treating the mockup's exact pixel values as gospel.

---

## 7. Component reuse (verified against actual codebase)

- Icon chip pattern for quick actions matches the existing `.acard .a-ic` component already defined in `wellness-app.html` (inline `<style>` block, lines 98-116) — reuse this class, don't reinvent it. The "table-like" feel in earlier mockups was traced back to a missing icon chip, not a flaw in the existing component.
- Medication summary ring should reuse the `.stock-ring` pattern from the existing `medicationView` (line ~604), not a new ring component.
- Chip/status color tokens: confirmed variants live in `css/mobile.css` — e.g. `chip2--alert` (not `chip2--danger`, which does not exist) for urgent states, `chip2--ok` for success. Verify against `mobile.css` directly before using any chip variant not listed there.

---

## 8. Open items for future screen passes (not blocking this handoff)

- Journal/notes entry flow — no screen designed yet.
- Notification feed detail (grouping/visual treatment of Alerts vs Admin messages vs Reminders).
- Care tab full scope.
- Tools tab full scope (Calculators, Wearables, Exercises) including hydration target setting (referenced from Home but configured here).
- Records tab restructure (document vault + Monthly Report sub-section).
- Wearable data (Apple Watch/Wear OS) integration is out of scope for this static build — requires native iOS/Android app work (HealthKit/Health Connect) plus backend, tracked separately. Do not attempt to make the Wearables source toggle on the vitals card "real" as part of this handoff.
