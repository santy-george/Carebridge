import { assertEquals, assertRejects, assertStringIncludes } from 'jsr:@std/assert@1';
import {
  buildFcmPayload,
  getFcmAccessToken,
  isDeadFcmToken,
  parseServiceAccount,
  sendToFcmDevice,
} from './fcm.ts';

const SA_JSON = JSON.stringify({
  project_id: 'demo-proj',
  client_email: 'svc@demo-proj.iam.gserviceaccount.com',
  private_key: 'unused',
});

Deno.test('buildFcmPayload drops non-string data values', () => {
  const { message } = buildFcmPayload('tok', 'T', 'B', { a: 'x', b: 1, c: { d: 'e' }, f: null, g: 'y' }) as {
    message: { data?: Record<string, string> };
  };
  assertEquals(message.data, { a: 'x', g: 'y' });
});

Deno.test('buildFcmPayload omits data when none survive', () => {
  const { message } = buildFcmPayload('tok', 'T', 'B', { b: 1 }) as { message: Record<string, unknown> };
  assertEquals('data' in message, false);
  const { message: m2 } = buildFcmPayload('tok', 'T', 'B') as { message: Record<string, unknown> };
  assertEquals('data' in m2, false);
});

Deno.test('buildFcmPayload sets HIGH priority and default channel', () => {
  const { message } = buildFcmPayload('tok', 'Title', 'Body') as { message: Record<string, unknown> };
  assertEquals(message.token, 'tok');
  assertEquals(message.notification, { title: 'Title', body: 'Body' });
  assertEquals(message.android, { priority: 'HIGH', notification: { channel_id: 'default' } });
});

Deno.test('isDeadFcmToken is true for UNREGISTERED only', () => {
  assertEquals(isDeadFcmToken({ status: 404, reason: 'UNREGISTERED' }), true);
  assertEquals(isDeadFcmToken({ status: 400, reason: 'INVALID_ARGUMENT' }), false);
  assertEquals(isDeadFcmToken({ status: 500 }), false);
});

Deno.test('parseServiceAccount throws naming FCM_SERVICE_ACCOUNT_JSON on missing field', () => {
  const bad = JSON.stringify({ project_id: 'p', client_email: 'e' });
  const err = (() => {
    try {
      parseServiceAccount(bad);
    } catch (e) {
      return e as Error;
    }
  })();
  assertStringIncludes(err?.message ?? '', 'FCM_SERVICE_ACCOUNT_JSON');
  for (const input of [undefined, 'not json']) {
    try {
      parseServiceAccount(input);
      throw new Error('should have thrown');
    } catch (e) {
      assertStringIncludes((e as Error).message, 'FCM_SERVICE_ACCOUNT_JSON');
    }
  }
});

Deno.test('sendToFcmDevice returns not-configured result instead of throwing', async () => {
  const r = await sendToFcmDevice('tok', 'T', 'B', undefined, { serviceAccountJson: undefined });
  assertEquals(r, { token: 'tok', ok: false, status: 0, reason: 'FCM not configured' });
});

Deno.test('sendToFcmDevice maps a 404 UNREGISTERED body to reason UNREGISTERED', async () => {
  const fakeFetch = (() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          error: {
            code: 404,
            status: 'NOT_FOUND',
            details: [{ '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode: 'UNREGISTERED' }],
          },
        }),
        { status: 404 },
      ),
    )) as typeof fetch;
  const r = await sendToFcmDevice('tok', 'T', 'B', undefined, {
    fetch: fakeFetch,
    getAccessToken: () => Promise.resolve('at'),
    serviceAccountJson: SA_JSON,
  });
  assertEquals(r, { token: 'tok', ok: false, status: 404, reason: 'UNREGISTERED' });
  assertEquals(isDeadFcmToken(r), true);
});

Deno.test("sendToFcmDevice posts to the project's messages:send URL with bearer token", async () => {
  let seenUrl = '';
  let seenInit: RequestInit | undefined;
  const fakeFetch = ((url: string, init?: RequestInit) => {
    seenUrl = url;
    seenInit = init;
    return Promise.resolve(new Response('{"name":"projects/demo-proj/messages/1"}', { status: 200 }));
  }) as unknown as typeof fetch;
  const r = await sendToFcmDevice('tok', 'T', 'B', { k: 'v' }, {
    fetch: fakeFetch,
    getAccessToken: () => Promise.resolve('at-123'),
    serviceAccountJson: SA_JSON,
  });
  assertEquals(r, { token: 'tok', ok: true, status: 200 });
  assertEquals(seenUrl, 'https://fcm.googleapis.com/v1/projects/demo-proj/messages:send');
  assertEquals(seenInit?.method, 'POST');
  assertEquals((seenInit?.headers as Record<string, string>).authorization, 'Bearer at-123');
  assertEquals(JSON.parse(seenInit?.body as string).message.data, { k: 'v' });
});

Deno.test('getFcmAccessToken signs an RS256 JWT, exchanges it, and caches the result', async () => {
  const pair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  );
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...der))}\n-----END PRIVATE KEY-----\n`;
  const sa = { project_id: 'demo-proj', client_email: 'svc@demo-proj.iam.gserviceaccount.com', private_key: pem };

  let calls = 0;
  let body = '';
  const fakeFetch = ((_url: string, init?: RequestInit) => {
    calls++;
    body = String(init?.body);
    return Promise.resolve(new Response(JSON.stringify({ access_token: 'goog-at', expires_in: 3600 }), { status: 200 }));
  }) as unknown as typeof fetch;

  let now = 1_700_000_000_000;
  const deps = { fetch: fakeFetch, now: () => now };
  assertEquals(await getFcmAccessToken(sa, deps), 'goog-at');
  const params = new URLSearchParams(body);
  assertEquals(params.get('grant_type'), 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  const [h, p, s] = params.get('assertion')!.split('.');
  const dec = (x: string) => JSON.parse(atob(x.replace(/-/g, '+').replace(/_/g, '/')));
  assertEquals(dec(h), { alg: 'RS256', typ: 'JWT' });
  const claims = dec(p);
  assertEquals(claims.iss, sa.client_email);
  assertEquals(claims.scope, 'https://www.googleapis.com/auth/firebase.messaging');
  assertEquals(claims.aud, 'https://oauth2.googleapis.com/token');
  assertEquals(claims.exp - claims.iat, 3600);
  const sig = Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (s.length % 4)) % 4)), (c) =>
    c.charCodeAt(0),
  );
  assertEquals(
    await crypto.subtle.verify('RSASSA-PKCS1-v1_5', pair.publicKey, sig, new TextEncoder().encode(`${h}.${p}`)),
    true,
  );

  now += 49 * 60 * 1000;
  await getFcmAccessToken(sa, deps);
  assertEquals(calls, 1);
  now += 2 * 60 * 1000;
  await getFcmAccessToken(sa, deps);
  assertEquals(calls, 2);

  await assertRejects(() => getFcmAccessToken(sa, { fetch: (() => Promise.resolve(new Response('no', { status: 401 }))) as typeof fetch, now: () => now + 10 * 3600_000 }));
});
