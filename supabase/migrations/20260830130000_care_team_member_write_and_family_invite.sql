-- Reverses the V1 "care_team is read-only to family" call from
-- 20260805091858_members_care_team.sql: product decision, revisited
-- 2026-08-30 (mockup expects family to be able to add a care team
-- contact directly). Mirrors the member_owns write policy used on every
-- other member-owned table (medications, med_stock, appointments).
create policy "member manages own care team" on public.care_team
  for all using (public.member_owns(member_id)) with check (public.member_owns(member_id));

-- Family Circle permission level: 'full' can act on the member's behalf,
-- 'view' is read-only. Existing linked accounts default to 'full' (no
-- narrower access existed before this column).
alter table public.member_links
  add column permission_level text not null default 'full'
    check (permission_level in ('full', 'view'));

alter table public.member_invites
  add column permission_level text not null default 'full'
    check (permission_level in ('full', 'view'));

create or replace function public.redeem_invite_code(p_code text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_invite public.member_invites;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_invite from public.member_invites
    where code = p_code and used_at is null and expires_at > now()
    for update;

  if not found then
    raise exception 'invalid_or_expired_code';
  end if;

  insert into public.member_links (member_id, user_id, relationship_label, is_self, permission_level)
    values (v_invite.member_id, auth.uid(), v_invite.relationship_label, v_invite.is_self, v_invite.permission_level)
    on conflict (member_id, user_id) do nothing;

  update public.member_invites
    set used_at = now(), used_by_user_id = auth.uid()
    where id = v_invite.id;

  return v_invite.member_id;
end;
$$;

-- Self-service counterpart to redeem_invite_code(): lets an already-linked
-- family member (or the member themselves) generate a code for a new
-- family member, without coordinator involvement. Requires member_owns so
-- only people already on this member's care team can invite more people
-- onto it -- an unrelated authenticated user cannot mint invites for a
-- member they have no relationship to.
create or replace function public.create_family_invite(
  p_member_id uuid,
  p_relationship_label text,
  p_permission_level text default 'full'
)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not public.member_owns(p_member_id) then
    raise exception 'not_authorized';
  end if;

  if p_permission_level not in ('full', 'view') then
    raise exception 'invalid_permission_level';
  end if;

  v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

  insert into public.member_invites (code, member_id, relationship_label, is_self, permission_level, created_by)
    values (v_code, p_member_id, coalesce(nullif(trim(p_relationship_label), ''), 'Family member'), false, p_permission_level, auth.uid());

  return v_code;
end;
$$;

revoke execute on function public.create_family_invite(uuid, text, text) from public, anon;
grant execute on function public.create_family_invite(uuid, text, text) to authenticated;
