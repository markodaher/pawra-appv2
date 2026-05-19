// Pawra — Edge Function: notify admin of a new ID verification submission.
//
// Called by the client right after uploading ID photos. Sends a WhatsApp
// message to the admin so they can review in Supabase Studio.
//
// Required env vars (set in Supabase Dashboard → Edge Functions → Secrets):
//   WHATSAPP_ACCESS_TOKEN      — Meta Cloud API bearer token
//   WHATSAPP_PHONE_NUMBER_ID   — the sending phone number ID
//   ADMIN_WHATSAPP_NUMBER      — admin's full number e.g. "96170123456"
//
// If any env var is missing the function still returns 200 — notification is
// best-effort and must not block the submission flow.

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const { provider_name, provider_id } = await req.json() as {
      provider_name: string;
      provider_id: string;
    };

    const waToken  = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const waPhone  = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    const adminNum = Deno.env.get('ADMIN_WHATSAPP_NUMBER');

    if (waToken && waPhone && adminNum) {
      const body = [
        `🐾 *Pawra — New ID Verification*`,
        ``,
        `Provider: *${provider_name}*`,
        `ID: \`${provider_id}\``,
        ``,
        `Open Supabase Studio → Table Editor → id_verifications`,
        `Set status to *approved* or *rejected* (optionally add an admin_note).`,
      ].join('\n');

      await fetch(`https://graph.facebook.com/v18.0/${waPhone}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${waToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: adminNum,
          type: 'text',
          text: { body },
        }),
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    // Never let a notification failure surface as an error to the client.
    console.error('[notify-id-verification]', err);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
