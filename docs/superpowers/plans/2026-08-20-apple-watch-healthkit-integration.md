# Apple Watch HealthKit Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Read heart rate and SpO2 samples the Apple Watch already records passively into HealthKit, get them into `wearable_readings` via a new ingestion Edge Function, and show them on the Wellness App's Health screen.

**Architecture:** A custom native Capacitor plugin (`HealthKitBridge`) requests read-only HealthKit access and streams new HR/SpO2 samples to JS via observer queries with background delivery. The JS side batches samples and POSTs them, authenticated as the signed-in member, to a new `ingest-wearable` Edge Function, which verifies the member owns the `member_id` before writing (via `member_links`, using its own service-role client to bypass RLS after that check — the existing `wearable_readings` policy has no client-writable path by design). The Health screen adds a Heart Rate row and merges Watch-sourced SpO2 into the existing SpO2 row.

**Tech Stack:** Swift/HealthKit (native iOS plugin), Capacitor 8 (`registerPlugin`), TypeScript/React (Wellness app), Deno Edge Function, Supabase Postgres (existing `wearable_readings`/`member_links` tables), Vitest.

**Spec:** `docs/superpowers/specs/2026-08-20-apple-watch-healthkit-integration-design.md`

## Global Constraints

- Vitals only (heart rate, SpO2) — no fall detection, no watchOS app target, no live watch-face display.
- HealthKit access is **read-only** — this integration never writes to HealthKit.
- `ingest-wearable` takes the member's own user JWT, not a service_role JWT — different trust model than `send-push`/`send-email`.
- `reading_type` is server-side allowlisted to exactly `heart_rate`/`spo2`; `device_vendor` is server-hardcoded to `'apple_watch'`, never client-supplied.
- Ships to Santhosh's own device only — no feature flag, no other pilot family has hardware yet.

---

### Task 1: Enable HealthKit capability and entitlements

**Files:**
- Modify: `apps/wellness/ios/App/App/App.entitlements`
- Modify: `apps/wellness/ios/App/App/Info.plist`

**Interfaces:**
- Produces: `com.apple.developer.healthkit` + `com.apple.developer.healthkit.background-delivery` entitlements available to later native code; `NSHealthShareUsageDescription` satisfies the OS permission-prompt requirement.

- [ ] **Step 1: Check whether HealthKit capability is enabled on the App ID**

The push-notification work in this repo hit exactly this gap once already (App ID capability unchecked in the Apple Developer portal even though the local entitlements file requested it, causing a silent hang with no error). Before writing any Swift, check `https://developer.apple.com/account/resources/identifiers/list` → `com.carebridgehome.wellness` → Capabilities → search "HealthKit". If unchecked, check it and Confirm (this invalidates the provisioning profile, which `xcodebuild -allowProvisioningUpdates` regenerates automatically on next build — same as the push fix).

- [ ] **Step 2: Add HealthKit entitlements**

Add to `apps/wellness/ios/App/App/App.entitlements` (alongside the existing `aps-environment` key):

```xml
<key>com.apple.developer.healthkit</key>
<true/>
<key>com.apple.developer.healthkit.background-delivery</key>
<true/>
```

- [ ] **Step 3: Add the HealthKit usage-description string**

Add to `apps/wellness/ios/App/App/Info.plist`, as a sibling of the existing top-level keys:

```xml
<key>NSHealthShareUsageDescription</key>
<string>Care Bridge Home reads your heart rate and blood oxygen from Health to keep your care team informed.</string>
```

- [ ] **Step 4: Commit**

```bash
git add apps/wellness/ios/App/App/App.entitlements apps/wellness/ios/App/App/Info.plist
git commit -m "feat(healthkit): add entitlements and usage description for HealthKit read access"
```

---

### Task 2: `ingest-wearable` Edge Function

**Files:**
- Create: `supabase/functions/ingest-wearable/index.ts`

**Interfaces:**
- Consumes: `member_links(member_id, user_id)`, `wearable_readings(member_id, device_vendor, device_id, reading_type, value, raw_payload, recorded_at)` (both existing tables, no migration needed — RLS already has no client-writable insert path, by design).
- Produces: `POST /functions/v1/ingest-wearable` accepting a member's own user JWT, body `{ member_id: string; readings: { reading_type: 'heart_rate' | 'spo2'; value: number; recorded_at: string }[] }`, returning `{ ok: boolean; inserted: number }` on success.

- [ ] **Step 1: Write the function**

