-- Phase B: visits + visit_reports RLS and the field-staff functions. Run via
-- `supabase test db` (local only). Self-contained, rolled back at the end.

create extension if not exists pgtap with schema extensions;

begin;

select plan(23);

insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('c1000000-0000-0000-0000-0000000000c1', 'vt-coord-assigned@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('c2000000-0000-0000-0000-0000000000c2', 'vt-coord-other@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-0000000000a1', 'vt-admin@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('f1000000-0000-0000-0000-0000000000f1', 'vt-staff-1@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('f2000000-0000-0000-0000-0000000000f2', 'vt-staff-2@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('e1000000-0000-0000-0000-0000000000e1', 'vt-member@carebridgehome.test', crypt('test', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated');

update public.profiles set role = 'coordinator' where id in ('c1000000-0000-0000-0000-0000000000c1', 'c2000000-0000-0000-0000-0000000000c2');
update public.profiles set role = 'admin' where id = 'a1000000-0000-0000-0000-0000000000a1';
update public.profiles set role = 'field_staff' where id in ('f1000000-0000-0000-0000-0000000000f1', 'f2000000-0000-0000-0000-0000000000f2');

insert into public.members (id, full_name, phone, address, location)
values ('d1000000-0000-0000-0000-0000000000d1', 'Visit Test Member', '9999999999', '1 Test Road', 'Ernakulam');
insert into public.medical_profile (member_id, conditions, allergies)
values ('d1000000-0000-0000-0000-0000000000d1', '{diabetes}', '{penicillin}');
insert into public.care_assignments (member_id, coordinator_id)
values ('d1000000-0000-0000-0000-0000000000d1', 'c1000000-0000-0000-0000-0000000000c1');

insert into public.visits (id, member_id, staff_id, service_type, scheduled_start, scheduled_end)
values
  ('b1000000-0000-0000-0000-0000000000b1', 'd1000000-0000-0000-0000-0000000000d1', 'f1000000-0000-0000-0000-0000000000f1', 'Nursing visit', now() + interval '1 hour', now() + interval '2 hours'),
  ('b2000000-0000-0000-0000-0000000000b2', 'd1000000-0000-0000-0000-0000000000d1', 'f2000000-0000-0000-0000-0000000000f2', 'Physio', now() + interval '1 hour', now() + interval '2 hours');

-- Staff 1 sees only their own visit, and no members row.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'f1000000-0000-0000-0000-0000000000f1')::text, true);

select is((select count(*)::int from public.visits), 1, 'field staff reads only their own visits');
select is((select count(*)::int from public.members), 0, 'field staff has no direct read on members');
select is(
  (select member_name from public.get_my_visits(now() - interval '1 day', now() + interval '1 day')),
  'Visit Test Member', 'get_my_visits returns the member name');
select is(
  (select count(*)::int from public.get_my_visits(now() - interval '1 day', now() + interval '1 day')),
  1, 'get_my_visits returns only the caller''s visits');
with u as (update public.visits set status = 'completed' where id = 'b1000000-0000-0000-0000-0000000000b1' returning 1)
select is((select count(*)::int from u), 0, 'field staff direct update affects no rows');
select is((select status::text from public.visits where id = 'b1000000-0000-0000-0000-0000000000b1'), 'scheduled', 'direct update changed nothing');
select throws_ok(
  $$select public.check_in_visit('b2000000-0000-0000-0000-0000000000b2', 10, 76)$$,
  'P0001', 'visit_not_checkable_in', 'cannot check in to another nurse''s visit');
select throws_ok(
  $$select public.save_visit_report('b1000000-0000-0000-0000-0000000000b1', 120::smallint, 80::smallint, 70::smallint, 98::smallint, null, null, 'x', false)$$,
  'P0001', 'visit_not_reportable', 'cannot report before check-in');
select lives_ok(
  $$select public.check_in_visit('b1000000-0000-0000-0000-0000000000b1', 9.98, 76.28)$$, 'owner can check in');
select throws_ok(
  $$select public.check_in_visit('b1000000-0000-0000-0000-0000000000b1', 9.98, 76.28)$$,
  'P0001', 'visit_not_checkable_in', 'cannot check in twice');
select throws_ok(
  $$select public.check_out_visit('b1000000-0000-0000-0000-0000000000b1', 9.98, 76.28)$$,
  'P0001', 'report_not_submitted', 'cannot check out without a submitted report');
select lives_ok(
  $$select public.save_visit_report('b1000000-0000-0000-0000-0000000000b1', 120::smallint, 80::smallint, 70::smallint, 98::smallint, 110, 36.8, 'draft', false)$$,
  'owner can save a draft report');
select lives_ok(
  $$select public.save_visit_report('b1000000-0000-0000-0000-0000000000b1', 122::smallint, 82::smallint, 72::smallint, 97::smallint, 112, 36.9, 'final', true)$$,
  'owner can submit the report');
select throws_ok(
  $$select public.save_visit_report('b1000000-0000-0000-0000-0000000000b1', 100::smallint, 60::smallint, 60::smallint, 90::smallint, null, null, 'tamper', false)$$,
  'P0001', 'report_already_submitted', 'a submitted report is immutable');
select is((select notes from public.visit_reports where visit_id = 'b1000000-0000-0000-0000-0000000000b1'), 'final', 'staff reads own report');
select lives_ok(
  $$select public.check_out_visit('b1000000-0000-0000-0000-0000000000b1', 9.98, 76.28)$$, 'owner can check out after submitting');
select is((select status::text from public.visits where id = 'b1000000-0000-0000-0000-0000000000b1'), 'completed', 'visit is completed');

-- Staff 2 cannot see staff 1's report.
select set_config('request.jwt.claims', json_build_object('sub', 'f2000000-0000-0000-0000-0000000000f2')::text, true);
select is((select count(*)::int from public.visit_reports), 0, 'other staff cannot read the report');

-- Unassigned coordinator sees nothing; assigned coordinator and admin see both.
select set_config('request.jwt.claims', json_build_object('sub', 'c2000000-0000-0000-0000-0000000000c2')::text, true);
select is((select count(*)::int from public.visits), 0, 'unassigned coordinator sees no visits');
select set_config('request.jwt.claims', json_build_object('sub', 'c1000000-0000-0000-0000-0000000000c1')::text, true);
select is((select count(*)::int from public.visits), 2, 'assigned coordinator sees the member''s visits');
select is((select count(*)::int from public.visit_reports), 1, 'assigned coordinator reads the report');
select set_config('request.jwt.claims', json_build_object('sub', 'a1000000-0000-0000-0000-0000000000a1')::text, true);
select is((select count(*)::int from public.visits), 2, 'admin sees all visits');

-- Coordinator cannot assign a visit to a non-field-staff account.
select set_config('request.jwt.claims', json_build_object('sub', 'c1000000-0000-0000-0000-0000000000c1')::text, true);
select throws_ok(
  $$insert into public.visits (member_id, staff_id, service_type, scheduled_start, scheduled_end)
    values ('d1000000-0000-0000-0000-0000000000d1', 'e1000000-0000-0000-0000-0000000000e1', 'x', now(), now() + interval '1 hour')$$,
  '42501', null, 'cannot create a visit for a non-field-staff account');

select * from finish();
rollback;
