create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  checkin_date date not null default current_date,
  mood text check (mood in ('good','okay','low')),
  energy text check (energy in ('high','medium','low')),
  breathing text check (breathing in ('normal','slightly_short','very_short')),
  appetite text check (appetite in ('normal','reduced','skipped_meals')),
  aches text check (aches in ('none','mild','moderate','severe')),
  ache_tags text[] not null default '{}', -- Joints/Back/Head/Chest/Other; only meaningful when aches <> 'none'
  sleep text check (sleep in ('good','fair','poor')),
  notes text,
  wellness_score smallint check (wellness_score between 0 and 100),
  created_at timestamptz not null default now()
);
create index checkins_member_date_idx on public.checkins(member_id, checkin_date desc);

-- Scoped in per product decision 2026-08-05 (glucose/BMI tracking included
-- even though V1_SCOPE.md's explicit list didn't name it -- Notion's table
-- list does, and the schema cost is trivial). Confirm a frontend screen is
-- actually wired to this before considering it "shipped."
create table public.glucose_readings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  reading_date date not null,
  reading_time time not null,
  value_mg_dl numeric not null,
  context public.glucose_context not null,
  created_at timestamptz not null default now()
);
create index glucose_readings_member_date_idx on public.glucose_readings(member_id, reading_date desc);

create table public.vitals_readings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  vital_type public.vital_type not null,
  value numeric not null,
  value_secondary numeric, -- e.g. diastolic when vital_type = 'blood_pressure' (value = systolic)
  source text not null default 'manual' check (source in ('manual','wearable')),
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index vitals_readings_member_recorded_idx on public.vitals_readings(member_id, recorded_at desc);

-- Raw wearable ingestion. Written ONLY by a Supabase edge function using the
-- service_role key (bypasses RLS) per V1_SCOPE Sec 1a's architecture --
-- never directly by the app. Feeds vitals_readings and sos_alerts (fall events).
create table public.wearable_readings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  device_vendor text not null,
  device_id text,
  reading_type text not null, -- heart_rate | spo2 | steps | fall_event | battery | ...
  value numeric,
  raw_payload jsonb,
  recorded_at timestamptz not null,
  ingested_at timestamptz not null default now()
);
create index wearable_readings_member_recorded_idx on public.wearable_readings(member_id, recorded_at desc);

alter table public.checkins enable row level security;
alter table public.glucose_readings enable row level security;
alter table public.vitals_readings enable row level security;
alter table public.wearable_readings enable row level security;

create policy "read own or assigned checkins" on public.checkins
  for select using (public.can_access_member(member_id));
create policy "member manages own checkins" on public.checkins
  for all using (public.member_owns(member_id)) with check (public.member_owns(member_id));
create policy "assigned coordinator reads checkins" on public.checkins
  for select using (public.is_coordinator() and public.is_assigned_coordinator(member_id));

create policy "read own or assigned glucose readings" on public.glucose_readings
  for select using (public.can_access_member(member_id));
create policy "member manages own glucose readings" on public.glucose_readings
  for all using (public.member_owns(member_id)) with check (public.member_owns(member_id));
create policy "assigned coordinator reads glucose readings" on public.glucose_readings
  for select using (public.is_coordinator() and public.is_assigned_coordinator(member_id));

create policy "read own or assigned vitals readings" on public.vitals_readings
  for select using (public.can_access_member(member_id));
create policy "member manages own manual vitals readings" on public.vitals_readings
  for all
  using (public.member_owns(member_id) and source = 'manual')
  with check (public.member_owns(member_id) and source = 'manual');
create policy "assigned coordinator reads vitals readings" on public.vitals_readings
  for select using (public.is_coordinator() and public.is_assigned_coordinator(member_id));

create policy "read own or assigned wearable readings" on public.wearable_readings
  for select using (public.can_access_member(member_id));
-- No insert/update/delete policy for authenticated/anon -- writes only via
-- the service_role ingestion edge function, which bypasses RLS by design.
