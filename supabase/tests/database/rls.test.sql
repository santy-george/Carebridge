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

select plan(105);

-- Fixtures: two members (A owned by user A, B owned by user B), one
-- coordinator assigned to Member A only, one coordinator (g) assigned to
-- neither -- used below to prove the assigned-coordinator-only policies
-- actually reject an unassigned coordinator, not just accept everyone.
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('a0000000-0000-0000-0000-00000000000a', 'rls-test-member-a@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('b0000000-0000-0000-0000-00000000000b', 'rls-test-member-b@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('c0000000-0000-0000-0000-00000000000c', 'rls-test-coordinator@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('d0000000-0000-0000-0000-00000000000d', 'rls-test-family-son@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('19000000-0000-0000-0000-000000000019', 'rls-test-unassigned-coordinator@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('29000000-0000-0000-0000-000000000029', 'rls-test-linked-coordinator@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated');

update public.profiles set role = 'coordinator' where id in ('c0000000-0000-0000-0000-00000000000c', '19000000-0000-0000-0000-000000000019', '29000000-0000-0000-0000-000000000029');

insert into public.members (id, full_name, care_model)
values
  ('aa000000-0000-0000-0000-00000000aaaa', 'RLS Test Member A', 'self_care'),
  ('bb000000-0000-0000-0000-00000000bbbb', 'RLS Test Member B', 'self_care');

insert into public.member_links (member_id, user_id, relationship_label, is_self)
values
  ('aa000000-0000-0000-0000-00000000aaaa', 'a0000000-0000-0000-0000-00000000000a', 'Self', true),
  ('bb000000-0000-0000-0000-00000000bbbb', 'b0000000-0000-0000-0000-00000000000b', 'Self', true),
  -- Simulates a coordinator who redeemed a member invite code for a
  -- patient they are NOT assigned to -- the ordinary path any
  -- authenticated account (coordinator or not) can take via
  -- redeem_invite_code(), which has no coordinator exclusion. Deliberately
  -- a fresh fixture, not the shared unassigned-coordinator (19...019) one:
  -- reusing that identity would give it member_owns(A) = true too, and
  -- silently invalidate the existing "unassigned coordinator sees zero
  -- rows on Member A" assertions elsewhere in this file, which rely on
  -- that identity having NO relationship to Member A whatsoever.
  ('aa000000-0000-0000-0000-00000000aaaa', '29000000-0000-0000-0000-000000000029', 'Family member', false);

insert into public.member_invites (code, member_id, relationship_label, is_self, expires_at)
values
  ('VALIDCODE', 'aa000000-0000-0000-0000-00000000aaaa', 'Son', false, now() + interval '1 day'),
  ('EXPIREDCODE', 'aa000000-0000-0000-0000-00000000aaaa', 'Son', false, now() - interval '1 day');

insert into public.member_invites (code, member_id, relationship_label, used_at, used_by_user_id)
values ('USEDCODE', 'aa000000-0000-0000-0000-00000000aaaa', 'Daughter', now(), 'b0000000-0000-0000-0000-00000000000b');

insert into public.care_assignments (member_id, coordinator_id)
values ('aa000000-0000-0000-0000-00000000aaaa', 'c0000000-0000-0000-0000-00000000000c');

insert into public.upgrade_leads (member_id, requested_care_model, status)
values ('aa000000-0000-0000-0000-00000000aaaa', 'virtual_care', 'new');

insert into public.checkins (member_id, checkin_date, mood)
values
  ('aa000000-0000-0000-0000-00000000aaaa', current_date, 'good'),
  ('bb000000-0000-0000-0000-00000000bbbb', current_date, 'okay');

insert into public.sleep_sessions (member_id, device_vendor, started_at, ended_at, stage)
values
  ('aa000000-0000-0000-0000-00000000aaaa', 'apple_watch', now() - interval '8 hours', now() - interval '4 hours', 'asleep_core'),
  ('bb000000-0000-0000-0000-00000000bbbb', 'apple_watch', now() - interval '8 hours', now() - interval '4 hours', 'asleep_core');

insert into public.ecg_readings (member_id, device_vendor, recorded_at, classification, average_heart_rate)
values
  ('aa000000-0000-0000-0000-00000000aaaa', 'apple_watch', now(), 'sinus_rhythm', 68),
  ('bb000000-0000-0000-0000-00000000bbbb', 'apple_watch', now(), 'sinus_rhythm', 71);

insert into public.rhythm_events (member_id, device_vendor, recorded_at)
values
  ('aa000000-0000-0000-0000-00000000aaaa', 'apple_watch', now()),
  ('bb000000-0000-0000-0000-00000000bbbb', 'apple_watch', now());

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

-- === 2026-08-29: one checkin per member per day. Root cause of a real
-- bug -- resaving a check-in used to always INSERT, so Home's "latest
-- checkin" query (ordered only by checkin_date, no tiebreaker) could show
-- an arbitrary earlier same-day row instead of the member's actual latest
-- edit.
select throws_ok(
  $$ insert into public.checkins (member_id, checkin_date, mood) values ('aa000000-0000-0000-0000-00000000aaaa', current_date, 'low') $$,
  '23505',
  null,
  'A second checkins row for the same member+day violates the new unique constraint'
);

select lives_ok(
  $$ insert into public.checkins (member_id, checkin_date, mood, wellness_score)
     values ('aa000000-0000-0000-0000-00000000aaaa', current_date, 'low', 42)
     on conflict (member_id, checkin_date) do update set mood = excluded.mood, wellness_score = excluded.wellness_score $$,
  'Upserting on (member_id, checkin_date) -- what CheckIn.tsx now does -- replaces today''s row instead of erroring'
);

select is(
  (select count(*)::int from public.checkins where member_id = 'aa000000-0000-0000-0000-00000000aaaa' and checkin_date = current_date),
  1,
  'Still exactly one row for Member A today after the upsert -- no duplicate was created'
);

select is(
  (select wellness_score::int from public.checkins where member_id = 'aa000000-0000-0000-0000-00000000aaaa' and checkin_date = current_date),
  42,
  'The upsert actually replaced the row''s value, not just left the original insert in place'
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
  'Coordinator reads member_links only for members they are assigned to (2026-08-29: scoped down from all-member_links) -- sees Member A''s self-link + the audit-fixture linked-coordinator row, not Member B''s'
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

-- === 2026-08-29 RLS audit fix: an UNASSIGNED coordinator who is merely
-- linked (member_owns true, e.g. via redeem_invite_code) must NOT be able
-- to bypass member_update_preserves_clinical_fields via the global
-- is_coordinator() check that used to live in this policy's WITH CHECK.
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '29000000-0000-0000-0000-000000000029')::text, true);

select throws_ok(
  $$ update public.members set care_model = 'virtual_care' where id = 'aa000000-0000-0000-0000-00000000aaaa' $$,
  '42501',
  null,
  'An unassigned coordinator who is only linked (not assigned) to Member A cannot change care_model -- closes the 2026-08-29 audit finding'
);

select is(
  (select care_model::text from public.members where id = 'aa000000-0000-0000-0000-00000000aaaa'),
  'direct_care',
  'Member A''s care_model is unchanged after the blocked unassigned-linked-coordinator attempt'
);

select lives_ok(
  $$ update public.members set phone = '8888888888' where id = 'aa000000-0000-0000-0000-00000000aaaa' $$,
  'The same unassigned-linked coordinator can still update a non-clinical contact field, same as any other linked non-coordinator account -- the fix does not remove legitimate linked-account access'
);

-- === 2026-08-29: "any coordinator can see anything" scoped down to
-- assignment-only (SOS alerts excepted). New restrictions this migration
-- introduces, not covered by any earlier test.
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'c0000000-0000-0000-0000-00000000000c')::text, true);

