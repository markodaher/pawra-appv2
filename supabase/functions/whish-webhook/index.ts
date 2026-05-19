// Pawra — Whish Money payment confirmation webhook.
//
// Whish calls this URL after a payment is completed or fails.
// We update the relevant booking/order status in the DB.
//
// Whish will POST a payload containing at minimum:
//   TransactionRef — the reference we sent during initiation (order/booking id)
//   Status         — e.g. "SUCCESS", "FAILED", "PENDING"
//   Amount         — confirmed amount
//
// Exact field names depend on the spec Whish provides.

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const body = await req.json() as Record<string, unknown>;

    const ref    = (body.TransactionRef ?? body.transaction_ref ?? '') as string;
    const status = ((body.Status ?? body.status ?? '') as string).toUpperCase();

    // Only act on confirmed payments.
    if (!ref || status !== 'SUCCESS') {
      console.log('[whish-webhook] Ignored:', { ref, status });
      return new Response(JSON.stringify({ ok: true }), { headers: cors });
    }

    // Use service role to bypass RLS for payment confirmations.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Reference format: "order_<id>" or "booking_<id>"
    if (ref.startsWith('order_')) {
      const id = ref.replace('order_', '');
      await supabase.from('orders').update({ status: 'confirmed', payment_status: 'paid' }).eq('id', id);
    } else if (ref.startsWith('booking_')) {
      const id = ref.replace('booking_', '');
      await supabase.from('bookings').update({ payment_status: 'paid' }).eq('id', id);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[whish-webhook]', err);
    // Always return 200 to Whish so they don't keep retrying on our errors.
    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  }
});
