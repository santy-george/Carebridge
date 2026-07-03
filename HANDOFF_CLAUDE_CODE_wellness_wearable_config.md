# Wellness App — Wearable Device Settings Screen Handover

For: Claude Code
From: Claude (Cowork)
Date: 2026-07-04
File: `wellness-app.html` — **new** `<section id="wearableConfigView">`, add after the existing `<section id="wearableView">` (currently ends ~line 1087)
Reference: `HANDOFF_CLAUDE_CODE_wellness_checkin.md` (2026-07-04) — this screen reuses the same purple-bordered card language established there. Read that doc's §3-§4 before implementing this one; do not re-derive the styling from scratch.

This was designed through one mockup pass, reviewed and approved by the product owner (Santhosh) with an explicit feasibility caveat attached (see §0). Where a judgment call was made rather than getting explicit confirmation, it's flagged **[ASSUMPTION]**.

---

## 0. Feasibility — read this before building

**This screen is a visual/interaction demo only. None of the controls on it can do what they appear to do in the current static prototype**, and that's expected and fine — it was explicitly signed off as a demo screen, not a spec for working device integration.

- "Forget this device," "Start pairing," sync frequency, and the background-sync toggle all need native iOS/Android work (Bluetooth pairing, HealthKit / Health Connect) plus a backend to function for real. None of that exists in this repo.
- Build every control as a **local UI state toggle only** — clicking things should visually respond (segmented selection changes, toggle switches flip, "Start pairing" can show a brief demo state if you want) but must not imply a real device connection is being made or broken.
- Do not build a fake "pairing in progress" spinner or "device found" flow that looks like real Bluetooth discovery — that would misrepresent a capability that doesn't exist, same principle as the Home handoff's guidance on fake "syncing" states.
- All of the readings referenced (battery %, last synced, connection status) are **hardcoded demo values**, same as the existing `wearableView` screen this one extends.

---

## 1. Entry point

Add a settings/gear icon button to the existing `wearableView` `.tbar` (currently line ~976-980, which has a back button, title "Health Insights", and a "Synced" chip). Insert a small icon button between the title and the "Synced" chip, or after it, that routes to `wearableConfigView` via `CBH.go('wearableConfigView')`.

**[ASSUMPTION]** Icon choice for this entry point — reuse the existing `settings` symbol (already in `js/icons.js`, line 26) rather than adding a new one.

---

## 2. Header

- Same two-row header pattern as the Check-in screen (see checkin handoff §2): breadcrumb row above the title.
- Breadcrumb: "‹ Wearables" — routes back to `wearableView` (`CBH.back()`, standard pattern), not to Tools or Home.
- Title: "Device settings"
- Subtitle: "Manage your connected wearable and what it shares"

---

## 3. Card frame — reuse the Check-in pattern exactly

Every card on this screen uses the **same frame already defined for Check-in**: light blue fill (`var(--accent-soft)` / `#EAF0FB`), 2px solid Carebridge purple border (`#57317E` / `var(--purple-600)`), `var(--radius-lg)` corners. Do not create a new card class — extend the same `.ci-card` (or whatever it gets renamed to during Check-in implementation) so both screens stay in lockstep if the frame changes later.

One card ("Pair another device", §7) uses a **dashed** version of the same border — same color and width, `border-style: dashed`.

---

## 4. Your device (card 1)

- Left: circular white icon chip (48px), new `device-watch` symbol (see §8) in Carebridge purple, matching the icon-chip pattern from Check-in.
- Device name (bold, e.g. "Apple Watch Series 8" — demo placeholder text).
- Connection status row: small colored dot + label. Connected = green dot + green text ("Connected"). **[ASSUMPTION]** disconnected state not mocked — use the same red/orange tone as Check-in's "concern" tier (`#8C1D21` text) with label "Disconnected" and swap the "Forget this device" button for a "Reconnect" button in that state; simple conditional render.
- Right-aligned battery pill (white background, dark text, rounded-full).
- Divider, then a two-column row: "Last synced" + relative time, "Paired" + date.
- Full-width "Forget this device" button below: white background, thin border and text in the danger/concern red (`#F09595` border / `#8C1D21` text) — **not** a solid destructive-red fill, since this needs a confirmation step, not a one-tap irreversible action.
- **Tapping "Forget this device" must show a confirmation prompt** (reuse whatever confirm-dialog pattern exists elsewhere in the app, or a simple inline "Are you sure?" state) before clearing the demo connection state — don't wire it to instantly disconnect on first tap.

---

## 5. Sync frequency (card 2)

- Three-option pill row, same interaction pattern as Check-in's option pills (§4 of that doc) but **single-tier selection only** — no severity coloring here, just a plain selected/unselected state. Selected: green tier styling reused from Check-in (`#E6FBF3` bg / `#A8DEB0` border / `#256D33` text) is fine to reuse purely as "the active choice," not as a severity signal — **[ASSUMPTION]** this double-use of the green tier is acceptable since there's no severity concept on this screen; flag if that reads confusingly in review.
- Options: "Real-time" / "Every 15 min" / "Manual only".
- Below, a divider, then a labeled toggle row: "Sync in background" + description "Keeps readings current even when the app is closed" + a toggle switch (see §6 for the toggle component spec).

