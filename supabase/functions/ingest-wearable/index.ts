import { createClient } from 'jsr:@supabase/supabase-js@2';

// Phase C wearable ingestion. Different trust model than send-push/send-email:
// those are service_role-only-caller functions, invoked only by privileged
// server-side code. This function's legitimate caller IS the member's own
// phone, reporting the member's own HealthKit data -- so it takes the
// member's normal user JWT, not a service_role JWT. It verifies which
// member_id that user is linked to before writing, then uses its own
// service_role client to bypass RLS (none of the tables here have a
// client-writable insert policy) -- same check-first-then-bypass shape as
// erase-consent-withdrawal.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const STREAMING_READING_TYPES = new Set([
  'heart_rate',
  'spo2',
  'heart_rate_variability_sdnn',
  'resting_heart_rate',
  'respiratory_rate',
  'walking_speed',
  'vo2_max',
  'apple_walking_steadiness',
  'apple_sleeping_wrist_temperature',
]);
const DAILY_CUMULATIVE_READING_TYPES = new Set([
  'step_count',
  'active_energy_burned',
  'distance_walked_running',
  'apple_stand_time',
]);
const ALLOWED_READING_TYPES = new Set([...STREAMING_READING_TYPES, ...DAILY_CUMULATIVE_READING_TYPES]);
const ALLOWED_SLEEP_STAGES = new Set(['in_bed', 'asleep_core', 'asleep_deep', 'asleep_rem', 'awake']);

export function isDailyCumulativeType(readingType: string): boolean {
  return DAILY_CUMULATIVE_READING_TYPES.has(readingType);
}

interface ReadingInput {
  reading_type: string;
  value: number;
  recorded_at: string;
}
interface SleepSessionInput {
  started_at: string;
  ended_at: string;
  stage: string;
}
interface EcgReadingInput {
  recorded_at: string;
  classification: string;
  average_heart_rate?: number;
}
interface RhythmEventInput {
  recorded_at: string;
}
interface IngestRequest {
  member_id: string;
  readings?: ReadingInput[];
  sleep_sessions?: SleepSessionInput[];
  ecg_readings?: EcgReadingInput[];
  rhythm_events?: RhythmEventInput[];
}

function isValidTimestamp(v: unknown): v is string {
  return typeof v === 'string' && !Number.isNaN(Date.parse(v));
}

export function isValidReading(r: unknown): r is ReadingInput {
  if (typeof r !== 'object' || r === null) return false;
  const c = r as Record<string, unknown>;
  return (
    typeof c.reading_type === 'string' &&
    ALLOWED_READING_TYPES.has(c.reading_type) &&
    typeof c.value === 'number' &&
    Number.isFinite(c.value) &&
    isValidTimestamp(c.recorded_at)
  );
}

export function isValidSleepSession(r: unknown): r is SleepSessionInput {
  if (typeof r !== 'object' || r === null) return false;
  const c = r as Record<string, unknown>;
  return (
    isValidTimestamp(c.started_at) &&
    isValidTimestamp(c.ended_at) &&
    typeof c.stage === 'string' &&
    ALLOWED_SLEEP_STAGES.has(c.stage)
  );
}

export function isValidEcgReading(r: unknown): r is EcgReadingInput {
  if (typeof r !== 'object' || r === null) return false;
  const c = r as Record<string, unknown>;
  return (
    isValidTimestamp(c.recorded_at) &&
    typeof c.classification === 'string' &&
    c.classification.length > 0 &&
    (c.average_heart_rate === undefined ||
      (typeof c.average_heart_rate === 'number' && Number.isFinite(c.average_heart_rate)))
  );
}

