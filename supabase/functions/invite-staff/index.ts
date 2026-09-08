import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

// Exported and unit-tested in isolation (index.test.ts) -- pure validation,
// no Supabase client involved. 'member' is deliberately not in VALID_ROLES
// at the call site below: members self-signup through the wellness app,
// they are never created via this staff-invite path.
export interface InviteRequest {
  full_name?: string;
  email?: string;
  role?: string;
  discipline?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidInviteRequest(body: InviteRequest, validRoles: string[]): boolean {
  if (!body.full_name || !body.full_name.trim()) return false;
  if (!body.email || !EMAIL_RE.test(body.email)) return false;
  if (!body.role || !validRoles.includes(body.role)) return false;
  return true;
}

const STAFF_ROLES_WITH_HR_PROFILE = ['field_staff'];
const INVITABLE_ROLES = ['admin', 'coordinator', 'field_staff', 'finance', 'management'];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  }

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

    // Verify the caller is an admin BEFORE anything privileged happens --
    // inviting staff is an admin-only action (the mockup's own permission
    // matrix: "Users, roles & settings" is Admin-Full, everyone else "--").
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
    if (callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'admin role required' }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const body: InviteRequest = await req.json();
    if (!isValidInviteRequest(body, INVITABLE_ROLES)) {
      return new Response(
        JSON.stringify({ error: 'full_name, a valid email, and a valid role are required' }),
        { status: 400, headers: corsHeaders },
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Creates the auth.users row and sends Supabase's own built-in invite
    // email (a set-password link) -- the on_auth_user_created trigger fires
    // from this insert exactly as it does for a normal signup, creating the
    // profiles row with its schema default role='member'.
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      body.email!,
      { data: { full_name: body.full_name } },
    );
    if (inviteError || !inviteData.user) {
      return new Response(JSON.stringify({ error: inviteError?.message ?? 'invite failed' }), {
        status: 500,
        headers: corsHeaders,
      });
    }
    const newUserId = inviteData.user.id;

    // Promote past the trigger's 'member' default to the role actually
    // selected in the invite drawer. This is the one documented path for
    // changing profiles.role -- see the comment on
    // profile_update_preserves_role in
    // 20260815160000_lock_down_profile_role_column.sql: "Role changes
    // remain possible only via a coordinator-run SQL UPDATE (service_role /
    // table owner, bypasses RLS)". adminClient is exactly that.
    const { error: roleUpdateError } = await adminClient
      .from('profiles')
      .update({ role: body.role, full_name: body.full_name })
      .eq('id', newUserId);
    if (roleUpdateError) {
      return new Response(JSON.stringify({ error: roleUpdateError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    if (STAFF_ROLES_WITH_HR_PROFILE.includes(body.role!)) {
      const { error: staffProfileError } = await adminClient.from('staff_profiles').insert({
        id: newUserId,
        discipline: body.discipline ?? null,
      });
      if (staffProfileError) {
        return new Response(JSON.stringify({ error: staffProfileError.message }), {
          status: 500,
          headers: corsHeaders,
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, user_id: newUserId }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});