```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Phase C wearable ingestion. Different trust model than send-push/send-email:
// those are service_role-only-caller functions, invoked only by privileged
// server-side code. This function's legitimate caller IS the member's own
// phone, reporting the member's own HealthKit data -- so it takes the
// member's normal user JWT, not a service_role JWT. It verifies which
// member_id that user is linked to before writing, then uses its own
// service_role client to bypass RLS (wearable_readings deliberately has no
// client-writable insert policy) -- same check-first-then-bypass shape as
// erase-consent-withdrawal.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const ALLOWED_READING_TYPES = new Set(['heart_rate', 'spo2']);

interface ReadingInput {
  reading_type: string;
  value: number;
  recorded_at: string;
}

interface IngestRequest {
  member_id: string;
  readings: ReadingInput[];
}

function isValidReading(r: unknown): r is ReadingInput {
  if (typeof r !== 'object' || r === null) return false;
  const candidate = r as Record<string, unknown>;
  return (
    typeof candidate.reading_type === 'string' &&
    ALLOWED_READING_TYPES.has(candidate.reading_type) &&
    typeof candidate.value === 'number' &&
    Number.isFinite(candidate.value) &&
    typeof candidate.recorded_at === 'string' &&
    !Number.isNaN(Date.parse(candidate.recorded_at))
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'method not allowed' }), {
        status: 405,
        headers: corsHeaders,
      });
    }

    // Extract the caller's user id from their (platform-verified) JWT --
    // the gateway's own verify_jwt has already checked the signature before
    // this code runs, same trust boundary send-push/send-email rely on for
    // the `role` claim; here we trust `sub` the same way.
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    const claimsSegment = jwt.split('.')[1];
    let callerId: string | undefined;
    try {
      callerId = claimsSegment
        ? JSON.parse(atob(claimsSegment.replace(/-/g, '+').replace(/_/g, '/')))?.sub
        : undefined;
    } catch {
      callerId = undefined;
    }
    if (!callerId) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const body = (await req.json()) as IngestRequest;
    if (!body.member_id || !Array.isArray(body.readings) || body.readings.length === 0) {
      return new Response(
        JSON.stringify({ error: 'member_id and a non-empty readings array are required' }),
        { status: 400, headers: corsHeaders },
      );
    }
    if (!body.readings.every(isValidReading)) {
      return new Response(
        JSON.stringify({ error: 'every reading needs a valid reading_type, numeric value, and recorded_at' }),
        { status: 400, headers: corsHeaders },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Ownership check: the caller may only ingest readings for a member
    // they're actually linked to, never an arbitrary id.
    const { data: link, error: linkError } = await adminClient
      .from('member_links')
      .select('member_id')
      .eq('user_id', callerId)
      .eq('member_id', body.member_id)
      .maybeSingle();
    if (linkError) {
      return new Response(JSON.stringify({ error: linkError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }
    if (!link) {
      return new Response(JSON.stringify({ error: 'not linked to this member' }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const rows = body.readings.map((r) => ({
      member_id: body.member_id,
      device_vendor: 'apple_watch',
      device_id: null,
      reading_type: r.reading_type,
      value: r.value,
      recorded_at: r.recorded_at,
    }));

    const { error: insertError } = await adminClient.from('wearable_readings').insert(rows);
    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ ok: true, inserted: rows.length }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
```

- [ ] **Step 2: Deploy**

```bash
supabase functions deploy ingest-wearable --project-ref bbthbboakoicoyiuclll
```

- [ ] **Step 3: Smoke-test with a real member JWT — valid case**

Get a real member's access token (e.g. from the app's own session, or `supabase.auth.signInWithPassword` against the hosted project for a known test account) and their linked `member_id`, then:

```bash
curl -s -X POST "https://bbthbboakoicoyiuclll.supabase.co/functions/v1/ingest-wearable" \
  -H "Authorization: Bearer <member_access_token>" \
  -H "Content-Type: application/json" \
  -d '{"member_id":"<their-member-id>","readings":[{"reading_type":"heart_rate","value":72,"recorded_at":"2026-08-20T04:00:00Z"}]}'
```

Expected: `{"ok":true,"inserted":1}`. Confirm the row landed:

```bash
curl -s "https://bbthbboakoicoyiuclll.supabase.co/rest/v1/wearable_readings?select=*&member_id=eq.<their-member-id>&order=recorded_at.desc&limit=1" \
  -H "apikey: <service_role_key>" -H "Authorization: Bearer <service_role_key>"
```

- [ ] **Step 4: Smoke-test the ownership check — wrong member**

Same request, but with a `member_id` the caller is *not* linked to. Expected: `403`, `{"error":"not linked to this member"}`.

- [ ] **Step 5: Smoke-test input validation — bad reading_type**

Same valid member, but `"reading_type":"steps"`. Expected: `400`.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/ingest-wearable/index.ts
git commit -m "feat(wearable): add ingest-wearable Edge Function"
```

---

### Task 3: Native HealthKit bridge plugin (Swift)

**Files:**
- Create: `apps/wellness/ios/App/App/HealthKitBridge.swift`
- Create: `apps/wellness/ios/App/App/HealthKitBridgePlugin.swift`

**Interfaces:**
- Produces: a Capacitor plugin registered as JS name `HealthKitBridge` with methods `requestAuthorization() -> Promise<{granted: boolean}>` and `startObserving() -> Promise<void>`, and a `healthKitSamples` event carrying `{ readings: { reading_type: 'heart_rate' | 'spo2'; value: number; recorded_at: string }[] }`.

- [ ] **Step 1: Write the HealthKit logic**

```swift
import Foundation
import HealthKit

