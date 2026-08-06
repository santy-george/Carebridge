create table public.sos_alerts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  alert_type public.sos_alert_type not null,
  status public.sos_alert_status not null default 'open',
  triggered_at timestamptz not null default now(),
  wearable_reading_id uuid references public.wearable_readings(id),
  location_lat numeric,
  location_lng numeric,
  acknowledged_by uuid references public.profiles(id),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index sos_alerts_member_id_idx on public.sos_alerts(member_id);
create index sos_alerts_open_idx on public.sos_alerts(status) where status = 'open';

alter table public.sos_alerts enable row level security;

create policy "member creates own sos alert" on public.sos_alerts
  for insert with check (public.member_owns(member_id));

-- Product decision 2026-08-05: ANY coordinator can read/triage ANY open
-- alert, not just their own assigned members -- deliberate for a
-- life-safety feature (a fall alert shouldn't go unseen due to an
-- assignment gap or an off-shift coordinator).
create policy "member or any coordinator reads sos alerts" on public.sos_alerts
  for select using (public.member_owns(member_id) or public.is_coordinator());

create policy "any coordinator updates sos alerts" on public.sos_alerts
  for update using (public.is_coordinator()) with check (public.is_coordinator());

create table public.upgrade_leads (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  requested_care_model public.care_model not null
    constraint upgrade_leads_target_model check (requested_care_model in ('virtual_care','direct_care')),
  requested_plan_level public.plan_level,
  status public.upgrade_lead_status not null default 'new',
  notes text,
  created_at timestamptz not null default now(),
  followed_up_by uuid references public.profiles(id),
  followed_up_at timestamptz
);
create index upgrade_leads_status_idx on public.upgrade_leads(status);

alter table public.upgrade_leads enable row level security;
create policy "member creates own upgrade lead" on public.upgrade_leads
  for insert with check (public.member_owns(member_id));
create policy "member or coordinator reads upgrade leads" on public.upgrade_leads
  for select using (public.member_owns(member_id) or public.is_coordinator());
create policy "coordinator manages upgrade leads" on public.upgrade_leads
  for update using (public.is_coordinator()) with check (public.is_coordinator());
