create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'member',
  full_name text,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile on signup. Role always defaults to 'member' --
-- coordinators are promoted manually (UPDATE profiles SET role='coordinator'
-- WHERE id=...) for V1 since there's a small, known set of coordinators and
-- no self-serve coordinator signup (V1_SCOPE Sec 3).
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, phone)
  values (new.id, new.email, new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

alter table public.profiles enable row level security;

-- Helper functions used by every RLS policy below. security definer + fixed
-- search_path so they can read tables the calling role's own RLS would
-- otherwise block (avoids policy recursion), without being search_path-hijackable.
create or replace function public.is_coordinator()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'coordinator'
  );
$$;

create policy "profile owner reads own profile"
  on public.profiles for select using (id = auth.uid());

create policy "profile owner updates own profile"
  on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "coordinators read all profiles"
  on public.profiles for select using (public.is_coordinator());
