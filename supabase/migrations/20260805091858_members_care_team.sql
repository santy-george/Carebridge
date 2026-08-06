create table public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  date_of_birth date,
  gender text,
  phone text,
  address text,
  location text, -- 'Ernakulam' | 'Thiruvalla' today; free text, not enum -- service area may expand
  care_model public.care_model not null default 'self_care',
  plan_level public.plan_level not null default 'basic',
  emergency_contact_name text,
  emergency_contact_phone text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index members_user_id_idx on public.members(user_id);
create trigger set_members_updated_at before update on public.members
  for each row execute function public.set_updated_at();

create table public.medical_profile (
  member_id uuid primary key references public.members(id) on delete cascade,
  conditions text[] not null default '{}',
  conditions_other text,
  allergies text[] not null default '{}',
  notes text,
  updated_at timestamptz not null default now()
);
create trigger set_medical_profile_updated_at before update on public.medical_profile
  for each row execute function public.set_updated_at();

-- Read-only to family (V1_SCOPE Sec 1: "Care Team tab, read-only, populated
-- by the coordinator via Admin"). coordinator_profile_id is nullable --
-- most seeded entries (e.g. "Dr Rajeev Menon, Family physician") are plain
-- contact info with no login account, per HANDOFF.md's care-team shape.
create table public.care_team (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  coordinator_profile_id uuid references public.profiles(id),
  role_label text not null, -- free text ("Care coordinator", "Family physician", ...) per HANDOFF, not an enum
  name text not null,
  initials text,
  phone text,
  email text,
  address text,
  notes text,
  display_order smallint not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index care_team_member_id_idx on public.care_team(member_id);

-- Internal assignment table -- drives RLS for "coordinator can act on their
-- assigned members' data." Family never reads this table directly.
create table public.care_assignments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  coordinator_id uuid not null references public.profiles(id) on delete cascade,
  assigned_role text not null default 'primary_coordinator',
  is_active boolean not null default true,
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz
);
create unique index care_assignments_active_unique
  on public.care_assignments(member_id, coordinator_id) where is_active;
create index care_assignments_member_id_idx on public.care_assignments(member_id);
create index care_assignments_coordinator_id_idx on public.care_assignments(coordinator_id);

create or replace function public.member_owns(p_member_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members m where m.id = p_member_id and m.user_id = auth.uid());
$$;

create or replace function public.is_assigned_coordinator(p_member_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.care_assignments ca
    where ca.member_id = p_member_id and ca.coordinator_id = auth.uid() and ca.is_active
  );
$$;

-- Strict default used by most member-owned tables: owner OR their assigned
-- coordinator. (sos_alerts and care_assignments deliberately use broader
-- is_coordinator() checks instead -- see plan context and inline comments below.)
create or replace function public.can_access_member(p_member_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.member_owns(p_member_id) or public.is_assigned_coordinator(p_member_id);
$$;

alter table public.members enable row level security;
alter table public.medical_profile enable row level security;
alter table public.care_team enable row level security;
alter table public.care_assignments enable row level security;

create policy "member or assigned coordinator reads member record"
  on public.members for select using (public.can_access_member(id));
create policy "member updates own member record"
  on public.members for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "coordinator creates member records"
  on public.members for insert with check (public.is_coordinator());
create policy "assigned coordinator updates member record"
  on public.members for update
  using (public.is_coordinator() and public.is_assigned_coordinator(id))
  with check (public.is_coordinator());

create policy "read own or assigned medical profile"
  on public.medical_profile for select using (public.can_access_member(member_id));
create policy "member writes own medical profile"
  on public.medical_profile for all
  using (public.member_owns(member_id)) with check (public.member_owns(member_id));
create policy "assigned coordinator writes medical profile"
  on public.medical_profile for all
  using (public.is_coordinator() and public.is_assigned_coordinator(member_id))
  with check (public.is_coordinator() and public.is_assigned_coordinator(member_id));

create policy "read own or assigned care team"
  on public.care_team for select using (public.can_access_member(member_id));
create policy "assigned coordinator manages care team"
  on public.care_team for all
  using (public.is_coordinator() and public.is_assigned_coordinator(member_id))
  with check (public.is_coordinator());
-- Deliberately no member-facing insert/update/delete policy on care_team --
-- it's read-only to the family in V1 (V1_SCOPE Sec 1), enforced at the DB layer.

-- V1 simplification: any coordinator manages all assignments, not
-- just their own -- needed so someone can reassign members between a small pool.
create policy "coordinators manage assignments"
  on public.care_assignments for all
  using (public.is_coordinator()) with check (public.is_coordinator());
