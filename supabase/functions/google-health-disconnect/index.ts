import { createClient } from 'jsr:@supabase/supabase-js@2';
import { jwtClaims } from '../_shared/auth.ts';
import { PROVIDER, revokeToken } from '../_shared/googleHealth.ts';

// Disconnect = revoke at Google, then delete the row (its trigger deletes the
// vault secret). Only the member's self link may disconnect, same as connect.
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
  const { member_id: memberId } = await req.json().catch(() => ({}));
  if (typeof memberId !== 'string') return json({ error: 'member_id required' }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: link } = await admin
    .from('member_links')
    .select('member_id')
    .eq('user_id', userId)
    .eq('member_id', memberId)
    .eq('is_self', true)
    .maybeSingle();
  if (!link) return json({ error: 'only the member can disconnect their own account' }, 403);

  const { data: token } = await admin.rpc('get_wearable_refresh_token', {
    p_member_id: memberId,
    p_provider: PROVIDER,
  });
  if (token) await revokeToken(token);

  const { error } = await admin
    .from('wearable_connections')
    .delete()
    .eq('member_id', memberId)
    .eq('provider', PROVIDER);
  if (error) return json({ error: 'could not disconnect' }, 500);
  return json({ ok: true });
});
