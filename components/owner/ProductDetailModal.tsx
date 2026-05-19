import { useMemo, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../../lib/AppContext';
import { openStatus } from '../../lib/hours';
import { useEnterAnim } from '../../lib/transitions';
import type { Product, Provider, Theme } from '../../types';
import { Icon } from '../Icon';
import { ProductImage } from '../primitives';

// Full-screen marketplace page for one product. Same right-slide-in pattern
// as ProviderDetail — opens above the active screen and dismisses with the
// back button. Not a Modal (the user wants a real page, not a popup sheet).
export function ProductDetailPage({ p, T, preorder, onClose, onAdd }: {
  p: Product; T: Theme; preorder: boolean;
  onClose: () => void; onAdd: (qty: number) => void;
}) {
  const [qty, setQty] = useState(1);
  const outOfStock = p.stockCount === 0;
  const max = Math.min(p.stockCount, 20);
  const anim = useEnterAnim('right');

  return (
    <Animated.View style={[
      { position: 'absolute', inset: 0, zIndex: 60, backgroundColor: T.bg },
      anim.sheet,
    ]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <View>
          <ProductImage p={p} T={T} radius={0} ratio={1} style={{ aspectRatio: 1.1, width: '100%' }} />
          {outOfStock ? (
            <View style={{
              position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.42)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <View style={{
                paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999,
                backgroundColor: 'rgba(0,0,0,0.7)',
              }}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Out of stock</Text>
              </View>
            </View>
          ) : null}

          {/* Back button — same chrome as ProviderDetail */}
          <Pressable onPress={onClose} style={{
            position: 'absolute', top: 14, left: 14,
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.92)',
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
          }}>
            <Icon name="chevron-left" size={20} color={T.ink} />
          </Pressable>
        </View>

        <View style={{ padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: T.ink, letterSpacing: -0.6, lineHeight: 30 }}>
                {p.name}
              </Text>
              {p.subtitle ? (
                <Text style={{ fontSize: 14, color: T.inkMuted, marginTop: 6, lineHeight: 19 }}>
                  {p.subtitle}
                </Text>
              ) : null}
            </View>
            <Text style={{ fontSize: 24, fontWeight: '700', color: T.ink, letterSpacing: -0.5 }}>
              ${p.price.toFixed(2)}
            </Text>
          </View>

          {preorder ? (
            <View style={{
              flexDirection: 'row', gap: 10, alignItems: 'flex-start',
              marginTop: 16, padding: 12, borderRadius: 14,
              backgroundColor: T.accentSoft, borderWidth: 1, borderColor: T.accent,
            }}>
              <Icon name="clock" size={15} color={T.accent} />
              <Text style={{ flex: 1, fontSize: 12.5, color: T.inkSoft, lineHeight: 17 }}>
                Shop is closed — this item will be added as a pre-order and dispatched when they reopen.
              </Text>
            </View>
          ) : null}

          {p.description ? (
            <>
              <View style={{ height: 1, backgroundColor: T.hairline, marginVertical: 18 }} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: T.inkMuted, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 }}>
                About this item
              </Text>
              <Text style={{ fontSize: 14, color: T.inkSoft, lineHeight: 21 }}>{p.description}</Text>
            </>
          ) : null}

          <View style={{ height: 1, backgroundColor: T.hairline, marginVertical: 22 }} />

          {!outOfStock ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 0,
                borderWidth: 1, borderColor: T.hairline, borderRadius: 14, overflow: 'hidden',
              }}>
                <Pressable
                  onPress={() => setQty(q => Math.max(1, q - 1))}
                  style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="minus" size={16} color={qty === 1 ? T.inkMuted : T.ink} />
                </Pressable>
                <View style={{ width: 40, alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: T.ink }}>{qty}</Text>
                </View>
                <Pressable
                  onPress={() => setQty(q => Math.min(max, q + 1))}
                  style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="plus" size={16} color={qty === max ? T.inkMuted : T.ink} />
                </Pressable>
              </View>

              <Pressable
                onPress={() => { onAdd(qty); onClose(); }}
                style={{ flex: 1, height: 50, borderRadius: 14, backgroundColor: T.ink, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
              >
                <Icon name="bag" size={16} color={T.bg} />
                <Text style={{ color: T.bg, fontSize: 15, fontWeight: '700' }}>
                  Add to cart · ${(p.price * qty).toFixed(2)}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={{
              height: 50, borderRadius: 14, backgroundColor: T.surfaceAlt,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ color: T.inkMuted, fontSize: 15, fontWeight: '700' }}>Out of stock</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </Animated.View>
  );
}

// Global wrapper — renders the page whenever productDetailOpen is set.
// Mounted once at the owner shell so any screen can open a product by
// calling setProductDetailOpen(product).
export function GlobalProductDetailSheet({ T }: { T: Theme }) {
  const {
    productDetailOpen, setProductDetailOpen,
    providers, addToCart, changeQty, cart,
  } = useApp();

  const vendorById = useMemo(() => {
    const m = new Map<string, Provider>();
    providers.forEach(pr => m.set(pr.id, pr));
    return m;
  }, [providers]);

  if (!productDetailOpen) return null;

  const vendor = vendorById.get(productDetailOpen.vendorId);
  const preorder = vendor ? !openStatus(vendor.weeklyHours).open : false;

  const handleAddQty = (qty: number) => {
    const p = productDetailOpen;
    const inCart = cart.find(c => c.id === p.id);
    if (inCart) {
      changeQty(p.id, inCart.qty + qty);
    } else {
      addToCart(p);
      for (let i = 1; i < qty; i++) changeQty(p.id, i + 1);
    }
  };

  return (
    <ProductDetailPage
      p={productDetailOpen}
      T={T}
      preorder={preorder}
      onClose={() => setProductDetailOpen(null)}
      onAdd={handleAddQty}
    />
  );
}