select throws_ok(
  $$ insert into public.care_assignments (member_id, coordinator_id) values ('bb000000-0000-0000-0000-00000000bbbb', 'c0000000-0000-0000-0000-00000000000c') $$,
  '42501',
  null,
  'A coordinator can no longer self-assign to a new patient -- care_assignments has no client-writable policy left'
);

update public.care_assignments set is_active = false
  where member_id = 'aa000000-0000-0000-0000-00000000aaaa' and coordinator_id = 'c0000000-0000-0000-0000-00000000000c';

select is(
  (select is_active from public.care_assignments where member_id = 'aa000000-0000-0000-0000-00000000aaaa' and coordinator_id = 'c0000000-0000-0000-0000-00000000000c'),
  true,
  'A coordinator can no longer deactivate even their own existing assignment -- with no UPDATE policy at all, RLS silently matches zero rows (no error, same as any other read-side RLS filter) rather than throwing, so the row is simply left unchanged'
);

select is(
  (select count(*)::int from public.care_assignments where coordinator_id = 'c0000000-0000-0000-0000-00000000000c'),
  1,
  'The assigned coordinator can still read their own care_assignments row (needed for e.g. Admin''s MemberList "Assigned to" column)'
);

select lives_ok(
  $$ update public.upgrade_leads set status = 'contacted' where member_id = 'aa000000-0000-0000-0000-00000000aaaa' $$,
  'The assigned coordinator can still manage an upgrade lead for their own assigned member'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '19000000-0000-0000-0000-000000000019')::text, true);

