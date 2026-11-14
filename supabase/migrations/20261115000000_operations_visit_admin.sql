-- Operations phase: Admin reads and manages visits. Coordinators cannot read
-- other staff's profiles (access is assignment-scoped), so names for the
-- scheduler come through SECURITY DEFINER functions that apply the same
-- assignment scope themselves. Each revokes anon explicitly (default grants
-- give anon EXECUTE on every function).

-- Field staff a coordinator may schedule. Active staff only.
create or replace function public.list_assignable_staff()
returns table (id uuid, full_name text, discipline text, service_area text)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_coordinator() then
    raise exception 'not_authorized';
  end if;

  return query
    select p.id, p.full_name, sp.discipline::text, sp.service_area
    from public.profiles p
    join public.staff_profiles sp on sp.id = p.id
    where p.role = 'field_staff' and sp.employment_status = 'active'
    order by p.full_name;
end;
$$;
revoke execute on function public.list_assignable_staff() from public, anon;
grant execute on function public.list_assignable_staff() to authenticated;

-- Visits in a window, limited to members the caller coordinates (admin sees
-- all). Includes names and whether a submitted report exists.
create or replace function public.get_visits_admin(p_from timestamptz, p_to timestamptz)
returns table (
  id uuid,
  member_id uuid,
  member_name text,
  staff_id uuid,
  staff_name text,
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
  if not public.is_coordinator() then
    raise exception 'not_authorized';
  end if;

  return query
    select v.id, v.member_id, m.full_name, v.staff_id, p.full_name,
           v.service_type, v.scheduled_start, v.scheduled_end, v.status,
           v.checkin_at, v.checkout_at,
           coalesce(r.submitted_at is not null, false)
    from public.visits v
    join public.members m on m.id = v.member_id
    join public.profiles p on p.id = v.staff_id
    left join public.visit_reports r on r.visit_id = v.id
    where public.is_assigned_coordinator(v.member_id)
      and v.scheduled_start >= p_from
      and v.scheduled_start < p_to
    order by v.scheduled_start;
end;
$$;
revoke execute on function public.get_visits_admin(timestamptz, timestamptz) from public, anon;
grant execute on function public.get_visits_admin(timestamptz, timestamptz) to authenticated;

-- A submitted report with the visit context, for the Visit Reports screen.
create or replace function public.get_visit_reports_admin(p_from timestamptz, p_to timestamptz)
returns table (
  visit_id uuid,
  member_id uuid,
  member_name text,
  staff_name text,
  service_type text,
  scheduled_start timestamptz,
  bp_systolic smallint,
  bp_diastolic smallint,
  pulse smallint,
  spo2 smallint,
  glucose_mgdl numeric,
  temperature_c numeric,
  notes text,
  submitted_at timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_coordinator() then
    raise exception 'not_authorized';
  end if;

  return query
    select v.id, v.member_id, m.full_name, p.full_name, v.service_type,
           v.scheduled_start, r.bp_systolic, r.bp_diastolic, r.pulse, r.spo2,
           r.glucose_mgdl, r.temperature_c, r.notes, r.submitted_at
    from public.visit_reports r
    join public.visits v on v.id = r.visit_id
    join public.members m on m.id = v.member_id
    join public.profiles p on p.id = v.staff_id
    where r.submitted_at is not null
      and public.is_assigned_coordinator(v.member_id)
      and v.scheduled_start >= p_from
      and v.scheduled_start < p_to
    order by r.submitted_at desc;
end;
$$;
revoke execute on function public.get_visit_reports_admin(timestamptz, timestamptz) from public, anon;
grant execute on function public.get_visit_reports_admin(timestamptz, timestamptz) to authenticated;

-- Coordinators close out a visit that did not happen. Only a scheduled visit
-- can be cancelled or marked missed; an in-progress or finished visit is the
-- nurse's record and stays untouched.
create or replace function public.close_unattended_visit(p_visit_id uuid, p_status public.visit_status)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_member uuid;
  v_updated int;
begin
  if not public.is_coordinator() then
    raise exception 'not_authorized';
  end if;
  if p_status not in ('cancelled', 'missed') then
    raise exception 'invalid_status';
  end if;

  select member_id into v_member from public.visits where id = p_visit_id;
  if not found or not public.is_assigned_coordinator(v_member) then
    raise exception 'visit_not_found';
  end if;

  update public.visits set status = p_status
   where id = p_visit_id and status = 'scheduled';
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'visit_not_closable';
  end if;
end;
$$;
revoke execute on function public.close_unattended_visit(uuid, public.visit_status) from public, anon;
grant execute on function public.close_unattended_visit(uuid, public.visit_status) to authenticated;
