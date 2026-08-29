// Supabase query errors (PostgrestError: {code, details, hint, message}) are
// plain objects, not Error instances -- passed directly to
// Sentry.captureException(), the SDK can't serialize them into a real
// exception and the issue just shows "Object captured as exception with
// keys: code, details, hint, message" with none of the actual values,
// making it undebuggable from the Sentry UI alone. Wrap into a real Error
// carrying the actual message/code/details/hint as text instead.
//
// Deliberately has no dependency on '@sentry/react' or './sentry' -- it's
// pure error-shape normalization, not Sentry-specific. Keeping it out of
// sentry.ts (which calls Sentry.init() at module load) means importing this
// function never triggers that side effect in tests that only need this.
export function toSentryError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) return error;
  if (error && typeof error === 'object') {
    const { message, code, details, hint } = error as Record<string, unknown>;
    const parts = [message, code, details, hint].filter((v) => v != null && v !== '');
    if (parts.length) return new Error(parts.join(' | '));
  }
  return new Error(fallbackMessage);
}
