import { describe, expect, it } from 'vitest';
import { toSentryError } from './toSentryError';

describe('toSentryError', () => {
  it('passes a real Error through unchanged', () => {
    const original = new Error('boom');
    expect(toSentryError(original, 'fallback')).toBe(original);
  });

  it('wraps a PostgrestError-shaped object into a real Error with the actual message', () => {
    const pgError = {
      code: '23505',
      details: 'Key already exists.',
      hint: null,
      message: 'duplicate key value',
    };
    const wrapped = toSentryError(pgError, 'fallback');
    expect(wrapped).toBeInstanceOf(Error);
    expect(wrapped.message).toContain('duplicate key value');
    expect(wrapped.message).toContain('23505');
    expect(wrapped.message).toContain('Key already exists.');
  });

  it('falls back to the provided message for null/undefined/non-object errors', () => {
    expect(toSentryError(null, 'fallback message').message).toBe('fallback message');
    expect(toSentryError(undefined, 'fallback message').message).toBe('fallback message');
    expect(toSentryError('a string', 'fallback message').message).toBe('fallback message');
  });

  it('falls back to the provided message when the object has no usable fields', () => {
    expect(toSentryError({}, 'fallback message').message).toBe('fallback message');
  });
});
