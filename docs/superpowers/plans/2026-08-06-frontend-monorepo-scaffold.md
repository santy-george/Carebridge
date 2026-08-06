# Frontend Monorepo Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a pnpm + Turborepo monorepo (`apps/wellness`, `apps/admin`, `packages/design-system`, `packages/db-types`) alongside the existing static mockup, with the real CSS design system ported and both apps Capacitor-wrapped.

**Architecture:** pnpm workspaces define four packages; Turborepo orchestrates `dev`/`build`/`lint`/`test` across them with caching. `packages/design-system` re-exports the existing root `css/*.css` files and a TypeScript port of `js/icons.js` as an internal, unbuilt (source-consumed) dependency — both apps import it directly, no build step of its own. `packages/db-types` is a structural placeholder until Supabase Auth work resumes.

**Tech Stack:** pnpm (via corepack), Turborepo, Vite + React + TypeScript, Capacitor (iOS + Android), ESLint (flat config) + Prettier, Vitest (+ Testing Library for the two apps).

## Global Constraints

- Existing folders (`admin-app/`, `field-app/`, `family-app/`, `wellness-app/`, `css/`, `js/`, `supabase/`) are not modified or moved.
- Package manager is pnpm, activated via `corepack enable` — no global npm install of pnpm.
- Build orchestration is Turborepo (`turbo.json` at root).
- Both `apps/wellness` and `apps/admin` are Vite + React + TypeScript, Capacitor-wrapped (iOS + Android platform folders scaffolded).
- One root ESLint flat config + one root Prettier config, extended (not duplicated) by every app/package.
- CSS design-system files (`tokens.css`, `components.css`, `app.css`, `mobile.css`, `admin.css`) are ported verbatim — no visual redesign in this plan.
- Out of scope, do not implement here: CI/CD, Sentry, Supabase Auth wiring, Phase 2 screen rebuilds, native device/simulator builds (platform config only).

---

## File Structure

```
Carebridge/
  pnpm-workspace.yaml
  package.json                 # root: packageManager pin, turbo scripts, shared devDependencies
  turbo.json
  tsconfig.base.json
  eslint.config.js             # root flat config
  .prettierrc.json
  .prettierignore
  packages/
    design-system/
      package.json
      tsconfig.json
      vitest.config.ts
      eslint.config.js         # thin re-export of root config
      src/
        icons.ts                # TS port of js/icons.js
        icons.test.ts
        tokens.css              # copy of css/tokens.css
        components.css          # copy of css/components.css
        app.css                 # copy of css/app.css
        mobile.css              # copy of css/mobile.css
        admin.css               # copy of css/admin.css
    db-types/
      package.json
      tsconfig.json
      vitest.config.ts
      eslint.config.js
      README.md
      src/
        index.ts
        index.test.ts
  apps/
    wellness/                   # pnpm create vite react-ts + Capacitor + design-system wiring
      capacitor.config.ts
      eslint.config.js
      vite.config.ts
      index.html
      src/App.tsx
      src/App.test.tsx
      src/test-setup.ts
      ios/, android/            # from `cap add`
    admin/                       # same shape, blank shell
      ...
```

---

