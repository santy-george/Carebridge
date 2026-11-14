import { createClient } from 'jsr:@supabase/supabase-js@2';
import { jwtClaims } from '../_shared/auth.ts';
import { generateDeviceToken, hashDeviceToken } from '../_shared/deviceToken.ts';

// Trades the member's signed-in session for a device upload key used by the
// Android background sync job (see 20261115040000_wearable_device_tokens.sql
// for why a session cannot be shared). Only the member's own login may get a
// key: the phone's Health Connect data is its owner's, and a relative's phone
// must not stream its owner's watch data into a parent's record unattended.
// Registering again replaces the previous key for that user, member and
// platform, so a reinstall or re-login never leaves an old key live.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const userId = jwtClaims(req).sub;
  if (!userId) return json({ error: 'unauthorized' }, 401);

  const { member_id: memberId, platform } = await req.json().catch(() => ({}));
  if (typeof memberId !== 'string') return json({ error: 'member_id required' }, 400);
  if (platform !== 'android') return json({ error: 'unsupported platform' }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: link } = await admin
    .from('member_links')
    .select('member_id')
    .eq('user_id', userId)
    .eq('member_id', memberId)
    .eq('is_self', true)
    .maybeSingle();
  if (!link) return json({ error: 'only the member can enable background sync' }, 403);

  const { error: revokeError } = await admin
    .from('wearable_device_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('member_id', memberId)
    .eq('platform', platform)
    .is('revoked_at', null);
  if (revokeError) return json({ error: 'could not register device' }, 500);

  const token = generateDeviceToken();
  const { error } = await admin.from('wearable_device_tokens').insert({
    user_id: userId,
    member_id: memberId,
    platform,
    token_hash: await hashDeviceToken(token),
  });
  if (error) return json({ error: 'could not register device' }, 500);

  return json({ token });
});
