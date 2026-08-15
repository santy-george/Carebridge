-- Found during the 2026-08-15 RLS audit (Workstream D). Four policies use
-- the shape `using (is_coordinator() and is_assigned_coordinator(x))
-- with check (is_coordinator())` -- the assignment half is checked on the
-- OLD row (USING) but dropped on the NEW row (WITH CHECK). For INSERT,
-- Postgres only ever evaluates WITH CHECK (there is no old row), so on
-- these tables any coordinator -- not just the member's assigned one --
-- could INSERT a row for a member they have no assignment to, fully
-- bypassing the "assigned coordinator only" design intent these tables
-- state in their own comments. For UPDATE, the same gap lets an assigned
-- coordinator re-parent an existing row onto an unassigned member_id in
-- the same statement that passed USING against their own assignment.
--
-- Fix: widen WITH CHECK to match USING on all four. No behaviour change for
-- any legitimate caller -- every existing write from Admin already targets
-- the coordinator's own assigned members.

-- === care_team ===
drop policy "assigned coordinator manages care team" on public.care_team;
create policy "assigned coordinator manages care team"
  on public.care_team for all
  using (public.is_coordinator() and public.is_assigned_coordinator(member_id))
  with check (public.is_coordinator() and public.is_assigned_coordinator(member_id));

-- === preventive_plan_goals ===
drop policy "assigned coordinator manages preventive plan goals" on public.preventive_plan_goals;
create policy "assigned coordinator manages preventive plan goals"
  on public.preventive_plan_goals for all
  using (public.is_coordinator() and public.is_assigned_coordinator(member_id))
  with check (public.is_coordinator() and public.is_assigned_coordinator(member_id));

-- === storage.objects (documents bucket) ===
drop policy "assigned coordinator manages document files" on storage.objects;
create policy "assigned coordinator manages document files"
  on storage.objects for all
  using (
    bucket_id = 'documents' and public.is_coordinator()
    and public.is_assigned_coordinator((storage.foldername(name))[1]::uuid)
  )
  with check (
    bucket_id = 'documents' and public.is_coordinator()
    and public.is_assigned_coordinator((storage.foldername(name))[1]::uuid)
  );

-- === members ===
-- Lower severity than the three above -- member_id here is the row's own
-- primary key, not a plain FK column, so "reparenting" would mean rewriting
-- a member's own id, which every child table's FK (no ON UPDATE CASCADE
-- specified) already blocks in practice. Fixed anyway for consistency and
-- because a future migration could add an ON UPDATE CASCADE FK without
-- anyone thinking to revisit this policy.
drop policy "assigned coordinator updates member record" on public.members;
create policy "assigned coordinator updates member record"
  on public.members for update
  using (public.is_coordinator() and public.is_assigned_coordinator(id))
  with check (public.is_coordinator() and public.is_assigned_coordinator(id));
