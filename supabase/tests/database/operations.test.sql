-- Operations phase: coordinator/admin visit functions. Run via
-- `supabase test db` (local only). Self-contained, rolled back at the end.

create extension if not exists pgtap with schema extensions;

begin;

select plan(16);

insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('c1000000-0000-0000-0000-0000000000c1', 'op-coord-assigned@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('c2000000-0000-0000-0000-0000000000c2', 'op-coord-other@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('f1000000-0000-0000-0000-0000000000f1', 'op-staff-1@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('f2000000-0000-0000-0000-0000000000f2', 'op-staff-2@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated');

update public.profiles set role = 'coordinator', full_name = 'Coord One' where id = 'c1000000-0000-0000-0000-0000000000c1';
update public.profiles set role = 'coordinator' where id = 'c2000000-0000-0000-0000-0000000000c2';
update public.profiles set role = 'field_staff', full_name = 'Nurse One' where id = 'f1000000-0000-0000-0000-0000000000f1';
update public.profiles set role = 'field_staff', full_name = 'Nurse Two' where id = 'f2000000-0000-0000-0000-0000000000f2';

insert into public.staff_profiles (id, discipline, employment_status)
values
  ('f1000000-0000-0000-0000-0000000000f1', 'nurse', 'active'),
  ('f2000000-0000-0000-0000-0000000000f2', 'nurse', 'inactive');

insert into public.members (id, full_name, phone, address, location)
values ('d1000000-0000-0000-0000-0000000000d1', 'Op Test Member', '9999999999', '1 Test Road', 'Ernakulam');
insert into public.care_assignments (member_id, coordinator_id)
values ('d1000000-0000-0000-0000-0000000000d1', 'c1000000-0000-0000-0000-0000000000c1');

insert into public.visits (id, member_id, staff_id, service_type, scheduled_start, scheduled_end)
values
  ('b1000000-0000-0000-0000-0000000000b1', 'd1000000-0000-0000-0000-0000000000d1', 'f1000000-0000-0000-0000-0000000000f1', 'Nursing visit', now() + interval '1 hour', now() + interval '2 hours'),
  ('b2000000-0000-0000-0000-0000000000b2', 'd1000000-0000-0000-0000-0000000000d1', 'f1000000-0000-0000-0000-0000000000f1', 'Physio', now() + interval '3 hours', now() + interval '4 hours');
update public.visits set status = 'in_progress', checkin_at = now() where id = 'b2000000-0000-0000-0000-0000000000b2';

set local role authenticated;

-- Assigned coordinator
select set_config('request.jwt.claims', json_build_object('sub', 'c1000000-0000-0000-0000-0000000000c1')::text, true);
select is(
  (select count(*)::int from public.list_assignable_staff() where id = 'f1000000-0000-0000-0000-0000000000f1'),
  1, 'coordinator lists active field staff');
select is(
  (select count(*)::int from public.list_assignable_staff() where id = 'f2000000-0000-0000-0000-0000000000f2'),
  0, 'inactive staff are not assignable');
select is(
  (select staff_name from public.get_visits_admin(now() - interval '1 day', now() + interval '1 day') where id = 'b1000000-0000-0000-0000-0000000000b1'),
  'Nurse One', 'coordinator reads visits with staff name');
select is(
  (select count(*)::int from public.get_visits_admin(now() - interval '1 day', now() + interval '1 day')),
  2, 'coordinator sees both visits for the assigned member');
select lives_ok(
  $$insert into public.visits (member_id, staff_id, service_type, scheduled_start, scheduled_end, created_by)
    values ('d1000000-0000-0000-0000-0000000000d1', 'f1000000-0000-0000-0000-0000000000f1', 'Wound dressing', now() + interval '5 hours', now() + interval '6 hours', 'c1000000-0000-0000-0000-0000000000c1')$$,
  'assigned coordinator can schedule a visit for an active nurse');
select is(
  (select count(*)::int from public.get_visits_admin(now() - interval '1 day', now() + interval '1 day')),
  3, 'new visit appears in the admin list');
select lives_ok(
  $$select public.close_unattended_visit('b1000000-0000-0000-0000-0000000000b1', 'cancelled')$$,
  'coordinator can cancel a scheduled visit');
select is((select status::text from public.visits where id = 'b1000000-0000-0000-0000-0000000000b1'), 'cancelled', 'visit is cancelled');
select throws_ok(
  $$select public.close_unattended_visit('b2000000-0000-0000-0000-0000000000b2', 'missed')$$,
  'P0001', 'visit_not_closable', 'in-progress visit cannot be closed out by a coordinator');
select throws_ok(
  $$select public.close_unattended_visit('b1000000-0000-0000-0000-0000000000b1', 'completed')$$,
  'P0001', 'invalid_status', 'coordinator cannot set an arbitrary status');

-- Unassigned coordinator
select set_config('request.jwt.claims', json_build_object('sub', 'c2000000-0000-0000-0000-0000000000c2')::text, true);
select is(
  (select count(*)::int from public.get_visits_admin(now() - interval '1 day', now() + interval '1 day')),
  0, 'unassigned coordinator sees no visits');
select throws_ok(
  $$select public.close_unattended_visit('b1000000-0000-0000-0000-0000000000b1', 'missed')$$,
  'P0001', 'visit_not_found', 'unassigned coordinator cannot close a visit');

-- Field staff and anon are shut out
select set_config('request.jwt.claims', json_build_object('sub', 'f1000000-0000-0000-0000-0000000000f1')::text, true);
select throws_ok($$select * from public.list_assignable_staff()$$, 'P0001', 'not_authorized', 'field staff cannot list staff');
select throws_ok($$select * from public.get_visits_admin(now(), now() + interval '1 day')$$, 'P0001', 'not_authorized', 'field staff cannot use the admin visit list');
select throws_ok($$select * from public.get_visit_reports_admin(now(), now() + interval '1 day')$$, 'P0001', 'not_authorized', 'field staff cannot read admin reports');

reset role;
set local role anon;
select throws_ok($$select * from public.get_visits_admin(now(), now() + interval '1 day')$$, '42501', null, 'anon has no execute');

select * from finish();
rollback;
