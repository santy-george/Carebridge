# Frontend Monorepo Scaffold — Design

**Date:** 2026-08-06
**Status:** Approved, ready for implementation plan
**Corresponds to:** Notion "Care Bridge Home — Production Rollout (Wellness App first)", Phase 0 (partial — see Out of Scope)

## Context

Care Bridge Home's repo is currently a static HTML/CSS/JS mockup (`admin-app/`, `field-app/`, `family-app/`, `wellness-app/`, shared `css/`/`js/`), plus a `supabase/` backend (schema + RLS, locally verified 2026-08-05). Per the Notion rollout plan, the Wellness App ships first as a React + Vite + TypeScript + Capacitor rebuild. No frontend code-owned stack exists yet — this is Phase 0's biggest unstarted gap and blocks all of Phase 2 (screen-by-screen rebuild).

This spec covers the initial monorepo scaffold only: tooling, app shells, and the design-system port. It does not cover CI/CD, Sentry, Supabase Auth wiring, or any actual screen rebuild — those are follow-on specs (see Out of Scope).

## Goals

- Stand up a pnpm + Turborepo monorepo at the repo root, alongside (not replacing) the existing static mockup folders.
- Two Vite + React + TypeScript apps, both Capacitor-wrapped: `apps/wellness` (critical path) and `apps/admin` (blank shell, wiring deferred to Workstream B).
- A shared `packages/design-system` containing the real ported CSS tokens/components/icon sprite from the current mockup, consumed by both apps.
- A `packages/db-types` placeholder, ready to receive Supabase-generated types once Auth work resumes.
- Baseline repo hygiene: ESLint + Prettier + Vitest, shared root config.

## Non-goals

- CI/CD (GitHub Actions) — separate follow-on spec.
- Sentry / observability — separate follow-on spec.
- Any Phase 2 screen rebuild (Home, Check-in, Meds, etc.) — this scaffold only proves the pipeline works.
- Supabase Auth integration — `packages/db-types` is structural only in this step.
- Native builds (running on an actual iOS/Android device/simulator) — Capacitor config is scaffolded, but Xcode/Android Studio builds are the user's to run.

## Layout

```
Carebridge/
  apps/
    wellness/                # React+Vite+TS, Capacitor-wrapped
    admin/                   # React+Vite+TS, Capacitor-wrapped, blank shell
  packages/
    design-system/           # ported CSS tokens/components/icon sprite
    db-types/                 # placeholder, populated after Supabase Auth work
  pnpm-workspace.yaml
  turbo.json
  package.json               # root workspace scripts (dev/build/lint/test via turbo)
  # existing admin-app/, field-app/, family-app/, wellness-app/, css/, js/, supabase/ untouched
```

## Tooling

- **Package manager:** pnpm, enabled via `corepack enable` (bundled with Node 22, already installed) — no global install needed.
- **Build orchestration:** Turborepo, caching/parallelizing `dev`/`build`/`lint`/`test` across all four workspace packages.
- **Apps:** Vite + React + TypeScript template each, with Capacitor added (`@capacitor/core`, `@capacitor/cli`, iOS + Android platform scaffolds via `npx cap add ios/android`). Native tooling (Xcode/Android Studio) is not available in this environment — platform config lands, but building/running on device/simulator is a manual follow-up for the user.
- **Linting/formatting:** one root ESLint flat config + Prettier config, extended by each app/package rather than duplicated per-package.
- **Testing:** Vitest configured per-package, with one smoke test per package to prove the runner works. No feature tests yet — nothing to test until Phase 2 screens exist.

## Design-system port

- `packages/design-system` receives `tokens.css`, `components.css`, `app.css` from the root `css/` folder, plus the icon sprite logic from `js/icons.js`, packaged with exports both apps can import.
- `mobile.css` and `admin.css` (app-shell layout helpers — sidebar, topbar) are ported too, since both apps need shell layout. These may need splitting per-app later as real screens are built; noting this now rather than improvising a split before it's needed.
- **Parity check:** run `apps/wellness`'s dev server side-by-side with a `wellness-app/*.dc.html` screen and confirm tokens, fonts, and spacing match. This is a pipeline check, not a screen rebuild — Phase 2 does the actual screen-by-screen port.

## db-types package

- Structural only in this step: `package.json`, a placeholder export, and a README documenting the `supabase gen types typescript` command to run once the hosted project is linked (or against local `supabase start`).
- Actually populated when Supabase Auth work resumes (see Notion Phase 1, "Typed client + seed").

## Testing/validation for this step

- `pnpm install` succeeds at root.
- `pnpm turbo run build` succeeds across all four packages.
- `apps/wellness` dev server boots and renders a default page styled via `packages/design-system` tokens (visual parity check against a `.dc.html` screen, as above).
- `apps/admin` dev server boots (blank shell, still themed via the shared design-system).
- `pnpm turbo run lint` and `pnpm turbo run test` both pass (smoke tests only).

## Out of scope / follow-on specs

- CI/CD (GitHub Actions: typecheck, build, preview deploy).
- Sentry (web + native error/observability baseline).
- Supabase Auth wiring (member OTP, coordinator role, protected routes).
- Phase 2 screen-by-screen rebuild (Home, Check-in, Meds, Care, Records, SOS).
- Admin Portal actual wiring (Workstream B: coordinator login, member dashboard, SOS inbox, care-team assignment).
