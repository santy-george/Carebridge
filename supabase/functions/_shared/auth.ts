// Claims of the caller's Supabase JWT. Only safe in a function deployed with
// verify_jwt = true (the default): the platform has already checked the
// signature, so decoding here is reading, not trusting.
export function jwtClaims(req: Request): { sub?: string; role?: string } {
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const segment = jwt.split('.')[1];
  if (!segment) return {};
  try {
    return JSON.parse(atob(segment.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return {};
  }
}
