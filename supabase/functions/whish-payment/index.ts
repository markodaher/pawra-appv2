// Pawra — Whish Money payment initiation.
//
// Called by the client at checkout when the buyer selects Whish Money.
// Creates a payment request via the Whish Collect web service and returns
// a payment URL the user opens in their browser / Whish app.
//
// Required Supabase Edge Function secrets (Dashboard → Edge Functions → Secrets):
//   WHISH_CHANNEL   — your merchant channel ID (from Whish)
//   WHISH_SECRET    — your merchant secret key (from Whish)
//   WHISH_API_URL   — base URL of the Whish Collect API
//                     (confirm exact URL with Whish; typically
//                      https://api.whish.money/collect or similar)
//
// Request body: { amount: number, currency: 'USD'|'LBP', reference: string,
//                 description: string, customer_phone?: string }
// Response:     { payment_url: string, transaction_ref: string }

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { amount, currency = 'USD', reference, description, customer_phone } =
      await req.json() as {
        amount: number;
        currency?: 'USD' | 'LBP';
        reference: string;
        description: string;
        customer_phone?: string;
      };

    const channel  = Deno.env.get('WHISH_CHANNEL');
    const secret   = Deno.env.get('WHISH_SECRET');
    const apiUrl   = Deno.env.get('WHISH_API_URL');

    if (!channel || !secret || !apiUrl) {
      // Credentials not yet configured — return a clear error so the client
      // can fall back to cash and the developer knows what to set up.
      return new Response(
        JSON.stringify({
          error: 'Whish credentials not configured. Set WHISH_CHANNEL, WHISH_SECRET and WHISH_API_URL in Supabase Edge Function secrets.',
        }),
        { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    // ── Whish Collect API request ─────────────────────────────────────────
    // Exact parameter names may vary — update from the spec Whish provides.
    const payload = {
      Channel:          channel,
      Secret:           secret,
      Amount:           amount.toFixed(2),
      Currency:         currency,
      TransactionRef:   reference,
      Description:      description,
      ...(customer_phone ? { CustomerPhone: customer_phone } : {}),
      // Webhook URL so Whish can confirm payment asynchronously.
      CallbackURL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/whish-webhook`,
    };

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || data.error || data.Error) {
      console.error('[whish-payment] API error:', data);
      return new Response(
        JSON.stringify({ error: data.error ?? data.Error ?? 'Whish payment initiation failed' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    // Whish returns a URL or QR — field names may differ; map accordingly.
    return new Response(
      JSON.stringify({
        payment_url:     data.PaymentURL ?? data.payment_url ?? data.URL ?? null,
        transaction_ref: data.TransactionRef ?? data.transaction_ref ?? reference,
        qr_data:         data.QRCode ?? data.qr_code ?? null,
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('[whish-payment]', err);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }
});
