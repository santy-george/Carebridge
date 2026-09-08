import { assertEquals } from 'jsr:@std/assert@1';
import { toStaffUser, type AuthUserLike, type ProfileLike } from './index.ts';

Deno.test('toStaffUser marks a never-signed-in invited user as invite_accepted=false', () => {
  const profile: ProfileLike = { id: 'u1', full_name: 'Tom Sebastian', email: 'tom@carebridge.in', role: 'management', created_at: '2026-09-01T00:00:00Z' };
  const authUser: AuthUserLike = { id: 'u1', last_sign_in_at: null };
  assertEquals(toStaffUser(profile, authUser), {
    id: 'u1',
    full_name: 'Tom Sebastian',
    email: 'tom@carebridge.in',
    role: 'management',
    created_at: '2026-09-01T00:00:00Z',
    last_sign_in_at: null,
    invite_accepted: false,
  });
});

Deno.test('toStaffUser marks a user who has signed in as invite_accepted=true', () => {
  const profile: ProfileLike = { id: 'u2', full_name: 'Meera P.', email: 'meera@carebridge.in', role: 'coordinator', created_at: '2026-08-01T00:00:00Z' };
  const authUser: AuthUserLike = { id: 'u2', last_sign_in_at: '2026-09-08T10:00:00Z' };
  const result = toStaffUser(profile, authUser);
  assertEquals(result.invite_accepted, true);
  assertEquals(result.last_sign_in_at, '2026-09-08T10:00:00Z');
});

Deno.test('toStaffUser handles a profile with no matching auth user (defensive, should not normally happen)', () => {
  const profile: ProfileLike = { id: 'u3', full_name: 'Ghost', email: 'ghost@carebridge.in', role: 'finance', created_at: '2026-09-01T00:00:00Z' };
  const result = toStaffUser(profile, null);
  assertEquals(result.last_sign_in_at, null);
  assertEquals(result.invite_accepted, false);
});