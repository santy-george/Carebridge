// Google Health API (successor to the Fitbit Web API) -- shared by the
// google-health-* functions. Design:
// docs/superpowers/specs/2026-11-15-google-health-api-spo2-design.md
import { dropKnown, instantKey } from './dedupe.ts';

export const PROVIDER = 'google_health';
export const DEVICE_VENDOR = 'google_health';
export const SPO2_SCOPE =
  'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const API_BASE = 'https://health.googleapis.com/v4/users/me/dataTypes';

// Nights whose SpO2 is processed late, or re-processed, are re-read.
const SPO2_LOOKBACK_DAYS = 3;
const FIRST_SYNC_DAYS = 14;

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function googleConfigFromEnv(): GoogleConfig | null {
  const clientId = Deno.env.get('GOOGLE_HEALTH_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_HEALTH_CLIENT_SECRET');
  const redirectUri = Deno.env.get('GOOGLE_HEALTH_REDIRECT_URI');
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function randomToken(byteLength = 32): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

// RFC 7636 S256 code challenge.
export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

// access_type=offline + prompt=consent so Google always returns a refresh
// token, including when the member reconnects after revoking.
export function buildConsentUrl(cfg: GoogleConfig, state: string, challenge: string): string {
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: 'code',
    scope: SPO2_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  return `${AUTH_URL}?${params}`;
}

export function grantedScopeIncludes(granted: string | undefined, needed: string): boolean {
  return (granted ?? '').split(/\s+/).includes(needed);
}

export class GoogleAuthRevokedError extends Error {}

type Fetch = typeof fetch;

export async function exchangeCode(
  cfg: GoogleConfig,
  code: string,
  verifier: string,
  fetchImpl: Fetch = fetch,
): Promise<{ refreshToken: string | null; scope: string }> {
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`token exchange failed: ${body.error ?? res.status}`);
  return { refreshToken: body.refresh_token ?? null, scope: body.scope ?? '' };
}

export async function refreshAccessToken(
  cfg: GoogleConfig,
  refreshToken: string,
  fetchImpl: Fetch = fetch,
): Promise<string> {
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const body = await res.json();
  // invalid_grant = the member revoked access, or the token expired. Not
  // retryable; the member has to reconnect.
  if (body.error === 'invalid_grant') throw new GoogleAuthRevokedError('invalid_grant');
  if (!res.ok || !body.access_token) throw new Error(`token refresh failed: ${body.error ?? res.status}`);
  return body.access_token;
}

export async function revokeToken(token: string, fetchImpl: Fetch = fetch): Promise<void> {
  // Best effort: a token Google already considers invalid is the goal state.
  await fetchImpl(`${REVOKE_URL}?${new URLSearchParams({ token })}`, { method: 'POST' });
}

interface GoogleDate {
  year: number;
  month: number;
  day: number;
}

export interface DailySpo2Point {
  dailyOxygenSaturation?: { date?: GoogleDate; averagePercentage?: number };
}

export interface Spo2Reading {
  value: number;
  recorded_at: string;
}