select is(
  (select count(*)::int from public.upgrade_leads where member_id = 'aa000000-0000-0000-0000-00000000aaaa'),
  0,
  'An unassigned coordinator no longer sees Member A''s upgrade lead at all -- leads are not treated like SOS'
);

update public.upgrade_leads set status = 'declined' where member_id = 'aa000000-0000-0000-0000-00000000aaaa';

reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'c0000000-0000-0000-0000-00000000000c')::text, true);

select is(
  (select status::text from public.upgrade_leads where member_id = 'aa000000-0000-0000-0000-00000000aaaa'),
  'contacted',
  'An unassigned coordinator''s update was silently a no-op (RLS matched zero rows, no UPDATE policy applies) -- the lead status is still whatever the assigned coordinator set it to earlier, not "declined"'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '19000000-0000-0000-0000-000000000019')::text, true);

select is(
  (select count(*)::int from public.profiles where id = 'a0000000-0000-0000-0000-00000000000a'),
  0,
  'An unassigned coordinator can no longer read Member A''s linked-account profile (2026-08-29: profiles scoped to assigned coordinators)'
);

select throws_ok(
  $$ select public.reactivate_consent('a0000000-0000-0000-0000-00000000000a', 'aa000000-0000-0000-0000-00000000aaaa') $$,
  '42501',
  'only the assigned coordinator can reactivate consent',
  'An unassigned coordinator cannot reactivate Member A''s consent -- reactivate_consent now requires is_assigned_coordinator, not just is_coordinator'
);

-- === Wearable expansion tables: sleep_sessions, ecg_readings, rhythm_events ===
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-00000000000a')::text, true);

select is(
  (select count(*)::int from public.sleep_sessions where member_id = 'aa000000-0000-0000-0000-00000000aaaa'),
  1,
  'Member A can SELECT their own sleep_sessions row'
);
select is(
  (select count(*)::int from public.sleep_sessions where member_id = 'bb000000-0000-0000-0000-00000000bbbb'),
  0,
  'Member A gets zero rows querying Member B sleep_sessions'
);
select throws_ok(
  $$ insert into public.sleep_sessions (member_id, device_vendor, started_at, ended_at, stage) values ('aa000000-0000-0000-0000-00000000aaaa', 'apple_watch', now(), now(), 'awake') $$,
  '42501',
  null,
  'Member A cannot INSERT into sleep_sessions -- writes are service_role-only via ingest-wearable'
);

select is(
  (select count(*)::int from public.ecg_readings where member_id = 'aa000000-0000-0000-0000-00000000aaaa'),
  1,
  'Member A can SELECT their own ecg_readings row'
);
select is(
  (select count(*)::int from public.ecg_readings where member_id = 'bb000000-0000-0000-0000-00000000bbbb'),
  0,
  'Member A gets zero rows querying Member B ecg_readings'
);
select throws_ok(
  $$ insert into public.ecg_readings (member_id, device_vendor, recorded_at, classification) values ('aa000000-0000-0000-0000-00000000aaaa', 'apple_watch', now(), 'sinus_rhythm') $$,
  '42501',
  null,
  'Member A cannot INSERT into ecg_readings -- writes are service_role-only via ingest-wearable'
);

