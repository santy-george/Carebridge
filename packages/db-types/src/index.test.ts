import { describe, expect, it } from 'vitest';
import type { Database } from './index';

type PublicTables = Database['public']['Tables'];

describe('db-types', () => {
  it('generates a Database type with the expected core tables', () => {
    const tableNames: Array<keyof PublicTables> = ['members', 'profiles', 'checkins'];
    expect(tableNames).toHaveLength(3);
  });
});
