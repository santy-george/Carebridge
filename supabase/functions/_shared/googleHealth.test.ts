import { assertEquals, assert, assertRejects } from 'jsr:@std/assert@1';
import {
  GoogleAuthRevokedError,
  SPO2_SCOPE,
  buildConsentUrl,
  grantedScopeIncludes,
  mapDailySpo2,
  pkceChallenge,
  refreshAccessToken,
  spo2SinceDate,
} from './googleHealth.ts';

const cfg = { clientId: 'cid', clientSecret: 'secret', redirectUri: 'https://x.test/cb' };

Deno.test('pkceChallenge matches the RFC 7636 test vector', async () => {
  assertEquals(
    await pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),
    'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
  );
});

Deno.test('consent URL asks for offline access, PKCE S256, and only the SpO2 scope', () => {
  const url = new URL(buildConsentUrl(cfg, 'st', 'ch'));
  assertEquals(url.searchParams.get('access_type'), 'offline');
  assertEquals(url.searchParams.get('prompt'), 'consent');
  assertEquals(url.searchParams.get('code_challenge_method'), 'S256');
  assertEquals(url.searchParams.get('scope'), SPO2_SCOPE);
  assertEquals(url.searchParams.get('state'), 'st');
  assert(!url.searchParams.has('client_secret'));
});

Deno.test('grantedScopeIncludes needs the exact scope, not a prefix', () => {
  assert(grantedScopeIncludes(`openid ${SPO2_SCOPE}`, SPO2_SCOPE));
  assert(!grantedScopeIncludes('openid', SPO2_SCOPE));
  assert(!grantedScopeIncludes(undefined, SPO2_SCOPE));
  assert(!grantedScopeIncludes(`${SPO2_SCOPE}.extra`, SPO2_SCOPE));
});

Deno.test('mapDailySpo2 stamps a nightly average at 12:00 IST on its date', () => {
  assertEquals(
    mapDailySpo2([{ dailyOxygenSaturation: { date: { year: 2026, month: 11, day: 14 }, averagePercentage: 96.04 } }]),
    [{ value: 96, recorded_at: '2026-11-14T06:30:00.000Z' }],
  );
});

Deno.test('mapDailySpo2 skips points with no date or an impossible value', () => {
  assertEquals(
    mapDailySpo2([
      {},
      { dailyOxygenSaturation: { averagePercentage: 95 } },
      { dailyOxygenSaturation: { date: { year: 2026, month: 1, day: 1 }, averagePercentage: 0 } },
      { dailyOxygenSaturation: { date: { year: 2026, month: 1, day: 1 }, averagePercentage: 101 } },
    ]),
    [],
  );
});

Deno.test('spo2SinceDate looks back 14 days on first sync, 3 after', () => {
  const now = new Date('2026-11-15T00:00:00Z');
  assertEquals(spo2SinceDate(null, now), '2026-11-01');
  assertEquals(spo2SinceDate('2026-11-14T00:00:00Z', now), '2026-11-12');
});

Deno.test('refreshAccessToken turns invalid_grant into GoogleAuthRevokedError', async () => {
  const fakeFetch = (() =>
    Promise.resolve(new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 }))) as typeof fetch;
  await assertRejects(() => refreshAccessToken(cfg, 'r', fakeFetch), GoogleAuthRevokedError);
});

Deno.test('refreshAccessToken returns the access token on success', async () => {
  const fakeFetch = (() =>
    Promise.resolve(new Response(JSON.stringify({ access_token: 'at' }), { status: 200 }))) as typeof fetch;
  assertEquals(await refreshAccessToken(cfg, 'r', fakeFetch), 'at');
});
