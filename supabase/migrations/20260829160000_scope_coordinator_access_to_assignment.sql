-- Human-partner decision (2026-08-29): "any coordinator can see anything"
-- is too broad for now. Coordinator visibility is scoped down to
-- assignment-only across the board -- with SOS alerts kept as the one
-- deliberate exception (an emergency needs whichever coordinator is on
-- call to see it, not just the patient's specifically assigned one; same
-- reasoning explicitly rejected for upgrade_leads below, since leads are
-- not time-critical the same way). Proper role-based access (a
-- supervisor-or-above tier that can actually assign coordinators to
-- patients) is out of scope here, deferred until the Admin Portal is built
-- out fully -- until then, care_assignments creation becomes
-- service_role/SQL-only, matching the existing member_invites precedent
-- (no self-service creation, no Admin UI yet).
--
-- Real, accepted degradation while this stands: MemberList/Leads/
-- ConsentRequests in the Admin Portal will show nothing for members not
-- yet assigned to the viewing coordinator; a coordinator can no longer see
-- another coordinator's name/profile; no new care_assignments row can be
-- created via the app at all (existing assignments are untouched and keep
-- working -- is_assigned_coordinator() reads care_assignments directly via
-- SECURITY DEFINER regardless of RLS).

-- === profiles ===
-- Not member_id-scoped directly (profiles.id = auth.uid()), so "assigned"
-- here means: this profile belongs to a linked account (member_links) for
-- a patient the viewing coordinator is actually assigned to.
create or replace function public.is_assigned_coordinator_for_linked_profile(p_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.member_links ml
    where ml.user_id = p_profile_id
      and public.is_assigned_coordinator(ml.member_id)
  );
$$;

drop policy "coordinators read all profiles" on public.profiles;
create policy "assigned coordinator reads linked profiles"
  on public.profiles for select
  using (public.is_coordinator() and public.is_assigned_coordinator_for_linked_profile(id));

-- === member_links ===
drop policy "coordinators read all member links" on public.member_links;
create policy "assigned coordinator reads member links"
  on public.member_links for select
  using (public.is_coordinator() and public.is_assigned_coordinator(member_id));

-- === consents ===
drop policy "coordinators read all consent history" on public.consents;
create policy "assigned coordinator reads consent history"
  on public.consents for select
  using (public.is_coordinator() and public.is_assigned_coordinator(member_id));

-- === members: drop the two "any coordinator" exceptions that aren't SOS ===
-- Leads: per human-partner decision, NOT treated like SOS -- a lead not
-- yet assigned to any coordinator becomes invisible in the Leads screen
-- until a real claiming/assignment workflow exists. Assigned coordinators
-- already see the member via the existing can_access_member() policy, so
-- no replacement policy is needed once a lead's member is assigned.
drop policy "any coordinator reads member with upgrade lead" on public.members;
drop policy "any coordinator reads member with withdrawal request" on public.members;
-- "any coordinator reads member with sos alert" is intentionally untouched.

-- === upgrade_leads ===
drop policy "coordinator manages upgrade leads" on public.upgrade_leads;
create policy "assigned coordinator manages upgrade leads"
  on public.upgrade_leads for update
  using (public.is_coordinator() and public.is_assigned_coordinator(member_id))
  with check (public.is_coordinator() and public.is_assigned_coordinator(member_id));

drop policy "member or coordinator reads upgrade leads" on public.upgrade_leads;
create policy "member or assigned coordinator reads upgrade leads"
  on public.upgrade_leads for select
  using (
    public.member_owns(member_id)
    or (public.is_coordinator() and public.is_assigned_coordinator(member_id))
  );

-- === care_assignments ===
-- A coordinator may still see which patients THEY are assigned to (needed
-- for e.g. Admin's MemberList "Assigned to" column to show their own
-- name), but can no longer create, reassign, or deactivate any assignment
-- -- that requires a supervisor-or-above role that doesn't exist in the
-- schema yet (user_role is currently just 'member' | 'coordinator').
drop policy "coordinators manage assignments" on public.care_assignments;
create policy "coordinator reads own assignments"
  on public.care_assignments for select
  using (coordinator_id = auth.uid());

-- === reactivate_consent RPC ===
-- Was is_coordinator()-only (any coordinator could reactivate any user's
-- withdrawn consent for any member) -- inconsistent with the tightened
-- model above. Now requires the caller be assigned to the specific member
-- in question.
create or replace function public.reactivate_consent(p_user_id uuid, p_member_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_subject_email text;
  v_member_name text;
  v_actor_email text;
begin
  if not (public.is_coordinator() and public.is_assigned_coordinator(p_member_id)) then
    raise exception 'only the assigned coordinator can reactivate consent' using errcode = '42501';
  end if;

  select email into v_subject_email from auth.users where id = p_user_id;
  select full_name into v_member_name from public.members where id = p_member_id;
  select email into v_actor_email from auth.users where id = auth.uid();

  update public.profiles set consent_status = 'active' where id = p_user_id;

  insert into public.consents (
    user_id, member_id, event, subject_email, member_name_snapshot, actor_user_id, actor_email
  )
  values (
    p_user_id, p_member_id, 'given', v_subject_email, v_member_name, auth.uid(), v_actor_email
  );
end;
$$;
