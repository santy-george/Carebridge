// Device upload keys for background wearable sync. The raw key exists only on
// the device; the database keeps its SHA-256 hash, so a leaked table row
// cannot be replayed as a key.

const PREFIX = 'cbdt_';

export function generateDeviceToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const b64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return PREFIX + b64;
}

export function looksLikeDeviceToken(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith(PREFIX) && v.length >= PREFIX.length + 40 && v.length <= 100;
}

export async function hashDeviceToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
