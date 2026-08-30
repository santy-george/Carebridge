create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  provider text not null,
  visit_type text,
  appt_date date not null,
  appt_time time,
  created_at timestamptz not null default now()
);
create index appointments_member_date_idx on public.appointments(member_id, appt_date);

alter table public.appointments enable row level security;

create policy "read own or assigned appointments" on public.appointments
  for select using (public.can_access_member(member_id));
create policy "member manages own appointments" on public.appointments
  for all using (public.member_owns(member_id)) with check (public.member_owns(member_id));
create policy "assigned coordinator manages appointments" on public.appointments
  for all
  using (public.is_coordinator() and public.is_assigned_coordinator(member_id))
  with check (public.is_coordinator() and public.is_assigned_coordinator(member_id));