select is(
  (select count(*)::int from public.rhythm_events where member_id = 'aa000000-0000-0000-0000-00000000aaaa'),
  1,
  'Member A can SELECT their own rhythm_events row'
);
select is(
  (select count(*)::int from public.rhythm_events where member_id = 'bb000000-0000-0000-0000-00000000bbbb'),
  0,
  'Member A gets zero rows querying Member B rhythm_events'
);
select throws_ok(
  $$ insert into public.rhythm_events (member_id, device_vendor, recorded_at) values ('aa000000-0000-0000-0000-00000000aaaa', 'apple_watch', now()) $$,
  '42501',
  null,
  'Member A cannot INSERT into rhythm_events -- writes are service_role-only via ingest-wearable'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'c0000000-0000-0000-0000-00000000000c')::text, true);

select is(
  (select count(*)::int from public.sleep_sessions where member_id = 'aa000000-0000-0000-0000-00000000aaaa'),
  1,
  'Assigned coordinator can SELECT Member A sleep_sessions'
);
select is(
  (select count(*)::int from public.ecg_readings where member_id = 'aa000000-0000-0000-0000-00000000aaaa'),
  1,
  'Assigned coordinator can SELECT Member A ecg_readings'
);
select is(
  (select count(*)::int from public.rhythm_events where member_id = 'aa000000-0000-0000-0000-00000000aaaa'),
  1,
  'Assigned coordinator can SELECT Member A rhythm_events'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '19000000-0000-0000-0000-000000000019')::text, true);

