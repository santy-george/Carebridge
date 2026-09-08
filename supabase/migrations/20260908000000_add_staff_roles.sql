-- Extends the 2-value user_role enum (member/coordinator) to the full
-- 6-value role model the Admin Portal mockup's Users & Roles screen
-- assumes (admin/coordinator/field_staff/finance/management, plus the
-- existing member). This migration ONLY adds the enum values -- Postgres
-- forbids referencing a newly added enum value in a comparison/WHERE
-- clause inside the same transaction that added it (ALTER TYPE ... ADD
-- VALUE takes effect at transaction commit, but the safety check that
-- blocks using it mid-transaction is separate and still applies). Every
-- migration file in this repo runs as its own transaction, so the actual
-- staff_profiles table + RLS policies that reference these new values
-- live in the next migration file, not this one.
alter type public.user_role add value 'admin';
alter type public.user_role add value 'field_staff';
alter type public.user_role add value 'finance';
alter type public.user_role add value 'management';