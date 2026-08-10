import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN;

const PII_KEYS = [
  'full_name',
  'phone',
  'email',
  'address',
  'conditions',
  'conditions_other',
  'allergies',
  'notes',
  'emergency_contact_name',
  'emergency_contact_phone',
];

interface ScrubbableEvent {
  user?: { email?: string; ip_address?: string; [key: string]: unknown };
  request?: { headers?: Record<string, string> };
  extra?: Record<string, unknown>;
  breadcrumbs?: Array<{ data?: Record<string, unknown>; [key: string]: unknown }>;
  [key: string]: unknown;
}

function scrubValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrubValue);
  if (value && typeof value === 'object') return scrubObject(value as Record<string, unknown>);
  return value;
}

function scrubObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = PII_KEYS.includes(key) ? '[redacted]' : scrubValue(value);
  }
  return result;
}

// Strips known-PII fields from a Sentry event before it leaves the device --
// stack traces and error messages are left untouched, since scrubbing those
// would defeat the point of having Sentry. Exported (not just used inline in
// beforeSend) so it's unit-testable as plain data in/data out, without
// needing to mock Sentry.init's side effects.
export function sanitizeEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
  }
  if (event.request?.headers) {
    delete event.request.headers['Authorization'];
    delete event.request.headers['Cookie'];
  }
  if (event.extra) {
    event.extra = scrubObject(event.extra);
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) =>
      crumb.data ? { ...crumb, data: scrubObject(crumb.data) } : crumb,
    );
  }
  return event;
}

if (dsn) {
  Sentry.init({
    dsn,
    beforeSend: sanitizeEvent as Sentry.BrowserOptions['beforeSend'],
  });
}
