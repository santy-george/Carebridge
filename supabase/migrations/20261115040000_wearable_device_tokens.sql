-- Per-device upload keys for background wearable sync (Android WorkManager).
-- A background job cannot share the app's Supabase session: refresh tokens
-- rotate, and two holders of one session log each other out. So the app
-- trades its session, once, for a device key that can do exactly one thing:
-- upload readings for one member through ingest-wearable.
--
-- Only a SHA-256 hash is stored. No RLS policy: no client role can read the
-- table; ingest-wearable and register-wearable-device use the service role.
-- On every use the key's user must still be linked to its member, so removing
-- a member link disables the key without touching this table.

create table public.wearable_device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  platform text not null check (platform in ('android')),
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index wearable_device_tokens_user_member_idx
  on public.wearable_device_tokens(user_id, member_id, platform);
alter table public.wearable_device_tokens enable row level security;
