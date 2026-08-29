-- Daily-cumulative wearable types (step_count, active_energy_burned,
-- distance_walked_running, apple_stand_time) don't fit wearable_readings'
-- append-one-row-per-sample shape: Watch and iPhone can both log steps for
-- the same interval, so these need one upserted row per calendar day
-- instead. A dedicated table gives PostgREST a real (non-partial) unique
-- constraint to target via on_conflict -- a partial index scoped to just
-- these reading_types inside wearable_readings can't be used as an upsert
-- arbiter.
create table public.daily_activity_totals (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  device_vendor text not null,
  reading_type text not null check (reading_type in ('step_count', 'active_energy_burned', 'distance_walked_running', 'apple_stand_time')),
  day date not null,
  value numeric not null,
  updated_at timestamptz not null default now()
);
create unique index daily_activity_totals_member_type_day_unique
  on public.daily_activity_totals(member_id, reading_type, day);
create index daily_activity_totals_member_day_idx
  on public.daily_activity_totals(member_id, day desc);

-- Sleep sessions (HKCategoryTypeIdentifier.sleepAnalysis) -- interval data
-- with a stage enum, not a single value+timestamp.
create table public.sleep_sessions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  device_vendor text not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  stage text not null check (stage in ('in_bed', 'asleep_core', 'asleep_deep', 'asleep_rem', 'awake')),
  raw_payload jsonb,
  ingested_at timestamptz not null default now()
);
create index sleep_sessions_member_started_idx on public.sleep_sessions(member_id, started_at desc);

-- ECG readings (HKElectrocardiogramType) -- classification + averaged heart
-- rate only, never raw voltage. Third-party apps can't initiate an ECG;
-- this only ever observes a sample the member already took via the Watch's
-- own ECG app.
create table public.ecg_readings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  device_vendor text not null,
  recorded_at timestamptz not null,
  classification text not null,
  average_heart_rate numeric,
  raw_payload jsonb,
  ingested_at timestamptz not null default now()
);
create index ecg_readings_member_recorded_idx on public.ecg_readings(member_id, recorded_at desc);

-- Irregular rhythm notifications (HKCategoryTypeIdentifier.irregularHeartRhythmEvent)
-- -- a background PPG-based AFib-risk notification, not a metric or an ECG.
create table public.rhythm_events (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  device_vendor text not null,
  recorded_at timestamptz not null,
  raw_payload jsonb,
  ingested_at timestamptz not null default now()
);
create index rhythm_events_member_recorded_idx on public.rhythm_events(member_id, recorded_at desc);

alter table public.daily_activity_totals enable row level security;
alter table public.sleep_sessions enable row level security;
alter table public.ecg_readings enable row level security;
alter table public.rhythm_events enable row level security;

create policy "read own or assigned daily activity totals" on public.daily_activity_totals
  for select using (public.can_access_member(member_id));
create policy "read own or assigned sleep sessions" on public.sleep_sessions
  for select using (public.can_access_member(member_id));
create policy "read own or assigned ecg readings" on public.ecg_readings
  for select using (public.can_access_member(member_id));
create policy "read own or assigned rhythm events" on public.rhythm_events
  for select using (public.can_access_member(member_id));
-- No insert/update/delete policy for authenticated/anon on any of the four
-- -- writes only via the service_role ingest-wearable edge function, same
-- posture as wearable_readings.