select is(
  (select count(*)::int from public.sleep_sessions where member_id = 'aa000000-0000-0000-0000-00000000aaaa'),
  0,
  'Unassigned coordinator gets zero rows querying Member A sleep_sessions'
);
select is(
  (select count(*)::int from public.ecg_readings where member_id = 'aa000000-0000-0000-0000-00000000aaaa'),
  0,
  'Unassigned coordinator gets zero rows querying Member A ecg_readings'
);
select is(
  (select count(*)::int from public.rhythm_events where member_id = 'aa000000-0000-0000-0000-00000000aaaa'),
  0,
  'Unassigned coordinator gets zero rows querying Member A rhythm_events'
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

-- === Finding 1 (task-1 review): ownership check on withdrawal requests ===
-- The family "Son" user (d) is now linked to Member A (via the invite code
-- just redeemed above) but has no member_links row for Member B at all --
-- exactly the "no relationship to this member" case the fix must reject.
select throws_ok(
  $$ select public.request_consent_withdrawal('bb000000-0000-0000-0000-00000000bbbb', 'self') $$,
  'P0001',
  'not_linked_to_member',
  'A user with no member_links to Member B cannot call request_consent_withdrawal for Member B'
);

select throws_ok(
  $$ insert into public.consents (user_id, member_id, event) values ('d0000000-0000-0000-0000-00000000000d', 'bb000000-0000-0000-0000-00000000bbbb', 'given') $$,
  '42501',
  null,
  'A user with no member_links to Member B cannot insert a forged ''given'' consents row for Member B either'
);

select is(
  (select count(*)::int from public.consents where member_id = 'bb000000-0000-0000-0000-00000000bbbb'),
  0,
  'Neither the rejected request_consent_withdrawal call nor the rejected insert left any row on Member B''s consent history'
);

-- === Simulate consent tracking: Member A gives consent, then requests withdrawal ===
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-00000000000a')::text, true);

-- === Final-review finding 5: direct client inserts must have member_id null ===
-- Previously this insert was ALLOWED (the policy permitted 'given' + a
-- member_id the caller owns). No legitimate direct-client caller ever does
-- that -- Signup.tsx inserts member_id-less rows, and reactivate_consent() is
-- SECURITY DEFINER and bypasses this policy -- while it let any linked user
-- forge a row indistinguishable from a genuine coordinator reactivation.
select throws_ok(
  $$ insert into public.consents (user_id, member_id, event) values ('a0000000-0000-0000-0000-00000000000a', 'aa000000-0000-0000-0000-00000000aaaa', 'given') $$,
  '42501',
  null,
  'Member A cannot insert a ''given'' consents row WITH a member_id even for a member they own -- direct client inserts are now unconditionally restricted to member_id is null'
);

select lives_ok(
  $$ insert into public.consents (user_id, event, subject_email) values ('a0000000-0000-0000-0000-00000000000a', 'given', 'rls-test-member-a@carebridgehome.test') $$,
  'Member A can still insert the signup-shaped consent-given event (member_id null) with a subject_email snapshot'
);

select is(
  (select subject_email from public.consents where user_id = 'a0000000-0000-0000-0000-00000000000a' and event = 'given' and member_id is null),
  'rls-test-member-a@carebridgehome.test',
  'The signup-shaped ''given'' row carries the subject_email snapshot that survives the account''s own deletion'
);

select throws_ok(
  $$ insert into public.consents (user_id, member_id, event, scope) values ('a0000000-0000-0000-0000-00000000000a', 'aa000000-0000-0000-0000-00000000aaaa', 'withdrawal_requested', 'self') $$,
  '42501',
  null,
  'Member A cannot insert a withdrawal_requested event directly -- only event=''given'' is allowed via direct client insert'
);

-- === Finding 2 (task-1 review): profiles.consent_status locked down ===
-- consent_status must only move via request_consent_withdrawal() /
-- reactivate_consent() (both SECURITY DEFINER, bypass RLS), never a
-- direct client UPDATE -- even though the caller is updating their own
-- row, which the broad "profile owner updates own profile" policy would
-- otherwise allow in full.
select throws_ok(
  $$ update public.profiles set consent_status = 'withdrawal_pending' where id = 'a0000000-0000-0000-0000-00000000000a' $$,
  '42501',
  null,
  'Member A cannot directly UPDATE their own consent_status column -- RLS WITH CHECK rejects the row'
);

select is(
  (select consent_status from public.profiles where id = 'a0000000-0000-0000-0000-00000000000a'),
  'active',
  'consent_status on Member A remains unchanged (active) after the rejected direct-UPDATE attempt'
);

select lives_ok(
  $$ update public.profiles set full_name = 'Test A Renamed' where id = 'a0000000-0000-0000-0000-00000000000a' $$,
  'Member A can still directly update other profile fields (full_name) -- the column lockdown is scoped to consent_status only'
);

select is(
  (select full_name from public.profiles where id = 'a0000000-0000-0000-0000-00000000000a'),
  'Test A Renamed',
  'The full_name update by Member A actually applied'
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

-- === Final-review finding 2: the audit row must carry identity of its own,
-- not just FKs that get nulled out by the erasure it records ===
select is(
  (select subject_email from public.consents where user_id = 'a0000000-0000-0000-0000-00000000000a' and event = 'withdrawal_requested'),
  'rls-test-member-a@carebridgehome.test',
  'request_consent_withdrawal snapshots the requester''s email onto the audit row'
);

select is(
  (select member_name_snapshot from public.consents where user_id = 'a0000000-0000-0000-0000-00000000000a' and event = 'withdrawal_requested'),
  'RLS Test Member A',
  'request_consent_withdrawal snapshots the member''s name onto the audit row'
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
  1,
  '2026-08-29: coordinator consent visibility scoped to assignment -- sees only Member A''s withdrawal_requested row (member_id set); Member A''s signup "given" row has member_id NULL (is_assigned_coordinator(NULL) is false, so it stays invisible even to their own assigned coordinator) and Member B''s withdrawal_requested row is invisible since the coordinator isn''t assigned to Member B'
);

select is(
  (
    select array_agg(id order by id) from public.members
    where id in ('aa000000-0000-0000-0000-00000000aaaa', 'bb000000-0000-0000-0000-00000000bbbb')
  ),
  array['aa000000-0000-0000-0000-00000000aaaa'::uuid],
  '2026-08-29: the "any coordinator reads member with withdrawal request" exception was removed -- the assigned coordinator sees only Member A (their actual assignment), not Member B'
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

-- reactivate_consent is SECURITY DEFINER, so the tightened member_id-must-be-
-- null insert policy above does not apply to it: it still writes the
-- 'given' + member_id row that Admin's History reads, and now stamps the
-- acting coordinator onto it.
select is(
  (select count(*)::int from public.consents where user_id = 'a0000000-0000-0000-0000-00000000000a' and event = 'given' and member_id = 'aa000000-0000-0000-0000-00000000aaaa'),
  1,
  'reactivate_consent (SECURITY DEFINER) still writes a ''given'' row WITH a member_id, unaffected by the tightened direct-insert policy'
);

select is(
  (select actor_user_id from public.consents where user_id = 'a0000000-0000-0000-0000-00000000000a' and event = 'given' and member_id is not null),
  'c0000000-0000-0000-0000-00000000000c'::uuid,
  'reactivate_consent records which coordinator performed the reactivation (actor_user_id)'
);

select is(
  (select actor_email from public.consents where user_id = 'a0000000-0000-0000-0000-00000000000a' and event = 'given' and member_id is not null),
  'rls-test-coordinator@carebridgehome.test',
  'reactivate_consent records the acting coordinator''s email, which survives even that coordinator''s account being deleted'
);

select is(
  (select member_name_snapshot from public.consents where user_id = 'a0000000-0000-0000-0000-00000000000a' and event = 'given' and member_id is not null),
  'RLS Test Member A',
  'reactivate_consent snapshots the member name onto the reactivation row too'
);

-- === Simulate a non-coordinator trying to reactivate someone else's consent ===
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'd0000000-0000-0000-0000-00000000000d')::text, true);

select throws_ok(
  $$ select public.reactivate_consent('b0000000-0000-0000-0000-00000000000b', 'bb000000-0000-0000-0000-00000000bbbb') $$,
  '42501',
  'only the assigned coordinator can reactivate consent',
  'A non-coordinator (the family "Son" user) cannot reactivate someone else''s consent'
);

-- === Critical fix (task-9 review): consents.user_id must survive deletion
-- of the auth.users row it references. erase-consent-withdrawal inserts a
-- withdrawal_verified consents row for a user and then deletes that same
-- auth.users row in the same request -- if the FK were ON DELETE CASCADE
-- (as it originally was), that insert-then-delete ordering wouldn't matter:
-- Postgres evaluates the cascade against whatever rows exist at the moment
-- of deletion, so the audit row just written would be wiped out along with
-- it. Runs as the unrestricted test-runner role (bypasses RLS), same as the
-- fixture setup at the top of this file.
reset role;

insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values ('e0000000-0000-0000-0000-00000000000e', 'rls-test-erasure-subject@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated');

insert into public.consents (user_id, member_id, event, scope)
values ('e0000000-0000-0000-0000-00000000000e', 'aa000000-0000-0000-0000-00000000aaaa', 'withdrawal_verified', 'self');

delete from auth.users where id = 'e0000000-0000-0000-0000-00000000000e';

select is(
  (select count(*)::int from public.consents where member_id = 'aa000000-0000-0000-0000-00000000aaaa' and event = 'withdrawal_verified'),
  1,
  'The withdrawal_verified consents row survives deletion of the auth.users row it references, instead of being cascade-deleted'
);

select is(
  (select user_id from public.consents where member_id = 'aa000000-0000-0000-0000-00000000aaaa' and event = 'withdrawal_verified'),
  null::uuid,
  'consents.user_id is set to null (not cascade-deleted) after the referenced auth.users row is deleted -- ON DELETE SET NULL, mirroring member_id'
);

-- === Final-review finding 2 (Critical): a full scope:'all' erasure must not
-- leave an anonymous audit row ===
--
-- Both consents FKs are `on delete set null`, which is what keeps the row
-- alive -- but it also means that after a scope:'all' erasure (members row
-- deleted AND every linked auth.users row deleted) the surviving
-- withdrawal_verified row would have NO identifying information at all: only
-- id, event, scope, policy_version, created_at. DPDP needs provable "we
-- erased X's data, verified by coordinator Y, at time T". The four snapshot
-- columns added in 20260810150000_consent_audit_snapshot_columns.sql are
-- plain text with no FK, so nothing ever nulls them. This block reproduces
-- the exact erasure the Edge Function performs and proves that.
reset role;

insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values ('f0000000-0000-0000-0000-00000000000f', 'rls-test-erase-all-subject@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated');

insert into public.members (id, full_name, care_model)
values ('ff000000-0000-0000-0000-00000000ffff', 'RLS Test Erased Member', 'self_care');

insert into public.member_links (member_id, user_id, relationship_label, is_self)
values ('ff000000-0000-0000-0000-00000000ffff', 'f0000000-0000-0000-0000-00000000000f', 'Self', true);

-- Exactly the insert the Edge Function performs, with the snapshots captured
-- BEFORE any deletion.
insert into public.consents (user_id, member_id, event, scope, subject_email, member_name_snapshot, actor_user_id, actor_email)
values (
  'f0000000-0000-0000-0000-00000000000f',
  'ff000000-0000-0000-0000-00000000ffff',
  'withdrawal_verified',
  'all',
  'rls-test-erase-all-subject@carebridgehome.test',
  'RLS Test Erased Member',
  'c0000000-0000-0000-0000-00000000000c',
  'rls-test-coordinator@carebridgehome.test'
);

-- The erasure itself: member row (cascading every clinical/operational table)
-- then every linked auth.users login.
delete from public.members where id = 'ff000000-0000-0000-0000-00000000ffff';
delete from auth.users where id = 'f0000000-0000-0000-0000-00000000000f';

select is(
  (select count(*)::int from public.consents where subject_email = 'rls-test-erase-all-subject@carebridgehome.test'),
  1,
  'The withdrawal_verified row survives a full scope:''all'' erasure (both the members row and the linked auth.users row deleted)'
);

select is(
  (select user_id from public.consents where subject_email = 'rls-test-erase-all-subject@carebridgehome.test'),
  null::uuid,
  'Its user_id FK is nulled by the erasure, as designed'
);

select is(
  (select member_id from public.consents where subject_email = 'rls-test-erase-all-subject@carebridgehome.test'),
  null::uuid,
  'Its member_id FK is nulled by the erasure, as designed'
);

select is(
  (select member_name_snapshot from public.consents where subject_email = 'rls-test-erase-all-subject@carebridgehome.test'),
  'RLS Test Erased Member',
  'member_name_snapshot is still readable after the members row is gone -- plain text, no FK to null out'
);

select is(
  (select actor_email from public.consents where subject_email = 'rls-test-erase-all-subject@carebridgehome.test'),
  'rls-test-coordinator@carebridgehome.test',
  'actor_email records which coordinator verified the erasure, and is still readable afterwards'
);

select is(
  (select actor_user_id from public.consents where subject_email = 'rls-test-erase-all-subject@carebridgehome.test'),
  'c0000000-0000-0000-0000-00000000000c'::uuid,
  'actor_user_id still points at the coordinator while that account exists'
);

-- ...and the actor identity outlives the coordinator's own account too.
delete from auth.users where id = 'c0000000-0000-0000-0000-00000000000c';

select is(
  (select actor_user_id from public.consents where subject_email = 'rls-test-erase-all-subject@carebridgehome.test'),
  null::uuid,
  'actor_user_id is nulled if the coordinator''s account is later deleted (on delete set null, not cascade -- the row is not destroyed)'
);

select is(
  (select actor_email from public.consents where subject_email = 'rls-test-erase-all-subject@carebridgehome.test'),
  'rls-test-coordinator@carebridgehome.test',
  'actor_email still identifies who verified the erasure even after that coordinator''s account is deleted -- the whole point of the denormalized snapshot'
);

-- === device_push_tokens: owner-only, full lifecycle ===
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-00000000000a')::text, true);

select lives_ok(
  $$ insert into public.device_push_tokens (user_id, platform, token) values ('a0000000-0000-0000-0000-00000000000a', 'ios', 'token-a-iphone') $$,
  'Member A can register their own push token'
);

select is(
  (select count(*)::int from public.device_push_tokens where user_id = 'a0000000-0000-0000-0000-00000000000a'),
  1,
  'Member A sees their own push token'
);

select throws_ok(
  $$ insert into public.device_push_tokens (user_id, platform, token) values ('b0000000-0000-0000-0000-00000000000b', 'ios', 'forged-token') $$,
  '42501',
  null,
  'Member A cannot register a push token under Member B''s user_id'
);

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'b0000000-0000-0000-0000-00000000000b')::text, true);

