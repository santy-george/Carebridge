-- Phase B (Field Staff app) schema: visits and visit reports. Field staff
-- never write these tables directly -- every state change goes through a
-- SECURITY DEFINER function that re-checks ownership and the allowed
-- transition, so there is no column-level RLS surface to get wrong. The
-- default grants in 20260805095146_grants.sql give anon EXECUTE on every
-- function, so each function below revokes it explicitly.

create type public.visit_status as enum (
  'scheduled', 'in_progress', 'completed', 'missed', 'cancelled'
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  staff_id uuid not null references public.profiles(id),
  service_type text not null,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  status public.visit_status not null default 'scheduled',
  checkin_at timestamptz,
  checkin_lat double precision,
  checkin_lng double precision,
  checkout_at timestamptz,
  checkout_lat double precision,
  checkout_lng double precision,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scheduled_end > scheduled_start),
  check (checkin_lat is null or checkin_lat between -90 and 90),
  check (checkin_lng is null or checkin_lng between -180 and 180),
  check (checkout_lat is null or checkout_lat between -90 and 90),
  check (checkout_lng is null or checkout_lng between -180 and 180)
);
create index visits_staff_start_idx on public.visits(staff_id, scheduled_start);
create index visits_member_start_idx on public.visits(member_id, scheduled_start);
create trigger set_visits_updated_at before update on public.visits
  for each row execute function public.set_updated_at();

