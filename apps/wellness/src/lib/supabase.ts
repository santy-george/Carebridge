import { createClient } from '@supabase/supabase-js';
import type { Database } from '@carebridge/db-types';
import { capacitorPreferencesStorage } from './storage-adapter';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.');
}

// Vite loads .env.local in every mode, including production builds, so a build
// invoked without an explicit override silently ships the local-dev loopback
// URL. Fail the build loudly rather than shipping an app that can't reach any
// backend (see 2026-08-20 device-test finding: a `pnpm build` with no override
// baked in http://127.0.0.1:54321 and every request failed with no clear cause).
if (
  import.meta.env.PROD &&
  /^https?:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0)([:/]|$)/.test(supabaseUrl)
) {
  throw new Error(
    `VITE_SUPABASE_URL resolved to a loopback address (${supabaseUrl}) in a production build. ` +
      'This almost always means .env.local leaked into the build — pass VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ' +
      'as explicit environment overrides when building for a real device or deployment.',
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: capacitorPreferencesStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
