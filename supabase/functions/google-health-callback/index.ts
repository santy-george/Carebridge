import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  PROVIDER,
  SPO2_SCOPE,
  exchangeCode,
  googleConfigFromEnv,
  grantedScopeIncludes,
  revokeToken,
  syncMember,
} from '../_shared/googleHealth.ts';

// Google redirects the member's browser here after consent, so there is no
// Supabase JWT: deployed with verify_jwt = false (config.toml). The only
// authority is the single-use `state` minted by google-health-connect, which
// binds this callback to the member and user that started it. The PKCE
// verifier stored with it means an intercepted code is useless on its own.

const page = (title: string, message: string, status = 200) =>
  new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;max-width:28rem;margin:4rem auto;padding:0 1.5rem;color:#1f2937}h1{font-size:1.4rem;color:#3E6FB8}</style></head>
<body><h1>${title}</h1><p>${message}</p></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const googleError = url.searchParams.get('error');

  const cfg = googleConfigFromEnv();
  if (!cfg) return page('Not available', 'Fitbit connection is not set up yet.', 503);
  if (!state) return page('Something went wrong', 'This link is incomplete. Please try again from the app.', 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Consume the state first, whatever happens next: it must never be usable twice.
  const { data: pending } = await admin
    .from('oauth_states')
    .delete()
    .eq('state', state)
    .eq('provider', PROVIDER)
    .gt('expires_at', new Date().toISOString())
    .select('member_id, user_id, code_verifier')
    .maybeSingle();
  if (!pending) {
    return page('Link expired', 'This connection link has expired or was already used. Please start again from the app.', 400);
  }
  if (googleError || !code) {
    return page('Not connected', 'Fitbit was not connected. You can try again from the app at any time.');
  }

  let refreshToken: string | null;
  let scope: string;
  try {
    ({ refreshToken, scope } = await exchangeCode(cfg, code, pending.code_verifier));
  } catch {
    return page('Something went wrong', 'We could not finish connecting Fitbit. Please try again from the app.', 502);
  }

  // The member can untick the permission on Google's screen. Without it the
  // connection is useless, so do not keep the token at all.
  if (!refreshToken || !grantedScopeIncludes(scope, SPO2_SCOPE)) {
    if (refreshToken) await revokeToken(refreshToken);
    return page(
      'Permission needed',
      'Care Bridge needs permission to read your health measurements to show your blood oxygen. Please try again and leave that box ticked.',
    );
  }

  const { error } = await admin.rpc('store_wearable_connection', {
    p_member_id: pending.member_id,
    p_provider: PROVIDER,
    p_refresh_token: refreshToken,
    p_scopes: scope,
    p_user_id: pending.user_id,
  });
  if (error) {
    await revokeToken(refreshToken);
    return page('Something went wrong', 'We could not save the connection. Please try again from the app.', 500);
  }

  // First sync now, so the member sees data on return rather than in an hour.
  try {
    await syncMember(admin, cfg, pending.member_id);
  } catch (e) {
    console.error('initial google health sync failed', e instanceof Error ? e.message : e);
  }

  // Housekeeping: drop expired, never-completed consents.
  await admin.from('oauth_states').delete().lt('expires_at', new Date().toISOString());

  return page('Fitbit connected', 'You can close this page and return to the Care Bridge app.');
});
