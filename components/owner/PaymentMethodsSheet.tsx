import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../../lib/AppContext';
import { useEnterAnim } from '../../lib/transitions';
import type { PaymentMethod, Theme } from '../../types';
import { Icon } from '../Icon';

/**
 * Manage payment methods. Shows the cash built-in (always available, can't
 * remove) at the top, then any saved cards / Whish profiles. Tap a saved row
 * to edit, tap "Add new" to open the editor with an empty form. The same
 * `paymentMethods` collection backs the checkout sheets, so changes here
 * appear instantly during checkout.
 */
export function PaymentMethodsSheet({ T, onClose }: { T: Theme; onClose: () => void }) {
  const { paymentMethods, setPaymentMethodEditorOpen } = useApp();

  const onPick = (m: PaymentMethod) => {
    if (m.id === 'cash') return; // built-in, no editor
    setPaymentMethodEditorOpen(m);
  };

  const anim = useEnterAnim('right');
  return (
    <Animated.View style={[{ position: 'absolute', inset: 0, zIndex: 90, backgroundColor: T.bg }, anim.sheet]}>
      <View style={{
        paddingTop: 14, paddingHorizontal: 20, paddingBottom: 12,
        flexDirection: 'row', alignItems: 'center', gap: 12,
      }}>
        <Pressable onPress={onClose} style={{
          width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface,
          borderWidth: 1, borderColor: T.hairline,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="chevron-left" size={20} color={T.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 11, fontWeight: '700', color: T.inkMuted,
            letterSpacing: 0.4, textTransform: 'uppercase',
          }}>Profile</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: T.ink, letterSpacing: -0.3, marginTop: 2 }}>
            Payment methods
          </Text>
        </View>
        <Pressable
          onPress={() => setPaymentMethodEditorOpen('new')}
          hitSlop={6}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 4,
            paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
            backgroundColor: T.brandSoft,
          }}
        >
          <Icon name="plus" size={12} color={T.brand} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: T.brand }}>Add</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 60, gap: 10 }}>
        <Text style={{
          fontSize: 12, color: T.inkMuted, lineHeight: 17,
        }}>
          Saved methods show up at checkout. Cash on delivery is always
          available — every other method comes from this list.
        </Text>

        <View style={{ gap: 8, marginTop: 8 }}>
          {paymentMethods.map(m => {
            const isCash = m.id === 'cash';
            return (
              <Pressable
                key={m.id}
                onPress={() => onPick(m)}
                disabled={isCash}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  padding: 14, borderRadius: 16,
                  backgroundColor: pressed && !isCash ? T.surfaceAlt : T.surface,
                  borderWidth: 1, borderColor: T.hairline,
                })}
              >
                <View style={{
                  width: 40, height: 40, borderRadius: 12, backgroundColor: T.surfaceAlt,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={m.icon} size={18} color={T.ink} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text numberOfLines={1} style={{
                      fontSize: 14.5, fontWeight: '700', color: T.ink, letterSpacing: -0.2, flexShrink: 1,
                    }}>{m.label}</Text>
                    {isCash ? (
                      <View style={{
                        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
                        backgroundColor: T.surfaceAlt, borderWidth: 1, borderColor: T.hairline,
                      }}>
                        <Text style={{ fontSize: 9.5, fontWeight: '700', color: T.inkSoft, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                          Built-in
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {m.sub ? (
                    <Text numberOfLines={1} style={{ fontSize: 12.5, color: T.inkMuted, marginTop: 2 }}>{m.sub}</Text>
                  ) : null}
                </View>
                {!isCash ? (
                  <Icon name="chevron-right" size={14} color={T.inkMuted} />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => setPaymentMethodEditorOpen('new')}
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', gap: 12,
            padding: 14, borderRadius: 16,
            backgroundColor: pressed ? T.surfaceAlt : 'transparent',
            borderWidth: 1.5, borderColor: T.hairline, borderStyle: 'dashed',
          })}
        >
          <View style={{
            width: 40, height: 40, borderRadius: 12, backgroundColor: T.surfaceAlt,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="plus" size={18} color={T.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14.5, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>
              Add new payment method
            </Text>
            <Text style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>
              Card or Whish — used for both bookings and shop orders.
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    </Animated.View>
  );
}