struct HealthKitReading {
    let readingType: String
    let value: Double
    let recordedAt: Date
}

final class HealthKitBridge {
    private let store = HKHealthStore()
    private let heartRateType = HKQuantityType(.heartRate)
    private let spo2Type = HKQuantityType(.oxygenSaturation)

    // Anchors persist which samples have already been emitted, so a
    // relaunch resumes from the last-seen sample instead of re-emitting
    // history. UserDefaults is the same underlying storage Capacitor's own
    // Preferences plugin uses on iOS -- this just talks to it directly
    // rather than round-tripping the JS bridge for an internal detail.
    private let defaults = UserDefaults.standard
    private func anchorKey(for type: HKQuantityType) -> String {
        "healthkit_anchor_\(type.identifier)"
    }

    private func loadAnchor(for type: HKQuantityType) -> HKQueryAnchor? {
        guard let data = defaults.data(forKey: anchorKey(for: type)) else { return nil }
        return try? NSKeyedUnarchiver.unarchivedObject(ofClass: HKQueryAnchor.self, from: data)
    }

    private func saveAnchor(_ anchor: HKQueryAnchor?, for type: HKQuantityType) {
        guard let anchor = anchor,
              let data = try? NSKeyedArchiver.archivedData(withRootObject: anchor, requiringSecureCoding: true)
        else { return }
        defaults.set(data, forKey: anchorKey(for: type))
    }

    func requestAuthorization(completion: @escaping (Bool, Error?) -> Void) {
        guard HKHealthStore.isHealthDataAvailable() else {
            completion(false, nil)
            return
        }
        let readTypes: Set<HKObjectType> = [heartRateType, spo2Type]
        store.requestAuthorization(toShare: [], read: readTypes) { granted, error in
            completion(granted, error)
        }
    }

    // Calls back on every new batch of samples for either type, forever,
    // until the process ends -- background delivery wakes the app for this.
    func startObserving(onBatch: @escaping ([HealthKitReading]) -> Void) {
        observe(type: heartRateType, readingType: "heart_rate", onBatch: onBatch)
        observe(type: spo2Type, readingType: "spo2", onBatch: onBatch)
    }

    private func observe(type: HKQuantityType, readingType: String, onBatch: @escaping ([HealthKitReading]) -> Void) {
        let observerQuery = HKObserverQuery(sampleType: type, predicate: nil) { [weak self] _, completionHandler, _ in
            self?.fetchNewSamples(type: type, readingType: readingType, onBatch: onBatch)
            completionHandler()
        }
        store.execute(observerQuery)
        store.enableBackgroundDelivery(for: type, frequency: .immediate) { _, _ in }
    }

    private func fetchNewSamples(
        type: HKQuantityType,
        readingType: String,
        onBatch: @escaping ([HealthKitReading]) -> Void
    ) {
        let anchor = loadAnchor(for: type)
        let query = HKAnchoredObjectQuery(
            type: type,
            predicate: nil,
            anchor: anchor,
            limit: HKObjectQueryNoLimit
        ) { [weak self] _, samples, _, newAnchor, _ in
            guard let self, let quantitySamples = samples as? [HKQuantitySample], !quantitySamples.isEmpty else { return }

            let unit: HKUnit = readingType == "heart_rate"
                ? HKUnit.count().unitDivided(by: .minute())
                : HKUnit.percent()
            let scale = readingType == "spo2" ? 100.0 : 1.0 // fraction -> percent

            let readings = quantitySamples.map {
                HealthKitReading(
                    readingType: readingType,
                    value: $0.quantity.doubleValue(for: unit) * scale,
                    recordedAt: $0.startDate
                )
            }
            self.saveAnchor(newAnchor, for: type)
            onBatch(readings)
        }
        store.execute(query)
    }
}
```

- [ ] **Step 2: Write the plugin wrapper**

```swift
import Foundation
import Capacitor

