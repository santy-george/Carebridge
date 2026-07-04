# Care Bridge Home — Wellness App: Records Screen
For: Claude Code (record/continuity) · From: Claude (Cowork) · Date: 4 July 2026
Branch: continue on `feature/wellness-app-and-care-model-update` (or current working branch)
File touched: `wellness-app.html` only (no CSS/JS files outside the inline `<style>`/`<script>`)

## Process for this pass
Followed the established workflow: mocked up the screen visually first (two mockups — the Documents/History tab structure, then the scan-first upload flow), iterated with Santhosh, got sign-off ("Capture page looks good"), then implemented directly into `wellness-app.html` in this same session.

## What Records was before this pass
A single-panel `recordsView` with 3 cards: a link to the Monthly wellness report, a "Recent check-ins" list, and a "7-day vitals avg" grid. No actual document storage — despite `QA_CATALOG`'s "Upload a record" quick action already pointing at it.

## What Records is now

### Structure: two tabs
Reused the `.vitals-toggle`/`.vtog` component (same one Meds uses for Schedule/Cabinet), but on **separate classes** — `.rec-vtoggle`/`.rec-panel` and ids `rtab-*`/`rpanel-*` — not `.med-vtoggle`/`.med-panel`. Both screens' DOM trees exist simultaneously (only one `.view` is shown via `is-active` at a time), so reusing the exact same class names would have let `switchMedTab()`'s global `querySelectorAll('.med-panel')` accidentally toggle Records' panels too, and vice versa. New function `switchRecordsTab(tab)` mirrors `switchMedTab()` exactly, just scoped to the `rec-*` names.

**Documents tab** (`rpanel-documents`, default/active) — the actual document vault:
- "Upload a document" primary CTA → `addDocumentView`.
- Four categories, each an `.inv-item`/`toggleInv()` collapsible (same mechanic as Medicine Cabinet): **Lab reports** (3 seeded documents), **Prescriptions** (2), **Scans & imaging** (1), **Other** (empty — shows "Nothing here yet").
- Each document row uses the existing generic `.row`/`.ic`/`.m`/`.val` component (same one "June wellness report" already used), not a new pattern.

**History tab** (`rpanel-history`) — the screen's entire previous content, unchanged: Monthly report card, Recent check-ins, 7-day vitals avg. This satisfies the standing IA decision that "Monthly Report is a sub-section inside Records, not standalone" (see project CLAUDE.md / nav memory) — it was already nested as a card, now that whole card set lives under its own tab rather than being the only content on the screen.

### New view: `addDocumentView` — scan-first upload
Two-step flow inside one view (`.adoc-step`/`.adoc-step.show`, same show/hide mechanic as Meds' panels):

1. **Capture step** (`adocStep1`): camera-forward — a placeholder capture area, "Scan document" primary button, "Choose a file instead" as the quiet secondary link underneath (per Santhosh's explicit call: scan-first, not upload-first). A caption states plainly this is UI-only — **no real camera or file picker is wired up**, both buttons just advance to the confirm step. Same caveat pattern as the wearable-pairing and reorder/cart flows elsewhere in this file.
2. **Confirm step** (`adocStep2`): placeholder thumbnail, then Category (select: Lab report / Prescription / Scan or imaging / Other), Name (text), Date (date input) — modeled directly on the Add Medication form's field pattern (`.field`, same inline select styling). "Save to records" appends a new `.row` into the matching category's list, recomputes that category's count text, resets the form, and returns to Records on the Documents tab (`CBH.goTab('recordsView','records')` — mirrors `saveNewMed()`'s exact pattern).
3. Back button (breadcrumb chevron) calls `resetAddDocFlow()` before `CBH.back()`, so leaving mid-flow doesn't leave stale form values or land you on step 2 next time you open it.

### Quick action repoint
`QA_CATALOG`'s `upload` entry (`Upload a record`) now points at `addDocumentView` instead of `recordsView` — it's a more useful destination now that there's an actual upload flow to land on.

## Caveats / not done
- **UI-only, no real capture or storage.** `saveNewDocument()` has a `// TODO: replace with real document upload/storage once backend exists` — it only mutates the DOM; nothing persists past a reload (Records doesn't even do the localStorage trick Quick Actions uses — there was no existing persistence pattern for documents to extend, so it's pure in-memory demo state, same tier as Meds' reorder/cart cart items).
- Seeded documents (3 lab reports, 2 prescriptions, 1 scan) are static placeholders matching names already referenced elsewhere in the file (e.g. "Dr Rajeev Menon", "Kims Diagnostics", the existing ECG reference) — kept consistent with data already used in Meds/Wearable screens rather than inventing new names.
- Didn't touch `wellness-app.html`'s "Care" or "Tools" tabs, or any file outside `wellness-app.html`.

## Verification done
- Extracted the page's single `<script>` block, ran it through Node's `new Function()` — parses clean.
- Grep-confirmed all id pairs line up: `rtab-documents`/`rtab-history` ↔ `rpanel-documents`/`rpanel-history`; all four `doc-cat-*-list`/`doc-cat-*-count` ids present once each.
- Confirmed `<section>`/`</section>` tag balance for the whole file (21/21) and specifically for the new `recordsView`/`addDocumentView` blocks (2/2 each, open+close).
