-- Google Health API connections (Fitbit SpO2; design in
-- docs/superpowers/specs/2026-11-15-google-health-api-spo2-design.md).
--
-- A Google refresh token is a long-lived credential to a member's health data
-- at Google. It lives only in Supabase Vault (encrypted at rest); the table
-- holds the vault secret id. Neither table has an RLS policy, so no client
-- role (member, family, coordinator, admin) can select them at all. Only the
-- Edge Functions, through the service_role-only functions below, touch tokens.
-- The member-facing status function returns status fields and never the token.

create table public.wearable_connections (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  provider text not null check (provider in ('google_health')),
  refresh_token_secret_id uuid not null,
  scopes text not null,
  status text not null default 'ok' check (status in ('ok', 'needs_reconnect')),
  connected_by uuid references auth.users(id) on delete set null,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  last_error text,
  unique (member_id, provider)
);
alter table public.wearable_connections enable row level security;

-- One row per in-flight consent: the OAuth `state` value and its PKCE
-- verifier. Single use (deleted on callback) and short-lived.
create table public.oauth_states (
  state text primary key,
  member_id uuid not null references public.members(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google_health')),
  code_verifier text not null,
  expires_at timestamptz not null default now() + interval '10 minutes'
);
alter table public.oauth_states enable row level security;

-- Delete a connection's vault secret along with the row, including when the
-- member row is deleted (cascade) -- an orphaned token would outlive erasure.
create or replace function public.delete_wearable_connection_secret()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  delete from vault.secrets where id = old.refresh_token_secret_id;
  return old;
end;
$$;
create trigger wearable_connections_delete_secret
  after delete on public.wearable_connections
  for each row execute function public.delete_wearable_connection_secret();
revoke execute on function public.delete_wearable_connection_secret() from public, anon, authenticated;

create or replace function public.store_wearable_connection(
  p_member_id uuid,
  p_provider text,
  p_refresh_token text,
  p_scopes text,
  p_user_id uuid
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_secret_id uuid;
begin
  select refresh_token_secret_id into v_secret_id
    from public.wearable_connections
   where member_id = p_member_id and provider = p_provider;

  if v_secret_id is null then
    v_secret_id := vault.create_secret(p_refresh_token);
    insert into public.wearable_connections
      (member_id, provider, refresh_token_secret_id, scopes, connected_by)
    values (p_member_id, p_provider, v_secret_id, p_scopes, p_user_id);
  else
    perform vault.update_secret(v_secret_id, p_refresh_token);
    update public.wearable_connections
       set scopes = p_scopes, status = 'ok', last_error = null,
           connected_by = p_user_id, connected_at = now()
     where member_id = p_member_id and provider = p_provider;
  end if;
end;
$$;

create or replace function public.get_wearable_refresh_token(p_member_id uuid, p_provider text)
returns text
language sql stable security definer set search_path = public
as $$
  select s.decrypted_secret
    from public.wearable_connections c
    join vault.decrypted_secrets s on s.id = c.refresh_token_secret_id
   where c.member_id = p_member_id and c.provider = p_provider;
$$;

-- Token-handling functions: service_role only. The default grants give anon
-- and authenticated EXECUTE on every function, so revoke both explicitly.
revoke execute on function public.store_wearable_connection(uuid, text, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.get_wearable_refresh_token(uuid, text) from public, anon, authenticated;
grant execute on function public.store_wearable_connection(uuid, text, text, text, uuid) to service_role;
grant execute on function public.get_wearable_refresh_token(uuid, text) to service_role;

-- What the app may know: whether a member is connected and whether it needs
-- attention. Same audience as the member's other health data.
create or replace function public.get_wearable_connection_status(p_member_id uuid)
returns table (
  provider text,
  status text,
  connected_at timestamptz,
  last_synced_at timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.can_access_member(p_member_id) then
    raise exception 'not_authorized';
  end if;
  return query
    select c.provider, c.status, c.connected_at, c.last_synced_at
      from public.wearable_connections c
     where c.member_id = p_member_id;
end;
$$;
revoke execute on function public.get_wearable_connection_status(uuid) from public, anon;
grant execute on function public.get_wearable_connection_status(uuid) to authenticated;