@objc(HealthKitBridgePlugin)
public class HealthKitBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthKitBridgePlugin"
    public let jsName = "HealthKitBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startObserving", returnType: CAPPluginReturnPromise),
    ]

    private let bridge = HealthKitBridge()
    private let isoFormatter = ISO8601DateFormatter()

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        bridge.requestAuthorization { granted, error in
            if let error = error {
                call.reject(error.localizedDescription)
            } else {
                call.resolve(["granted": granted])
            }
        }
    }

    @objc func startObserving(_ call: CAPPluginCall) {
        bridge.startObserving { [weak self] readings in
            guard let self else { return }
            let payload = readings.map { reading -> [String: Any] in
                [
                    "reading_type": reading.readingType,
                    "value": reading.value,
                    "recorded_at": self.isoFormatter.string(from: reading.recordedAt),
                ]
            }
            self.notifyListeners("healthKitSamples", data: ["readings": payload])
        }
        call.resolve()
    }
}
```

- [ ] **Step 3: Verify the plugin registers**

Build for the connected device (same command used for the push fix):

```bash
cd apps/wellness/ios/App && xcodebuild -project App.xcodeproj -scheme App -configuration Debug -destination "id=<device-id>" -allowProvisioningUpdates build 2>&1 | tail -20
```

Expected: `** BUILD SUCCEEDED **`, with no "Push Notifications" or "HealthKit" entitlement mismatch warnings — if the App ID capability from Task 1 wasn't actually saved, this build (or the codesign step) surfaces it now, same as the earlier push bug.

- [ ] **Step 4: Commit**

```bash
git add apps/wellness/ios/App/App/HealthKitBridge.swift apps/wellness/ios/App/App/HealthKitBridgePlugin.swift
git commit -m "feat(healthkit): add native HealthKit read plugin (HR + SpO2, background delivery)"
```

---

### Task 4: JS bridge (`healthkit.ts`) with batching

**Files:**
- Create: `apps/wellness/src/lib/healthkit.ts`
- Create: `apps/wellness/src/lib/healthkit.test.ts`
- Modify: `apps/wellness/package.json` (add `@capacitor/app`)

**Interfaces:**
- Consumes: native plugin `HealthKitBridge` (Task 3): `requestAuthorization()`, `startObserving()`, `addListener('healthKitSamples', ...)`; `supabase` client (`apps/wellness/src/lib/supabase.ts`); `@capacitor/app`'s `App.addListener('appStateChange', ...)`.
- Produces: `registerHealthKit(userId: string, memberId: string): Promise<void>`, called once per signed-in session — same shape as `registerPushToken` in `push.ts`.

- [ ] **Step 1: Install `@capacitor/app`**

```bash
cd apps/wellness && pnpm add @capacitor/app
```

- [ ] **Step 2: Write the failing test**

```typescript
// apps/wellness/src/lib/healthkit.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Capacitor, registerPlugin } from '@capacitor/core';

const listeners: Record<string, (data: unknown) => void> = {};
const mockPlugin = {
  requestAuthorization: vi.fn(),
  startObserving: vi.fn(),
  addListener: vi.fn((eventName: string, cb: (data: unknown) => void) => {
    listeners[eventName] = cb;
    return Promise.resolve({ remove: vi.fn() });
  }),
};

vi.mock('@capacitor/core', async () => {
  const actual = await vi.importActual<typeof import('@capacitor/core')>('@capacitor/core');
  return {
    ...actual,
    Capacitor: { isNativePlatform: vi.fn(() => true) },
    registerPlugin: vi.fn(() => mockPlugin),
  };
});

const appListeners: Record<string, (state: { isActive: boolean }) => void> = {};
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn((eventName: string, cb: (state: { isActive: boolean }) => void) => {
      appListeners[eventName] = cb;
      return Promise.resolve({ remove: vi.fn() });
    }),
  },
}));

const invokeMock = vi.fn();
vi.mock('./supabase', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invokeMock(...args) } },
}));

import { registerHealthKit, __resetHealthKitStateForTests, FLUSH_BATCH_SIZE } from './healthkit';

describe('registerHealthKit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(listeners)) delete listeners[key];
    for (const key of Object.keys(appListeners)) delete appListeners[key];
    __resetHealthKitStateForTests();
    mockPlugin.requestAuthorization.mockResolvedValue({ granted: true });
    mockPlugin.startObserving.mockResolvedValue(undefined);
    invokeMock.mockResolvedValue({ data: { ok: true, inserted: 0 }, error: null });
  });

  it('is a no-op on a non-native platform', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    await registerHealthKit('user-1', 'member-1');
    expect(mockPlugin.requestAuthorization).not.toHaveBeenCalled();
  });

  it('requests authorization and starts observing on a native platform', async () => {
    await registerHealthKit('user-1', 'member-1');
    expect(mockPlugin.requestAuthorization).toHaveBeenCalled();
    expect(mockPlugin.startObserving).toHaveBeenCalled();
  });

  it('does not start observing when authorization is denied', async () => {
    mockPlugin.requestAuthorization.mockResolvedValue({ granted: false });
    await registerHealthKit('user-1', 'member-1');
    expect(mockPlugin.startObserving).not.toHaveBeenCalled();
  });

  it('flushes once the batch reaches FLUSH_BATCH_SIZE readings', async () => {
    await registerHealthKit('user-1', 'member-1');
    const readings = Array.from({ length: FLUSH_BATCH_SIZE }, (_, i) => ({
      reading_type: 'heart_rate',
      value: 70 + i,
      recorded_at: '2026-08-20T04:00:00Z',
    }));
    listeners.healthKitSamples({ readings });
    await Promise.resolve();
    await Promise.resolve();
    expect(invokeMock).toHaveBeenCalledWith('ingest-wearable-wrong-name', expect.anything());
  });
});
```

Note: that last assertion's function name is deliberately wrong (`'ingest-wearable-wrong-name'`) — it exists only to prove step 3's "run and verify it fails" step actually fails on real content, not just on a missing export. Step 4 replaces it with the real assertion once the implementation exists.

- [ ] **Step 3: Run to verify it fails**

```bash
cd apps/wellness && pnpm test healthkit.test.ts
```

Expected: FAIL (module `./healthkit` doesn't exist yet).

- [ ] **Step 4: Fix the deliberate-fail assertion, then implement**

Replace the wrong assertion from Step 2 with the real one:

```typescript
    expect(invokeMock).toHaveBeenCalledWith('ingest-wearable', {
      body: { member_id: 'member-1', readings },
    });
