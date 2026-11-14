import { createClient } from 'jsr:@supabase/supabase-js@2';
import { jwtClaims } from '../_shared/auth.ts';
import { PROVIDER, googleConfigFromEnv, syncMember } from '../_shared/googleHealth.ts';

// Scheduled pull (pg_cron, hourly). service_role only: a member JWT is also
// platform-valid, and must not be able to trigger syncs for everyone.
Deno.serve(async (req: Request) => {
  const headers = { 'Content-Type': 'application/json' };
  if (jwtClaims(req).role !== 'service_role') {
    return new Response(JSON.stringify({ error: 'service_role required' }), { status: 403, headers });
  }
  const cfg = googleConfigFromEnv();
  if (!cfg) return new Response(JSON.stringify({ error: 'google health not configured' }), { status: 503, headers });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: connections, error } = await admin
    .from('wearable_connections')
    .select('member_id')
    .eq('provider', PROVIDER)
    .eq('status', 'ok');
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });

  // Sequential on purpose: tens to low hundreds of members, well inside the
  // function time limit, and gentle on Google's per-project quota.
  const results = [];
  for (const { member_id } of connections ?? []) {
    try {
      results.push(await syncMember(admin, cfg, member_id));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await admin
        .from('wearable_connections')
        .update({ last_error: message.slice(0, 300) })
        .eq('member_id', member_id)
        .eq('provider', PROVIDER);
      results.push({ memberId: member_id, error: message });
    }
  }
  return new Response(JSON.stringify({ ok: true, members: results.length, results }), { headers });
});
