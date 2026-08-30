create table public.hydration_logs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  log_date date not null,
  goal integer not null default 8,
  filled integer not null default 0,
  created_at timestamptz not null default now(),
  unique (member_id, log_date)
);
create index hydration_logs_member_date_idx on public.hydration_logs(member_id, log_date);

-- Self-set activity goals (distinct from preventive_plan_goals, which the
-- care team sets). done_at tracks the most recent completion; "done today"
-- is computed client-side from done_at's local date, so there's no cron/
-- interval needed to reset a goal at midnight -- it just naturally reads
-- as not-done once the local date rolls over.
create table public.self_goals (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  text text not null,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index self_goals_member_id_idx on public.self_goals(member_id);

alter table public.hydration_logs enable row level security;
alter table public.self_goals enable row level security;

create policy "read own or assigned hydration logs" on public.hydration_logs
  for select using (public.can_access_member(member_id));
create policy "member manages own hydration logs" on public.hydration_logs
  for all using (public.member_owns(member_id)) with check (public.member_owns(member_id));
create policy "assigned coordinator manages hydration logs" on public.hydration_logs
  for all
  using (public.is_coordinator() and public.is_assigned_coordinator(member_id))
  with check (public.is_coordinator() and public.is_assigned_coordinator(member_id));

create policy "read own or assigned self goals" on public.self_goals
  for select using (public.can_access_member(member_id));
create policy "member manages own self goals" on public.self_goals
  for all using (public.member_owns(member_id)) with check (public.member_owns(member_id));
create policy "assigned coordinator manages self goals" on public.self_goals
  for all
  using (public.is_coordinator() and public.is_assigned_coordinator(member_id))
  with check (public.is_coordinator() and public.is_assigned_coordinator(member_id));
