-- DPDP Act consent tracking: an append-only audit log of consent events
-- (given at signup, withdrawal requested, withdrawal verified/erased by a
-- coordinator) plus a cheap current-state column on profiles so route
-- guards don't need to scan the log on every page load. See
-- docs/superpowers/specs/2026-08-10-consent-and-pii-scrubbing-design.md.

create type public.consent_event as enum ('given', 'withdrawal_requested', 'withdrawal_verified');
create type public.consent_scope as enum ('self', 'all');

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- on delete SET NULL, not CASCADE: the whole point of this table is an
  -- audit trail that survives the events it records. A `scope: 'all'`
  -- erasure deletes the `members` row -- if this FK cascaded, that single
  -- DELETE would wipe out every consents row ever logged for that member
  -- (across every person who was ever linked to it), destroying the exact
  -- audit trail DPDP requires proof of consent/withdrawal via. (Caught in
  -- plan self-review -- the first draft used ON DELETE CASCADE here,
  -- copying the pattern every other member_id FK in this schema uses, but
  -- this table's whole purpose makes that pattern wrong specifically here.)
  member_id uuid references public.members(id) on delete set null, -- null for 'given' at signup (no member linked yet) or after the referenced member is erased
  event public.consent_event not null,
  scope public.consent_scope, -- only set for withdrawal_requested / withdrawal_verified
  policy_version text not null default 'v1',
  created_at timestamptz not null default now()
);
create index consents_user_id_idx on public.consents(user_id);
create index consents_member_id_idx on public.consents(member_id);

alter table public.consents enable row level security;

create policy "user reads own consent history"
  on public.consents for select using (user_id = auth.uid());

create policy "coordinators read all consent history"
  on public.consents for select using (public.is_coordinator());

-- Direct client inserts are restricted to event = 'given' (used once, at
-- signup). withdrawal_requested/withdrawal_verified are written only by
-- request_consent_withdrawal() below and the erase-consent-withdrawal Edge
-- Function, both of which run with table-owner privileges and bypass this
-- policy -- so this restriction only closes off what an ordinary
-- authenticated client can forge directly via supabase-js .insert().
create policy "user inserts own consent-given events"
  on public.consents for insert with check (user_id = auth.uid() and event = 'given');

-- No update/delete policy anywhere on this table -- the log is immutable.

alter table public.profiles
  add column consent_status text not null default 'active'
    check (consent_status in ('active', 'withdrawal_pending'));

-- The only path that can move a profile into 'withdrawal_pending'. Client
-- code never issues a raw UPDATE on profiles.consent_status directly.
create or replace function public.request_consent_withdrawal(p_member_id uuid, p_scope public.consent_scope)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.consents (user_id, member_id, event, scope)
  values (auth.uid(), p_member_id, 'withdrawal_requested', p_scope);

  update public.profiles set consent_status = 'withdrawal_pending' where id = auth.uid();
end;
$$;

-- Coordinator-only: reactivates a profile after confirming a withdrawal
-- request was accidental. Operates on an arbitrary p_user_id (not
-- auth.uid()), so it must self-check the caller's role -- unlike
-- request_consent_withdrawal, which is safe by construction because it
-- only ever touches the caller's own row.
create or replace function public.reactivate_consent(p_user_id uuid, p_member_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_coordinator() then
    raise exception 'only coordinators can reactivate consent' using errcode = '42501';
  end if;

  update public.profiles set consent_status = 'active' where id = p_user_id;

  insert into public.consents (user_id, member_id, event)
  values (p_user_id, p_member_id, 'given');
end;
$$;
