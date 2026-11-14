-- Google Health connections: tokens unreachable by every client role. Run via
-- `supabase test db` (local only). Self-contained, rolled back at the end.

create extension if not exists pgtap with schema extensions;

begin;

select plan(14);

insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('a1000000-0000-0000-0000-0000000000a1', 'wc-admin@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('e1000000-0000-0000-0000-0000000000e1', 'wc-member@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('e2000000-0000-0000-0000-0000000000e2', 'wc-stranger@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated');
update public.profiles set role = 'admin' where id = 'a1000000-0000-0000-0000-0000000000a1';

insert into public.members (id, full_name) values ('d1000000-0000-0000-0000-0000000000d1', 'WC Member');
insert into public.member_links (member_id, user_id, is_self, relationship_label)
values ('d1000000-0000-0000-0000-0000000000d1', 'e1000000-0000-0000-0000-0000000000e1', true, 'Self');

-- As the service role (what the Edge Functions use)
set local role service_role;
select lives_ok(
  $$select public.store_wearable_connection('d1000000-0000-0000-0000-0000000000d1', 'google_health', 'refresh-1', 'scope-a', 'e1000000-0000-0000-0000-0000000000e1')$$,
  'service role stores a connection');
select is(public.get_wearable_refresh_token('d1000000-0000-0000-0000-0000000000d1', 'google_health'), 'refresh-1', 'service role reads the token back');
select lives_ok(
  $$select public.store_wearable_connection('d1000000-0000-0000-0000-0000000000d1', 'google_health', 'refresh-2', 'scope-b', 'e1000000-0000-0000-0000-0000000000e1')$$,
  'reconnecting replaces the token');
select is(public.get_wearable_refresh_token('d1000000-0000-0000-0000-0000000000d1', 'google_health'), 'refresh-2', 'token was replaced, not duplicated');
select is((select count(*)::int from public.wearable_connections), 1, 'still one connection row');
select is(
  (select count(*)::int from vault.secrets s join public.wearable_connections c on c.refresh_token_secret_id = s.id),
  1, 'token lives in vault');
reset role;

-- The member: status yes, token no
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'e1000000-0000-0000-0000-0000000000e1')::text, true);
select is((select status from public.get_wearable_connection_status('d1000000-0000-0000-0000-0000000000d1')), 'ok', 'member reads own connection status');
select is((select count(*)::int from public.wearable_connections), 0, 'member cannot select the connections table');
select throws_ok($$select public.get_wearable_refresh_token('d1000000-0000-0000-0000-0000000000d1', 'google_health')$$, '42501', null, 'member cannot read the token');
select throws_ok($$select public.store_wearable_connection('d1000000-0000-0000-0000-0000000000d1', 'google_health', 'x', 'x', null)$$, '42501', null, 'member cannot write a token');

-- Admin: no special access to tokens either
select set_config('request.jwt.claims', json_build_object('sub', 'a1000000-0000-0000-0000-0000000000a1')::text, true);
select throws_ok($$select public.get_wearable_refresh_token('d1000000-0000-0000-0000-0000000000d1', 'google_health')$$, '42501', null, 'admin cannot read the token');
select is((select count(*)::int from public.oauth_states), 0, 'admin cannot select oauth states');

-- Unlinked user
select set_config('request.jwt.claims', json_build_object('sub', 'e2000000-0000-0000-0000-0000000000e2')::text, true);
select throws_ok($$select * from public.get_wearable_connection_status('d1000000-0000-0000-0000-0000000000d1')$$, 'P0001', 'not_authorized', 'unlinked user cannot read status');
reset role;

-- Erasing the member cascades to the connection, and the trigger removes the
-- vault secret: a token must not outlive the member it belongs to.
create temp table doomed_secret as
  select refresh_token_secret_id as id from public.wearable_connections
   where member_id = 'd1000000-0000-0000-0000-0000000000d1';
delete from public.members where id = 'd1000000-0000-0000-0000-0000000000d1';
select is(
  (select count(*)::int from vault.secrets where id = (select id from doomed_secret)),
  0, 'vault secret removed when the member is deleted');

select * from finish();
rollback;
