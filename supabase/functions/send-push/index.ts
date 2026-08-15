import { createClient } from 'jsr:@supabase/supabase-js@2';

// Phase 3 push send-side. UNVERIFIED AGAINST A REAL DEVICE as of writing --
// there is no APNs Auth Key yet (Notion: "Push (iOS) -- device-side
// capability fully wired and proven on real hardware 2026-08-11 ... Send-side
// not built yet -- needs an APNs Auth Key (quick, no lead time) then an Edge
// Function to call APNs."). This lands that Edge Function so it's ready the
// moment the key exists; treat every APNs-protocol detail below (JWT shape,
// header names, response codes) as "implemented to spec, not yet proven" --
// verify with a real Auth Key + the Series 4 test watch (or an SE2) before
// trusting it for a real notification, let alone an SOS alert.
//
// Deliberately NOT wired to any trigger (sos_alerts insert, medication_logs,
// a cron job) -- no such trigger mechanism exists in this repo yet, and
// picking one is a product decision (which events page a member vs. which
// page a coordinator), not something to improvise here. This function is
// the reusable "send a push to a user's registered devices" primitive that
// a future trigger calls into.
//
// Android/FCM is out of scope -- Phase 3 scope was explicitly narrowed
// 2026-08-11 to iOS push + email only (see project_phase3_scope_narrowed
// memory / Notion). device_push_tokens rows with platform='android' are
// silently skipped, not errored on, so this function doesn't need to change
// shape when FCM eventually gets built.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

interface SendPushRequest {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

// APNs provider JWT is meant to be reused for up to an hour (Apple docs:
// "you should reuse the token... generating a new token for every request is
// unnecessary"). Module-level cache survives across requests within the same
// warm Edge Function instance; a cold start just re-signs, which is cheap and
// correctness-neutral -- only a performance nicety, not a correctness bug if
// it doesn't hit.
let cachedApnsJwt: { token: string; issuedAtMs: number } | null = null;

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeString(input: string): string {
  return base64UrlEncode(new TextEncoder().encode(input));
}

// Parses a PEM-formatted PKCS#8 EC private key (the .p8 file Apple issues
// for an APNs Auth Key) into a CryptoKey usable for ES256 signing.
async function importApnsSigningKey(pem: string): Promise<CryptoKey> {
  const pkcs8 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pkcs8), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
}

// Builds (or reuses) the APNs provider authentication token: a JWT signed
// ES256 per Apple's "Establishing a Token-Based Connection to APNs" spec.
// WebCrypto's ECDSA signature output is raw r||s (IEEE P1363), which is
// exactly the format JOSE/JWT ES256 expects -- unlike Node's crypto module
// (DER by default), no signature-format conversion is needed here.
async function getApnsProviderToken(): Promise<string> {
  const now = Date.now();
  // Apple invalidates tokens older than 1 hour; refresh at 50 minutes to
  // leave headroom rather than cutting it exactly at the limit.
  if (cachedApnsJwt && now - cachedApnsJwt.issuedAtMs < 50 * 60 * 1000) {
    return cachedApnsJwt.token;
  }

  const teamId = Deno.env.get('APNS_TEAM_ID');
  const keyId = Deno.env.get('APNS_KEY_ID');
  const privateKeyPem = Deno.env.get('APNS_AUTH_KEY_P8');
  if (!teamId || !keyId || !privateKeyPem) {
    throw new Error(
      'APNS_TEAM_ID / APNS_KEY_ID / APNS_AUTH_KEY_P8 not configured -- push send-side is not set up yet',
    );
  }

  const header = { alg: 'ES256', kid: keyId };
  const claims = { iss: teamId, iat: Math.floor(now / 1000) };
  const signingInput =
    base64UrlEncodeString(JSON.stringify(header)) + '.' + base64UrlEncodeString(JSON.stringify(claims));

  const key = await importApnsSigningKey(privateKeyPem);
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput),
  );

  const token = signingInput + '.' + base64UrlEncode(new Uint8Array(signature));
  cachedApnsJwt = { token, issuedAtMs: now };
  return token;
}

