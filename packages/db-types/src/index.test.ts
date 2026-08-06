import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from './index';

describe('db-types placeholder package', () => {
  it('exposes a placeholder schema version until Supabase types are generated', () => {
    expect(SCHEMA_VERSION).toBe('unpopulated');
  });
});
