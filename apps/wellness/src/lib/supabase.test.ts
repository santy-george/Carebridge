import { afterEach, describe, expect, it, vi } from 'vitest';
import { capacitorPreferencesStorage } from './storage-adapter';

describe('supabase client', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('creates a client when env vars are present', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

    const { supabase } = await import('./supabase');

    expect(supabase).toBeDefined();
    expect(typeof supabase.auth.signInWithPassword).toBe('function');
    expect((supabase.auth as unknown as { storage: unknown }).storage).toBe(
      capacitorPreferencesStorage,
    );
  });
});
