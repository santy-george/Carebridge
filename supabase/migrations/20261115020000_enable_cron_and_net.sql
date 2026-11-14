-- Scheduled jobs (pg_cron) that call Edge Functions over HTTP (pg_net).
-- The jobs themselves are created per environment, not here: they name the
-- hosted function URL and read a service-role key from Vault, neither of
-- which exists on a local stack. Hosted job definitions are recorded in
-- docs/superpowers/specs/2026-11-15-google-health-api-spo2-design.md.
create extension if not exists pg_cron;
create extension if not exists pg_net;
