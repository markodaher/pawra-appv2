import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Linking, Modal, Pressable, Text, View,
} from 'react-native';
import { initiateWhishPayment } from '../../lib/whish';
import type { Theme } from '../../types';
import { Icon } from '../Icon';
import { Button } from '../primitives';

type Props = {
  visible: boolean;
  T: Theme;
  amount: number;
  reference: string;       // e.g. "order_<id>" or "booking_<id>"
  description: string;
  customerPhone?: string;
  onSuccess: () => void;   // called after user confirms they've paid
  onClose: () => void;
};

export function WhishPaymentSheet({ visible, T, amount, reference, description, customerPhone, onSuccess, onClose }: Props) {
  const [loading,     setLoading]     = useState(false);
  const [paymentUrl,  setPaymentUrl]  = useState<string | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [waitingPay,  setWaitingPay]  = useState(false);

  // Trigger payment initiation when sheet becomes visible.
  useEffect(() => {
    if (!visible || paymentUrl) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    initiateWhishPayment({ amount, reference, description, customerPhone }).then(res => {
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setPaymentUrl(res.payment_url);
      } else {
        setError(res.error);
      }
    });

    return () => { cancelled = true; };
  }, [visible]);

  const openWhish = async () => {
    if (!paymentUrl) return;
    setWaitingPay(true);
    await Linking.openURL(paymentUrl).catch(() => {});
  };

  const reset = () => {
    setPaymentUrl(null);
    setError(null);
    setWaitingPay(false);
    setLoading(false);
  };

  const handleClose = () => { reset(); onClose(); };
  const handleSuccess = () => { reset(); onSuccess(); };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}
    >
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={handleClose} />

      <View style={{
        backgroundColor: T.bg,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
      }}>
        {/* Grabber */}
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: T.hairline }} />
        </View>

        <View style={{ padding: 24, paddingTop: 16, gap: 20 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{
              width: 52, height: 52, borderRadius: 16, backgroundColor: '#E8F5F0',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="phone" size={24} color="#1E7A5C" />
            </View>
            <View>
              <Text style={{ fontSize: 20, fontWeight: '700', color: T.ink, letterSpacing: -0.4 }}>
                Whish Money
              </Text>
              <Text style={{ fontSize: 13, color: T.inkMuted, marginTop: 2 }}>
                ${amount.toFixed(2)} USD
              </Text>
            </View>
          </View>

          {/* Loading */}
          {loading ? (
            <View style={{
              padding: 28, borderRadius: 16,
              backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
              alignItems: 'center', gap: 12,
            }}>
              <ActivityIndicator color={T.brand} size="large" />
              <Text style={{ fontSize: 14, color: T.inkMuted }}>Creating payment request…</Text>
            </View>
          ) : null}

          {/* Error */}
          {error ? (
            <View style={{
              padding: 16, borderRadius: 16,
              backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: T.danger,
              flexDirection: 'row', gap: 12, alignItems: 'flex-start',
            }}>
              <Icon name="x" size={18} color={T.danger} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: T.danger }}>
                  Payment unavailable
                </Text>
                <Text style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 4, lineHeight: 17 }}>
                  {error.includes('not configured')
                    ? 'Whish Money is not yet activated on this account. Please pay with cash or another method.'
                    : error}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Ready — show open button */}
          {paymentUrl && !waitingPay ? (
            <>
              <View style={{
                padding: 14, borderRadius: 16,
                backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
                gap: 8,
              }}>
                {[
                  'Tap "Pay with Whish" to open your Whish app',
                  'Confirm the payment of $' + amount.toFixed(2),
                  'Come back here and tap "I\'ve paid"',
                ].map((t, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <View style={{
                      width: 20, height: 20, borderRadius: 10,
                      backgroundColor: T.brandSoft,
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: T.brand }}>{i + 1}</Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 13.5, color: T.inkSoft, lineHeight: 19 }}>{t}</Text>
                  </View>
                ))}
              </View>
              <Button T={T} variant="primary" full onPress={openWhish} icon="arrow-right">
                Pay with Whish
              </Button>
            </>
          ) : null}

          {/* Waiting for user to return after paying */}
          {waitingPay ? (
            <>
              <View style={{
                padding: 16, borderRadius: 16,
                backgroundColor: T.brandSoft, borderWidth: 1, borderColor: T.brand,
                flexDirection: 'row', gap: 12, alignItems: 'center',
              }}>
                <Icon name="clock" size={20} color={T.brand} />
                <Text style={{ flex: 1, fontSize: 13.5, color: T.brandInk, fontWeight: '600' }}>
                  Waiting for your payment in Whish…
                </Text>
              </View>
              <Button T={T} variant="primary" full onPress={handleSuccess}>
                I've paid
              </Button>
              <Pressable onPress={() => setWaitingPay(false)} style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 13.5, color: T.inkMuted, fontWeight: '600' }}>
                  Go back
                </Text>
              </Pressable>
            </>
          ) : null}

          {/* Cancel / close */}
          {!loading ? (
            <Pressable onPress={handleClose} style={{ alignItems: 'center', paddingBottom: 8 }}>
              <Text style={{ fontSize: 14, color: T.inkMuted, fontWeight: '600' }}>
                {error ? 'Choose another method' : 'Cancel'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
