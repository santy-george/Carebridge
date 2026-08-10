import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'missing authorization header' }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Verify the caller's JWT and role using an RLS-respecting client first --
  // confirms who is calling and that they're a coordinator before the
  // service-role client below does anything privileged.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user: caller },
  } = await callerClient.auth.getUser();
  if (!caller) {
    return new Response(JSON.stringify({ error: 'invalid session' }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const { data: callerProfile } = await callerClient
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .maybeSingle();
  if (callerProfile?.role !== 'coordinator') {
    return new Response(JSON.stringify({ error: 'coordinator role required' }), {
      status: 403,
      headers: corsHeaders,
    });
  }

  const body = await req.json();
  const memberId: string | undefined = body.member_id;
  const requesterUserId: string | undefined = body.requester_user_id;
  const scope: 'self' | 'all' | undefined = body.scope;

  if (!memberId || !requesterUserId || (scope !== 'self' && scope !== 'all')) {
    return new Response(
      JSON.stringify({
        error: 'member_id, requester_user_id, and scope (self|all) are required',
      }),
      { status: 400, headers: corsHeaders },
    );
  }

  // Elevated client for the actual erasure -- bypasses RLS by design, since
  // this whole endpoint is a coordinator-authorized action already gated
  // above.
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Log the verification BEFORE deleting anything -- consents.user_id has
  // `on delete cascade`, so logging this after deleteUser() would erase the
  // very audit row meant to record that the erasure happened.
  await adminClient.from('consents').insert({
    user_id: requesterUserId,
    member_id: memberId,
    event: 'withdrawal_verified',
    scope,
  });

  if (scope === 'self') {
    // profiles.id -> auth.users(id) and member_links.user_id -> auth.users(id)
    // are both `on delete cascade` -- deleting the auth user is enough, the
    // rest cascades automatically. The patient's `members` row and other
    // linked accounts are untouched.
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(requesterUserId);
    if (deleteUserError) {
      return new Response(JSON.stringify({ error: deleteUserError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }
    return new Response(JSON.stringify({ ok: true, scope: 'self' }), {
      status: 200,
      headers: corsHeaders,
    });
  }

  // scope === 'all': every clinical/operational table with a member_id FK
  // already cascades from `members` (verified against every migration in
  // supabase/migrations/ -- checkins, vitals_readings, glucose_readings,
  // wearable_readings, medication_logs, medications, med_stock, sos_alerts,
  // preventive_plan_goals, care_team, care_assignments, documents (table
  // rows), member_links, member_invites are all `on delete cascade` from
  // members). Deleting the members row handles all of that in one
  // statement. `consents` is the deliberate exception -- its member_id FK
  // is `on delete set null`, not cascade, specifically so this erasure
  // doesn't destroy its own audit trail (see the migration in Task 1).
  // Two other things this DELETE does NOT reach: the actual Storage blobs
  // behind any documents rows (no DB-level FK to storage.objects), and the
  // linked accounts' auth.users logins.
  const { data: docs } = await adminClient
    .from('documents')
    .select('storage_path')
    .eq('member_id', memberId);
  const storagePaths = (docs ?? []).map((doc: { storage_path: string }) => doc.storage_path);
  if (storagePaths.length > 0) {
    await adminClient.storage.from('documents').remove(storagePaths);
  }

  const { data: links } = await adminClient
    .from('member_links')
    .select('user_id')
    .eq('member_id', memberId);
  const linkedUserIds = (links ?? []).map((link: { user_id: string }) => link.user_id);

  const { error: deleteMemberError } = await adminClient
    .from('members')
    .delete()
    .eq('id', memberId);
  if (deleteMemberError) {
    return new Response(JSON.stringify({ error: deleteMemberError.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  for (const userId of linkedUserIds) {
    await adminClient.auth.admin.deleteUser(userId);
  }

  return new Response(
    JSON.stringify({ ok: true, scope: 'all', erased_accounts: linkedUserIds.length }),
    { status: 200, headers: corsHeaders },
  );
});