function isoDate(d: GoogleDate): string {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

// A nightly average belongs to a calendar date in the member's timezone, not
// an instant. Stamped at 12:00 IST (06:30Z) so the date is the same in UTC and
// in every timezone from UTC-6 to UTC+11 (members are in Kerala; the pilot
// phone runs Sydney time).
export function mapDailySpo2(points: DailySpo2Point[]): Spo2Reading[] {
  const out: Spo2Reading[] = [];
  for (const p of points) {
    const d = p.dailyOxygenSaturation;
    const v = d?.averagePercentage;
    if (!d?.date || typeof v !== 'number' || !Number.isFinite(v) || v <= 0 || v > 100) continue;
    out.push({ value: Math.round(v * 10) / 10, recorded_at: `${isoDate(d.date)}T06:30:00.000Z` });
  }
  return out;
}

export function spo2SinceDate(lastSyncedAt: string | null, now: Date): string {
  const days = lastSyncedAt ? SPO2_LOOKBACK_DAYS : FIRST_SYNC_DAYS;
  const since = new Date(now.getTime() - days * 86_400_000);
  return since.toISOString().slice(0, 10);
}

export async function listDailySpo2(
  accessToken: string,
  sinceDate: string,
  fetchImpl: Fetch = fetch,
): Promise<DailySpo2Point[]> {
  const points: DailySpo2Point[] = [];
  let pageToken = '';
  do {
    const params = new URLSearchParams({
      filter: `daily_oxygen_saturation.date >= "${sinceDate}"`,
      pageSize: '1000',
    });
    if (pageToken) params.set('pageToken', pageToken);
    const res = await fetchImpl(`${API_BASE}/daily-oxygen-saturation/dataPoints?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });
    const body = await res.json();
    if (!res.ok) throw new Error(`list daily-oxygen-saturation failed: ${res.status} ${body.error?.status ?? ''}`);
    points.push(...(body.dataPoints ?? []));
    pageToken = body.nextPageToken ?? '';
  } while (pageToken);
  return points;
}

// One member, end to end. Never throws for a revoked grant: it records
// needs_reconnect so the app can say so instead of SpO2 silently stopping.
// deno-lint-ignore no-explicit-any
export async function syncMember(admin: any, cfg: GoogleConfig, memberId: string, fetchImpl: Fetch = fetch) {
  const { data: conn } = await admin
    .from('wearable_connections')
    .select('last_synced_at, status')
    .eq('member_id', memberId)
    .eq('provider', PROVIDER)
    .maybeSingle();
  if (!conn || conn.status !== 'ok') return { memberId, skipped: true };

  const { data: refreshToken, error: tokenError } = await admin.rpc('get_wearable_refresh_token', {
    p_member_id: memberId,
    p_provider: PROVIDER,
  });
  if (tokenError || !refreshToken) throw new Error('refresh token unavailable');

  let accessToken: string;
  try {
    accessToken = await refreshAccessToken(cfg, refreshToken, fetchImpl);
  } catch (e) {
    if (e instanceof GoogleAuthRevokedError) {
      await admin
        .from('wearable_connections')
        .update({ status: 'needs_reconnect', last_error: 'access revoked or expired' })
        .eq('member_id', memberId)
        .eq('provider', PROVIDER);
      return { memberId, needsReconnect: true };
    }
    throw e;
  }

  const readings = mapDailySpo2(
    await listDailySpo2(accessToken, spo2SinceDate(conn.last_synced_at, new Date()), fetchImpl),
  );

  let inserted = 0;
  if (readings.length) {
    const times = readings.map((r) => r.recorded_at).sort();
    const { data: existing, error: existingError } = await admin
      .from('wearable_readings')
      .select('recorded_at')
      .eq('member_id', memberId)
      .eq('device_vendor', DEVICE_VENDOR)
      .eq('reading_type', 'spo2')
      .gte('recorded_at', times[0])
      .lte('recorded_at', times[times.length - 1]);
    if (existingError) throw new Error(existingError.message);
    const fresh = dropKnown(
      readings,
      new Set((existing ?? []).map((e: { recorded_at: string }) => instantKey(e.recorded_at))),
      (r) => instantKey(r.recorded_at),
    );
    if (fresh.length) {
      const { error } = await admin.from('wearable_readings').insert(
        fresh.map((r) => ({
          member_id: memberId,
          device_vendor: DEVICE_VENDOR,
          device_id: null,
          reading_type: 'spo2',
          value: r.value,
          recorded_at: r.recorded_at,
        })),
      );
      if (error) throw new Error(error.message);
      inserted = fresh.length;
    }
  }

  await admin
    .from('wearable_connections')
    .update({ last_synced_at: new Date().toISOString(), last_error: null })
    .eq('member_id', memberId)
    .eq('provider', PROVIDER);
  return { memberId, inserted };
}
