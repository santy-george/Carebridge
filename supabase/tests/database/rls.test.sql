-- RLS isolation tests. Run via `supabase test db` (local Docker stack only,
-- never against the hosted Mumbai project). Self-contained: creates its own
-- fixtures inside a transaction that's rolled back at the end, so it never
-- pollutes seed.sql data.
--
-- Session simulation: auth.uid() reads request.jwt.claims->>'sub', which is
-- exactly what a real PostgREST request sets from the verified JWT -- so
-- set_config + `set local role` is a faithful simulation without a real login.

create extension if not exists pgtap with schema extensions;

begin;

select plan(34);

-- Fixtures: two members (A owned by user A, B owned by user B), one
-- coordinator assigned to Member A only.
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('a0000000-0000-0000-0000-00000000000a', 'rls-test-member-a@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('b0000000-0000-0000-0000-00000000000b', 'rls-test-member-b@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('c0000000-0000-0000-0000-00000000000c', 'rls-test-coordinator@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('d0000000-0000-0000-0000-00000000000d', 'rls-test-family-son@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated');

update public.profiles set role = 'coordinator' where id = 'c0000000-0000-0000-0000-00000000000c';

insert into public.members (id, full_name, care_model)
values
  ('aa000000-0000-0000-0000-00000000aaaa', 'RLS Test Member A', 'self_care'),
  ('bb000000-0000-0000-0000-00000000bbbb', 'RLS Test Member B', 'self_care');

insert into public.member_links (member_id, user_id, relationship_label, is_self)
values
  ('aa000000-0000-0000-0000-00000000aaaa', 'a0000000-0000-0000-0000-00000000000a', 'Self', true),
  ('bb000000-0000-0000-0000-00000000bbbb', 'b0000000-0000-0000-0000-00000000000b', 'Self', true);

insert into public.member_invites (code, member_id, relationship_label, is_self, expires_at)
values
  ('VALIDCODE', 'aa000000-0000-0000-0000-00000000aaaa', 'Son', false, now() + interval '1 day'),
  ('EXPIREDCODE', 'aa000000-0000-0000-0000-00000000aaaa', 'Son', false, now() - interval '1 day');

insert into public.member_invites (code, member_id, relationship_label, used_at, used_by_user_id)
values ('USEDCODE', 'aa000000-0000-0000-0000-00000000aaaa', 'Daughter', now(), 'b0000000-0000-0000-0000-00000000000b');

insert into public.care_assignments (member_id, coordinator_id)
values ('aa000000-0000-0000-0000-00000000aaaa', 'c0000000-0000-0000-0000-00000000000c');

insert into public.checkins (member_id, checkin_date, mood)
values
  ('aa000000-0000-0000-0000-00000000aaaa', current_date, 'good'),
  ('bb000000-0000-0000-0000-00000000bbbb', current_date, 'okay');

-- === Simulate Member A's session ===
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-00000000000a')::text, true);

select is(
  (select count(*)::int from public.checkins where member_id = 'aa000000-0000-0000-0000-00000000aaaa'),
  1,
  'Member A can SELECT their own checkin'
);

select is(
  (select count(*)::int from public.checkins where member_id = 'bb000000-0000-0000-0000-00000000bbbb'),
  0,
  'Member A gets zero rows querying Member B checkins (RLS filters silently, no error)'
);

select throws_ok(
  $$ insert into public.checkins (member_id, checkin_date, mood) values ('bb000000-0000-0000-0000-00000000bbbb', current_date, 'low') $$,
  '42501',
  null,
  'Member A INSERT into Member B checkins throws an RLS policy violation'
);

select is(
  (select count(*)::int from public.member_links where member_id = 'aa000000-0000-0000-0000-00000000aaaa'),
  1,
  'Member A can SELECT their own member_links row'
);

select is(
  (select count(*)::int from public.member_links where member_id = 'bb000000-0000-0000-0000-00000000bbbb'),
  0,
  'Member A gets zero rows querying Member B member_links (RLS filters silently)'
);

select is(
  (select count(*)::int from public.member_invites),
  0,
  'A non-coordinator authenticated user (Member A) sees zero rows on member_invites -- no policy grants direct read access'
);

-- Column-scoped UPDATE restriction (finding 3): a linked, non-coordinator
-- account may update contact fields but not clinical/assessment fields.
select lives_ok(
  $$ update public.members set phone = '9999999999' where id = 'aa000000-0000-0000-0000-00000000aaaa' $$,
  'Member A (linked, non-coordinator) can update their own contact field (phone)'
);

select is(
  (select phone from public.members where id = 'aa000000-0000-0000-0000-00000000aaaa'),
  '9999999999',
  'The phone update by Member A actually applied'
);

select throws_ok(
  $$ update public.members set care_model = 'virtual_care' where id = 'aa000000-0000-0000-0000-00000000aaaa' $$,
  '42501',
  null,
  'Member A (linked, non-coordinator) cannot change care_model -- RLS WITH CHECK rejects the row'
);

select is(
  (select care_model::text from public.members where id = 'aa000000-0000-0000-0000-00000000aaaa'),
  'self_care',
  'care_model on Member A remains unchanged (self_care) after the rejected update attempt'
);

-- === Simulate the assigned coordinator's session ===
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'c0000000-0000-0000-0000-00000000000c')::text, true);

