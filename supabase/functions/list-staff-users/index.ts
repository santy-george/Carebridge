import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

export interface ProfileLike {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  created_at: string;
}

export interface AuthUserLike {
  id: string;
  last_sign_in_at: string | null;
}

export interface StaffUser {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
  invite_accepted: boolean;
}

// Pure merge, unit-tested in isolation. Not exported/used for role
// filtering -- every row in `profiles` is included; `role` itself is
// displayed, not filtered, matching the mockup's single combined Users tab.
export function toStaffUser(profile: ProfileLike, authUser: AuthUserLike | null): StaffUser {
  return {
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email,
    role: profile.role,
    created_at: profile.created_at,
    last_sign_in_at: authUser?.last_sign_in_at ?? null,
    invite_accepted: !!authUser?.last_sign_in_at,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  }

  try {
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

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .order('created_at', { ascending: false });
    if (profilesError) {
      return new Response(JSON.stringify({ error: profilesError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // listUsers() paginates at 50/page by default; Care Bridge Home's whole
    // staff roster is nowhere near that yet (spec context: ~28 field staff
    // total per the mockup), so a single page is sufficient for this phase.
    // Revisit with pagination if the roster grows past ~50 accounts.
    const { data: authData, error: authError } = await adminClient.auth.admin.listUsers();
    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }
    const authById = new Map(authData.users.map((u) => [u.id, { id: u.id, last_sign_in_at: u.last_sign_in_at ?? null }]));

    const users = (profiles ?? []).map((p) => toStaffUser(p as ProfileLike, authById.get(p.id) ?? null));

    return new Response(JSON.stringify({ ok: true, users }), {
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