```

Now write the implementation:

```typescript
// apps/wellness/src/lib/healthkit.ts
import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import * as Sentry from '@sentry/react';
import { supabase } from './supabase';

// Read-only HealthKit integration: streams new heart-rate/SpO2 samples from
// the native HealthKitBridge plugin (apps/wellness/ios/App/App/HealthKitBridge.swift)
// into ingest-wearable. Never writes to HealthKit. Best-effort, same posture
// as push.ts -- a member may not own a Watch at all, so permission denial or
// any failure here must never block the app.

export const FLUSH_BATCH_SIZE = 20;

interface HealthKitReading {
  reading_type: 'heart_rate' | 'spo2';
  value: number;
  recorded_at: string;
}

interface HealthKitBridgePlugin {
  requestAuthorization(): Promise<{ granted: boolean }>;
  startObserving(): Promise<void>;
  addListener(
    eventName: 'healthKitSamples',
    listenerFunc: (data: { readings: HealthKitReading[] }) => void,
  ): Promise<{ remove: () => void }>;
}

const HealthKitBridge = registerPlugin<HealthKitBridgePlugin>('HealthKitBridge');

let queue: HealthKitReading[] = [];
let activeUserId: string | null = null;
let activeMemberId: string | null = null;
let listenersAttached = false;

export function __resetHealthKitStateForTests(): void {
  queue = [];
  activeUserId = null;
  activeMemberId = null;
  listenersAttached = false;
}

async function flush(): Promise<void> {
  if (queue.length === 0 || !activeMemberId) return;
  const batch = queue;
  queue = [];

  const { data, error } = await supabase.functions.invoke('ingest-wearable', {
    body: { member_id: activeMemberId, readings: batch },
  });
  if (error || !data?.ok) {
    console.error('Failed to ingest wearable readings:', error ?? data);
    Sentry.captureException(error ?? new Error('ingest-wearable returned not-ok'));
  }
}

function attachListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;

  void HealthKitBridge.addListener('healthKitSamples', (data) => {
    queue.push(...data.readings);
    if (queue.length >= FLUSH_BATCH_SIZE) {
      void flush();
    }
  });

  void App.addListener('appStateChange', (state) => {
    if (!state.isActive) {
      void flush();
    }
  });
}

// Called once per signed-in session (see AuthProvider), same call-site shape
// as registerPushToken. No-op on the web build.
export async function registerHealthKit(userId: string, memberId: string): Promise<void> {
  activeUserId = userId;
  activeMemberId = memberId;

  if (!Capacitor.isNativePlatform()) return;

  attachListeners();

  try {
    const { granted } = await HealthKitBridge.requestAuthorization();
    if (!granted) return;
    await HealthKitBridge.startObserving();
  } catch (error) {
    console.error('HealthKit registration failed:', error);
    Sentry.captureException(error);
  }
}
```

- [ ] **Step 5: Run to verify it passes**

```bash
cd apps/wellness && pnpm test healthkit.test.ts
```

Expected: PASS, all 4 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/wellness/package.json apps/wellness/pnpm-lock.yaml apps/wellness/src/lib/healthkit.ts apps/wellness/src/lib/healthkit.test.ts
git commit -m "feat(healthkit): add JS bridge with batched ingestion"
```

---

### Task 5: Wire registration into `AuthProvider`

**Files:**
- Modify: `apps/wellness/src/auth/AuthProvider.tsx:1-10` (imports), `:161-169` (push registration effect)

**Interfaces:**
- Consumes: `registerHealthKit(userId, memberId)` from Task 4.

- [ ] **Step 1: Add the import**

In `apps/wellness/src/auth/AuthProvider.tsx`, next to the existing `registerPushToken` import:

```typescript
import { registerHealthKit } from '../lib/healthkit';
```

