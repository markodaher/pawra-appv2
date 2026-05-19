import { useEffect, useMemo, useState } from 'react';
import {
  Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View,
} from 'react-native';
import { useApp } from '../../lib/AppContext';
import { WhishPaymentSheet } from './WhishPaymentSheet';
import { useEnterAnim } from '../../lib/transitions';
import type { Address, AddressIcon, CartItem, Theme } from '../../types';
import { Icon } from '../Icon';
import { Button } from '../primitives';

function iconFor(a: Address): AddressIcon {
  return a.icon ?? (a.kind === 'home' ? 'home' : a.kind === 'work' ? 'briefcase' : 'pin');
}

export function OrderCheckoutSheet({ T, onClose }: { T: Theme; onClose: () => void }) {
  const {
    cart, savedAddresses, currentAddressId, setAddressEditorOpen,
    paymentMethods, setPaymentMethodEditorOpen,
    checkout,
  } = useApp();

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const fee = 0;
  const total = subtotal + fee;

  // Default to the owner's currently-active service location, falling back to
  // the first saved address. The order's address is never sent to the DB
  // (no column yet) — selection lives in this sheet so the user can review.
  const defaultAddressId = useMemo(() => {
    if (currentAddressId && savedAddresses.find(a => a.id === currentAddressId)) {
      return currentAddressId;
    }
    return savedAddresses[0]?.id ?? null;
  }, [currentAddressId, savedAddresses]);

  const [addressId, setAddressId] = useState<string | null>(defaultAddressId);
  const [paymentId, setPaymentId] = useState<string>('cash');
  const [submitting, setSubmitting] = useState(false);

  // Keep selection in sync with savedAddresses. If the user adds a new address
  // via the editor while the sheet is open, auto-select it; if the selected
  // one disappears (deleted from the editor), fall back to the default.
  useEffect(() => {
    if (savedAddresses.length === 0) {
      if (addressId !== null) setAddressId(null);
      return;
    }
    const stillThere = addressId && savedAddresses.find(a => a.id === addressId);
    if (!stillThere) {
      // Prefer the most recently added (last in the list — loadAddresses orders
      // by created_at asc) so a fresh "Add new" auto-selects.
      const newest = savedAddresses[savedAddresses.length - 1];
      setAddressId(newest.id);
    }
  }, [savedAddresses, addressId]);

  // Same dance for payment methods: if the user adds a new card mid-checkout,
  // auto-select it. If their selection got removed elsewhere, fall back to cash.
  useEffect(() => {
    const stillThere = paymentMethods.find(p => p.id === paymentId);
    if (stillThere) return;
    // Only auto-promote saved (non-cash) methods. If the list is just cash,
    // stay on cash.
    const saved = paymentMethods.filter(p => p.id !== 'cash');
    if (saved.length > 0) {
      setPaymentId(saved[saved.length - 1].id);
    } else {
      setPaymentId('cash');
    }
  }, [paymentMethods, paymentId]);

  const selectedAddress = savedAddresses.find(a => a.id === addressId) || null;
  const canPlace = !!selectedAddress && cart.length > 0 && !submitting;

  // Vendor labels for the order summary. A cart can hold items from multiple
  // shops; we show all of them so the owner knows who's fulfilling what.
  const vendors = useMemo(() => {
    const seen = new Map<string, { name: string; count: number }>();
    for (const i of cart) {
      const v = seen.get(i.vendorId);
      if (v) v.count += i.qty;
      else seen.set(i.vendorId, { name: i.vendor, count: i.qty });
    }
    return Array.from(seen.values());
  }, [cart]);

  const [whishOpen, setWhishOpen] = useState(false);

  const onPlace = async () => {
    if (!canPlace) return;
    const paymentMethod = paymentMethods.find(p => p.id === paymentId) || paymentMethods[0];
    // Whish Money: open payment sheet before placing the order.
    if (paymentMethod?.kind === 'whish') {
      setWhishOpen(true);
      return;
    }
    setSubmitting(true);
    onClose();
    await checkout({ address: selectedAddress, paymentMethod });
  };

  const onWhishSuccess = async () => {
    setWhishOpen(false);
    setSubmitting(true);
    const paymentMethod = paymentMethods.find(p => p.id === paymentId) || paymentMethods[0];
    onClose();
    await checkout({ address: selectedAddress, paymentMethod });
  };

  const anim = useEnterAnim('right');
  return (
    <>
    <Animated.View style={[{ position: 'absolute', inset: 0, zIndex: 92 }, anim.sheet]}>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: T.bg }}
    >
      <View style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={onClose} style={{
            width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface,
            borderWidth: 1, borderColor: T.hairline,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="chevron-left" size={18} color={T.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: T.inkMuted, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' }}>
              {cart.length} {cart.length === 1 ? 'item' : 'items'}{vendors.length > 1 ? ` · ${vendors.length} shops` : ''}
            </Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>
              Checkout
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 160 }} keyboardShouldPersistTaps="handled">
        <Text style={SECT(T)}>Deliver to</Text>
        {savedAddresses.length === 0 ? (
          <Pressable
            onPress={() => setAddressEditorOpen('new')}
            style={{
              padding: 18, borderRadius: 16,
              backgroundColor: T.surface, borderWidth: 2, borderColor: T.hairline, borderStyle: 'dashed',
              flexDirection: 'row', alignItems: 'center', gap: 12,
            }}
          >
            <View style={{
              width: 40, height: 40, borderRadius: 12, backgroundColor: T.brandSoft,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="pin" size={18} color={T.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14.5, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>
                Add a delivery address
              </Text>
              <Text style={{ fontSize: 12, color: T.inkMuted, marginTop: 2, lineHeight: 16 }}>
                Drop a pin so the courier can find you.
              </Text>
            </View>
            <Icon name="chevron-right" size={14} color={T.inkMuted} />
          </Pressable>
        ) : (
          <View style={{ gap: 8 }}>
            {savedAddresses.map(a => {
              const sel = addressId === a.id;
              return (
                <Pressable key={a.id} onPress={() => setAddressId(a.id)} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  padding: 14, borderRadius: 16,
                  backgroundColor: sel ? T.brandSoft : T.surface,
                  borderWidth: 1.5, borderColor: sel ? T.brand : T.hairline,
                }}>
                  <View style={{
                    width: 40, height: 40, borderRadius: 12,
                    backgroundColor: sel ? T.brand : T.surfaceAlt,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={iconFor(a)} size={18} color={sel ? '#fff' : T.ink} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text numberOfLines={1} style={{
                        fontSize: 14.5, fontWeight: '700',
                        color: sel ? T.brandInk : T.ink, letterSpacing: -0.2, flexShrink: 1,
                      }}>{a.label || a.line1}</Text>
                      {a.id === currentAddressId ? (
                        <View style={{
                          paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
                          backgroundColor: T.surface, borderWidth: 1, borderColor: T.brand,
                        }}>
                          <Text style={{ fontSize: 9.5, fontWeight: '700', color: T.brand, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                            Current
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text numberOfLines={1} style={{ fontSize: 12.5, color: T.inkMuted, marginTop: 2 }}>
                      {[a.line1, a.area, a.floor].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <View style={{
                    width: 22, height: 22, borderRadius: 11,
                    backgroundColor: sel ? T.brand : 'transparent',
                    borderWidth: 1.5, borderColor: sel ? T.brand : T.inkMuted,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {sel ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} /> : null}
                  </View>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setAddressEditorOpen('new')}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                padding: 14, borderRadius: 16,
                borderWidth: 1.5, borderColor: T.hairline, borderStyle: 'dashed',
              }}
            >
              <View style={{
                width: 40, height: 40, borderRadius: 12, backgroundColor: T.surfaceAlt,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="plus" size={18} color={T.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>
                  Add new address
                </Text>
                <Text style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>
                  Saved to your service locations
                </Text>
              </View>
            </Pressable>
          </View>
        )}

        <Text style={SECT(T)}>Payment method</Text>
        <View style={{ gap: 8 }}>
          {paymentMethods.map(pm => {
            const sel = paymentId === pm.id;
            return (
              <Pressable key={pm.id} onPress={() => setPaymentId(pm.id)} style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                padding: 14, borderRadius: 16,
                backgroundColor: sel ? T.brandSoft : T.surface,
                borderWidth: 1.5, borderColor: sel ? T.brand : T.hairline,
              }}>
                <View style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: sel ? T.brand : T.surfaceAlt,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={pm.icon} size={18} color={sel ? '#fff' : T.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>{pm.label}</Text>
                  {pm.sub ? <Text style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>{pm.sub}</Text> : null}
                </View>
                <View style={{
                  width: 22, height: 22, borderRadius: 11,
                  backgroundColor: sel ? T.brand : 'transparent',
                  borderWidth: 1.5, borderColor: sel ? T.brand : T.inkMuted,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {sel ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} /> : null}
                </View>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => setPaymentMethodEditorOpen('new')}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              padding: 14, borderRadius: 16,
              borderWidth: 1.5, borderColor: T.hairline, borderStyle: 'dashed',
            }}
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
                Saved to your profile · usable on every checkout
              </Text>
            </View>
          </Pressable>
        </View>

        <Text style={SECT(T)}>Order summary</Text>
        <View style={{
          padding: 14, borderRadius: 16,
          backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, gap: 10,
        }}>
          {cart.map((i: CartItem, idx: number) => (
            <View key={i.id} style={{
              flexDirection: 'row', justifyContent: 'space-between', gap: 10,
              paddingTop: idx > 0 ? 8 : 0,
              borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: T.hairline,
            }}>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>{i.name}</Text>
                <Text numberOfLines={1} style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>
                  {i.vendor} · × {i.qty}
                </Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink }}>${(i.price * i.qty).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={{
          marginTop: 12, padding: 14, borderRadius: 16,
          backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, gap: 6,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: T.inkSoft }}>Subtotal</Text>
            <Text style={{ fontSize: 13, color: T.inkSoft }}>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
            paddingTop: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: T.hairline,
          }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: T.ink }}>Total</Text>
            <Text style={{ fontSize: 22, fontWeight: '700', color: T.ink, letterSpacing: -0.5 }}>${total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={{
          marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8,
          padding: 12, borderRadius: 12, backgroundColor: T.surfaceAlt,
        }}>
          <Icon name="truck" size={14} color={T.inkSoft} />
          <Text style={{ flex: 1, fontSize: 12, color: T.inkSoft, lineHeight: 17 }}>
            Estimated arrival ~45 min once the shop confirms.
          </Text>
        </View>
      </ScrollView>

      <View style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28,
        backgroundColor: T.bg, borderTopWidth: 1, borderTopColor: T.hairline,
        flexDirection: 'row', alignItems: 'center', gap: 12,
      }}>
        <View>
          <Text style={{ fontSize: 10.5, color: T.inkMuted, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' }}>Total</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: T.ink, letterSpacing: -0.4, marginTop: 2 }}>
            ${total.toFixed(2)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Button
            T={T} full size="lg"
            onPress={onPlace}
            icon="check"
            disabled={!canPlace}
          >
            {submitting ? 'Placing…' : selectedAddress ? 'Place order' : 'Add an address'}
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
    </Animated.View>
    <WhishPaymentSheet
      visible={whishOpen}
      T={T}
      amount={total}
      reference={`order_pending_${Date.now()}`}
      description={`Pawra shop order · ${cart.length} item${cart.length === 1 ? '' : 's'}`}
      onSuccess={onWhishSuccess}
      onClose={() => setWhishOpen(false)}
    />
    </>
  );
}

const SECT = (T: Theme) => ({
  fontSize: 13, fontWeight: '700' as const, color: T.inkMuted,
  letterSpacing: 0.3, textTransform: 'uppercase' as const,
  marginTop: 24, marginBottom: 10,
});
