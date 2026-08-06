create table public.documents (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  category public.document_category not null,
  file_name text not null,
  storage_path text not null unique, -- '<member_id>/<uuid>-<file_name>' inside the 'documents' bucket
  mime_type text,
  file_size_bytes bigint,
  notes text,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index documents_member_category_idx on public.documents(member_id, category);

alter table public.documents enable row level security;
create policy "read own or assigned documents" on public.documents
  for select using (public.can_access_member(member_id));
create policy "member manages own documents" on public.documents
  for all using (public.member_owns(member_id)) with check (public.member_owns(member_id));
create policy "assigned coordinator manages documents" on public.documents
  for all
  using (public.is_coordinator() and public.is_assigned_coordinator(member_id))
  with check (public.is_coordinator() and public.is_assigned_coordinator(member_id));

-- Storage bucket: private. Path convention enforced by app code: '<member_id>/<filename>'.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "read own or assigned document files"
  on storage.objects for select
  using (bucket_id = 'documents' and public.can_access_member((storage.foldername(name))[1]::uuid));

create policy "member uploads own document files"
  on storage.objects for insert
  with check (bucket_id = 'documents' and public.member_owns((storage.foldername(name))[1]::uuid));

create policy "member deletes own document files"
  on storage.objects for delete
  using (bucket_id = 'documents' and public.member_owns((storage.foldername(name))[1]::uuid));

create policy "assigned coordinator manages document files"
  on storage.objects for all
  using (
    bucket_id = 'documents' and public.is_coordinator()
    and public.is_assigned_coordinator((storage.foldername(name))[1]::uuid)
  )
  with check (bucket_id = 'documents' and public.is_coordinator());