-- Scoped to just the two fixtures (not a blanket select) so this isn't
-- fragile against other members becoming visible via unrelated broad
-- coordinator policies (e.g. any-coordinator access to a member with an
-- open sos_alerts/upgrade_leads row) or other seed data in the database --
-- this assertion is specifically about assignment-scoping between A and B.
select is(
  (
    select array_agg(id order by id) from public.members
    where id in ('aa000000-0000-0000-0000-00000000aaaa', 'bb000000-0000-0000-0000-00000000bbbb')
  ),
  array['aa000000-0000-0000-0000-00000000aaaa'::uuid],
  'Assigned coordinator sees exactly Member A when querying members, not Member B'
);

select lives_ok(
  $$ select count(*) from public.sos_alerts $$,
  'sos_alerts table is reachable by a coordinator session (broad-coordinator policy does not itself error)'
);

select is(
  (select count(*)::int from public.member_links where member_id in ('aa000000-0000-0000-0000-00000000aaaa', 'bb000000-0000-0000-0000-00000000bbbb')),
  2,
  'Coordinator reads all member_links rows'
);

select is(
  (select count(*)::int from public.member_invites),
  0,
  'A coordinator session also sees zero rows on member_invites -- no policy grants coordinators direct read access either'
);

select lives_ok(
  $$ update public.members set care_model = 'direct_care' where id = 'aa000000-0000-0000-0000-00000000aaaa' $$,
  'The assigned coordinator can still update care_model on Member A -- their own policy is unaffected by the stricter linked-account WITH CHECK'
);

select is(
  (select care_model::text from public.members where id = 'aa000000-0000-0000-0000-00000000aaaa'),
  'direct_care',
  'The coordinator''s care_model update actually applied'
);

-- === Simulate the family "Son" user redeeming invite codes ===
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'd0000000-0000-0000-0000-00000000000d')::text, true);

select is(
  public.redeem_invite_code('VALIDCODE'),
  'aa000000-0000-0000-0000-00000000aaaa'::uuid,
  'redeem_invite_code links the caller to the invite''s member and returns the member id'
);

select throws_ok(
  $$ select public.redeem_invite_code('EXPIREDCODE') $$,
  'P0001',
  'invalid_or_expired_code',
  'redeem_invite_code rejects an expired code'
);

select throws_ok(
  $$ select public.redeem_invite_code('USEDCODE') $$,
  'P0001',
  'invalid_or_expired_code',
  'redeem_invite_code rejects an already-used code'
);

-- === Simulate consent tracking: Member A gives consent, then requests withdrawal ===
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-00000000000a')::text, true);

select lives_ok(
  $$ insert into public.consents (user_id, member_id, event) values ('a0000000-0000-0000-0000-00000000000a', 'aa000000-0000-0000-0000-00000000aaaa', 'given') $$,
  'Member A can insert their own consent-given event'
);

select throws_ok(
  $$ insert into public.consents (user_id, member_id, event, scope) values ('a0000000-0000-0000-0000-00000000000a', 'aa000000-0000-0000-0000-00000000aaaa', 'withdrawal_requested', 'self') $$,
  '42501',
  null,
  'Member A cannot insert a withdrawal_requested event directly -- only event=''given'' is allowed via direct client insert'
);