-- One report per visit. Vitals are all optional -- a physio visit may record
-- none of them. submitted_at null = still a draft the nurse can edit.
create table public.visit_reports (
  visit_id uuid primary key references public.visits(id) on delete cascade,
  bp_systolic smallint check (bp_systolic is null or bp_systolic between 40 and 300),
  bp_diastolic smallint check (bp_diastolic is null or bp_diastolic between 20 and 200),
  pulse smallint check (pulse is null or pulse between 20 and 300),
  spo2 smallint check (spo2 is null or spo2 between 50 and 100),
  glucose_mgdl numeric check (glucose_mgdl is null or glucose_mgdl between 10 and 1000),
  temperature_c numeric check (temperature_c is null or temperature_c between 30 and 45),
  notes text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_visit_reports_updated_at before update on public.visit_reports
  for each row execute function public.set_updated_at();

alter table public.visits enable row level security;
alter table public.visit_reports enable row level security;

-- Staff existence check usable from a coordinator's RLS context: profiles
-- is not readable by an assigned coordinator for an arbitrary account.
create or replace function public.is_field_staff_user(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = p_user_id and role = 'field_staff'
  );
$$;
revoke execute on function public.is_field_staff_user(uuid) from public, anon;
grant execute on function public.is_field_staff_user(uuid) to authenticated;

-- visits: coordinators (assignment-scoped; admin passes through
-- is_assigned_coordinator) manage; field staff may only read their own.
create policy "coordinators read visits"
  on public.visits for select
  using (public.is_coordinator() and public.is_assigned_coordinator(member_id));

create policy "field staff read own visits"
  on public.visits for select
  using (staff_id = auth.uid());

create policy "coordinators create visits"
  on public.visits for insert
  with check (
    public.is_coordinator()
    and public.is_assigned_coordinator(member_id)
    and public.is_field_staff_user(staff_id)
  );

create policy "coordinators update visits"
  on public.visits for update
  using (public.is_coordinator() and public.is_assigned_coordinator(member_id))
  with check (
    public.is_coordinator()
    and public.is_assigned_coordinator(member_id)
    and public.is_field_staff_user(staff_id)
  );

create policy "coordinators delete visits"
  on public.visits for delete
  using (public.is_coordinator() and public.is_assigned_coordinator(member_id));

-- visit_reports: read-only via RLS to the visit's staff member and to the
-- coordinators who can read the visit. All writes go through
-- save_visit_report().
create policy "staff read own visit reports"
  on public.visit_reports for select
  using (exists (
    select 1 from public.visits v
    where v.id = visit_reports.visit_id and v.staff_id = auth.uid()
  ));

create policy "coordinators read visit reports"
  on public.visit_reports for select
  using (exists (
    select 1 from public.visits v
    where v.id = visit_reports.visit_id
      and public.is_coordinator()
      and public.is_assigned_coordinator(v.member_id)
  ));

-- The visit rows plus just enough of the member for the nurse to do the
-- visit. Field staff have no read policy on members, and must not get one:
-- this function is the only door, limited to visits assigned to the caller.
create or replace function public.get_my_visits(p_from timestamptz, p_to timestamptz)
returns table (
  id uuid,
  member_id uuid,
  member_name text,
  member_phone text,
  member_address text,
  member_location text,
  conditions text[],
  allergies text[],
  service_type text,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  status public.visit_status,
  checkin_at timestamptz,
  checkout_at timestamptz,
  report_submitted boolean
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  return query
    select v.id, v.member_id, m.full_name, m.phone, m.address, m.location,
           coalesce(mp.conditions, '{}'), coalesce(mp.allergies, '{}'),
           v.service_type, v.scheduled_start, v.scheduled_end, v.status,
           v.checkin_at, v.checkout_at,
           coalesce(r.submitted_at is not null, false)
    from public.visits v
    join public.members m on m.id = v.member_id
    left join public.medical_profile mp on mp.member_id = v.member_id
    left join public.visit_reports r on r.visit_id = v.id
    where v.staff_id = auth.uid()
      and v.scheduled_start >= p_from
      and v.scheduled_start < p_to
    order by v.scheduled_start;
end;
$$;
revoke execute on function public.get_my_visits(timestamptz, timestamptz) from public, anon;
grant execute on function public.get_my_visits(timestamptz, timestamptz) to authenticated;

create or replace function public.check_in_visit(p_visit_id uuid, p_lat double precision, p_lng double precision)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_updated int;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  update public.visits
     set status = 'in_progress', checkin_at = now(), checkin_lat = p_lat, checkin_lng = p_lng
   where id = p_visit_id and staff_id = auth.uid() and status = 'scheduled';
  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'visit_not_checkable_in';
  end if;
end;
$$;
revoke execute on function public.check_in_visit(uuid, double precision, double precision) from public, anon;
grant execute on function public.check_in_visit(uuid, double precision, double precision) to authenticated;

-- Saves the draft; p_submit locks it. A submitted report is immutable to
-- the nurse. Only an in-progress visit owned by the caller can be reported.
create or replace function public.save_visit_report(
  p_visit_id uuid,
  p_bp_systolic smallint,
  p_bp_diastolic smallint,
  p_pulse smallint,
  p_spo2 smallint,
  p_glucose_mgdl numeric,
  p_temperature_c numeric,
  p_notes text,
  p_submit boolean
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_status public.visit_status;
  v_submitted timestamptz;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select status into v_status from public.visits
    where id = p_visit_id and staff_id = auth.uid();
  if not found or v_status <> 'in_progress' then
    raise exception 'visit_not_reportable';
  end if;

  select submitted_at into v_submitted from public.visit_reports where visit_id = p_visit_id;
  if v_submitted is not null then
    raise exception 'report_already_submitted';
  end if;

  insert into public.visit_reports (
    visit_id, bp_systolic, bp_diastolic, pulse, spo2, glucose_mgdl,
    temperature_c, notes, submitted_at
  ) values (
    p_visit_id, p_bp_systolic, p_bp_diastolic, p_pulse, p_spo2, p_glucose_mgdl,
    p_temperature_c, p_notes, case when p_submit then now() end
  )
  on conflict (visit_id) do update set
    bp_systolic = excluded.bp_systolic,
    bp_diastolic = excluded.bp_diastolic,
    pulse = excluded.pulse,
    spo2 = excluded.spo2,
    glucose_mgdl = excluded.glucose_mgdl,
    temperature_c = excluded.temperature_c,
    notes = excluded.notes,
    submitted_at = excluded.submitted_at;
end;
$$;
revoke execute on function public.save_visit_report(uuid, smallint, smallint, smallint, smallint, numeric, numeric, text, boolean) from public, anon;
grant execute on function public.save_visit_report(uuid, smallint, smallint, smallint, smallint, numeric, numeric, text, boolean) to authenticated;

-- Check-out requires a submitted report, so a visit cannot be closed with
-- nothing on record.
create or replace function public.check_out_visit(p_visit_id uuid, p_lat double precision, p_lng double precision)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_updated int;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1 from public.visit_reports r
    join public.visits v on v.id = r.visit_id
    where r.visit_id = p_visit_id and v.staff_id = auth.uid() and r.submitted_at is not null
  ) then
    raise exception 'report_not_submitted';
  end if;

  update public.visits
     set status = 'completed', checkout_at = now(), checkout_lat = p_lat, checkout_lng = p_lng
   where id = p_visit_id and staff_id = auth.uid() and status = 'in_progress';
  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'visit_not_checkable_out';
  end if;
end;
$$;
revoke execute on function public.check_out_visit(uuid, double precision, double precision) from public, anon;
grant execute on function public.check_out_visit(uuid, double precision, double precision) to authenticated;