## Task 1: Root workspace + Turborepo bootstrap

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json`
- Create: `turbo.json`
- Modify: `.gitignore`

**Interfaces:**
- Produces: root scripts `dev`/`build`/`lint`/`test` (each `turbo run <task>`), workspace globs `apps/*` and `packages/*` that later tasks' packages must live under.

- [ ] **Step 1: Enable corepack and pin pnpm**

```bash
corepack enable
```

- [ ] **Step 2: Create the workspace manifest**

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Create the root package.json**

`package.json`:
```json
{
  "name": "carebridge-home",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test"
  }
}
```

- [ ] **Step 4: Pin the exact pnpm version via corepack**

```bash
corepack use pnpm@latest
```

This resolves the current pnpm release and writes an exact `"packageManager": "pnpm@X.Y.Z"` field into `package.json` — confirm it landed:

```bash
grep packageManager package.json
```

Expected: a line like `"packageManager": "pnpm@9.x.x",`.

- [ ] **Step 5: Install Turborepo at the workspace root**

```bash
pnpm add -D -w turbo
```

- [ ] **Step 6: Create the Turborepo pipeline**

`turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {}
  }
}
```

- [ ] **Step 7: Update .gitignore for the new tooling**

Append to `.gitignore`:
```
node_modules/
dist/
.turbo/

# Capacitor native build artifacts (platform source itself stays committed)
apps/*/android/app/build/
apps/*/android/.gradle/
apps/*/ios/App/Pods/
apps/*/ios/App/output/
apps/*/ios/App/DerivedData/
```

- [ ] **Step 8: Verify the bootstrap**

```bash
pnpm install
pnpm exec turbo --version
```

Expected: `pnpm install` succeeds (no workspace packages matched yet is fine — it just installs root deps); `turbo --version` prints a version number.

- [ ] **Step 9: Commit**

```bash
git add pnpm-workspace.yaml package.json turbo.json .gitignore pnpm-lock.yaml
git commit -m "chore: bootstrap pnpm workspace + turborepo"
```

---

## Task 2: Root lint/format/TypeScript baseline

**Files:**
- Create: `tsconfig.base.json`
- Create: `eslint.config.js`
- Create: `.prettierrc.json`
- Create: `.prettierignore`

**Interfaces:**
- Produces: `tsconfig.base.json` (extended by every package/app's own `tsconfig.json` via `"extends": "../../tsconfig.base.json"`), root `eslint.config.js` (re-exported by every package/app's own `eslint.config.js`).

- [ ] **Step 1: Install shared dev tooling at the root**

```bash
pnpm add -D -w eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh eslint-config-prettier prettier typescript vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/dom @types/react @types/react-dom
```

- [ ] **Step 2: Create the shared TypeScript base config**

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx"
  }
}
```

- [ ] **Step 3: Create the root ESLint flat config**

`eslint.config.js`:
```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/.turbo/**', '**/ios/**', '**/android/**', '**/node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  prettier,
);
```

- [ ] **Step 4: Create the root Prettier config**

`.prettierrc.json`:
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

`.prettierignore`:
```
dist
.turbo
ios
android
node_modules
pnpm-lock.yaml
```

- [ ] **Step 5: Verify the configs parse**

```bash
pnpm exec eslint eslint.config.js
pnpm exec prettier --check eslint.config.js
```

Expected: both exit 0 with no errors (Prettier may reformat — if it reports a diff, run `pnpm exec prettier --write eslint.config.js` and re-check).

- [ ] **Step 6: Commit**

```bash
git add tsconfig.base.json eslint.config.js .prettierrc.json .prettierignore package.json pnpm-lock.yaml
git commit -m "chore: add shared TypeScript, ESLint, and Prettier baseline"
```

---

## Task 3: packages/design-system — CSS port + icon sprite module

**Files:**
- Create: `packages/design-system/package.json`
- Create: `packages/design-system/tsconfig.json`
- Create: `packages/design-system/vitest.config.ts`
- Create: `packages/design-system/eslint.config.js`
- Create: `packages/design-system/src/icons.ts`
- Test: `packages/design-system/src/icons.test.ts`
- Create: `packages/design-system/src/tokens.css`, `src/components.css`, `src/app.css`, `src/mobile.css`, `src/admin.css`

**Interfaces:**
- Consumes: nothing (leaf package).
- Produces: `getIconNames(): string[]`, `injectIconSprite(): void`, and CSS subpath exports `@carebridge/design-system/tokens.css`, `/components.css`, `/app.css`, `/mobile.css`, `/admin.css` — both apps import these directly.

- [ ] **Step 1: Scaffold the package**

```bash
mkdir -p packages/design-system/src
```

`packages/design-system/package.json`:
```json
{
  "name": "@carebridge/design-system",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": "./src/icons.ts",
    "./tokens.css": "./src/tokens.css",
    "./components.css": "./src/components.css",
    "./app.css": "./src/app.css",
    "./mobile.css": "./src/mobile.css",
    "./admin.css": "./src/admin.css"
  },
  "scripts": {
    "lint": "eslint .",
    "test": "vitest run"
  }
}
```

`packages/design-system/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
```

`packages/design-system/eslint.config.js`:
```js
import rootConfig from '../../eslint.config.js';

export default rootConfig;
```

