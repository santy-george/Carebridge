# Home / Vitals Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Wellness App's authenticated app shell (top bar + bottom nav) and the real Home/vitals screen, replacing the current placeholder `App.tsx`.

**Architecture:** A shared `AppShell` layout component (top bar, bottom nav, stub routes for screens not yet built) wraps all authenticated routes. `Home.tsx` is the first real screen mounted inside it, fetching member-scoped Supabase data in parallel and rendering independent cards. Pure vitals-classification math (BMI, blood pressure/SpO2/glucose status, low-stock check) lives in a standalone, fully unit-tested module reused by both the shell (bell dot) and the screen (gauge rings).

**Tech Stack:** React 19, TypeScript, `@supabase/supabase-js`, `react-router-dom`, Vitest + React Testing Library, `@carebridge/design-system`.

## Global Constraints

- Navigation IA matches the actual mockup set exactly, not the Notion plan's shorthand: bottom nav tabs are **Summary (`/`) / My Health (`/health`) / My Schedule (`/medications`) / My Care (`/care`) / More (`/more`)**. Top bar adds Emergency (`/sos`) and avatar/Profile (`/profile`).
- Every non-Home route (`/health`, `/medications`, `/care`, `/more`, `/sos`, `/profile`) renders the shared `ComingSoon` stub this cycle — no other content.
- No Check-in nav entry anywhere — the actual mockup design has none; do not invent one.
- "My activity" (heart rate/steps/sleep) is a static placeholder only — no query, no manual-entry form. Card text: "Connect a wearable to see this."
- Overall Score hero ring reads `checkins.wellness_score` (latest by `checkin_date desc`); shows an explicit empty state when no checkin row exists — do not fabricate a score.
- No new design tokens (colors, spacing, radii) — reuse only what already exists in `packages/design-system/src/tokens.css`.
- Blood pressure gauge: <120 Normal (`chip2--ok`), 120–139 Elevated (`chip2--warn`), ≥140 High (`chip2--alert`). Gauge fill = `min(systolic, 180) / 180`.
- SpO2 gauge: ≥95 Normal (`chip2--ok`), <95 Low (`chip2--alert`). Gauge fill = reading value directly (already 0–100).
- Glucose classification thresholds (verbatim from the existing mockup logic): post-meal <140 ok / <180 warn / else alert; fasting or pre-meal <100 ok / <126 warn / else alert; bedtime <140 ok / <160 warn / else alert. Gauge fill = `min(value, 200) / 200`.
- `glucose_readings.context` enum values are `fasting` | `pre_meal` | `post_meal` | `bedtime` (underscored) — not the hyphenated strings used internally by the old mockup's JS.
- BMI category thresholds (verbatim from the mockup, standard WHO bands): <18.5 Underweight (`chip2--warn`), 18.5–24.9 Normal weight (`chip2--ok`), 25–29.9 Overweight (`chip2--warn`), ≥30 Obese (`chip2--alert`).
- Low-stock rule (verbatim from the mockup): an item is low-stock when `floor(qty / doses_per_day) <= 7` (guard `doses_per_day` to `1` if it's `0` or falsy).
- All queries and writes scope to `useAuth().selectedMemberId`. Writes rely entirely on existing RLS policies (`member_owns` + `source = 'manual'`) — no new migrations, no new policies.
- Home screen shows one loading skeleton during the initial parallel fetch, then cards render independently from their own empty states — no single post-load gate. A fetch error surfaces as a dismissible inline banner (`role="alert"`), not a full-screen failure. Glucose/BMI submit failures show an inline `form-error` message under the relevant form, matching the pattern already used in `Login.tsx`/`Signup.tsx`/`LinkMember.tsx`.
- Test mocking pattern matches existing tests exactly: `vi.mock('../lib/supabase', () => ({ supabase: { ... } }))` and `vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }))`, as done in `AuthProvider.test.tsx` / `LinkMember.test.tsx` / `App.test.tsx`.

---

### Task 1: Vitals classification helpers

**Files:**
- Create: `apps/wellness/src/lib/vitals.ts`
- Test: `apps/wellness/src/lib/vitals.test.ts`

**Interfaces:**
- Produces (used by Task 2's `AppShell` and Task 3/4's `Home.tsx`):
  - `export type GlucoseContext = 'fasting' | 'pre_meal' | 'post_meal' | 'bedtime';`
  - `export interface Status { label: string; chipClass: string; percent: number }`
  - `export function classifyBloodPressure(systolic: number): Status`
  - `export function classifySpo2(value: number): Status`
  - `export function classifyGlucose(value: number, context: GlucoseContext): Status`
  - `export function glucoseContextLabel(context: GlucoseContext): string`
  - `export function calculateBmi(weightKg: number, heightCm: number): number`
  - `export interface BmiCategory { label: string; chipClass: string }`
  - `export function categorizeBmi(bmi: number): BmiCategory`
  - `export function hasLowStockAlert(stock: { qty: number; doses_per_day: number }[]): boolean`

- [ ] **Step 1: Write the failing tests**

Create `apps/wellness/src/lib/vitals.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  calculateBmi,
  categorizeBmi,
  classifyBloodPressure,
  classifyGlucose,
  classifySpo2,
  glucoseContextLabel,
  hasLowStockAlert,
} from './vitals';

describe('classifyBloodPressure', () => {
  it('is Normal below 120', () => {
    expect(classifyBloodPressure(119)).toEqual({ label: 'Normal', chipClass: 'chip2--ok', percent: 66 });
  });
  it('is Elevated from 120 to 139', () => {
    expect(classifyBloodPressure(130)).toEqual({ label: 'Elevated', chipClass: 'chip2--warn', percent: 72 });
  });
  it('is High at 140 and above', () => {
    expect(classifyBloodPressure(140)).toEqual({ label: 'High', chipClass: 'chip2--alert', percent: 78 });
  });
  it('clamps the gauge fill above the 180 ceiling', () => {
    expect(classifyBloodPressure(220).percent).toBe(100);
  });
});

describe('classifySpo2', () => {
  it('is Normal at 95 and above', () => {
    expect(classifySpo2(95)).toEqual({ label: 'Normal', chipClass: 'chip2--ok', percent: 95 });
  });
  it('is Low below 95', () => {
    expect(classifySpo2(94)).toEqual({ label: 'Low', chipClass: 'chip2--alert', percent: 94 });
  });
});

describe('classifyGlucose', () => {
  it('classifies post_meal bands', () => {
    expect(classifyGlucose(139, 'post_meal').label).toBe('Normal');
    expect(classifyGlucose(140, 'post_meal').label).toBe('Needs attention');
    expect(classifyGlucose(180, 'post_meal').label).toBe('High');
  });
  it('classifies fasting bands', () => {
    expect(classifyGlucose(99, 'fasting').label).toBe('Normal');
    expect(classifyGlucose(100, 'fasting').label).toBe('Needs attention');
    expect(classifyGlucose(126, 'fasting').label).toBe('High');
  });
  it('classifies pre_meal the same as fasting', () => {
    expect(classifyGlucose(99, 'pre_meal').label).toBe('Normal');
  });
  it('classifies bedtime bands', () => {
    expect(classifyGlucose(139, 'bedtime').label).toBe('Normal');
    expect(classifyGlucose(140, 'bedtime').label).toBe('Needs attention');
    expect(classifyGlucose(160, 'bedtime').label).toBe('High');
  });
  it('clamps the gauge fill above the 200 ceiling', () => {
    expect(classifyGlucose(400, 'fasting').percent).toBe(100);
  });
});

describe('glucoseContextLabel', () => {
  it('maps each context to display text', () => {
    expect(glucoseContextLabel('fasting')).toBe('Fasting');
    expect(glucoseContextLabel('pre_meal')).toBe('Pre-meal');
    expect(glucoseContextLabel('post_meal')).toBe('Post-meal');
    expect(glucoseContextLabel('bedtime')).toBe('Bedtime');
  });
});

describe('calculateBmi', () => {
  it('computes BMI from weight and height', () => {
    expect(calculateBmi(70.4, 162)).toBe(26.8);
  });
});

describe('categorizeBmi', () => {
  it('is Underweight below 18.5', () => {
    expect(categorizeBmi(18.4)).toEqual({ label: 'Underweight', chipClass: 'chip2--warn' });
  });
  it('is Normal weight from 18.5 to 24.9', () => {
    expect(categorizeBmi(18.5)).toEqual({ label: 'Normal weight', chipClass: 'chip2--ok' });
    expect(categorizeBmi(24.9)).toEqual({ label: 'Normal weight', chipClass: 'chip2--ok' });
  });
  it('is Overweight from 25 to 29.9', () => {
    expect(categorizeBmi(25)).toEqual({ label: 'Overweight', chipClass: 'chip2--warn' });
  });
  it('is Obese at 30 and above', () => {
    expect(categorizeBmi(30)).toEqual({ label: 'Obese', chipClass: 'chip2--alert' });
  });
});

describe('hasLowStockAlert', () => {
  it('is false when every item has more than 7 days left', () => {
    expect(hasLowStockAlert([{ qty: 24, doses_per_day: 2 }])).toBe(false);
  });
  it('is true when any item has 7 or fewer days left', () => {
    expect(hasLowStockAlert([{ qty: 24, doses_per_day: 2 }, { qty: 5, doses_per_day: 1 }])).toBe(true);
  });
  it('treats a 0 doses_per_day as 1 to avoid a divide-by-zero', () => {
    expect(hasLowStockAlert([{ qty: 5, doses_per_day: 0 }])).toBe(true);
  });
  it('is false for an empty stock list', () => {
    expect(hasLowStockAlert([])).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/wellness && pnpm test -- vitals.test.ts`
Expected: FAIL — `./vitals` module not found.

- [ ] **Step 3: Implement the helpers**

Create `apps/wellness/src/lib/vitals.ts`:

```ts
export type GlucoseContext = 'fasting' | 'pre_meal' | 'post_meal' | 'bedtime';

export interface Status {
  label: string;
  chipClass: string;
  percent: number;
}

export function classifyBloodPressure(systolic: number): Status {
  const percent = Math.round((Math.min(systolic, 180) / 180) * 100);
  if (systolic < 120) return { label: 'Normal', chipClass: 'chip2--ok', percent };
  if (systolic < 140) return { label: 'Elevated', chipClass: 'chip2--warn', percent };
  return { label: 'High', chipClass: 'chip2--alert', percent };
}

export function classifySpo2(value: number): Status {
  const percent = Math.round(Math.min(value, 100));
  if (value >= 95) return { label: 'Normal', chipClass: 'chip2--ok', percent };
  return { label: 'Low', chipClass: 'chip2--alert', percent };
}

export function classifyGlucose(value: number, context: GlucoseContext): Status {
  const percent = Math.round((Math.min(value, 200) / 200) * 100);
  if (context === 'post_meal') {
    if (value < 140) return { label: 'Normal', chipClass: 'chip2--ok', percent };
    if (value < 180) return { label: 'Needs attention', chipClass: 'chip2--warn', percent };
    return { label: 'High', chipClass: 'chip2--alert', percent };
  }
  if (context === 'bedtime') {
    if (value < 140) return { label: 'Normal', chipClass: 'chip2--ok', percent };
    if (value < 160) return { label: 'Needs attention', chipClass: 'chip2--warn', percent };
    return { label: 'High', chipClass: 'chip2--alert', percent };
  }
  // fasting or pre_meal
  if (value < 100) return { label: 'Normal', chipClass: 'chip2--ok', percent };
  if (value < 126) return { label: 'Needs attention', chipClass: 'chip2--warn', percent };
  return { label: 'High', chipClass: 'chip2--alert', percent };
}

const GLUCOSE_CONTEXT_LABELS: Record<GlucoseContext, string> = {
  fasting: 'Fasting',
  pre_meal: 'Pre-meal',
  post_meal: 'Post-meal',
  bedtime: 'Bedtime',
};

export function glucoseContextLabel(context: GlucoseContext): string {
  return GLUCOSE_CONTEXT_LABELS[context];
}

export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export interface BmiCategory {
  label: string;
  chipClass: string;
}

export function categorizeBmi(bmi: number): BmiCategory {
  if (bmi < 18.5) return { label: 'Underweight', chipClass: 'chip2--warn' };
  if (bmi < 25) return { label: 'Normal weight', chipClass: 'chip2--ok' };
  if (bmi < 30) return { label: 'Overweight', chipClass: 'chip2--warn' };
  return { label: 'Obese', chipClass: 'chip2--alert' };
}

export function hasLowStockAlert(stock: { qty: number; doses_per_day: number }[]): boolean {
  return stock.some((item) => {
    const dosesPerDay = item.doses_per_day > 0 ? item.doses_per_day : 1;
    return Math.floor(item.qty / dosesPerDay) <= 7;
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/wellness && pnpm test -- vitals.test.ts`
Expected: PASS, 17 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/wellness/src/lib/vitals.ts apps/wellness/src/lib/vitals.test.ts
git commit -m "feat(wellness): add vitals classification helpers"
```

---

### Task 2: App shell (top bar, bottom nav, stub routes)

**Files:**
- Modify: `packages/design-system/src/mobile.css` (append new classes, do not touch existing ones)
- Create: `apps/wellness/src/shell/ComingSoon.tsx`
- Create: `apps/wellness/src/shell/ComingSoon.test.tsx`
- Create: `apps/wellness/src/shell/AppShell.tsx`
- Create: `apps/wellness/src/shell/AppShell.test.tsx`
- Modify: `apps/wellness/src/main.tsx`
- Delete: `apps/wellness/src/App.tsx`
- Delete: `apps/wellness/src/App.test.tsx`

**Interfaces:**
- Consumes: `hasLowStockAlert` from `apps/wellness/src/lib/vitals.ts` (Task 1). `useAuth()` from `apps/wellness/src/auth/useAuth.ts` (existing — returns `{ session, loading, linksLoaded, memberLinks, selectedMemberId, selectMember, refreshMemberLinks }`). `supabase` from `apps/wellness/src/lib/supabase.ts` (existing). `injectIconSprite` from `@carebridge/design-system` (existing, currently called in the `App.tsx` this task deletes).
- Produces (used by Task 3): `AppShell` renders `<Outlet />` for its child routes — Task 3's `Home` component mounts as the index route inside it. No props consumed by children beyond routing context.

- [ ] **Step 1: Add the new CSS classes**

Open `packages/design-system/src/mobile.css`. Find the `/* ---- Charts ------------------------------------------------------------ */` block containing `.ring` (search for `.ring {`). Immediately after the existing `.ring b { ... }` rule (before `.spark`), insert:

```css
.ring--sm {
  width: 56px;
  height: 56px;
}
.ring--sm::before {
  inset: 7px;
}
.ring--sm b {
  font-size: 13px;
}
```

Then, at the end of the file, append:

```css
/* ---- Key/value list (used by Home's medical-profile card) -------------- */
.kv {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.kv__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 9px 0;
}
.kv__row + .kv__row {
  border-top: 1px solid var(--border);
}
.kv__k {
  font-size: 12.5px;
  color: var(--text-muted);
}
.kv__v {
  font-size: 13px;
  color: var(--text-heading);
  font-weight: 500;
  text-align: right;
}

/* ---- App shell top bar --------------------------------------------------- */
.brand-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 4px 18px 0;
}
.brand-strip .tbar__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.brand-strip__brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 14px;
  color: var(--purple-700);
}
```

- [ ] **Step 2: Write the failing ComingSoon test**

Create `apps/wellness/src/shell/ComingSoon.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ComingSoon } from './ComingSoon';

