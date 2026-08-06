-- RLS only filters rows within a table a role can already touch -- Postgres
-- still requires the base GRANT for anon/authenticated to reach these tables
-- at all. Local Docker's default privileges didn't cover SELECT/INSERT/
-- UPDATE/DELETE (confirmed via \dp), so grant explicitly, both for existing
-- tables and any created by future migrations.
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;
grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;
grant execute on all functions in schema public
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
