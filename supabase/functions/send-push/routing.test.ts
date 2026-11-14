import { assertEquals } from 'jsr:@std/assert@1';
import type { PushSendResult } from './fcm.ts';
import { sendToDevices } from './routing.ts';

const ok = (token: string): PushSendResult => ({ token, ok: true, status: 200 });

Deno.test('routes ios rows to APNs and android rows to FCM', async () => {
  const iosCalls: string[] = [];
  const androidCalls: string[] = [];
  const { results, deadTokens } = await sendToDevices(
    [
      { token: 'i1', platform: 'ios' },
      { token: 'a1', platform: 'android' },
    ],
    'T',
    'B',
    { k: 'v' },
    {
      sendIos: (t) => {
        iosCalls.push(t);
        return Promise.resolve(ok(t));
      },
      sendAndroid: (t) => {
        androidCalls.push(t);
        return Promise.resolve(ok(t));
      },
    },
  );
  assertEquals(iosCalls, ['i1']);
  assertEquals(androidCalls, ['a1']);
  assertEquals(results.map((r) => r.token).sort(), ['a1', 'i1']);
  assertEquals(deadTokens, []);
});

Deno.test('a failing FCM send does not change APNs results', async () => {
  const { results } = await sendToDevices(
    [
      { token: 'i1', platform: 'ios' },
      { token: 'a1', platform: 'android' },
    ],
    'T',
    'B',
    undefined,
    {
      sendIos: (t) => Promise.resolve(ok(t)),
      sendAndroid: () => Promise.reject(new Error('fcm boom')),
    },
  );
  assertEquals(results.find((r) => r.token === 'i1'), ok('i1'));
  assertEquals(results.find((r) => r.token === 'a1'), {
    token: 'a1',
    ok: false,
    status: 0,
    reason: 'fcm boom',
  });
});

Deno.test('prunes android token only on UNREGISTERED', async () => {
  const { deadTokens } = await sendToDevices(
    [
      { token: 'a-dead', platform: 'android' },
      { token: 'a-410', platform: 'android' },
      { token: 'a-bad', platform: 'android' },
    ],
    'T',
    'B',
    undefined,
    {
      sendIos: (t) => Promise.resolve(ok(t)),
      sendAndroid: (t) =>
        Promise.resolve(
          t === 'a-dead'
            ? { token: t, ok: false, status: 404, reason: 'UNREGISTERED' }
            : t === 'a-410'
              ? { token: t, ok: false, status: 410 }
              : { token: t, ok: false, status: 400, reason: 'BadDeviceToken' },
        ),
    },
  );
  assertEquals(deadTokens, ['a-dead']);
});

Deno.test('prunes ios token on 410 or BadDeviceToken (unchanged behaviour)', async () => {
  const { deadTokens } = await sendToDevices(
    [
      { token: 'i-410', platform: 'ios' },
      { token: 'i-bad', platform: 'ios' },
      { token: 'i-unreg', platform: 'ios' },
    ],
    'T',
    'B',
    undefined,
    {
      sendIos: (t) =>
        Promise.resolve(
          t === 'i-410'
            ? { token: t, ok: false, status: 410 }
            : t === 'i-bad'
              ? { token: t, ok: false, status: 400, reason: 'BadDeviceToken' }
              : { token: t, ok: false, status: 404, reason: 'UNREGISTERED' },
        ),
      sendAndroid: (t) => Promise.resolve(ok(t)),
    },
  );
  assertEquals(deadTokens.sort(), ['i-410', 'i-bad']);
});