---

## 6. What we share (card 3)

- List of 5 rows, each: circular white icon chip (32px) + label + toggle switch, right-aligned.
- Rows and icons (reuse existing sprite symbols — do not duplicate):
  - Heart rate — reuse existing `heart` symbol (line 41)
  - Sleep — reuse `moon-stars` symbol **once it's added for Check-in** (see checkin handoff §5) — do not add it twice
  - Blood oxygen (SpO₂) — reuse `lungs` symbol **once it's added for Check-in** (see checkin handoff §5/§6) — static single-fill version here, no clip-path fill effect needed on this screen
  - Steps & activity — reuse existing `walking` symbol (line 71)
  - Stress level — reuse existing `brain` symbol (line 70)
- **Toggle switch component (new, reusable):** pill track (38×22px for list rows, 42×24px for the standalone "Sync in background" row), white circular knob that slides left/right, track color `#57317E` (purple) when on, `var(--border)` / `#DFDDE0` when off. This is a generic on/off switch — worth building as a small reusable component/class (e.g. `.switch`) since other screens (notification preferences, profile settings) will likely need the same control. **[ASSUMPTION]** flag this as a candidate for the shared component library rather than a one-off.
- Default demo state: Heart rate, Sleep, SpO2, and Steps on; Stress off — arbitrary demo values, not a meaningful default recommendation, just needs visual variety so both toggle states are visible on load.
- **[ASSUMPTION]** No explanation of *why* someone might turn a metric off (e.g. privacy framing) is included in this pass — if the product/legal side wants copy here (data sharing consent language), that's a content pass, not a layout change.

---

## 7. Pair another device (card 4)

- Dashed purple border (see §3), centered content.
- Label: "Pair another device"
- Row of 3 small circular icon chips representing device types: watch (reuse `device-watch`), Android/Wear OS (new `android` symbol, see §8), Bluetooth-generic (new `bluetooth` symbol, see §8).
- "+ Start pairing" button: solid purple fill, white text — per §0, this can show a brief demo-only state change (e.g. button text changes momentarily) but must not simulate a real discovery/pairing sequence.

---

## 8. Icons — new sprite entries needed

Per §5 of the Check-in handoff, `wellness-app.html` uses its own sprite (`js/icons.js`), not the Tabler font used in mockups. New symbols needed for this screen:

| New symbol name | Used for |
|---|---|
| `device-watch` | Your device icon chip, pairing row |
| `android` | Pairing row (Wear OS / Android device type) |
| `bluetooth` | Pairing row (generic BLE device type) |

**Reuse existing sprite entries — do not duplicate:**
- `settings` (line 26) → entry-point gear icon on `wearableView`
- `heart` (line 41) → Heart rate row
- `walking` (line 71) → Steps & activity row
- `brain` (line 70) → Stress level row
- `chevron` (line 31) → back breadcrumb
- `lungs` and `moon-stars` — these are new symbols first introduced in the Check-in handoff (§5). **Add them once, reuse on both screens.** Do not create second copies for this screen.
- `info` — also first introduced in the Check-in handoff footer note (§5) — reuse here for this screen's footer note too.

---

## 9. Footer note

Same visual treatment as Check-in's footer info strip (purple border, blue fill, `info` icon): "No device? You can always log readings manually from Check-in." Links conceptually to the existing manual-entry vitals toggle already built on Home (`setVitalsSource('manual')`) — no new navigation needed, this is just a reassurance message, not a tappable link. **[ASSUMPTION]** if product wants it tappable (deep-linking to Home's manual vitals entry), that's a small additive change, not called out as required here.

---

## 10. Component reuse (verified against actual codebase)

- Card frame, option-pill selection pattern: reuse Check-in's `.ci-card` / `.ci-opt` classes directly (see checkin handoff §12) rather than creating parallel classes for this screen.
- Icon chip circles: reuse the `.acard .a-ic` pattern already established (see Home handoff §7) for the 48px/32px circular icon backgrounds.
- New toggle switch: no existing equivalent in the current codebase to reuse — this is net-new, flagged in §6 as a good candidate for the shared component set once built.

---

## 11. Open items for future passes (not blocking this handoff)

- This entire screen is UI-only per §0 — a real implementation requires native app work (HealthKit / Health Connect, Bluetooth) and backend support, tracked separately, same caveat as the existing `wearableView` vitals source toggle.
- Data-sharing consent/privacy copy for the "What we share" toggles — content pass, not layout.
- Disconnected-device state is an assumption (§4), not explicitly mocked — confirm the "Reconnect" treatment reads right once built.
- Toggle switch component (§6) — recommend promoting to a shared, reusable class once a second screen needs it, rather than duplicating the inline styles used here.