select lives_ok(
  $$ select public.request_consent_withdrawal('aa000000-0000-0000-0000-00000000aaaa', 'self') $$,
  'Member A can call request_consent_withdrawal for their own member record'
);

select is(
  (select consent_status from public.profiles where id = 'a0000000-0000-0000-0000-00000000000a'),
  'withdrawal_pending',
  'request_consent_withdrawal moved Member A''s profile to withdrawal_pending'
);

select is(
  (select count(*)::int from public.consents where user_id = 'a0000000-0000-0000-0000-00000000000a' and event = 'withdrawal_requested' and scope = 'self'),
  1,
  'request_consent_withdrawal logged a withdrawal_requested/self row for Member A'
);

select lives_ok(
  $$ update public.consents set scope = 'all' where user_id = 'a0000000-0000-0000-0000-00000000000a' and event = 'withdrawal_requested' $$,
  'An UPDATE statement against consents does not itself error (no policy just means it matches zero rows)'
);

select is(
  (select scope::text from public.consents where user_id = 'a0000000-0000-0000-0000-00000000000a' and event = 'withdrawal_requested'),
  'self',
  'The consents row is unchanged after the UPDATE attempt -- no update policy exists, so RLS silently filters it to zero affected rows (immutable audit log)'
);

select is(
  (select count(*)::int from public.consents where user_id = 'b0000000-0000-0000-0000-00000000000b'),
  0,
  'Member A gets zero rows querying Member B''s consent history (RLS filters silently)'
);

-- Member B requests withdrawal too, so the coordinator visibility check
-- below has a real member-without-assignment case to prove against.
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'b0000000-0000-0000-0000-00000000000b')::text, true);

select lives_ok(
  $$ select public.request_consent_withdrawal('bb000000-0000-0000-0000-00000000bbbb', 'all') $$,
  'Member B (self-linked to Member B) can also request withdrawal for their own record'
);

-- === Simulate the assigned coordinator's session again, after both withdrawal requests ===
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'c0000000-0000-0000-0000-00000000000c')::text, true);

select is(
  (select count(*)::int from public.consents where user_id in ('a0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-00000000000b')),
  3,
  'Coordinator reads all consent history regardless of assignment -- Member A''s given + withdrawal_requested rows, plus Member B''s withdrawal_requested row'
);

select is(
  (
    select array_agg(id order by id) from public.members
    where id in ('aa000000-0000-0000-0000-00000000aaaa', 'bb000000-0000-0000-0000-00000000bbbb')
  ),
  array['aa000000-0000-0000-0000-00000000aaaa'::uuid, 'bb000000-0000-0000-0000-00000000bbbb'::uuid],
  'The assigned coordinator now also sees Member B (not their assignment) because Member B has a withdrawal_requested consents row -- the narrow coordinator-reads-member-with-withdrawal-request policy'
);

select lives_ok(
  $$ select public.reactivate_consent('a0000000-0000-0000-0000-00000000000a', 'aa000000-0000-0000-0000-00000000aaaa') $$,
  'The coordinator can reactivate Member A''s consent (false-alarm path)'
);

select is(
  (select consent_status from public.profiles where id = 'a0000000-0000-0000-0000-00000000000a'),
  'active',
  'reactivate_consent moved Member A''s profile back to active'
);

-- === Simulate a non-coordinator trying to reactivate someone else's consent ===
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'd0000000-0000-0000-0000-00000000000d')::text, true);

select throws_ok(
  $$ select public.reactivate_consent('b0000000-0000-0000-0000-00000000000b', 'bb000000-0000-0000-0000-00000000bbbb') $$,
  '42501',
  'only coordinators can reactivate consent',
  'A non-coordinator (the family "Son" user) cannot reactivate someone else''s consent'
);

-- === Simulate no session at all (anon) ===
reset role;
set local role anon;
select set_config('request.jwt.claims', '', true);

select is(
  (select count(*)::int from public.members),
  0,
  'anon role (no session) sees zero rows on members -- no accidental public-read policy'
);

select * from finish();

rollback;
