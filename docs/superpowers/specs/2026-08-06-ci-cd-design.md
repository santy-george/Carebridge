# CI/CD Design

**Goal:** run lint, test, build, and format checks automatically on every PR and push to `main`, so regressions are caught before they land — especially ahead of the larger Phase 2 screen-port work.

## Architecture

One GitHub Actions workflow: `.github/workflows/ci.yml`.

**Triggers:**
- `pull_request` targeting `main`
- `push` to `main`

**Job:** single job `checks`, `runs-on: ubuntu-latest`.

**Steps:**
1. `actions/checkout@v4`
2. `corepack enable` (reads `packageManager` field from root `package.json` — pins pnpm version without a separate config)
3. `actions/setup-node@v4` — `node-version: 22`, `cache: pnpm`
4. `pnpm install --frozen-lockfile`
5. `pnpm lint` (turbo: runs each workspace package's `eslint .`)
6. `pnpm test` (turbo: runs each workspace package's `vitest run`)
7. `pnpm build` (turbo: runs each workspace package's `tsc -b && vite build`, respecting `dependsOn: ["^build"]` so `packages/*` build before `apps/*`)
8. `pnpm format:check` (root-level `prettier --check .`, not a turbo task)

Each step runs sequentially; a failing step stops the job (default GitHub Actions behavior — no `continue-on-error`).

## Caching

pnpm store cache via `actions/setup-node`'s built-in `cache: pnpm` option (keyed off `pnpm-lock.yaml`). No turbo remote/local cache in this pass — the workspace is 4 packages, not yet large enough to justify the setup.

## Out of scope (deferred)

- **DB tests** (`supabase/tests/database/rls.test.sql`, pgTAP): needs Supabase CLI + a Postgres service container in CI. Tracked as a follow-up task, not built here.
- **Turbo remote caching:** revisit if CI runtime becomes a problem as the app grows.
- **Branch protection rules** (requiring this check before merge): a GitHub repo setting, not code — the user can enable it once the workflow exists and has run green at least once.

## Existing `static.yml` change

`.github/workflows/static.yml` currently deploys the entire repository to GitHub Pages on every push to `main` — a leftover from before the monorepo restructure (predates `apps/*`/`packages/*`). Its `push: branches: ["main"]` trigger is removed, leaving only `workflow_dispatch` (manual trigger). The deploy logic itself is untouched.

## Testing / Verification

No unit-testable logic — this is CI configuration. Verification is empirical: push the branch to GitHub and confirm the Actions run passes. Requires explicit go-ahead before pushing (per standing safety rules on pushing to a shared remote).