`packages/design-system/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 2: Write the failing test for the icon sprite module**

`packages/design-system/src/icons.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { getIconNames } from './icons';

describe('icon sprite', () => {
  it('includes icons ported from js/icons.js', () => {
    const names = getIconNames();
    expect(names).toContain('dashboard');
    expect(names).toContain('emergency');
    expect(names).toContain('members');
    expect(names.length).toBeGreaterThan(50);
  });
});
```

- [ ] **Step 3: Run the test, verify it fails**

```bash
pnpm --filter @carebridge/design-system test
```

Expected: FAIL — `Cannot find module './icons'` (file doesn't exist yet).

- [ ] **Step 4: Port js/icons.js into the TypeScript module**

Open `js/icons.js` and copy the entire body of its `S = { ... }` object (every `key: '<svg markup>'` entry, currently lines 4–128) verbatim into the `S` object below — do not hand-retype individual entries, copy them exactly as they appear in the source file.

`packages/design-system/src/icons.ts`:
```ts
const S: Record<string, string> = {
  // Paste every entry from js/icons.js's `S` object here, verbatim.
};

export function getIconNames(): string[] {
  return Object.keys(S);
}

export function injectIconSprite(): void {
  let defs = '';
  for (const k in S) {
    defs += `<symbol id="i-${k}" viewBox="0 0 24 24">${S[k]}</symbol>`;
  }
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${defs}</svg>`;
  if (document.body) {
    document.body.insertBefore(wrap, document.body.firstChild);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.insertBefore(wrap, document.body.firstChild);
    });
  }
}
```

- [ ] **Step 5: Run the test, verify it passes**

```bash
pnpm --filter @carebridge/design-system test
```

Expected: PASS.

- [ ] **Step 6: Copy the CSS files verbatim**

```bash
cp css/tokens.css packages/design-system/src/tokens.css
cp css/components.css packages/design-system/src/components.css
cp css/app.css packages/design-system/src/app.css
cp css/mobile.css packages/design-system/src/mobile.css
cp css/admin.css packages/design-system/src/admin.css
```

- [ ] **Step 7: Lint the package**

```bash
pnpm --filter @carebridge/design-system lint
```

Expected: no errors (the placeholder comment inside `S` is fine; it's replaced with real entries in Step 4 before this point, so by now `S` holds real data).

- [ ] **Step 8: Commit**

```bash
git add packages/design-system pnpm-lock.yaml package.json
git commit -m "feat: port design-system CSS and icon sprite into packages/design-system"
```

---

## Task 4: packages/db-types — structural placeholder

**Files:**
- Create: `packages/db-types/package.json`
- Create: `packages/db-types/tsconfig.json`
- Create: `packages/db-types/vitest.config.ts`
- Create: `packages/db-types/eslint.config.js`
- Create: `packages/db-types/README.md`
- Create: `packages/db-types/src/index.ts`
- Test: `packages/db-types/src/index.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `SCHEMA_VERSION: string`, `Database` type — placeholders both apps may import once Supabase Auth work resumes; not consumed by anything in this plan.

- [ ] **Step 1: Scaffold the package**

```bash
mkdir -p packages/db-types/src
```

`packages/db-types/package.json`:
```json
{
  "name": "@carebridge/db-types",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint .",
    "test": "vitest run"
  }
}
```

`packages/db-types/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
```

`packages/db-types/eslint.config.js`:
```js
import rootConfig from '../../eslint.config.js';

export default rootConfig;
```

`packages/db-types/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 2: Write the failing test**

`packages/db-types/src/index.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from './index';

describe('db-types placeholder package', () => {
  it('exposes a placeholder schema version until Supabase types are generated', () => {
    expect(SCHEMA_VERSION).toBe('unpopulated');
  });
});
```

- [ ] **Step 3: Run the test, verify it fails**

```bash
pnpm --filter @carebridge/db-types test
```

Expected: FAIL — `Cannot find module './index'`.

- [ ] **Step 4: Write the placeholder module**

`packages/db-types/src/index.ts`:
```ts
export const SCHEMA_VERSION = 'unpopulated';

export type Database = Record<string, unknown>;
```

- [ ] **Step 5: Run the test, verify it passes**

```bash
pnpm --filter @carebridge/db-types test
```

Expected: PASS.

- [ ] **Step 6: Write the README documenting how this gets populated**

`packages/db-types/README.md`:
```markdown
# @carebridge/db-types

Structural placeholder. `src/index.ts` exports `SCHEMA_VERSION = 'unpopulated'`
and a `Database` type alias until Supabase Auth work resumes.

## Generating real types

Once the local stack is running (`supabase start` from `supabase/`) or the
hosted `carebridge-dev` project is linked:

```bash
# Against local Supabase:
supabase gen types typescript --local > src/database.types.ts

# Against the hosted project, once linked:
supabase gen types typescript --project-id <project-ref> > src/database.types.ts
```

Then replace the `Database` placeholder in `src/index.ts` with:

```ts
export type { Database } from './database.types';
```

and remove the `SCHEMA_VERSION` placeholder and its test.
```

- [ ] **Step 7: Commit**

```bash
git add packages/db-types pnpm-lock.yaml package.json
git commit -m "feat: add db-types structural placeholder package"
```

---

## Task 5: apps/wellness — Vite scaffold + design-system wiring + Capacitor

**Files:**
- Create: `apps/wellness/**` (via `pnpm create vite`)
- Modify: `apps/wellness/package.json`
- Modify: `apps/wellness/index.html`
- Modify: `apps/wellness/vite.config.ts`
- Modify: `apps/wellness/src/App.tsx`
- Create: `apps/wellness/src/App.test.tsx`
- Create: `apps/wellness/src/test-setup.ts`
- Replace: `apps/wellness/eslint.config.js`
- Create: `apps/wellness/capacitor.config.ts`
- Create: `apps/wellness/ios/`, `apps/wellness/android/` (via `cap add`)

**Interfaces:**
- Consumes: `@carebridge/design-system` (`getIconNames`/`injectIconSprite`, and `/tokens.css`, `/components.css`, `/app.css`, `/mobile.css` subpath exports) from Task 3.
- Produces: nothing consumed by later tasks (apps/admin is independent).

- [ ] **Step 1: Scaffold the Vite app**

```bash
pnpm create vite@latest apps/wellness -- --template react-ts
```

- [ ] **Step 2: Rename the package and remove generator-provided lint tooling**

Edit `apps/wellness/package.json`: change `"name"` to `"@carebridge/wellness"`, add `"private": true`, and remove any generator-added ESLint-related `devDependencies` (e.g. `eslint`, `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`, `typescript-eslint`) — these are already installed at the workspace root in Task 2. Add a `"test": "vitest run"` script alongside the existing `dev`/`build`/`lint`/`preview` scripts.

Delete the generator's own lint config and replace it:

```bash
rm apps/wellness/eslint.config.js
```

`apps/wellness/eslint.config.js`:
```js
import rootConfig from '../../eslint.config.js';

export default rootConfig;
```

- [ ] **Step 3: Add the design-system dependency**

```bash
pnpm add @carebridge/design-system@workspace:* --filter @carebridge/wellness
```

- [ ] **Step 4: Configure Vitest + Testing Library in vite.config.ts**

Edit `apps/wellness/vite.config.ts` to add a `test` block (Vite's own config accepts Vitest's `test` key when using `vitest/config`'s merged types — simplest is importing `defineConfig` from `vite` as the template does, and adding `test` as a plain object; Vitest reads it regardless of which `defineConfig` typed it):

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

`apps/wellness/src/test-setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Set the app-shell theme attribute**

Edit `apps/wellness/index.html`: change `<html lang="en">` to `<html lang="en" data-app="family">` (Client & Family App theming, per `CLAUDE.md` §1 — the Wellness App is the current Self Care/Family surface).

- [ ] **Step 6: Write the failing smoke test**

`apps/wellness/src/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the Wellness shell heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /care bridge wellness/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run the test, verify it fails**

```bash
pnpm --filter @carebridge/wellness test
```

Expected: FAIL — the generator's default `App.tsx` renders "Vite + React", not "Care Bridge Wellness".

- [ ] **Step 8: Replace App.tsx with a design-system-themed shell**

`apps/wellness/src/App.tsx`:
```tsx
import { useEffect } from 'react';
import { injectIconSprite } from '@carebridge/design-system';
import '@carebridge/design-system/tokens.css';
import '@carebridge/design-system/components.css';
import '@carebridge/design-system/app.css';
import '@carebridge/design-system/mobile.css';

function App() {
  useEffect(() => {
    injectIconSprite();
  }, []);

  return (
    <main className="content">
      <div className="card">
        <h1 className="t-heading-s">Care Bridge Wellness</h1>
        <p className="t-body-m">Design-system pipeline check — scaffold only.</p>
        <button className="btn btn--primary" type="button">
          <svg className="icon">
            <use href="#i-dashboard" />
          </svg>
          Looks themed
        </button>
      </div>
    </main>
  );
}

export default App;
```

- [ ] **Step 9: Run the test, verify it passes**

```bash
pnpm --filter @carebridge/wellness test
```

Expected: PASS.

- [ ] **Step 10: Add Capacitor**

```bash
pnpm add @capacitor/core --filter @carebridge/wellness
pnpm add -D @capacitor/cli --filter @carebridge/wellness
cd apps/wellness
pnpm exec cap init "Care Bridge Wellness" "com.carebridgehome.wellness" --web-dir dist
cd ../..
pnpm add @capacitor/ios @capacitor/android --filter @carebridge/wellness
cd apps/wellness
pnpm exec cap add ios
pnpm exec cap add android
cd ../..
```

If `cap add ios` or `cap add android` fails because Xcode / Android SDK aren't installed in this environment, that's expected — per the design spec's non-goals, native builds are a manual follow-up for the user. Note which platform(s) failed and why, leave `capacitor.config.ts` in place, and continue; don't treat this as a task failure.

- [ ] **Step 11: Verify build and lint**

```bash
pnpm --filter @carebridge/wellness build
pnpm --filter @carebridge/wellness lint
```

Expected: both succeed.

- [ ] **Step 12: Commit**

```bash
git add apps/wellness pnpm-lock.yaml package.json
git commit -m "feat: scaffold apps/wellness with design-system and Capacitor"
```

---

## Task 6: apps/admin — Vite scaffold (blank shell) + design-system wiring + Capacitor

**Files:**
- Create: `apps/admin/**` (via `pnpm create vite`)
- Modify: `apps/admin/package.json`
- Modify: `apps/admin/index.html`
- Modify: `apps/admin/vite.config.ts`
- Modify: `apps/admin/src/App.tsx`
- Create: `apps/admin/src/App.test.tsx`
- Create: `apps/admin/src/test-setup.ts`
- Replace: `apps/admin/eslint.config.js`
- Create: `apps/admin/capacitor.config.ts`
- Create: `apps/admin/ios/`, `apps/admin/android/` (via `cap add`)

**Interfaces:**
- Consumes: `@carebridge/design-system` (`/tokens.css`, `/components.css`, `/app.css`, `/admin.css` subpath exports) from Task 3.
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Scaffold the Vite app**

```bash
pnpm create vite@latest apps/admin -- --template react-ts
```

- [ ] **Step 2: Rename the package and remove generator-provided lint tooling**

Edit `apps/admin/package.json`: `"name": "@carebridge/admin"`, `"private": true`, remove generator ESLint devDependencies, add `"test": "vitest run"`.

```bash
rm apps/admin/eslint.config.js
```

`apps/admin/eslint.config.js`:
```js
import rootConfig from '../../eslint.config.js';

export default rootConfig;
```

- [ ] **Step 3: Add the design-system dependency**

```bash
pnpm add @carebridge/design-system@workspace:* --filter @carebridge/admin
```

- [ ] **Step 4: Configure Vitest + Testing Library**

`apps/admin/vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

`apps/admin/src/test-setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Set the app-shell theme attribute**

Edit `apps/admin/index.html`: change `<html lang="en">` to `<html lang="en" data-app="admin">`.

- [ ] **Step 6: Write the failing smoke test**

`apps/admin/src/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the Admin shell heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /admin portal/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run the test, verify it fails**

```bash
pnpm --filter @carebridge/admin test
```

Expected: FAIL — default `App.tsx` doesn't render "Admin Portal".

- [ ] **Step 8: Replace App.tsx with a blank themed shell**

`apps/admin/src/App.tsx`:
```tsx
import '@carebridge/design-system/tokens.css';
import '@carebridge/design-system/components.css';
import '@carebridge/design-system/app.css';
import '@carebridge/design-system/admin.css';

function App() {
  return (
    <main className="content">
      <div className="card">
        <h1 className="t-heading-s">Admin Portal</h1>
        <p className="t-body-m">Scaffold only — wiring deferred to Workstream B.</p>
      </div>
    </main>
  );
}

export default App;
```

- [ ] **Step 9: Run the test, verify it passes**

```bash
pnpm --filter @carebridge/admin test
```

Expected: PASS.

- [ ] **Step 10: Add Capacitor**

```bash
pnpm add @capacitor/core --filter @carebridge/admin
pnpm add -D @capacitor/cli --filter @carebridge/admin
cd apps/admin
pnpm exec cap init "Care Bridge Admin" "com.carebridgehome.admin" --web-dir dist
cd ../..
pnpm add @capacitor/ios @capacitor/android --filter @carebridge/admin
cd apps/admin
pnpm exec cap add ios
pnpm exec cap add android
cd ../..
```

Same note as Task 5 Step 10 if native platform scaffolding fails in this environment — not a task failure, continue.

- [ ] **Step 11: Verify build and lint**

```bash
pnpm --filter @carebridge/admin build
pnpm --filter @carebridge/admin lint
```

Expected: both succeed.

- [ ] **Step 12: Commit**

```bash
git add apps/admin pnpm-lock.yaml package.json
git commit -m "feat: scaffold apps/admin blank shell with design-system and Capacitor"
```

---

## Task 7: Full monorepo validation + design-system parity check

**Files:** none created — this task only runs and records verification.

**Interfaces:**
- Consumes: every package/app from Tasks 1–6.

- [ ] **Step 1: Clean install from the root**

```bash
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
```

Expected: succeeds with no phantom-dependency errors.

- [ ] **Step 2: Run the full Turborepo pipeline**

```bash
pnpm build
pnpm lint
pnpm test
```

Expected: all three succeed across all four packages (`design-system`, `db-types`, `wellness`, `admin`).

- [ ] **Step 3: Boot both dev servers**

```bash
pnpm --filter @carebridge/wellness dev
```

Expected: Vite prints a local URL; visiting it renders the "Care Bridge Wellness" card, Urbanist font, purple/blue-themed button per `data-app="family"`.

```bash
pnpm --filter @carebridge/admin dev
```

Expected: same shape, "Admin Portal" card, `data-app="admin"` theming.

- [ ] **Step 4: Manual design-system parity check**

With `apps/wellness`'s dev server running, open `wellness-app/CheckIn.dc.html` in a second browser tab side by side. Compare:
- Font (Urbanist, same weights)
- Card corner radius, shadow, spacing
- Button color and type scale

This is a visual pipeline check, not a pixel-diff test — record any mismatch as a follow-up note; do not attempt to fix Phase 2-scope visual issues here.

- [ ] **Step 5: Record the outcome**

Report back: which of build/lint/test passed, which native platforms (iOS/Android) scaffolded successfully in Tasks 5–6, and the result of the manual parity check.

- [ ] **Step 6: Final commit (if any cleanup was needed)**

```bash
git add -A
git commit -m "chore: verify monorepo scaffold end-to-end"
```

Skip this step if Steps 1–4 required no file changes.

---

## Self-Review Notes

- **Spec coverage:** every Goal/Tooling/Design-system-port/db-types/Testing-validation section of `docs/superpowers/specs/2026-08-06-frontend-monorepo-scaffold-design.md` maps to a task above (Tasks 1–2 = tooling baseline, Task 3 = design-system port, Task 4 = db-types, Tasks 5–6 = the two apps + Capacitor, Task 7 = the spec's "Testing/validation for this step" checklist verbatim).
- **Type consistency:** `getIconNames()`/`injectIconSprite()` names match between Task 3's implementation and Tasks 5/6's `import { injectIconSprite } from '@carebridge/design-system'`. `SCHEMA_VERSION` matches between Task 4's test and implementation.
- **No placeholders left unresolved:** the one intentional copy-paste instruction (Task 3 Step 4, porting the `S` icon map) is a mechanical verbatim-copy instruction, not an open-ended TODO — resolved by reading the existing `js/icons.js` file, not invented.
