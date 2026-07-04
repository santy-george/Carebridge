# Care Bridge Home — Wellness App: Care Screen
For: Claude Code (record/continuity) · From: Claude (Cowork) · Date: 4 July 2026
File touched: `wellness-app.html` only

## Process for this pass
Direct implementation ("Go build") — Santhosh gave a clear, complete spec (two-part: admin-arranged Care Team, plus member-owned Own Contacts with named categories), so this skipped the mockup step.

## What Care was before this pass
`careTeamView` was a single flat card: two rows (Care coordinator, Family physician), each with mail/chat/phone icon buttons, plus a footer note. No concept of member-added contacts.

## What Care is now

### Structure: two tabs, same pattern as Meds/Records
`.care-vtoggle`/`.care-panel` — a third instance of the same tab-switching mechanic, with its own class names/ids (`ctab-team`/`ctab-own`, `cpanel-team`/`cpanel-own`) for the same reason Records got its own `.rec-*` namespace: every view's DOM persists at once, so sharing class names with Meds' `.med-*` or Records' `.rec-*` would let one screen's tab switch silently affect another's panels via the global `querySelectorAll`. `switchCareTab(tab)` mirrors `switchMedTab()`/`switchRecordsTab()` exactly.

**Care Team tab** (`cpanel-team`, default/active) — read-only, arranged by the Care Bridge office. Expanded from 2 to 4 rows to feel like an actual home-care team: Care coordinator (Joel Abraham), Family physician (Dr. Rajeev Menon — unchanged), Physiotherapist (Sarah Mathew), Home nurse (Reshma Thomas). Same `.row`/`.row-av`/`.row-actions` component as before, no add/remove — members can't edit who the office has assigned.

**Own Contacts tab** (`cpanel-own`) — member-managed. Seeded with 4 example contacts spanning the categories Santhosh listed: Dr. Priya Varma (Ophthalmologist), Ravi Kumar (Physiotherapist), Sunitha Nair (Home nurse, backup), Suresh Kumar (Chauffeur). Each row has chat/phone action icons plus a new remove (✕) icon button (`removeOwnContact()`, confirms then removes the row — same `confirm()` pattern as removing a scheduled medication). At the bottom, a "+ Add a contact" row uses the `.add-contact-row` CSS class that already existed in the file but had never been wired to any markup — first real use of it.

### New view: `addContactView`
Modeled directly on the Add Medication form (`.form-sec`/`.field` sections, same inline `<select>` styling): Name (required), Category (select: Doctor / Physiotherapist / Counsellor / Pharmacist / Nurse / Chauffeur / Other — Santhosh's list verbatim, "Chauffeurs" normalized to singular "Chauffeur" for the option label), **Phone 1 + Phone 2** (side by side, Phone 2 optional), Email (optional), **Address** (single textarea, optional), and **Notes** capped at 100 words (not characters — `updateContactNotesWordCount()` splits on whitespace and trims the textarea back to 100 words on input, same live-counter pattern as Check-in's 100-character notes field, just word-based). "Save contact" (`saveNewContact()`) builds a new row into `#ownContactsList` with initials derived from the name (`initialsForName()` — first+last word initials, or first two letters if a single word) and an avatar tint keyed off category (`_contactCategoryColor` map — green for Doctor, the app's existing "digital wellness" purple-ish tint for Physiotherapist, red for Nurse, accent blue for everything else), then returns to Care on the Own Contacts tab (`CBH.goTab('careTeamView','care')`, same pattern as `saveNewMed()`/`saveNewDocument()`). Back/Cancel call `resetAddContactForm()` first so re-opening the form doesn't carry over stale values (including the word counter, reset to 0).

## Caveats / not done
- **UI-only, no persistence.** New contacts and removals are pure DOM mutations — nothing survives a reload. `saveNewContact()` carries the same `// TODO: replace with real contacts sync once backend exists` caveat as the Meds/Records additions.
- Phone 1/2, email, address and notes are all captured on the form but **not displayed anywhere** — the Own Contacts row still only shows name + category, and the row's chat/phone icon buttons have never had real onclick handlers anywhere in this file (Care Team, Family Circle included). Not a regression, just consistent with the existing decorative-icon pattern until calling/messaging/a contact-detail view is real.
- Didn't touch Tools (the last remaining 5-tab screen).

## Verification done
- Extracted the page's `<script>` block, ran through Node's `new Function()` — parses clean (re-verified after the field-set update).
- `<section>`/`</section>` balance: 22/22 (was 21/21 before adding `addContactView`).
- Grep-confirmed every id (`ctab-team`, `ctab-own`, `cpanel-team`, `cpanel-own`, `ownContactsList`, `addContactView`, `acPhone1`, `acPhone2`, `acAddress`, `acNotesWordCount`) and function (`switchCareTab`, `removeOwnContact`, `resetAddContactForm`, `saveNewContact`, `initialsForName`, `updateContactNotesWordCount`) appears exactly once; confirmed the old single `acPhone` id has zero remaining references.
