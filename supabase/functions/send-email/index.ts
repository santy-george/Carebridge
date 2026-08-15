// Phase 3 transactional email send-side (Notion: "Transactional email --
// Resend/Postmark/SES; makes pharmacist + coordinator emails real (currently
// mailto:). In active scope -- quick signup, no lead time, unblocks real
// Claude Code build work once the account exists."). No Resend/Postmark/SES
// account exists yet -- that signup is the user's action, not something this
// function can do for itself. This lands the send-side code so it's ready
// the moment an API key exists, same shape as send-push/index.ts.
//
// Provider: Resend, per the plan's own ordering ("Resend/Postmark/SES") and
// because its API is a single JSON POST with no SDK dependency needed in a
// Deno Edge Function. If a different provider is chosen later, only
// callResendApi() below needs to change -- the request/response contract of
// this function (service_role-gated, {to, subject, html/text}) stays the
// same regardless of provider.
//
// Deliberately NOT wired to any trigger yet -- no pharmacist-notification or
// coordinator-notification feature exists in either app today (checked: the
// only `mailto:` in the codebase is Wellness's Care Team "email" contact
// action, a click-to-compose link, not a server-sent notification). Picking
// which events actually send an email is a product decision, not made here.
// This is the reusable "send one transactional email" primitive a future
// trigger calls into.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

interface SendEmailRequest {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

async function callResendApi(req: SendEmailRequest): Promise<{ ok: boolean; status: number; body: unknown }> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const fromAddress = Deno.env.get('RESEND_FROM_ADDRESS');
  if (!apiKey || !fromAddress) {
    throw new Error('RESEND_API_KEY / RESEND_FROM_ADDRESS not configured -- email send-side is not set up yet');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [req.to],
      subject: req.subject,
      html: req.html,
      text: req.text,
    }),
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { ok: response.ok, status: response.status, body };
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

    // service_role-only -- same reasoning as send-push/index.ts: Supabase's
    // platform JWT verification accepts any valid Supabase-signed JWT,
    // including an ordinary member's, so this function must independently
    // check the caller's own role claim rather than trusting verify_jwt
    // alone. Without this, any signed-in member could make the service send
    // arbitrary email to arbitrary addresses.
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    const claimsSegment = jwt.split('.')[1];
    let callerRole: string | undefined;
    try {
      callerRole = claimsSegment
        ? JSON.parse(atob(claimsSegment.replace(/-/g, '+').replace(/_/g, '/')))?.role
        : undefined;
    } catch {
      callerRole = undefined;
    }
    if (callerRole !== 'service_role') {
      return new Response(JSON.stringify({ error: 'service_role required' }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const body = (await req.json()) as SendEmailRequest;
    if (!body.to || !body.subject || (!body.html && !body.text)) {
      return new Response(
        JSON.stringify({ error: 'to, subject, and (html or text) are required' }),
        { status: 400, headers: corsHeaders },
      );
    }

    const result = await callResendApi(body);
    return new Response(JSON.stringify({ ok: result.ok, status: result.status, provider_response: result.body }), {
      status: result.ok ? 200 : 502,
      headers: corsHeaders,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
