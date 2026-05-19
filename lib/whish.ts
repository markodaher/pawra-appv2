import { Linking } from 'react-native';
import { supabase } from './supabase';

export type WhishPaymentResult =
  | { ok: true;  payment_url: string; transaction_ref: string; qr_data?: string }
  | { ok: false; error: string };

/**
 * Initiates a Whish Money payment via the whish-payment Edge Function.
 *
 * @param amount        Amount in USD (or LBP if currency = 'LBP')
 * @param reference     Unique ref for this payment, e.g. `order_<id>`
 * @param description   Human-readable line shown to the payer in Whish
 * @param currency      'USD' (default) or 'LBP'
 * @param customerPhone Optional — pre-fills the payer's number in Whish
 */
export async function initiateWhishPayment(params: {
  amount: number;
  reference: string;
  description: string;
  currency?: 'USD' | 'LBP';
  customerPhone?: string;
}): Promise<WhishPaymentResult> {
  const { data, error } = await supabase.functions.invoke('whish-payment', {
    body: {
      amount:          params.amount,
      reference:       params.reference,
      description:     params.description,
      currency:        params.currency ?? 'USD',
      customer_phone:  params.customerPhone,
    },
  });

  if (error) return { ok: false, error: error.message };
  if (data?.error) return { ok: false, error: data.error };
  if (!data?.payment_url) return { ok: false, error: 'No payment URL returned by Whish' };

  return {
    ok: true,
    payment_url:     data.payment_url,
    transaction_ref: data.transaction_ref,
    qr_data:         data.qr_data,
  };
}

/** Opens the Whish payment URL in the device browser. */
export async function openWhishPayment(url: string): Promise<void> {
  const supported = await Linking.canOpenURL(url);
  if (supported) await Linking.openURL(url);
}