select is(
  (select count(*)::int from public.device_push_tokens where user_id = 'a0000000-0000-0000-0000-00000000000a'),
  0,
  'Member B gets zero rows querying Member A''s push tokens (RLS filters silently)'
);

select lives_ok(
  $$ insert into public.device_push_tokens (user_id, platform, token) values ('b0000000-0000-0000-0000-00000000000b', 'android', 'token-b-pixel') $$,
  'Member B can register their own push token'
);

select is(
  (select count(*)::int from public.device_push_tokens where token = 'token-a-iphone') ,
  0,
  'Member B''s UPDATE/DELETE reach is scoped to their own rows -- Member A''s token is invisible, not just unwritable'
);

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-00000000000a')::text, true);

select lives_ok(
  $$ delete from public.device_push_tokens where user_id = 'a0000000-0000-0000-0000-00000000000a' and token = 'token-a-iphone' $$,
  'Member A can delete their own push token (e.g. on sign-out)'
);

select is(
  (select count(*)::int from public.device_push_tokens where user_id = 'a0000000-0000-0000-0000-00000000000a'),
  0,
  'Member A''s push token is gone after deletion, Member B''s is untouched'
);

-- === 2026-08-15 RLS audit fixes ===

-- --- profiles.role self-escalation (CRITICAL) ---
-- "profile owner updates own profile" preserved consent_status but never
-- checked role -- any member could UPDATE their own row to role='coordinator'
-- and gain every coordinator-gated policy in the schema. Fixed by
-- 20260815160000_lock_down_profile_role_column.sql.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-00000000000a')::text, true);

