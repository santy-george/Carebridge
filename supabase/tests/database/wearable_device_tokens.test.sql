-- Device upload keys: no client role may read them. Run via
-- `supabase test db` (local only). Self-contained, rolled back at the end.

create extension if not exists pgtap with schema extensions;

begin;

select plan(3);

insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('a1000000-0000-0000-0000-0000000000a1', 'dt-admin@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('e1000000-0000-0000-0000-0000000000e1', 'dt-member@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated');
update public.profiles set role = 'admin' where id = 'a1000000-0000-0000-0000-0000000000a1';
insert into public.members (id, full_name) values ('d1000000-0000-0000-0000-0000000000d1', 'DT Member');
insert into public.member_links (member_id, user_id, is_self) values ('d1000000-0000-0000-0000-0000000000d1', 'e1000000-0000-0000-0000-0000000000e1', true);
insert into public.wearable_device_tokens (user_id, member_id, platform, token_hash)
values ('e1000000-0000-0000-0000-0000000000e1', 'd1000000-0000-0000-0000-0000000000d1', 'android', repeat('a', 64));

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'e1000000-0000-0000-0000-0000000000e1')::text, true);
select is((select count(*)::int from public.wearable_device_tokens), 0, 'the key owner cannot read key rows');
select set_config('request.jwt.claims', json_build_object('sub', 'a1000000-0000-0000-0000-0000000000a1')::text, true);
select is((select count(*)::int from public.wearable_device_tokens), 0, 'admin cannot read key rows');
reset role;

delete from public.members where id = 'd1000000-0000-0000-0000-0000000000d1';
select is((select count(*)::int from public.wearable_device_tokens), 0, 'keys are deleted with the member');

select * from finish();
rollback;
