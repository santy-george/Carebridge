import { describe, expect, it } from 'vitest';
import { sanitizeEvent } from './sentry';

describe('sanitizeEvent', () => {
  it('redacts known PII keys from event.extra', () => {
    const event = {
      extra: { full_name: 'Jane Doe', phone: '+91123', unrelated: 'keep me' },
    };
    expect(sanitizeEvent(event).extra).toEqual({
      full_name: '[redacted]',
      phone: '[redacted]',
      unrelated: 'keep me',
    });
  });

  it('redacts PII keys inside breadcrumb data without dropping other breadcrumb fields', () => {
    const event = {
      breadcrumbs: [
        { message: 'clicked', category: 'ui.click', data: { email: 'a@b.com', action: 'submit' } },
      ],
    };
    const result = sanitizeEvent(event);
    expect(result.breadcrumbs?.[0]).toEqual({
      message: 'clicked',
      category: 'ui.click',
      data: { email: '[redacted]', action: 'submit' },
    });
  });

  it('strips user email and ip_address but keeps other user fields', () => {
    const event = { user: { id: 'user-1', email: 'a@b.com', ip_address: '1.2.3.4' } };
    expect(sanitizeEvent(event).user).toEqual({ id: 'user-1' });
  });

  it('strips Authorization and Cookie request headers', () => {
    const event = {
      request: { headers: { Authorization: 'Bearer x', Cookie: 'session=y', 'User-Agent': 'test' } },
    };
    expect(sanitizeEvent(event).request?.headers).toEqual({ 'User-Agent': 'test' });
  });

  it('leaves an event with none of the above fields untouched', () => {
    const event = { message: 'some error' };
    expect(sanitizeEvent(event)).toEqual({ message: 'some error' });
  });

  it('recurses into nested objects and arrays within extra', () => {
    const event = {
      extra: { patient: { full_name: 'Jane', history: [{ notes: 'private' }] } },
    };
    expect(sanitizeEvent(event).extra).toEqual({
      patient: { full_name: '[redacted]', history: [{ notes: '[redacted]' }] },
    });
  });
});
