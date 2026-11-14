import { assert, assertEquals, assertNotEquals } from 'jsr:@std/assert@1';
import { generateDeviceToken, hashDeviceToken, looksLikeDeviceToken } from './deviceToken.ts';

Deno.test('generated tokens are prefixed, well formed and unique', () => {
  const a = generateDeviceToken();
  const b = generateDeviceToken();
  assert(looksLikeDeviceToken(a));
  assertNotEquals(a, b);
});

Deno.test('looksLikeDeviceToken rejects other strings', () => {
  assert(!looksLikeDeviceToken(''));
  assert(!looksLikeDeviceToken('cbdt_short'));
  assert(!looksLikeDeviceToken('eyJhbGciOiJIUzI1NiJ9.x.y'));
  assert(!looksLikeDeviceToken(undefined));
});

Deno.test('hash is stable hex SHA-256 and differs from the token', async () => {
  assertEquals(
    await hashDeviceToken('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  );
  const t = generateDeviceToken();
  assertEquals((await hashDeviceToken(t)).length, 64);
});