export function isValidRhythmEvent(r: unknown): r is RhythmEventInput {
  if (typeof r !== 'object' || r === null) return false;
  const c = r as Record<string, unknown>;
  return isValidTimestamp(c.recorded_at);
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
    const hasAnyArray =
      (body.readings?.length ?? 0) > 0 ||
      (body.sleep_sessions?.length ?? 0) > 0 ||
      (body.ecg_readings?.length ?? 0) > 0 ||
      (body.rhythm_events?.length ?? 0) > 0;
    if (!body.member_id || !hasAnyArray) {
      return new Response(
        JSON.stringify({ error: 'member_id and at least one non-empty reading array are required' }),
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

    const results: Record<string, { inserted: number; error?: string }> = {};

    if (body.readings?.length) {
      if (!body.readings.every(isValidReading)) {
        results.readings = { inserted: 0, error: 'invalid reading_type, value, or recorded_at' };
      } else {
        const streamingRows = body.readings
          .filter((r) => !isDailyCumulativeType(r.reading_type))
          .map((r) => ({
            member_id: body.member_id,
            device_vendor: 'apple_watch',
            device_id: null,
            reading_type: r.reading_type,
            value: r.value,
            recorded_at: r.recorded_at,
          }));
        const dailyRows = body.readings
          .filter((r) => isDailyCumulativeType(r.reading_type))
          .map((r) => ({
            member_id: body.member_id,
            device_vendor: 'apple_watch',
            reading_type: r.reading_type,
            day: r.recorded_at.slice(0, 10),
            value: r.value,
            updated_at: new Date().toISOString(),
          }));

        let inserted = 0;
        let firstError: string | undefined;
        if (streamingRows.length) {
          const { error } = await adminClient.from('wearable_readings').insert(streamingRows);
          if (error) firstError = error.message;
          else inserted += streamingRows.length;
        }
        if (dailyRows.length) {
          const { error } = await adminClient
            .from('daily_activity_totals')
            .upsert(dailyRows, { onConflict: 'member_id,reading_type,day' });
          if (error) firstError = firstError ?? error.message;
          else inserted += dailyRows.length;
        }
        results.readings = firstError ? { inserted, error: firstError } : { inserted };
      }
    }

    if (body.sleep_sessions?.length) {
      if (!body.sleep_sessions.every(isValidSleepSession)) {
        results.sleep_sessions = { inserted: 0, error: 'invalid started_at, ended_at, or stage' };
      } else {
        const rows = body.sleep_sessions.map((s) => ({
          member_id: body.member_id,
          device_vendor: 'apple_watch',
          started_at: s.started_at,
          ended_at: s.ended_at,
          stage: s.stage,
        }));
        const { error } = await adminClient.from('sleep_sessions').insert(rows);
        results.sleep_sessions = error ? { inserted: 0, error: error.message } : { inserted: rows.length };
      }
    }

    if (body.ecg_readings?.length) {
      if (!body.ecg_readings.every(isValidEcgReading)) {
        results.ecg_readings = { inserted: 0, error: 'invalid recorded_at, classification, or average_heart_rate' };
      } else {
        const rows = body.ecg_readings.map((e) => ({
          member_id: body.member_id,
          device_vendor: 'apple_watch',
          recorded_at: e.recorded_at,
          classification: e.classification,
          average_heart_rate: e.average_heart_rate ?? null,
        }));
        const { error } = await adminClient.from('ecg_readings').insert(rows);
        results.ecg_readings = error ? { inserted: 0, error: error.message } : { inserted: rows.length };
      }
    }

    if (body.rhythm_events?.length) {
      if (!body.rhythm_events.every(isValidRhythmEvent)) {
        results.rhythm_events = { inserted: 0, error: 'invalid recorded_at' };
      } else {
        const rows = body.rhythm_events.map((e) => ({
          member_id: body.member_id,
          device_vendor: 'apple_watch',
          recorded_at: e.recorded_at,
        }));
        const { error } = await adminClient.from('rhythm_events').insert(rows);
        results.rhythm_events = error ? { inserted: 0, error: error.message } : { inserted: rows.length };
      }
    }

    const anyError = Object.values(results).some((r) => r.error);
    return new Response(JSON.stringify({ ok: !anyError, results }), {
      status: anyError ? 207 : 200,
      headers: corsHeaders,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
