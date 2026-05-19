import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../../lib/AppContext';
import type { Theme } from '../../types';
import { Icon } from '../Icon';
import { Button } from '../primitives';

export function PayoutSetupSheet({ visible, T, onClose }: { visible: boolean; T: Theme; onClose: () => void }) {
  const { selfProvider, setPayoutSetup, setProviderSetupOpen } = useApp();

  const handleConfirm = () => {
    setPayoutSetup(true);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" presentationStyle="overFullScreen" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} />
      <View style={{
        backgroundColor: T.bg,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
      }}>
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: T.hairline }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <View style={{
              width: 48, height: 48, borderRadius: 14, backgroundColor: T.brandSoft,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="card" size={22} color={T.brandInk} />
            </View>
            <View>
              <Text style={{ fontSize: 21, fontWeight: '700', color: T.ink, letterSpacing: -0.5 }}>Get paid</Text>
              <Text style={{ fontSize: 13, color: T.inkMuted, marginTop: 1 }}>How payments work on Pawra</Text>
            </View>
          </View>

          {/* Payment methods */}
          <View style={{ gap: 10, marginBottom: 20 }}>
            {[
              {
                icon: 'card',
                title: 'Cash on delivery',
                sub: 'Clients pay you directly in cash when you deliver the service. No platform cut.',
                done: true,
              },
              {
                icon: 'phone',
                title: 'Whish Money',
                sub: selfProvider?.whatsapp
                  ? `Clients can send to ${selfProvider.whatsapp} via Whish. Make sure your number is registered.`
                  : 'Add your WhatsApp number in business details — clients can send payments via Whish Money.',
                done: !!selfProvider?.whatsapp,
              },
            ].map((row, i) => (
              <View key={i} style={{
                flexDirection: 'row', gap: 12, padding: 14, borderRadius: 16,
                backgroundColor: T.surface, borderWidth: 1, borderColor: row.done ? T.brand : T.hairline,
              }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 10,
                  backgroundColor: row.done ? T.brandSoft : T.surfaceAlt,
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon name={row.done ? 'check' : row.icon} size={17} color={row.done ? T.brand : T.inkMuted} strokeWidth={row.done ? 2.5 : 1.6} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>{row.title}</Text>
                  <Text style={{ fontSize: 12.5, color: T.inkMuted, marginTop: 3, lineHeight: 17 }}>{row.sub}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Coming soon */}
          <View style={{
            padding: 14, borderRadius: 14, backgroundColor: T.surfaceAlt,
            flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 24,
          }}>
            <Icon name="clock" size={15} color={T.inkMuted} />
            <Text style={{ flex: 1, fontSize: 12.5, color: T.inkMuted, lineHeight: 17 }}>
              Direct bank transfers and automatic platform payouts are coming soon. You'll be notified when available.
            </Text>
          </View>

          {/* WhatsApp CTA if not set */}
          {!selfProvider?.whatsapp && (
            <View style={{ marginBottom: 16 }}>
              <Button T={T} variant="soft" full icon="edit" onPress={() => { onClose(); setProviderSetupOpen(true); }}>
                Add WhatsApp number in business details
              </Button>
            </View>
          )}

          <Button T={T} variant="primary" full onPress={handleConfirm}>
            Got it
          </Button>
        </ScrollView>
      </View>
    </Modal>
  );
}
