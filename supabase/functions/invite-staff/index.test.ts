import { assertEquals } from 'jsr:@std/assert@1';
import { isValidInviteRequest, type InviteRequest } from './index.ts';

const VALID_ROLES = ['admin', 'coordinator', 'field_staff', 'finance', 'management'];

Deno.test('isValidInviteRequest accepts a well-formed field_staff invite', () => {
  const body: InviteRequest = {
    full_name: 'Anu George',
    email: 'anu@carebridge.in',
    role: 'field_staff',
  };
  assertEquals(isValidInviteRequest(body, VALID_ROLES), true);
});

Deno.test('isValidInviteRequest rejects a missing full_name', () => {
  assertEquals(
    isValidInviteRequest({ email: 'anu@carebridge.in', role: 'field_staff' }, VALID_ROLES),
    false,
  );
});

Deno.test('isValidInviteRequest rejects a missing or malformed email', () => {
  assertEquals(
    isValidInviteRequest({ full_name: 'Anu George', email: 'not-an-email', role: 'field_staff' }, VALID_ROLES),
    false,
  );
  assertEquals(
    isValidInviteRequest({ full_name: 'Anu George', role: 'field_staff' }, VALID_ROLES),
    false,
  );
});

Deno.test('isValidInviteRequest rejects an unknown role', () => {
  assertEquals(
    isValidInviteRequest({ full_name: 'Anu George', email: 'anu@carebridge.in', role: 'super_admin' }, VALID_ROLES),
    false,
  );
});

Deno.test('isValidInviteRequest rejects role member (members self-signup, never invited here)', () => {
  assertEquals(
    isValidInviteRequest({ full_name: 'Anu George', email: 'anu@carebridge.in', role: 'member' }, VALID_ROLES),
    false,
  );
});