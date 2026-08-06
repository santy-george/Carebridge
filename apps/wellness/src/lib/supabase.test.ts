import { afterEach, describe, expect, it, vi } from 'vitest';

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
  });
});