describe('ComingSoon', () => {
  it('renders the given title and a coming-soon message', () => {
    render(<ComingSoon title="My Health" />);
    expect(screen.getByRole('heading', { name: 'My Health' })).toBeInTheDocument();
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd apps/wellness && pnpm test -- ComingSoon.test.tsx`
Expected: FAIL — `./ComingSoon` module not found.

- [ ] **Step 4: Implement ComingSoon**

Create `apps/wellness/src/shell/ComingSoon.tsx`:

```tsx
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
      <h1 className="t-heading-s">{title}</h1>
      <p className="t-body-m">Coming soon.</p>
    </div>
  );
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `cd apps/wellness && pnpm test -- ComingSoon.test.tsx`
Expected: PASS.

- [ ] **Step 6: Write the failing AppShell tests**

Create `apps/wellness/src/shell/AppShell.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';
import { useAuth } from '../auth/useAuth';

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));

const selectMaybeSingle = vi.fn();
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => selectMaybeSingle()),
      })),
    })),
  },
}));

function renderShell(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<div>Home content</div>} />
          <Route path="/health" element={<div>Health content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppShell', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ selectedMemberId: 'm1' } as never);
    selectMaybeSingle.mockResolvedValue({ data: [], error: null });
  });

  it('renders all 5 bottom nav tabs with correct hrefs', () => {
    renderShell();
    const expected: [string, string][] = [
      ['Summary', '/'],
      ['My Health', '/health'],
      ['My Schedule', '/medications'],
      ['My Care', '/care'],
      ['More', '/more'],
    ];
    for (const [label, href] of expected) {
      const link = screen.getByRole('link', { name: new RegExp(label, 'i') });
      expect(link).toHaveAttribute('href', href);
    }
  });

  it('marks the current route active', () => {
    renderShell('/');
    expect(screen.getByRole('link', { name: /summary/i })).toHaveClass('is-active');
  });

  it('renders the routed child content via Outlet', () => {
    renderShell('/');
    expect(screen.getByText('Home content')).toBeInTheDocument();
  });

  it('links the Emergency icon to /sos and the bell to /medications', () => {
    renderShell();
    expect(screen.getByRole('link', { name: /emergency/i })).toHaveAttribute('href', '/sos');
    expect(screen.getByRole('link', { name: /medications/i })).toHaveAttribute('href', '/medications');
  });

  it('shows no low-stock dot when med_stock is empty', async () => {
    renderShell();
    const link = screen.getByRole('link', { name: /medications/i });
    await waitFor(() => expect(link.querySelector('.dot')).not.toBeInTheDocument());
  });

  it('shows the low-stock dot when a stock item is low', async () => {
    selectMaybeSingle.mockResolvedValue({ data: [{ qty: 2, doses_per_day: 1 }], error: null });
    renderShell();
    const link = screen.getByRole('link', { name: /medications/i });
    await waitFor(() => expect(link.querySelector('.dot')).toBeInTheDocument());
  });
});
```

- [ ] **Step 7: Run it to verify it fails**

Run: `cd apps/wellness && pnpm test -- AppShell.test.tsx`
Expected: FAIL — `./AppShell` module not found.

- [ ] **Step 8: Implement AppShell**

Create `apps/wellness/src/shell/AppShell.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { injectIconSprite } from '@carebridge/design-system';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';
import { hasLowStockAlert } from '../lib/vitals';

const NAV_ITEMS = [
  { to: '/', label: 'Summary', icon: 'home' },
  { to: '/health', label: 'My Health', icon: 'pulse' },
  { to: '/medications', label: 'My Schedule', icon: 'pill' },
  { to: '/care', label: 'My Care', icon: 'family' },
  { to: '/more', label: 'More', icon: 'more' },
] as const;

export function AppShell() {
  const location = useLocation();
  const { selectedMemberId } = useAuth();
  const [lowStock, setLowStock] = useState(false);

  useEffect(() => {
    injectIconSprite();
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (!selectedMemberId) {
      setLowStock(false);
      return;
    }
    supabase
      .from('med_stock')
      .select('qty, doses_per_day')
      .eq('member_id', selectedMemberId)
      .then(({ data, error }: { data: { qty: number; doses_per_day: number }[] | null; error: unknown }) => {
        if (!isMounted) return;
        setLowStock(!error && !!data && hasLowStockAlert(data));
      });
    return () => {
      isMounted = false;
    };
  }, [selectedMemberId]);

  return (
    <div className="stack">
      <div className="brand-strip">
        <span className="brand-strip__brand">
          <span className="icon">
            <svg>
              <use href="#i-pulse" />
            </svg>
          </span>
          Care Bridge Home
        </span>
        <div className="tbar__actions">
          <Link
            className="iconbtn"
            to="/sos"
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
            aria-label="Emergency SOS"
          >
            <span className="icon">
              <svg>
                <use href="#i-emergency" />
              </svg>
            </span>
          </Link>
          <Link className="iconbtn" to="/medications" aria-label="Medications">
            <span className="icon">
              <svg>
                <use href="#i-bell" />
              </svg>
            </span>
            {lowStock && <span className="dot" />}
          </Link>
          <Link className="avatar-btn" to="/profile" aria-label="Profile">
            <span className="icon">
              <svg>
                <use href="#i-user" />
              </svg>
            </span>
          </Link>
        </div>
      </div>

      <div className="vbody has-nav">
        <Outlet />
      </div>

      <nav className="bnav">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            className={`bnav__i${location.pathname === item.to ? ' is-active' : ''}`}
            to={item.to}
          >
            <span className="ic">
              <span className="icon">
                <svg>
                  <use href={`#i-${item.icon}`} />
                </svg>
              </span>
            </span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
```

- [ ] **Step 9: Run it to verify it passes**

Run: `cd apps/wellness && pnpm test -- AppShell.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 10: Rewire routing and delete the placeholder**

Delete `apps/wellness/src/App.tsx` and `apps/wellness/src/App.test.tsx`.

Replace the full contents of `apps/wellness/src/main.tsx` with:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import '@carebridge/design-system/tokens.css';
import '@carebridge/design-system/components.css';
import '@carebridge/design-system/app.css';
import '@carebridge/design-system/mobile.css';
import { AuthProvider } from './auth/AuthProvider';
import { RedirectIfAuthenticated, RequireAuth, RequireSession } from './auth/RequireAuth';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { LinkMember } from './pages/LinkMember';
import { Home } from './pages/Home';
import { AppShell } from './shell/AppShell';
import { ComingSoon } from './shell/ComingSoon';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<RedirectIfAuthenticated />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>
          <Route element={<RequireSession />}>
            <Route path="/link-member" element={<LinkMember />} />
          </Route>
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<Home />} />
              <Route path="/health" element={<ComingSoon title="My Health" />} />
              <Route path="/medications" element={<ComingSoon title="My Schedule" />} />
              <Route path="/care" element={<ComingSoon title="My Care" />} />
              <Route path="/more" element={<ComingSoon title="More" />} />
              <Route path="/sos" element={<ComingSoon title="Emergency SOS" />} />
              <Route path="/profile" element={<ComingSoon title="Profile" />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
```

Note: this references `./pages/Home`, which Task 3 creates. This task's own build/test run (next step) will fail until Task 3 exists — that's expected and fine within this plan's sequencing; do not create a placeholder `Home` here.

- [ ] **Step 11: Create a temporary placeholder so this task's own tests pass in isolation**

Since `Home.tsx` doesn't exist until Task 3, and this task must be independently testable and committable, create a minimal placeholder now that Task 3 will overwrite:

Create `apps/wellness/src/pages/Home.tsx`:

```tsx
export function Home() {
  return <div className="card">Home</div>;
}
```

- [ ] **Step 12: Run the full wellness test suite and lint**

Run: `cd apps/wellness && pnpm test && pnpm lint`
Expected: all tests pass (including the pre-existing `RequireAuth`, `AuthProvider`, `Login`, `Signup`, `LinkMember`, `routing.integration` suites, unaffected by this change), 0 lint errors.

- [ ] **Step 13: Commit**

```bash
git add packages/design-system/src/mobile.css apps/wellness/src/shell apps/wellness/src/main.tsx apps/wellness/src/pages/Home.tsx
git add apps/wellness/src/App.tsx apps/wellness/src/App.test.tsx
git commit -m "feat(wellness): add authenticated app shell with stub routes"
```

(The `git add` on the two deleted files stages their removal.)

---

### Task 3: Home screen — read-only cards

**Files:**
- Create: `apps/wellness/src/components/GaugeRing.tsx`
- Create: `apps/wellness/src/components/GaugeRing.test.tsx`
- Modify: `apps/wellness/src/pages/Home.tsx` (replace the Task 2 placeholder entirely)
- Create: `apps/wellness/src/pages/Home.test.tsx`

**Interfaces:**
- Consumes: `classifyBloodPressure`, `classifySpo2`, `classifyGlucose`, `Status` type from `apps/wellness/src/lib/vitals.ts` (Task 1). `useAuth()` for `selectedMemberId`. `supabase` for `.from(...).select(...)` queries.
- Produces (used by Task 4, which modifies this same file): the `Home` component's existing `useEffect`/`Promise.all` data-fetch block and its state shape — Task 4 extends both rather than replacing them. Exact state shape defined in Step 4 below.

- [ ] **Step 1: Write the failing GaugeRing test**

Create `apps/wellness/src/components/GaugeRing.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GaugeRing } from './GaugeRing';

describe('GaugeRing', () => {
  it('renders the label text', () => {
    render(<GaugeRing percent={72} colorVar="var(--mint-500)" label="120" />);
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('uses the small size class when size="sm"', () => {
    render(<GaugeRing percent={50} colorVar="var(--mint-500)" label="97" size="sm" />);
    expect(screen.getByText('97').parentElement).toHaveClass('ring--sm');
  });

  it('defaults to the large size class', () => {
    render(<GaugeRing percent={50} colorVar="var(--mint-500)" label="72" />);
    const el = screen.getByText('72').parentElement;
    expect(el).toHaveClass('ring');
    expect(el).not.toHaveClass('ring--sm');
  });

  it('clamps percent into 0-100 for the --p custom property', () => {
    render(<GaugeRing percent={150} colorVar="var(--mint-500)" label="x" />);
    const el = screen.getByText('x').parentElement as HTMLElement;
    expect(el.style.getPropertyValue('--p')).toBe('100');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/wellness && pnpm test -- GaugeRing.test.tsx`
Expected: FAIL — `./GaugeRing` module not found.

- [ ] **Step 3: Implement GaugeRing**

Create `apps/wellness/src/components/GaugeRing.tsx`:

```tsx
import type { CSSProperties } from 'react';

interface GaugeRingProps {
  percent: number;
  colorVar: string;
  label: string;
  size?: 'sm' | 'lg';
}

export function GaugeRing({ percent, colorVar, label, size = 'lg' }: GaugeRingProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const className = size === 'sm' ? 'ring ring--sm' : 'ring';
  const style = { '--p': clamped, '--accent': colorVar } as CSSProperties;

  return (
    <div className={className} style={style}>
      <b>{label}</b>
    </div>
  );
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd apps/wellness && pnpm test -- GaugeRing.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the failing Home tests (read-only cards)**

Create `apps/wellness/src/pages/Home.test.tsx`. This test file covers only what this task builds; Task 4 appends more tests to it for the glucose/BMI cards.

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Home } from './Home';
import { useAuth } from '../auth/useAuth';

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));

const tableResponses: Record<string, { data: unknown; error: unknown }> = {};
const insertCalls: { table: string; payload: unknown }[] = [];
const insertResponses: Record<string, { error: unknown }> = {};

// A generic chainable + thenable query-builder mock: every filter/modifier
// method (select/eq/in/order/limit/maybeSingle) returns the same object, so
// it works regardless of which methods a given real query chains and in
// what order — matching how the real supabase-js query builder behaves
// (each intermediate call is itself awaitable).
function mockTable(table: string) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: () => builder,
    insert: (payload: unknown) => {
      insertCalls.push({ table, payload });
      return Promise.resolve(insertResponses[table] ?? { error: null });
    },
    then: (resolve: (v: { data: unknown; error: unknown }) => void) =>
      resolve(tableResponses[table] ?? { data: null, error: null }),
  };
  return builder;
}

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => mockTable(table)),
  },
}));

