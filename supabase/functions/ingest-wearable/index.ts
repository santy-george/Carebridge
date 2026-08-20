import { createClient } from 'jsr:@supabase/supabase-js@2';

// Phase C wearable ingestion. Different trust model than send-push/send-email:
// those are service_role-only-caller functions, invoked only by privileged
// server-side code. This function's legitimate caller IS the member's own
// phone, reporting the member's own HealthKit data -- so it takes the
// member's normal user JWT, not a service_role JWT. It verifies which
// member_id that user is linked to before writing, then uses its own
// service_role client to bypass RLS (wearable_readings deliberately has no
// client-writable insert policy) -- same check-first-then-bypass shape as
// erase-consent-withdrawal.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const ALLOWED_READING_TYPES = new Set(['heart_rate', 'spo2']);

interface ReadingInput {
  reading_type: string;
  value: number;
  recorded_at: string;
}

interface IngestRequest {
  member_id: string;
  readings: ReadingInput[];
}

function isValidReading(r: unknown): r is ReadingInput {
  if (typeof r !== 'object' || r === null) return false;
  const candidate = r as Record<string, unknown>;
  return (
    typeof candidate.reading_type === 'string' &&
    ALLOWED_READING_TYPES.has(candidate.reading_type) &&
    typeof candidate.value === 'number' &&
    Number.isFinite(candidate.value) &&
    typeof candidate.recorded_at === 'string' &&
    !Number.isNaN(Date.parse(candidate.recorded_at))
  );
}

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

    // Extract the caller's user id from their (platform-verified) JWT --
    // the gateway's own verify_jwt has already checked the signature before
    // this code runs, same trust boundary send-push/send-email rely on for
    // the `role` claim; here we trust `sub` the same way.
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    const claimsSegment = jwt.split('.')[1];
    let callerId: string | undefined;
    try {
      callerId = claimsSegment
        ? JSON.parse(atob(claimsSegment.replace(/-/g, '+').replace(/_/g, '/')))?.sub
        : undefined;
    } catch {
      callerId = undefined;
    }
    if (!callerId) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const body = (await req.json()) as IngestRequest;
    if (!body.member_id || !Array.isArray(body.readings) || body.readings.length === 0) {
      return new Response(
        JSON.stringify({ error: 'member_id and a non-empty readings array are required' }),
        { status: 400, headers: corsHeaders },
      );
    }
    if (!body.readings.every(isValidReading)) {
      return new Response(
        JSON.stringify({ error: 'every reading needs a valid reading_type, numeric value, and recorded_at' }),
        { status: 400, headers: corsHeaders },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Ownership check: the caller may only ingest readings for a member
    // they're actually linked to, never an arbitrary id.
    const { data: link, error: linkError } = await adminClient
      .from('member_links')
      .select('member_id')
      .eq('user_id', callerId)
      .eq('member_id', body.member_id)
      .maybeSingle();
    if (linkError) {
      return new Response(JSON.stringify({ error: linkError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }
    if (!link) {
      return new Response(JSON.stringify({ error: 'not linked to this member' }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const rows = body.readings.map((r) => ({
      member_id: body.member_id,
      device_vendor: 'apple_watch',
      device_id: null,
      reading_type: r.reading_type,
      value: r.value,
      recorded_at: r.recorded_at,
    }));

    const { error: insertError } = await adminClient.from('wearable_readings').insert(rows);
    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ ok: true, inserted: rows.length }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