- [ ] **Step 2: Add the registration effect**

Immediately after the existing push-registration `useEffect` (around line 165-169), add a parallel effect — HealthKit needs `selectedMemberId`, not just `session.user.id`, since readings are ingested per-member:

```typescript
  // HealthKit registration mirrors the push-registration effect above: best-
  // effort, independent of the auth-loading critical path, never blocks the
  // app. Needs selectedMemberId (not just the session) since readings are
  // ingested against a specific member.
  useEffect(() => {
    const userId = session?.user.id;
    if (!userId || !selectedMemberId) return;
    void registerHealthKit(userId, selectedMemberId);
  }, [session?.user.id, selectedMemberId]);
```

- [ ] **Step 3: Run the existing AuthProvider-adjacent tests to confirm nothing broke**

```bash
cd apps/wellness && pnpm test
```

Expected: PASS. Neither `routing.integration.test.tsx` nor `AuthProvider.test.tsx` mocks `push.ts` today — `registerPushToken`'s own `Capacitor.isNativePlatform()` guard already makes it a safe no-op under JSDOM (always `false` outside a native shell), and `registerHealthKit` uses the identical guard, so no new mock is needed for this to pass.

- [ ] **Step 4: Commit**

```bash
git add apps/wellness/src/auth/AuthProvider.tsx
git commit -m "feat(healthkit): register HealthKit observation on signed-in session"
```

---

### Task 6: `classifyHeartRate`

**Files:**
- Modify: `apps/wellness/src/lib/vitals.ts`
- Modify: `apps/wellness/src/lib/vitals.test.ts`

**Interfaces:**
- Produces: `classifyHeartRate(value: number): Status` — same `Status` shape (`{ label, chipClass, percent }`) as `classifyBloodPressure`.

- [ ] **Step 1: Write the failing tests**

Add to `apps/wellness/src/lib/vitals.test.ts`, alongside the existing `classifyBloodPressure`/`classifySpo2` describe blocks:

```typescript
describe('classifyHeartRate', () => {
  it('is Low below 60', () => {
    expect(classifyHeartRate(55)).toEqual({ label: 'Low', chipClass: 'chip2--warn', percent: 31 });
  });
  it('is Normal from 60 to 100', () => {
    expect(classifyHeartRate(72)).toEqual({ label: 'Normal', chipClass: 'chip2--ok', percent: 40 });
  });
  it('is High above 100', () => {
    expect(classifyHeartRate(110)).toEqual({ label: 'High', chipClass: 'chip2--warn', percent: 61 });
  });
  it('clamps the gauge fill above the 180 ceiling', () => {
    expect(classifyHeartRate(220).percent).toBe(100);
  });
});
```

Add `classifyHeartRate` to the existing import list at the top of the file.

- [ ] **Step 2: Run to verify it fails**

```bash
cd apps/wellness && pnpm test vitals.test.ts
```

Expected: FAIL (`classifyHeartRate` is not exported).

- [ ] **Step 3: Implement**

Add to `apps/wellness/src/lib/vitals.ts`, next to `classifySpo2`:

```typescript
// Resting heart rate outside 60-100 bpm can be a normal variation
// (fitness, medication, transient exertion caught by a continuous
// wearable sample) rather than an acute problem the way a single high BP
// reading can be -- warn, not alert, on both bounds.
export function classifyHeartRate(value: number): Status {
  const percent = Math.round((Math.min(value, 180) / 180) * 100);
  if (value < 60) return { label: 'Low', chipClass: 'chip2--warn', percent };
  if (value <= 100) return { label: 'Normal', chipClass: 'chip2--ok', percent };
  return { label: 'High', chipClass: 'chip2--warn', percent };
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
cd apps/wellness && pnpm test vitals.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/wellness/src/lib/vitals.ts apps/wellness/src/lib/vitals.test.ts
git commit -m "feat(healthkit): add classifyHeartRate"
```

---

### Task 7: Health screen — Heart Rate row + Watch-sourced SpO2

**Files:**
- Modify: `apps/wellness/src/pages/Health.tsx`
- Modify: `apps/wellness/src/pages/Health.test.tsx`

**Interfaces:**
- Consumes: `classifyHeartRate` (Task 6), `wearable_readings` table (`reading_type`, `value`, `recorded_at`).

- [ ] **Step 1: Write the failing tests**

Add to `apps/wellness/src/pages/Health.test.tsx`, and add `tableResponses.wearable_readings = { data: [], error: null };` to the existing `beforeEach`:

