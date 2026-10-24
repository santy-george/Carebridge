// FCM HTTP v1 sender for Android pushes. Kept standalone (no Deno.serve, no
// side effects at import) so it can be unit tested; index.ts wires it in.

export interface FcmServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

export interface PushSendResult {
  token: string;
  ok: boolean;
  status: number;
  reason?: string;
}

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const TOKEN_CACHE_MS = 50 * 60 * 1000;

export function parseServiceAccount(json: string | undefined): FcmServiceAccount {
  if (!json) throw new Error('FCM_SERVICE_ACCOUNT_JSON is not set');
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('FCM_SERVICE_ACCOUNT_JSON is not valid JSON');
  }
  for (const field of ['project_id', 'client_email', 'private_key'] as const) {
    if (typeof parsed?.[field] !== 'string' || !parsed[field]) {
      throw new Error(`FCM_SERVICE_ACCOUNT_JSON is missing ${field}`);
    }
  }
  return {
    project_id: parsed.project_id as string,
    client_email: parsed.client_email as string,
    private_key: parsed.private_key as string,
  };
}

export function buildFcmPayload(
  token: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): { message: object } {
  const stringData: Record<string, string> = {};
  for (const [k, v] of Object.entries(data ?? {})) {
    if (typeof v === 'string') stringData[k] = v;
  }
  const message: Record<string, unknown> = {
    token,
    notification: { title, body },
    android: { priority: 'HIGH', notification: { channel_id: 'default' } },
  };
  if (Object.keys(stringData).length > 0) message.data = stringData;
  return { message };
}

export function isDeadFcmToken(r: { status: number; reason?: string }): boolean {
  return r.reason === 'UNREGISTERED';
}

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function importRsaSigningKey(pem: string): Promise<CryptoKey> {
  const pkcs8 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pkcs8), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

let cachedAccess: { token: string; issuedAtMs: number; clientEmail: string } | null = null;

export async function getFcmAccessToken(
  sa: FcmServiceAccount,
  deps: { fetch?: typeof fetch; now?: () => number } = {},
): Promise<string> {
  const doFetch = deps.fetch ?? fetch;
  const nowMs = (deps.now ?? Date.now)();
  if (cachedAccess && cachedAccess.clientEmail === sa.client_email && nowMs - cachedAccess.issuedAtMs < TOKEN_CACHE_MS) {
    return cachedAccess.token;
  }

  const iat = Math.floor(nowMs / 1000);
  const enc = new TextEncoder();
  const header = base64UrlEncode(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claims = base64UrlEncode(
    enc.encode(JSON.stringify({ iss: sa.client_email, scope: FCM_SCOPE, aud: GOOGLE_TOKEN_URL, iat, exp: iat + 3600 })),
  );
  const signingInput = `${header}.${claims}`;
  const key = await importRsaSigningKey(sa.private_key);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(signingInput));
  const assertion = `${signingInput}.${base64UrlEncode(new Uint8Array(sig))}`;

  const res = await doFetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  });
  if (!res.ok) throw new Error(`Google OAuth token exchange failed: ${res.status}`);
  const json = await res.json();
  if (typeof json.access_token !== 'string') throw new Error('Google OAuth response missing access_token');
  cachedAccess = { token: json.access_token, issuedAtMs: nowMs, clientEmail: sa.client_email };
  return json.access_token;
}

export async function sendToFcmDevice(
  token: string,
  title: string,
  body: string,
  data: Record<string, unknown> | undefined,
  deps: { fetch?: typeof fetch; getAccessToken?: () => Promise<string>; serviceAccountJson?: string } = {},
): Promise<PushSendResult> {
  let sa: FcmServiceAccount;
  try {
    sa = parseServiceAccount('serviceAccountJson' in deps ? deps.serviceAccountJson : Deno.env.get('FCM_SERVICE_ACCOUNT_JSON'));
  } catch {
    return { token, ok: false, status: 0, reason: 'FCM not configured' };
  }
  const doFetch = deps.fetch ?? fetch;
  try {
    const accessToken = await (deps.getAccessToken ?? (() => getFcmAccessToken(sa, { fetch: doFetch })))();
    const res = await doFetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify(buildFcmPayload(token, title, body, data)),
    });
    if (res.ok) return { token, ok: true, status: res.status };
    let reason: string | undefined;
    try {
      const err = (await res.json())?.error;
      const detail = Array.isArray(err?.details)
        ? err.details.find((d: { errorCode?: string }) => typeof d?.errorCode === 'string')
        : undefined;
      reason = detail?.errorCode ?? err?.status;
    } catch {
      // non-JSON error body; leave reason undefined
    }
    return { token, ok: false, status: res.status, reason };
  } catch (e) {
    return { token, ok: false, status: 0, reason: e instanceof Error ? e.message : String(e) };
  }
}