interface ApnsSendResult {
  token: string;
  ok: boolean;
  status: number;
  reason?: string;
}

async function sendToApnsDevice(
  deviceToken: string,
  title: string,
  body: string,
  data: Record<string, string> | undefined,
): Promise<ApnsSendResult> {
  const bundleId = Deno.env.get('APNS_BUNDLE_ID');
  const environment = Deno.env.get('APNS_ENVIRONMENT') === 'production' ? 'production' : 'sandbox';
  if (!bundleId) {
    throw new Error('APNS_BUNDLE_ID not configured -- push send-side is not set up yet');
  }
  const host =
    environment === 'production' ? 'https://api.push.apple.com' : 'https://api.sandbox.push.apple.com';

  const providerToken = await getApnsProviderToken();

  // Plain fetch(), no manual HTTP/2 framing -- Deno's fetch negotiates HTTP/2
  // over TLS automatically (ALPN), which is all APNs requires; the
  // :method/:scheme/:path/:authority pseudo-headers HTTP/2 needs are derived
  // from the request/URL, not something calling code sets by hand.
  const response = await fetch(`${host}/3/device/${deviceToken}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${providerToken}`,
      'apns-topic': bundleId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      aps: { alert: { title, body }, sound: 'default' },
      ...(data ?? {}),
    }),
  });

  if (response.ok) {
    return { token: deviceToken, ok: true, status: response.status };
  }

  let reason: string | undefined;
  try {
    const errBody = await response.json();
    reason = errBody?.reason;
  } catch {
    // APNs error bodies are always JSON per spec; an unparseable body means
    // something more fundamental (proxy, TLS, wrong host) went wrong --
    // leave reason undefined rather than guessing.
  }
  return { token: deviceToken, ok: false, status: response.status, reason };
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

    // service_role-only. Supabase's platform JWT verification (config.toml
    // default verify_jwt = true) already rejects a request with no valid
    // Supabase-signed JWT at all -- but an ordinary signed-in member's JWT is
    // ALSO valid by that check, and this function must not let a member
    // trigger a push to an arbitrary user_id. Require the JWT's own role
    // claim to be service_role, same trust boundary erase-consent-withdrawal
    // draws around its service-role adminClient, just checked on the
    // inbound side here instead of only the outbound client.
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    const claimsSegment = jwt.split('.')[1];
    let callerRole: string | undefined;
    try {
      callerRole = claimsSegment
        ? JSON.parse(atob(claimsSegment.replace(/-/g, '+').replace(/_/g, '/')))?.role
        : undefined;
    } catch {
      callerRole = undefined;
    }
    if (callerRole !== 'service_role') {
      return new Response(JSON.stringify({ error: 'service_role required' }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const req_body = (await req.json()) as SendPushRequest;
    const { user_id, title, body, data } = req_body;
    if (!user_id || !title || !body) {
      return new Response(JSON.stringify({ error: 'user_id, title, and body are required' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { data: tokenRows, error: tokenError } = await adminClient
      .from('device_push_tokens')
      .select('token, platform')
      .eq('user_id', user_id)
      .eq('platform', 'ios');
    if (tokenError) {
      return new Response(JSON.stringify({ error: tokenError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }
    if (!tokenRows || tokenRows.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, results: [] }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    const results = await Promise.all(
      tokenRows.map((row: { token: string }) => sendToApnsDevice(row.token, title, body, data)),
    );

    // 410/BadDeviceToken means Apple has permanently invalidated this token
    // (app uninstalled, device reset, etc.) -- clean it up so future sends
    // don't keep paying for a dead token. Best-effort: a failed delete here
    // doesn't fail the response, since the actual sends already happened.
    const deadTokens = results
      .filter((r) => r.status === 410 || r.reason === 'BadDeviceToken')
      .map((r) => r.token);
    if (deadTokens.length > 0) {
      await adminClient.from('device_push_tokens').delete().in('token', deadTokens);
    }

    return new Response(
      JSON.stringify({
        ok: results.every((r) => r.ok),
        sent: results.filter((r) => r.ok).length,
        results,
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