```typescript
  it('shows a heart rate row sourced from wearable_readings', async () => {
    tableResponses.wearable_readings = {
      data: [{ reading_type: 'heart_rate', value: 72, recorded_at: '2026-08-20T08:00:00Z' }],
      error: null,
    };
    render(<Health />);
    expect(await screen.findByText('Heart rate')).toBeInTheDocument();
    expect(screen.getByText('72 bpm')).toBeInTheDocument();
  });

  it('merges Watch-sourced SpO2 with manually logged SpO2 into one row', async () => {
    tableResponses.vitals_readings = {
      data: [{ vital_type: 'spo2_pct', value: 97, recorded_at: '2026-08-01T08:00:00Z' }],
      error: null,
    };
    tableResponses.wearable_readings = {
      data: [{ reading_type: 'spo2', value: 96, recorded_at: '2026-08-02T08:00:00Z' }],
      error: null,
    };
    render(<Health />);
    const spo2Rows = await screen.findAllByText('SpO2');
    expect(spo2Rows).toHaveLength(1);
    expect(screen.getByText('96%')).toBeInTheDocument(); // the later (Watch) reading is latest
  });
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd apps/wellness && pnpm test Health.test.tsx
```

Expected: FAIL ("Heart rate" not found; `wearable_readings` currently unqueried).

- [ ] **Step 3: Implement**

In `apps/wellness/src/pages/Health.tsx`:

Add to imports:
```typescript
import {
  categorizeBmi,
  classifyBloodPressure,
  classifyGlucose,
  classifyHeartRate,
  classifySpo2,
  glucoseContextLabel,
  type GlucoseContext,
} from '../lib/vitals';
```

Add a `WearableRow` interface next to `GlucoseRow`:
```typescript
interface WearableRow {
  reading_type: string;
  value: number;
  recorded_at: string;
}
```

Add state and a third query into the existing `Promise.all` (replace the whole `useEffect`):
```typescript
  const [vitals, setVitals] = useState<VitalRow[]>([]);
  const [glucose, setGlucose] = useState<GlucoseRow[]>([]);
  const [wearable, setWearable] = useState<WearableRow[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    if (!selectedMemberId) return;

    Promise.all([
      supabase
        .from('vitals_readings')
        .select('vital_type, value, recorded_at')
        .eq('member_id', selectedMemberId)
        .in('vital_type', ['blood_pressure', 'spo2_pct', 'weight_kg', 'height_cm'])
        .order('recorded_at', { ascending: true })
        .limit(200),
      supabase
        .from('glucose_readings')
        .select('value_mg_dl, context, reading_date, reading_time')
        .eq('member_id', selectedMemberId)
        .order('reading_date', { ascending: true })
        .order('reading_time', { ascending: true })
        .limit(200),
      supabase
        .from('wearable_readings')
        .select('reading_type, value, recorded_at')
        .eq('member_id', selectedMemberId)
        .in('reading_type', ['heart_rate', 'spo2'])
        .order('recorded_at', { ascending: true })
        .limit(200),
    ]).then(([vitalsRes, glucoseRes, wearableRes]) => {
      if (!isMounted) return;
      setLoading(false);
      setFetchError(!!(vitalsRes.error || glucoseRes.error || wearableRes.error));
      setVitals((vitalsRes.data as VitalRow[] | null) ?? []);
      setGlucose((glucoseRes.data as GlucoseRow[] | null) ?? []);
      setWearable((wearableRes.data as WearableRow[] | null) ?? []);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedMemberId]);
```

Add `NOTES.heart_rate` and `SUGGESTIONS.heart_rate`:
```typescript
const NOTES = {
  bp: 'Sustained readings above 130 raise the risk of stroke, heart disease and kidney strain if not managed with your care team.',
  spo2: "Readings below 92% can indicate your body isn't getting enough oxygen and should be checked promptly, especially alongside breathlessness.",
  heart_rate:
    'Resting heart rate outside 60–100 bpm can be a normal variation (fitness, medication) but is worth tracking — share persistent patterns with your care team.',
  bmi: 'BMI is a screening measure calculated from your logged weight and height. Values outside the normal range are linked to higher risk of heart disease, diabetes and joint strain — your care team can help interpret it alongside your other vitals.',
  glucose:
    'Repeated highs over weeks raise the risk of diabetes-related complications, including nerve, eye and kidney damage. Fasting/pre-meal and post-meal readings use different normal ranges, since a normal post-meal value is naturally higher than a fasting one.',
} as const;

const SUGGESTIONS = {
  bp: 'Share this trend with your care team at your next check-in.',
  spo2: 'Flag this trend to your care team, especially if you notice breathlessness.',
  heart_rate: 'Share this trend with your care team, especially if it persists at rest.',
  bmi: 'Share this trend with your care team and keep logging weight regularly.',
  glucose: 'Log meals alongside your next few readings and share this trend with your care team.',
} as const;
```

Replace the existing `spo2Readings` block (merge Watch-sourced SpO2 in) and add a Heart Rate block right after it:

