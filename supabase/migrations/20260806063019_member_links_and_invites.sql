-- member_links replaces members.user_id (single-owner) with a many-to-many
-- model: one account can be linked to multiple members (e.g. a family
-- member managing two parents), and one member can have multiple linked
-- accounts (the patient's own account plus one or more family members').
create table public.member_links (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  relationship_label text not null default 'Family member', -- e.g. 'Self', 'Son', 'Daughter', 'Spouse'
  is_self boolean not null default false,
  created_at timestamptz not null default now(),
  unique (member_id, user_id)
);
create index member_links_user_id_idx on public.member_links(user_id);
create index member_links_member_id_idx on public.member_links(member_id);

alter table public.member_links enable row level security;

create policy "user reads own member links"
  on public.member_links for select using (user_id = auth.uid());
create policy "coordinators read all member links"
  on public.member_links for select using (public.is_coordinator());
-- Deliberately no client-facing insert/update/delete policy -- rows are
-- created only via redeem_invite_code() (security definer, bypasses RLS)
-- or coordinator-run SQL for now.

-- member_invites: one-time codes a coordinator generates (SQL/script for
-- now, no Admin UI yet) and hands to a family member/patient to redeem.
-- Example, run by a coordinator to invite someone to member <member_id>:
--   insert into public.member_invites (code, member_id, relationship_label, is_self)
--   values (upper(substr(md5(random()::text), 1, 8)), '<member_id>', 'Son', false);
create table public.member_invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  member_id uuid not null references public.members(id) on delete cascade,
  relationship_label text not null default 'Family member',
  is_self boolean not null default false,
  created_by uuid references public.profiles(id),
  expires_at timestamptz not null default (now() + interval '14 days'),
  used_at timestamptz,
  used_by_user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index member_invites_member_id_idx on public.member_invites(member_id);

-- No RLS policy at all on member_invites -- unreachable by direct client
-- query even for authenticated users. The only way in is the security
-- definer RPC below, or coordinator-run SQL. This keeps codes unguessable
-- by query even though the table itself has RLS enabled (default-deny).
alter table public.member_invites enable row level security;

create or replace function public.redeem_invite_code(p_code text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_invite public.member_invites;
begin
  select * into v_invite from public.member_invites
    where code = p_code and used_at is null and expires_at > now()
    for update;

  if not found then
    raise exception 'invalid_or_expired_code';
  end if;

  insert into public.member_links (member_id, user_id, relationship_label, is_self)
    values (v_invite.member_id, auth.uid(), v_invite.relationship_label, v_invite.is_self)
    on conflict (member_id, user_id) do nothing;

  update public.member_invites
    set used_at = now(), used_by_user_id = auth.uid()
    where id = v_invite.id;

  return v_invite.member_id;
end;
$$;

-- New tables/functions from this migration are covered automatically by
-- the `alter default privileges` grants in 20260805095146_grants.sql (same
-- migration-runner role) -- no extra grant statements needed here.

-- member_owns() now checks member_links instead of members.user_id.
create or replace function public.member_owns(p_member_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.member_links ml where ml.member_id = p_member_id and ml.user_id = auth.uid()
  );
$$;

-- The old policy read members.user_id directly -- replace it before
-- dropping that column.
drop policy "member updates own member record" on public.members;
create policy "member updates own member record"
  on public.members for update
  using (public.member_owns(id)) with check (public.member_owns(id));

drop index if exists members_user_id_idx;
alter table public.members drop column user_id;
