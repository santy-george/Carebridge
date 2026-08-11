-- Phase 3 push notifications: table to persist each device's push token so
-- a future send job (Edge Function, SECURITY DEFINER RPC, or service-role
-- job) has something to send to. No sender exists yet -- this migration
-- only lands the storage side, wired up from the Wellness app's push
-- registration flow (src/lib/push.ts).

create table public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade, -- unlike consents, a token is meaningless once the account is gone -- cascade is correct here
  platform text not null check (platform in ('ios', 'android')),
  token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per (user, token): the same token can't belong to two rows for
-- the same user (re-registration on app relaunch should update, not
-- duplicate), but a user can hold multiple tokens (multiple devices).
create unique index device_push_tokens_user_token_idx on public.device_push_tokens(user_id, token);
create index device_push_tokens_user_id_idx on public.device_push_tokens(user_id);

alter table public.device_push_tokens enable row level security;

-- Owner-only, full lifecycle: a device registers its own token, refreshes
-- it on change, and should remove it on sign-out/uninstall. No coordinator
-- read policy -- coordinators never need to read raw tokens directly, only
-- whatever future send job runs as service_role (which bypasses RLS).
create policy "user manages own push tokens"
  on public.device_push_tokens for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create trigger device_push_tokens_set_updated_at
  before update on public.device_push_tokens
  for each row execute function public.set_updated_at();