```typescript
  const spo2Readings = [
    ...vitals.filter((v) => v.vital_type === 'spo2_pct'),
    ...wearable
      .filter((w) => w.reading_type === 'spo2')
      .map((w) => ({ vital_type: 'spo2_pct', value: w.value, recorded_at: w.recorded_at })),
  ].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  if (spo2Readings.length > 0) {
    const recent = spo2Readings.slice(-RECENT_COUNT);
    const latest = recent[recent.length - 1];
    const status = classifySpo2(latest.value);
    rows.push({
      id: 'spo2',
      category: 'Respiratory',
      name: 'SpO2',
      range: '95–100%',
      value: `${latest.value}%`,
      chipClass: status.chipClass,
      statusLabel: status.label,
      note: NOTES.spo2,
      suggestion: status.chipClass === 'chip2--ok' ? '' : SUGGESTIONS.spo2,
      pts: buildSparklinePoints(
        recent.map((r) => r.value),
        280,
        40,
        6,
      ),
      dayRows: recent.map((r) => ({ day: formatShortDate(r.recorded_at), val: String(r.value) })),
    });
  }

  const heartRateReadings = wearable
    .filter((w) => w.reading_type === 'heart_rate')
    .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  if (heartRateReadings.length > 0) {
    const recent = heartRateReadings.slice(-RECENT_COUNT);
    const latest = recent[recent.length - 1];
    const status = classifyHeartRate(latest.value);
    rows.push({
      id: 'heart_rate',
      category: 'Cardiovascular',
      name: 'Heart rate',
      range: '60–100 bpm',
      value: `${latest.value} bpm`,
      chipClass: status.chipClass,
      statusLabel: status.label,
      note: NOTES.heart_rate,
      suggestion: status.chipClass === 'chip2--ok' ? '' : SUGGESTIONS.heart_rate,
      pts: buildSparklinePoints(
        recent.map((r) => r.value),
        280,
        40,
        6,
      ),
      dayRows: recent.map((r) => ({ day: formatShortDate(r.recorded_at), val: `${r.value} bpm` })),
    });
  }
```

Update the disclaimer copy (it's no longer manual-only):
```typescript
      <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0 }}>
        These observations are from readings collected via manual entries and your connected Apple
        Watch, where available. Please reach out to your care team or general physician for
        professional medical advice.
      </p>
```

- [ ] **Step 4: Run to verify it passes**

```bash
cd apps/wellness && pnpm test Health.test.tsx
```

Expected: PASS, all tests including the two new ones.

- [ ] **Step 5: Run the full test suite**

```bash
cd apps/wellness && pnpm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/wellness/src/pages/Health.tsx apps/wellness/src/pages/Health.test.tsx
git commit -m "feat(healthkit): show Heart Rate and Watch-sourced SpO2 on the Health screen"
```

---

### Task 8: Real-device end-to-end verification

**Files:** none (verification only)

**Interfaces:** none — this task proves Tasks 1-7 work together on real hardware, the same way push and email were verified this session.

- [ ] **Step 1: Build and install on the connected device**

```bash
cd apps/wellness/ios/App && xcodebuild -project App.xcodeproj -scheme App -configuration Debug -destination "id=<device-id>" -allowProvisioningUpdates build
xcrun devicectl device install app --device <device-id> <path-to-built-.app>
```

- [ ] **Step 2: Launch with console attached and grant HealthKit permission**

```bash
xcrun devicectl device process launch --console --terminate-existing --device <device-id> com.carebridgehome.wellness
```

The HealthKit permission sheet should appear on first launch after sign-in (triggered by the `AuthProvider` effect from Task 5) — allow Heart Rate and Blood Oxygen. Confirm the console log shows `startObserving` was called with no error.

- [ ] **Step 3: Wait for a real sample and confirm ingestion**

Background delivery timing is OS-controlled — this may take anywhere from immediately to a while, per the design doc's stated caveat. Poll `wearable_readings` for the signed-in test member:

```bash
curl -s "https://bbthbboakoicoyiuclll.supabase.co/rest/v1/wearable_readings?select=reading_type,value,recorded_at&member_id=eq.<member-id>&device_vendor=eq.apple_watch&order=recorded_at.desc&limit=5" \
  -H "apikey: <service_role_key>" -H "Authorization: Bearer <service_role_key>"
```

Expected: rows with `reading_type` of `heart_rate` and/or `spo2`.

- [ ] **Step 4: Confirm the Health screen shows it**

Open the Wellness app on the device, navigate to Health ("My Health" tab). Confirm a "Heart rate" row appears (and, if any manual SpO2 entries also exist for this member, confirm the SpO2 row's latest value reflects whichever reading — manual or Watch — is more recent).

- [ ] **Step 5: Update memory with the outcome**

Whatever the actual verification result (worked cleanly / hit a real bug / background delivery took N minutes), record it the same way the push and email verification was recorded this session — this is exactly the kind of "past claim not actually proven" gap the push work caught once already; don't let this ship marked done without a real device having actually produced a row.
