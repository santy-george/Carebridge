import { describe, expect, it } from 'vitest';
import { getIconNames } from './icons';

describe('icon sprite', () => {
  it('includes icons ported from js/icons.js', () => {
    const names = getIconNames();
    expect(names).toContain('dashboard');
    expect(names).toContain('emergency');
    expect(names).toContain('members');
    expect(names.length).toBeGreaterThan(50);
  });
});