select throws_ok(
  $$ update public.profiles set role = 'coordinator' where id = 'a0000000-0000-0000-0000-00000000000a' $$,
  '42501',
  null,
  'Member A cannot self-promote to coordinator via a direct UPDATE -- RLS WITH CHECK rejects the row'
);

select is(
  (select role::text from public.profiles where id = 'a0000000-0000-0000-0000-00000000000a'),
  'member',
  'role on Member A remains ''member'' after the rejected self-promotion attempt'
);

-- --- WITH CHECK assignment gaps: care_team, preventive_plan_goals, storage.objects ---
-- These policies checked is_assigned_coordinator() in USING but not WITH
-- CHECK, so INSERT (which only evaluates WITH CHECK) let ANY coordinator
-- write rows for members they aren't assigned to. Fixed by
-- 20260815161000_close_assigned_coordinator_with_check_gaps.sql. Coordinator
-- g0000000... ('19000000-...019') is a coordinator with zero care_assignments
-- rows -- deliberately unassigned to either Member A or B.
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '19000000-0000-0000-0000-000000000019')::text, true);

select throws_ok(
  $$ insert into public.care_team (member_id, role_label, name) values ('aa000000-0000-0000-0000-00000000aaaa', 'Physio', 'Unassigned Coordinator Injection') $$,
  '42501',
  null,
  'An unassigned coordinator cannot INSERT a care_team row for Member A'
);