describe('Home', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ selectedMemberId: 'm1' } as never);
    for (const key of Object.keys(tableResponses)) delete tableResponses[key];
    for (const key of Object.keys(insertResponses)) delete insertResponses[key];
    insertCalls.length = 0;
    tableResponses.members = { data: { full_name: 'Jane Doe' }, error: null };
  });

  it('shows a loading skeleton before the initial fetch resolves', () => {
    render(<Home />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows the add-profile CTA when no medical profile exists', async () => {
    tableResponses.medical_profile = { data: null, error: null };
    render(<Home />);
    expect(await screen.findByText(/add your health profile/i)).toBeInTheDocument();
  });

  it('shows conditions and allergies when a medical profile exists', async () => {
    tableResponses.medical_profile = {
      data: { conditions: ['Diabetes'], conditions_other: null, allergies: ['Peanuts'] },
      error: null,
    };
    render(<Home />);
    expect(await screen.findByText('Diabetes')).toBeInTheDocument();
    expect(await screen.findByText('Peanuts')).toBeInTheDocument();
  });

  it('shows "No check-in yet" when there is no checkin row', async () => {
    tableResponses.checkins = { data: [], error: null };
    render(<Home />);
    expect(await screen.findByText(/no check-in yet/i)).toBeInTheDocument();
  });

  it('shows the wellness score when a checkin exists', async () => {
    tableResponses.checkins = { data: [{ wellness_score: 72, checkin_date: '2026-08-01' }], error: null };
    render(<Home />);
    expect(await screen.findByText('72')).toBeInTheDocument();
  });

  it('shows a placeholder for the activity row with no query', async () => {
    render(<Home />);
    await waitFor(() => expect(screen.getByText(/jane/)).toBeInTheDocument());
    expect(screen.getAllByText(/connect a wearable/i).length).toBeGreaterThan(0);
  });

  it('renders the greeting with the member first name', async () => {
    render(<Home />);
    expect(await screen.findByText(/good (morning|afternoon|evening), jane/i)).toBeInTheDocument();
  });

  it('shows a dismissible error banner when a fetch fails', async () => {
    tableResponses.medical_profile = { data: null, error: { message: 'network error' } };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<Home />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `cd apps/wellness && pnpm test -- Home.test.tsx`
Expected: FAIL — the Task 2 placeholder `Home` doesn't render any of this content.

- [ ] **Step 7: Implement the Home screen's read-only portion**

Replace the full contents of `apps/wellness/src/pages/Home.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';
import { GaugeRing } from '../components/GaugeRing';
import { classifyBloodPressure, classifyGlucose, classifySpo2 } from '../lib/vitals';

interface MedicalProfile {
  conditions: string[];
  conditions_other: string | null;
  allergies: string[];
}

interface LatestCheckin {
  wellness_score: number | null;
  checkin_date: string;
}

interface VitalRow {
  vital_type: string;
  value: number;
  recorded_at: string;
}

interface LatestGlucose {
  value_mg_dl: number;
  context: 'fasting' | 'pre_meal' | 'post_meal' | 'bedtime';
  reading_date: string;
  reading_time: string;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function latestByType(rows: VitalRow[], vitalType: string): VitalRow | null {
  return rows.filter((r) => r.vital_type === vitalType)[0] ?? null;
}

const RING_COLOR_BY_CHIP: Record<string, string> = {
  'chip2--ok': 'var(--mint-500)',
  'chip2--warn': 'var(--amber-500)',
  'chip2--alert': 'var(--danger)',
};

function ringColorFor(status: { chipClass: string } | null): string {
  return status ? RING_COLOR_BY_CHIP[status.chipClass] : 'var(--neutral-300)';
}

export function Home() {
  const { selectedMemberId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [medicalProfile, setMedicalProfile] = useState<MedicalProfile | null>(null);
  const [checkin, setCheckin] = useState<LatestCheckin | null>(null);
  const [vitals, setVitals] = useState<VitalRow[]>([]);
  const [glucose, setGlucose] = useState<LatestGlucose | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!selectedMemberId) return;

    Promise.all([
      supabase.from('members').select('full_name').eq('id', selectedMemberId).maybeSingle(),
      supabase.from('medical_profile').select('conditions, conditions_other, allergies').eq('member_id', selectedMemberId).maybeSingle(),
      supabase
        .from('checkins')
        .select('wellness_score, checkin_date')
        .eq('member_id', selectedMemberId)
        .order('checkin_date', { ascending: false })
        .limit(1),
      supabase
        .from('vitals_readings')
        .select('vital_type, value, recorded_at')
        .eq('member_id', selectedMemberId)
        .in('vital_type', ['blood_pressure', 'spo2_pct', 'weight_kg', 'height_cm'])
        .order('recorded_at', { ascending: false }),
      supabase
        .from('glucose_readings')
        .select('value_mg_dl, context, reading_date, reading_time')
        .eq('member_id', selectedMemberId)
        .order('reading_date', { ascending: false })
        .order('reading_time', { ascending: false })
        .limit(1),
    ]).then(([membersRes, profileRes, checkinsRes, vitalsRes, glucoseRes]) => {
      if (!isMounted) return;
      setLoading(false);
      const anyError =
        membersRes.error || profileRes.error || checkinsRes.error || vitalsRes.error || glucoseRes.error;
      setFetchError(!!anyError);
      const memberRow = membersRes.data as { full_name: string } | null;
      setFirstName(memberRow ? memberRow.full_name.split(' ')[0] : '');
      setMedicalProfile((profileRes.data as MedicalProfile | null) ?? null);
      const checkinRows = (checkinsRes.data as LatestCheckin[] | null) ?? [];
      setCheckin(checkinRows[0] ?? null);
      setVitals((vitalsRes.data as VitalRow[] | null) ?? []);
      const glucoseRows = (glucoseRes.data as LatestGlucose[] | null) ?? [];
      setGlucose(glucoseRows[0] ?? null);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedMemberId]);

  if (loading) {
    return <div className="card">Loading…</div>;
  }

  const hasMedicalProfile = !!(
    medicalProfile &&
    (medicalProfile.conditions.length > 0 || medicalProfile.conditions_other || medicalProfile.allergies.length > 0)
  );
  const conditionsList = medicalProfile
    ? [...medicalProfile.conditions, ...(medicalProfile.conditions_other ? [medicalProfile.conditions_other] : [])]
    : [];

  const bp = latestByType(vitals, 'blood_pressure');
  const spo2 = latestByType(vitals, 'spo2_pct');
  const bpStatus = bp ? classifyBloodPressure(bp.value) : null;
  const spo2Status = spo2 ? classifySpo2(spo2.value) : null;
  const glucoseStatus = glucose ? classifyGlucose(glucose.value_mg_dl, glucose.context) : null;

  return (
    <>
      {fetchError && (
        <div className="card" role="alert">
          <span>Something went wrong loading your data.</span>
          <button type="button" onClick={() => setFetchError(false)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="tbar">
        <div className="tbar__title">
          <div className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <h1>
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </h1>
        </div>
      </div>

      {hasMedicalProfile ? (
        <div className="card card--flush">
          <div className="kv">
            <div className="kv__row">
              <span className="kv__k">Conditions</span>
              <span className="kv__v">{conditionsList.length ? conditionsList.join(', ') : 'None on file'}</span>
            </div>
            <div className="kv__row">
              <span className="kv__k">Allergies</span>
              <span className="kv__v">
                {medicalProfile && medicalProfile.allergies.length ? medicalProfile.allergies.join(', ') : 'None on file'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <span>Add your health profile</span>
        </div>
      )}

      <div className="hero-card" style={{ textAlign: 'center' }}>
        {checkin ? (
          <GaugeRing percent={checkin.wellness_score ?? 0} colorVar="var(--cyan-500)" label={String(checkin.wellness_score ?? '—')} />
        ) : (
          <>
            <GaugeRing percent={0} colorVar="var(--neutral-300)" label="—" />
            <div>No check-in yet</div>
          </>
        )}
      </div>

      <div className="sec">My vitals</div>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
        <div>
          <GaugeRing percent={bpStatus?.percent ?? 0} colorVar={ringColorFor(bpStatus)} label={bp ? String(bp.value) : '—'} size="sm" />
          <div>Blood pressure</div>
        </div>
        <div>
          <GaugeRing percent={glucoseStatus?.percent ?? 0} colorVar={ringColorFor(glucoseStatus)} label={glucose ? String(glucose.value_mg_dl) : '—'} size="sm" />
          <div>Glucose</div>
        </div>
        <div>
          <GaugeRing percent={spo2Status?.percent ?? 0} colorVar={ringColorFor(spo2Status)} label={spo2 ? String(spo2.value) : '—'} size="sm" />
          <div>SpO2</div>
        </div>
      </div>

      <div className="sec">My activity</div>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
        <div>
          <div>Heart rate</div>
          <div>Connect a wearable to see this</div>
        </div>
        <div>
          <div>Steps</div>
          <div>Connect a wearable to see this</div>
        </div>
        <div>
          <div>Sleep</div>
          <div>Connect a wearable to see this</div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 8: Run it to verify it passes**

Run: `cd apps/wellness && pnpm test -- Home.test.tsx GaugeRing.test.tsx`
Expected: PASS, 12 tests total (8 in Home.test.tsx, 4 in GaugeRing.test.tsx).

- [ ] **Step 9: Run the full wellness test suite and lint**

Run: `cd apps/wellness && pnpm test && pnpm lint`
Expected: all tests pass, 0 lint errors.

- [ ] **Step 10: Commit**

```bash
git add apps/wellness/src/components/GaugeRing.tsx apps/wellness/src/components/GaugeRing.test.tsx
git add apps/wellness/src/pages/Home.tsx apps/wellness/src/pages/Home.test.tsx
git commit -m "feat(wellness): add Home screen read-only cards (profile, score, vitals)"
```

---

### Task 4: Home screen — glucose and BMI logging cards

**Files:**
- Modify: `apps/wellness/src/pages/Home.tsx` (extend the Task 3 data-fetch and add two new cards)
- Modify: `apps/wellness/src/pages/Home.test.tsx` (append tests)

**Interfaces:**
- Consumes: `calculateBmi`, `categorizeBmi`, `glucoseContextLabel`, `GlucoseContext` from `apps/wellness/src/lib/vitals.ts` (Task 1). Task 3's existing `Home` component structure, `latestByType` helper, and `VitalRow` interface (extends the same `vitals` state array already fetched — weight_kg/height_cm were already included in Task 3's query `in` list, so no new query is needed for BMI; only a new `glucose_readings` insert and two new `vitals_readings` inserts are added).

- [ ] **Step 1: Append failing tests to Home.test.tsx**

Add to the bottom of the `describe('Home', ...)` block in `apps/wellness/src/pages/Home.test.tsx` (before the closing `});`):

```tsx
  it('shows the BMI card with weight/height and computed category', async () => {
    tableResponses.vitals_readings = {
      data: [
        { vital_type: 'weight_kg', value: 70.4, recorded_at: '2026-08-01T00:00:00Z' },
        { vital_type: 'height_cm', value: 162, recorded_at: '2026-08-01T00:00:00Z' },
      ],
      error: null,
    };
    render(<Home />);
    expect(await screen.findByText('26.8')).toBeInTheDocument();
    expect(await screen.findByText('Overweight')).toBeInTheDocument();
  });

  it('submits a glucose reading with the correct payload', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<Home />);

    await user.type(await screen.findByLabelText(/blood glucose/i), '118');
    await user.click(screen.getByRole('button', { name: /log glucose reading/i }));

    await waitFor(() =>
      expect(insertCalls).toContainEqual({
        table: 'glucose_readings',
        payload: expect.objectContaining({ member_id: 'm1', value_mg_dl: 118, context: 'post_meal' }),
      }),
    );
  });

  it('submits weight and height as two vitals_readings inserts', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<Home />);

    await user.type(await screen.findByLabelText(/^weight$/i), '70.4');
    await user.type(screen.getByLabelText(/^height$/i), '162');
    await user.click(screen.getByRole('button', { name: /log body reading/i }));

    await waitFor(() => {
      expect(insertCalls).toContainEqual({
        table: 'vitals_readings',
        payload: expect.objectContaining({ member_id: 'm1', vital_type: 'weight_kg', value: 70.4, source: 'manual' }),
      });
      expect(insertCalls).toContainEqual({
        table: 'vitals_readings',
        payload: expect.objectContaining({ member_id: 'm1', vital_type: 'height_cm', value: 162, source: 'manual' }),
      });
    });
  });

  it('shows an inline error when the glucose submit fails', async () => {
    insertResponses.glucose_readings = { error: { message: 'insert failed' } };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<Home />);

    await user.type(await screen.findByLabelText(/blood glucose/i), '118');
    await user.click(screen.getByRole('button', { name: /log glucose reading/i }));

    expect(await screen.findByText(/couldn.t save that reading/i)).toBeInTheDocument();
  });

  it('shows an inline error when the BMI submit fails', async () => {
    insertResponses.vitals_readings = { error: { message: 'insert failed' } };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<Home />);

    await user.type(await screen.findByLabelText(/^weight$/i), '70.4');
    await user.type(screen.getByLabelText(/^height$/i), '162');
    await user.click(screen.getByRole('button', { name: /log body reading/i }));

    expect(await screen.findByText(/couldn.t save that reading/i)).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run it to verify the new tests fail**

Run: `cd apps/wellness && pnpm test -- Home.test.tsx`
Expected: FAIL — no BMI card, no glucose/BMI forms exist yet.

- [ ] **Step 3: Extend Home.tsx with the glucose and BMI cards**

In `apps/wellness/src/pages/Home.tsx`:

Add to the imports:

```tsx
import { calculateBmi, categorizeBmi, classifyBloodPressure, classifyGlucose, classifySpo2, glucoseContextLabel, type GlucoseContext } from '../lib/vitals';
```

(replacing the Task 3 import line that only pulled in the three `classify*` functions).

Add two new pieces of state inside the `Home` component, alongside the existing `useState` calls:

```tsx
  const [glucoseInput, setGlucoseInput] = useState('');
  const [glucoseContext, setGlucoseContext] = useState<GlucoseContext>('post_meal');
  const [glucoseError, setGlucoseError] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [bmiError, setBmiError] = useState(false);
```

After the existing `Promise.all(...).then(...)` block's body, before `setGlucose(glucoseRows[0] ?? null);`, no change needed there — but add these two lines right after it, still inside the `.then` callback, to seed the form inputs from the latest readings once loaded:

```tsx
      const weightRow = ((vitalsRes.data as VitalRow[] | null) ?? []).find((r) => r.vital_type === 'weight_kg');
      const heightRow = ((vitalsRes.data as VitalRow[] | null) ?? []).find((r) => r.vital_type === 'height_cm');
      if (weightRow) setWeightInput(String(weightRow.value));
      if (heightRow) setHeightInput(String(heightRow.value));
```

Add two handler functions after the `useEffect` block, before the `return`:

```tsx
  const logGlucose = async () => {
    const value = parseFloat(glucoseInput);
    if (!value || !selectedMemberId) return;
    setGlucoseError(false);
    const now = new Date();
    const { error } = await supabase.from('glucose_readings').insert({
      member_id: selectedMemberId,
      reading_date: now.toISOString().slice(0, 10),
      reading_time: now.toTimeString().slice(0, 5),
      value_mg_dl: value,
      context: glucoseContext,
    });
    if (error) {
      setGlucoseError(true);
      return;
    }
    setGlucoseInput('');
    setGlucose({ value_mg_dl: value, context: glucoseContext, reading_date: now.toISOString().slice(0, 10), reading_time: now.toTimeString().slice(0, 5) });
  };

  const logBodyReading = async () => {
    const weight = parseFloat(weightInput);
    const height = parseFloat(heightInput);
    if (!weight || !height || !selectedMemberId) return;
    setBmiError(false);
    const now = new Date().toISOString();
    const results = await Promise.all([
      supabase.from('vitals_readings').insert({ member_id: selectedMemberId, vital_type: 'weight_kg', value: weight, source: 'manual', recorded_at: now }),
      supabase.from('vitals_readings').insert({ member_id: selectedMemberId, vital_type: 'height_cm', value: height, source: 'manual', recorded_at: now }),
    ]);
    if (results.some((r) => r.error)) {
      setBmiError(true);
      return;
    }
    setVitals((prev) => [
      { vital_type: 'weight_kg', value: weight, recorded_at: now },
      { vital_type: 'height_cm', value: height, recorded_at: now },
      ...prev.filter((r) => r.vital_type !== 'weight_kg' && r.vital_type !== 'height_cm'),
    ]);
  };
```

Add two new pieces of derived state right after the existing `glucoseStatus` line:

```tsx
  const weightRow = latestByType(vitals, 'weight_kg');
  const heightRow = latestByType(vitals, 'height_cm');
  const bmi = weightRow && heightRow ? calculateBmi(weightRow.value, heightRow.value) : null;
  const bmiCategory = bmi !== null ? categorizeBmi(bmi) : null;
```

Add two new cards at the end of the returned JSX, immediately before the closing `</>`:

```tsx
      <div className="sec">BLOOD GLUCOSE</div>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div>{glucose ? `${glucose.value_mg_dl} mg/dL` : '—'}</div>
            <div>{glucose ? `${glucoseContextLabel(glucose.context)} · logged ${glucose.reading_date}` : 'No readings yet'}</div>
          </div>
          {glucoseStatus && <span className={`chip2 ${glucoseStatus.chipClass}`}>{glucoseStatus.label}</span>}
        </div>
        <div className="seg">
          {(['fasting', 'pre_meal', 'post_meal', 'bedtime'] as const).map((ctx) => (
            <button
              key={ctx}
              type="button"
              className={glucoseContext === ctx ? 'is-active' : ''}
              onClick={() => setGlucoseContext(ctx)}
            >
              {glucoseContextLabel(ctx)}
            </button>
          ))}
        </div>
        <div className="vin">
          <label htmlFor="glucose-input">Blood glucose</label>
          <div className="r">
            <input
              id="glucose-input"
              type="number"
              step="1"
              value={glucoseInput}
              onChange={(e) => setGlucoseInput(e.target.value)}
            />
            <span className="u">mg/dL</span>
          </div>
        </div>
        <button
          className="mbtn mbtn--fill mbtn--block mbtn--sm"
          type="button"
          aria-label="Log glucose reading"
          onClick={logGlucose}
        >
          Log reading
        </button>
        {glucoseError && (
          <p className="form-error" role="alert">
            Couldn&apos;t save that reading — try again.
          </p>
        )}
      </div>

      <div className="sec">MY BODY</div>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div>{bmi !== null ? bmi : '—'}</div>
            <div>
              {weightRow && heightRow ? `${weightRow.value} kg · ${heightRow.value} cm` : 'No readings yet'}
            </div>
          </div>
          {bmiCategory && <span className={`chip2 ${bmiCategory.chipClass}`}>{bmiCategory.label}</span>}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div className="vin" style={{ flex: 1 }}>
            <label htmlFor="weight-input">Weight</label>
            <div className="r">
              <input
                id="weight-input"
                type="number"
                step="0.1"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
              />
              <span className="u">kg</span>
            </div>
          </div>
          <div className="vin" style={{ flex: 1 }}>
            <label htmlFor="height-input">Height</label>
            <div className="r">
              <input
                id="height-input"
                type="number"
                step="1"
                value={heightInput}
                onChange={(e) => setHeightInput(e.target.value)}
              />
              <span className="u">cm</span>
            </div>
          </div>
        </div>
        <button
          className="mbtn mbtn--fill mbtn--block mbtn--sm"
          type="button"
          aria-label="Log body reading"
          onClick={logBodyReading}
        >
          Log reading
        </button>
        {bmiError && (
          <p className="form-error" role="alert">
            Couldn&apos;t save that reading — try again.
          </p>
        )}
      </div>
```

- [ ] **Step 4: Run it to verify the tests pass**

Run: `cd apps/wellness && pnpm test -- Home.test.tsx`
Expected: PASS, 13 tests total (8 from Task 3 + 5 new: BMI card display, glucose submit payload, weight/height submit payload, glucose submit failure, BMI submit failure).

- [ ] **Step 5: Run the full wellness test suite, lint, and build**

Run: `cd apps/wellness && pnpm test && pnpm lint && pnpm build`
Expected: all tests pass, 0 lint errors, build succeeds.

- [ ] **Step 6: Run the full monorepo pipeline from repo root**

Run: `pnpm lint && pnpm test && pnpm build && pnpm format:check`
Expected: all green across all 4 workspace packages.

- [ ] **Step 7: Commit**

```bash
git add apps/wellness/src/pages/Home.tsx apps/wellness/src/pages/Home.test.tsx
git commit -m "feat(wellness): add glucose and BMI logging cards to Home"
```
