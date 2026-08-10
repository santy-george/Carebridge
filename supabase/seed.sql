-- Local dev fixtures only. Never run against the hosted Mumbai project.
-- Seeds a coordinator, a member linked to a fake local auth user, a care
-- team row, and one check-in -- just enough to click around in Studio
-- (supabase start prints the local Studio URL) and see non-empty tables.

-- Fake auth.users rows, inserted directly (bypassing GoTrue) -- fine for
-- local seed data, matches the same technique the RLS test suite uses.
--
-- instance_id and the token columns below aren't optional: GoTrue's
-- password-grant handler scans them into non-nullable Go string fields, and
-- a bare INSERT leaves them NULL (their column default), so login for any
-- seeded user fails locally even though the row looks fine in Studio.
-- instance_id must match every other row GoTrue itself creates
-- ('00000000-0000-0000-0000-000000000000'); the *_token columns just need
-- to be '' rather than NULL.
insert into auth.users (
  instance_id, id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, aud, role,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'coordinator.seed@carebridgehome.test', crypt('seed-password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'member.seed@carebridgehome.test', crypt('seed-password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', '', '', '', '', '', '', '', '')
on conflict (id) do nothing;

-- profiles rows are auto-created by the on_auth_user_created trigger above;
-- promote the first one to coordinator.
update public.profiles set role = 'coordinator', full_name = 'Priya Nair (seed coordinator)'
where id = '00000000-0000-0000-0000-000000000001';

update public.profiles set full_name = 'Jane Doe (seed member)'
where id = '00000000-0000-0000-0000-000000000002';

insert into public.members (id, full_name, date_of_birth, phone, location, care_model, plan_level, emergency_contact_name, emergency_contact_phone, created_by)
values (
  '10000000-0000-0000-0000-000000000001',
  'Jane Doe',
  '1954-03-12',
  '+91 98470 00001',
  'Ernakulam',
  'self_care',
  'standard',
  'Sarah Doe',
  '+1 416 555 0100',
  '00000000-0000-0000-0000-000000000001'
)
on conflict (id) do nothing;

insert into public.member_links (member_id, user_id, relationship_label, is_self)
values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'Self',
  true
)
on conflict (member_id, user_id) do nothing;

insert into public.care_assignments (member_id, coordinator_id)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
on conflict do nothing;

insert into public.medical_profile (member_id, conditions, allergies, notes)
values (
  '10000000-0000-0000-0000-000000000001',
  array['Diabetes','High BP'],
  array['Penicillin'],
  'Seed fixture -- no real medical data.'
)
on conflict (member_id) do nothing;

insert into public.care_team (member_id, coordinator_profile_id, role_label, name, initials, phone, email, display_order)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Care coordinator', 'Priya Nair', 'PN', '+91 98470 00001', 'coordinator.seed@carebridgehome.test', 1),
  ('10000000-0000-0000-0000-000000000001', null, 'Family physician', 'Dr Rajeev Menon', 'RM', '+91 98470 00002', null, 2)
on conflict do nothing;

insert into public.checkins (member_id, checkin_date, mood, energy, breathing, appetite, aches, sleep, notes, wellness_score)
values (
  '10000000-0000-0000-0000-000000000001',
  current_date,
  'good',
  'high',
  'normal',
  'normal',
  'none',
  'good',
  'Seed fixture check-in.',
  88
)
on conflict do nothing;

insert into public.sos_alerts (id, member_id, alert_type, status, location_lat, location_lng)
values (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'manual',
  'open',
  9.9816,
  76.2999
)
on conflict do nothing;

insert into public.upgrade_leads (id, member_id, requested_care_model, requested_plan_level, status, notes)
values (
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'virtual_care',
  'standard',
  'new',
  'Seed fixture -- daughter asked about remote monitoring during her visit.'
)
on conflict do nothing;

insert into public.preventive_plan_goals (member_id, title, icon, due_date, completed_at, completed_note, display_order, created_by)
values
  ('10000000-0000-0000-0000-000000000001', 'Annual flu vaccination', 'bandage', '2026-07-31', '2026-07-02T00:00:00Z', 'Completed 2 Jul at Riverside Clinic', 1, '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000001', 'Annual eye exam', 'eye', '2026-07-31', null, null, 2, '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000001', 'Bone density scan', 'lab', '2026-08-15', null, null, 3, '00000000-0000-0000-0000-000000000001')
on conflict do nothing;
