create table public.medications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  name text not null,
  purpose text,
  dosage text,
  form text,
  frequency text,
  time_of_day public.time_of_day_band[] not null default '{}',
  specific_time time,
  source public.medication_source not null default 'otc',
  prescribed_by text,
  high_risk boolean not null default false,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index medications_member_id_idx on public.medications(member_id);
create trigger set_medications_updated_at before update on public.medications
  for each row execute function public.set_updated_at();

-- Not in Notion's literal table list, added because HANDOFF.md requires
-- per-day taken/untaken history, and Admin's adherence dashboard (V1_SCOPE
-- Sec 3) needs real history, not a value that silently resets at midnight.
create table public.medication_logs (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medications(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  scheduled_date date not null,
  time_of_day public.time_of_day_band,
  taken boolean not null default false,
  taken_at timestamptz,
  created_at timestamptz not null default now(),
  unique (medication_id, scheduled_date, time_of_day)
);
create index medication_logs_member_date_idx on public.medication_logs(member_id, scheduled_date);

create table public.med_stock (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  name text not null,
  qty numeric not null default 0,
  unit text not null default 'tablets',
  doses_per_day integer not null default 1,
  high_risk boolean not null default false,
  expiry_date date,
  prescribed_by text,
  date_stocked date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index med_stock_member_id_idx on public.med_stock(member_id);
create trigger set_med_stock_updated_at before update on public.med_stock
  for each row execute function public.set_updated_at();

alter table public.medications enable row level security;
alter table public.medication_logs enable row level security;
alter table public.med_stock enable row level security;

create policy "read own or assigned medications" on public.medications
  for select using (public.can_access_member(member_id));
create policy "member manages own medications" on public.medications
  for all using (public.member_owns(member_id)) with check (public.member_owns(member_id));
create policy "assigned coordinator manages medications" on public.medications
  for all
  using (public.is_coordinator() and public.is_assigned_coordinator(member_id))
  with check (public.is_coordinator() and public.is_assigned_coordinator(member_id));

create policy "read own or assigned medication logs" on public.medication_logs
  for select using (public.can_access_member(member_id));
create policy "member manages own medication logs" on public.medication_logs
  for all using (public.member_owns(member_id)) with check (public.member_owns(member_id));
create policy "assigned coordinator manages medication logs" on public.medication_logs
  for all
  using (public.is_coordinator() and public.is_assigned_coordinator(member_id))
  with check (public.is_coordinator() and public.is_assigned_coordinator(member_id));

create policy "read own or assigned med stock" on public.med_stock
  for select using (public.can_access_member(member_id));
create policy "member manages own med stock" on public.med_stock
  for all using (public.member_owns(member_id)) with check (public.member_owns(member_id));
create policy "assigned coordinator manages med stock" on public.med_stock
  for all
  using (public.is_coordinator() and public.is_assigned_coordinator(member_id))
  with check (public.is_coordinator() and public.is_assigned_coordinator(member_id));
