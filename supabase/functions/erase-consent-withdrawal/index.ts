import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  // Every response in this file spreads corsHeaders, so declaring the
  // content type once here covers all of them. Without it supabase-js hands
  // the caller a raw string instead of a parsed object, which is how
  // `failed_accounts` was going unnoticed on the Admin side.
  'Content-Type': 'application/json',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    // JSON body rather than the bare string 'ok', now that corsHeaders
    // declares Content-Type: application/json for every response.
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  }

  // Everything below can throw in ways that aren't individually anticipated
  // (a malformed request body, an unexpected client-library error, etc.).
  // Without this wrapper, an uncaught throw produces a default error
  // response with no CORS headers, which a browser caller sees as an opaque
  // CORS failure instead of a proper error status/body.
  try {
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

    // Server-side validation of the request body BEFORE anything is deleted.
    // member_id / requester_user_id / scope arrive from the client, and the
    // typed-"WITHDRAW" confirmation in the Admin UI is a friction gate, not a
    // security control. This is the layer holding the service_role key and
    // performing irreversible deletion, so it must independently confirm that
    // a real, still-pending withdrawal request exists for this exact
    // (user, member, scope) triple -- otherwise a coordinator (or anything
    // holding a coordinator session) could erase an arbitrary member that
    // nobody ever asked to withdraw.
    const { data: pendingRequest, error: pendingError } = await adminClient
      .from('consents')
      .select('scope, member_id')
      .eq('user_id', requesterUserId)
      .eq('member_id', memberId)
      .eq('event', 'withdrawal_requested')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    // consent_status is fetched from the same row that supplies subject_email
    // below -- 'withdrawal_pending' is what makes the request *still* pending
    // (a reactivated user is back to 'active', and must not be erasable off a
    // stale withdrawal_requested row).
    const { data: subjectProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('consent_status, email')
      .eq('id', requesterUserId)
      .maybeSingle();
    if (pendingError || profileError) {
      return new Response(JSON.stringify({ error: 'failed to verify pending request' }), {
        status: 500,
        headers: corsHeaders,
      });
    }
    if (
      !pendingRequest ||
      pendingRequest.scope !== scope ||
      subjectProfile?.consent_status !== 'withdrawal_pending'
    ) {
      return new Response(
        JSON.stringify({ error: 'no matching pending withdrawal request found' }),
        { status: 409, headers: corsHeaders },
      );
    }

    // Snapshot the subject's and member's identity BEFORE any deletion --
    // consents.user_id and consents.member_id are both `on delete set null`,
    // so after a scope: 'all' erasure the surviving audit row would otherwise
    // carry no identifying information whatsoever. These are plain text
    // columns with no FK, so nothing ever nulls them. See
    // 20260810150000_consent_audit_snapshot_columns.sql.
    let subjectEmail: string | null = subjectProfile?.email ?? null;
    if (!subjectEmail) {
      // profiles.email is populated by the on_auth_user_created trigger, but
      // fall back to the auth record rather than logging a null subject.
      const { data: subjectUser } = await adminClient.auth.admin.getUserById(requesterUserId);
      subjectEmail = subjectUser?.user?.email ?? null;
    }
    const { data: memberRow } = await adminClient
      .from('members')
      .select('full_name')
      .eq('id', memberId)
      .maybeSingle();
    const memberNameSnapshot: string | null = memberRow?.full_name ?? null;

    // Log the verification BEFORE deleting anything -- consents.user_id has
    // `on delete set null` (see 20260810140000_consents_user_id_set_null.sql;
    // it used to be `on delete cascade`, which silently destroyed this exact
    // audit row the moment the referenced auth user was deleted below,
    // regardless of statement order). If this insert itself fails, deletion
    // must not proceed -- otherwise we'd erase data with zero audit trail
    // and still report success.
    const { error: consentInsertError } = await adminClient.from('consents').insert({
      user_id: requesterUserId,
      member_id: memberId,
      event: 'withdrawal_verified',
      scope,
      subject_email: subjectEmail,
      member_name_snapshot: memberNameSnapshot,
      actor_user_id: caller.id,
      actor_email: caller.email ?? null,
    });
    if (consentInsertError) {
      return new Response(
        JSON.stringify({
          error: `failed to write withdrawal_verified audit row, aborting before any deletion: ${consentInsertError.message}`,
        }),
        { status: 500, headers: corsHeaders },
      );
    }

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
    // statement. `consents` is the deliberate exception -- both its
    // member_id and user_id FKs are `on delete set null`, not cascade,
    // specifically so this erasure doesn't destroy its own audit trail.
    // Two other things this DELETE does NOT reach: the actual Storage blobs
    // behind any documents rows (no DB-level FK to storage.objects), and the
    // linked accounts' auth.users logins.
    const { data: docs, error: docsError } = await adminClient
      .from('documents')
      .select('storage_path')
      .eq('member_id', memberId);
    if (docsError) {
      return new Response(
        JSON.stringify({
          error: `failed to list documents for Storage sweep, aborting before deleting anything: ${docsError.message}`,
        }),
        { status: 500, headers: corsHeaders },
      );
    }
    const storagePaths = (docs ?? []).map((doc: { storage_path: string }) => doc.storage_path);
    if (storagePaths.length > 0) {
      // Must be checked, not fire-and-forget: the `documents` table rows are
      // cascade-deleted seconds later by the members DELETE below, so a
      // silently-failed Storage sweep leaves the actual blobs behind with no
      // index left to find them -- unrecoverable orphaned PII, reported to
      // the coordinator as a clean success. Abort before deleting anything.
      const { error: storageRemoveError } = await adminClient.storage
        .from('documents')
        .remove(storagePaths);
      if (storageRemoveError) {
        return new Response(
          JSON.stringify({
            error: `failed to remove documents from Storage, aborting before deleting anything: ${storageRemoveError.message}`,
          }),
          { status: 500, headers: corsHeaders },
        );
      }
    }

    const { data: links, error: linksError } = await adminClient
      .from('member_links')
      .select('user_id')
      .eq('member_id', memberId);
    if (linksError) {
      return new Response(
        JSON.stringify({
          error: `failed to list linked accounts, aborting before deleting anything: ${linksError.message}`,
        }),
        { status: 500, headers: corsHeaders },
      );
    }
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

    // The `members` row (and everything cascading from it) is already gone
    // at this point, so a failure deleting one linked auth.users login is a
    // partial failure, not something we can abort out of. Collect which
    // ones failed instead of discarding the error, so the response can't
    // claim unqualified success while some accounts are left behind.
    const failedAccounts: { user_id: string; error: string }[] = [];
    for (const userId of linkedUserIds) {
      const { error: deleteLinkedUserError } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteLinkedUserError) {
        failedAccounts.push({ user_id: userId, error: deleteLinkedUserError.message });
      }
    }

    // 207 Multi-Status when some linked accounts survived: HTTP 200 made
    // `failed_accounts` invisible to supabase-js callers (whose `error` is
    // null for any 2xx), so the Admin UI reported a partial erasure as
    // cleanly resolved. `ok` reflects the same distinction in the body.
    return new Response(
      JSON.stringify({
        ok: failedAccounts.length === 0,
        scope: 'all',
        erased_accounts: linkedUserIds.length - failedAccounts.length,
        failed_accounts: failedAccounts,
      }),
      { status: failedAccounts.length > 0 ? 207 : 200, headers: corsHeaders },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
