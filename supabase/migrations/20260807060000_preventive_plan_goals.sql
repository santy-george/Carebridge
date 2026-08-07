-- Preventive health plan: coordinator-curated per-member goals (vaccination
-- due, screening due, lifestyle habit, ...), shown read-only to the member
-- and their linked family -- same "populated by coordinator" shape as
-- care_team (20260805091858_members_care_team.sql). Was skipped during the
-- 2026-08-07 Phase 2 More-sub-screens pass specifically because this table
-- didn't exist yet.
create table public.preventive_plan_goals (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  title text not null,
  icon text not null default 'target', -- design-system icon key, e.g. 'bandage', 'walking', 'eye'
  due_date date,
  completed_at timestamptz,
  completed_note text, -- e.g. 'Completed 2 Jul at Riverside Clinic'
  display_order smallint not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index preventive_plan_goals_member_id_idx on public.preventive_plan_goals(member_id);

alter table public.preventive_plan_goals enable row level security;

create policy "read own or assigned preventive plan goals"
  on public.preventive_plan_goals for select using (public.can_access_member(member_id));
create policy "assigned coordinator manages preventive plan goals"
  on public.preventive_plan_goals for all
  using (public.is_coordinator() and public.is_assigned_coordinator(member_id))
  with check (public.is_coordinator());
-- Deliberately no member-facing insert/update/delete policy -- read-only to
-- the family, same reasoning and same enforcement layer as care_team.