select throws_ok(
  $$ insert into public.preventive_plan_goals (member_id, title) values ('aa000000-0000-0000-0000-00000000aaaa', 'Unassigned Coordinator Injection') $$,
  '42501',
  null,
  'An unassigned coordinator cannot INSERT a preventive_plan_goals row for Member A'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('documents', 'aa000000-0000-0000-0000-00000000aaaa/unassigned-coordinator-injection.txt') $$,
  '42501',
  null,
  'An unassigned coordinator cannot INSERT a storage object into Member A''s documents folder'
);

-- Coordinator c's auth.users row was deleted earlier in this file (the
-- "actor identity outlives the coordinator's own account" block above), which
-- cascade-deleted their profiles row and therefore their care_assignments row
-- too -- so c is no longer a valid assigned coordinator for anything by this
-- point in the suite. Use a fresh coordinator (still alive) to prove the
-- legitimate path, rather than reusing c.
reset role;

insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values ('39000000-0000-0000-0000-000000000039', 'rls-test-second-coordinator@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated');
update public.profiles set role = 'coordinator' where id = '39000000-0000-0000-0000-000000000039';
insert into public.care_assignments (member_id, coordinator_id) values ('aa000000-0000-0000-0000-00000000aaaa', '39000000-0000-0000-0000-000000000039');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '39000000-0000-0000-0000-000000000039')::text, true);

select lives_ok(
  $$ insert into public.care_team (member_id, role_label, name) values ('aa000000-0000-0000-0000-00000000aaaa', 'Physio', 'Legit Assigned Coordinator Entry') $$,
  'The assigned coordinator can still INSERT a care_team row for Member A -- the fix does not break the legitimate path'
);

select lives_ok(
  $$ insert into public.preventive_plan_goals (member_id, title) values ('aa000000-0000-0000-0000-00000000aaaa', 'Legit Assigned Coordinator Goal') $$,
  'The assigned coordinator can still INSERT a preventive_plan_goals row for Member A'
);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('documents', 'aa000000-0000-0000-0000-00000000aaaa/assigned-coordinator-upload.txt') $$,
  'The assigned coordinator can still INSERT a storage object into Member A''s documents folder'
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
