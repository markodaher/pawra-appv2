import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../../lib/AppContext';
import { openStatus } from '../../lib/hours';
import { useEnterAnim } from '../../lib/transitions';
import type { CartItem, Theme } from '../../types';
import { Icon } from '../Icon';
import { Button, ProductImage } from '../primitives';

export function CartDrawer({ T, cart, onClose, onChange, onRemove, onCheckout }: {
  T: Theme;
  cart: CartItem[];
  onClose: () => void;
  onChange: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
}) {
  const { providers } = useApp();
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const fee = 0;
  // Group cart vendors → flag pre-order if any vendor is currently closed.
  const preorderVendors = (() => {
    const ids = Array.from(new Set(cart.map(i => i.vendorId)));
    const out: { name: string; nextLabel: string }[] = [];
    for (const id of ids) {
      const pr = providers.find(p => p.id === id);
      if (!pr) continue;
      const status = openStatus(pr.weeklyHours);
      if (status.open) continue;
      out.push({
        name: pr.name || 'Shop',
        nextLabel: status.nextOpening
          ? `${status.nextOpening.label} · ${status.nextOpening.timeLabel}`
          : 'next open time',
      });
    }
    return out;
  })();
  const hasPreorder = preorderVendors.length > 0;
  const anim = useEnterAnim('bottom');
  return (
    <Animated.View style={[{ position: 'absolute', inset: 0, zIndex: 70 }, anim.backdrop]}>
      <Pressable onPress={onClose} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)' }} />
      <Animated.View style={[{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        backgroundColor: T.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        maxHeight: '82%',
      }, anim.sheet]}>
      <Pressable onPress={() => {}} style={{ flex: 1 }}>
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: T.hairline }} />
        </View>
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12,
        }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: T.ink, letterSpacing: -0.4 }}>
            Cart <Text style={{ color: T.inkMuted, fontWeight: '500' }}>· {cart.length}</Text>
          </Text>
          <Pressable onPress={onClose} style={{
            width: 36, height: 36, borderRadius: 18, backgroundColor: T.surfaceAlt,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="x" size={16} color={T.ink} />
          </Pressable>
        </View>

        {hasPreorder ? (
          <View style={{
            marginHorizontal: 20, marginBottom: 10, padding: 12, borderRadius: 14,
            backgroundColor: T.accentSoft, borderWidth: 1, borderColor: T.accent,
            flexDirection: 'row', gap: 10, alignItems: 'flex-start',
          }}>
            <Icon name="clock" size={14} color={T.accent} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: T.accent }}>
                Pre-order — ships when shop opens
              </Text>
              <Text style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 2, lineHeight: 16 }}>
                {preorderVendors.map(v => `${v.name}: ${v.nextLabel}`).join(' · ')}
              </Text>
            </View>
          </View>
        ) : null}

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20 }}>
          {cart.length === 0 ? (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <Icon name="bag" size={32} color={T.inkMuted} />
              <Text style={{ marginTop: 12, fontSize: 15, fontWeight: '600', color: T.inkMuted }}>Your cart is empty</Text>
              <Text style={{ fontSize: 13, marginTop: 4, color: T.inkMuted }}>Add something nice for your pet.</Text>
            </View>
          ) : cart.map(i => (
            <View key={i.id} style={{
              flexDirection: 'row', gap: 12, paddingVertical: 12,
              borderBottomWidth: 1, borderBottomColor: T.hairline,
            }}>
              <ProductImage p={i} T={T} radius={12} ratio={1} style={{ width: 64, height: 64 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: T.ink, lineHeight: 18 }}>{i.name}</Text>
                <Text style={{ fontSize: 11.5, color: T.inkMuted, marginTop: 2 }}>{i.vendor}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 18, backgroundColor: T.surfaceAlt }}>
                    <Pressable onPress={() => onChange(i.id, i.qty - 1)} style={qtyBtn}>
                      <Icon name="minus" size={13} color={T.ink} />
                    </Pressable>
                    <Text style={{ width: 28, textAlign: 'center', fontWeight: '700', color: T.ink, fontSize: 14 }}>{i.qty}</Text>
                    <Pressable onPress={() => onChange(i.id, i.qty + 1)} style={qtyBtn}>
                      <Icon name="plus" size={13} color={T.ink} />
                    </Pressable>
                  </View>
                  <Pressable onPress={() => onRemove(i.id)}>
                    <Text style={{ color: T.inkMuted, fontSize: 12, fontWeight: '600' }}>Remove</Text>
                  </Pressable>
                </View>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink }}>${(i.price * i.qty).toFixed(2)}</Text>
            </View>
          ))}
        </ScrollView>

        {cart.length > 0 ? (
          <View style={{
            padding: 20, paddingTop: 14, paddingBottom: 28,
            borderTopWidth: 1, borderTopColor: T.hairline,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 13, color: T.inkSoft }}>Subtotal</Text>
              <Text style={{ fontSize: 13, color: T.inkSoft }}>${subtotal.toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, alignItems: 'baseline' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: T.ink }}>Total</Text>
              <Text style={{ fontSize: 22, fontWeight: '700', color: T.ink, letterSpacing: -0.5 }}>${(subtotal + fee).toFixed(2)}</Text>
            </View>
            <Button T={T} full size="lg" onPress={onCheckout} icon="arrow-right">Checkout</Button>
          </View>
        ) : null}
      </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const qtyBtn = { width: 32, height: 32, alignItems: 'center' as const, justifyContent: 'center' as const };
