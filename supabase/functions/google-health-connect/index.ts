import { createClient } from 'jsr:@supabase/supabase-js@2';
import { jwtClaims } from '../_shared/auth.ts';
import {
  PROVIDER,
  buildConsentUrl,
  googleConfigFromEnv,
  pkceChallenge,
  randomToken,
} from '../_shared/googleHealth.ts';

// Starts the Google consent flow for the caller's own member record. Only the
// member's self link may connect: the Google account is the watch wearer's,
// and a family member must not attach their own Google data to a parent.
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

  const cfg = googleConfigFromEnv();
  if (!cfg) return json({ error: 'google health not configured' }, 503);

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
  if (!link) return json({ error: 'only the member can connect their own account' }, 403);

  // Abandoned consents (member closed the browser) expire; clear them out.
  await admin.from('oauth_states').delete().lt('expires_at', new Date().toISOString());

  const state = randomToken();
  const verifier = randomToken(48);
  const { error } = await admin.from('oauth_states').insert({
    state,
    member_id: memberId,
    user_id: userId,
    provider: PROVIDER,
    code_verifier: verifier,
  });
  if (error) return json({ error: 'could not start connection' }, 500);

  return json({ url: buildConsentUrl(cfg, state, await pkceChallenge(verifier)) });
});
