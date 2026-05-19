import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHOP_CATEGORIES } from '../../constants/data';
import { CartCounter } from './CartCounter';
import { FONT } from '../../constants/theme';
import { useApp } from '../../lib/AppContext';
import { openStatus } from '../../lib/hours';
import type { Product, Provider, Theme } from '../../types';
import { Icon } from '../Icon';
import { Pill, ProductImage, SectionHeader } from '../primitives';
import { StorefrontCard } from './StorefrontCard';

export function OwnerShop({ T }: { T: Theme }) {
  const {
    products, providers, favorites, toggleFav, cartCount, setCartOpen,
    setProviderShopOpen, setProductDetailOpen,
  } = useApp();
  const insets = useSafeAreaInsets();
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const base = cat === 'all' ? products : products.filter(p => p.cat === cat);
  const items = q ? base.filter(p => (p.name + ' ' + p.subtitle + ' ' + p.vendor).toLowerCase().includes(q.toLowerCase())) : base;
  // Featured = first 6 of the current filtered set, so the rail respects the
  // active category + search and never leads with items the user filtered out.
  const featured = items.slice(0, 6);
  const vendorById = useMemo(() => {
    const m = new Map<string, Provider>();
    providers.forEach(pr => m.set(pr.id, pr));
    return m;
  }, [providers]);
  // Storefronts surfaced under Shop = providers that actually sell something.
  // Tapping one opens the same ProviderDetail screen as Home.
  const shopProviders = useMemo(() => {
    const vendorIds = new Set(products.map(p => p.vendorId));
    return providers.filter(pr => vendorIds.has(pr.id));
  }, [products, providers]);

  return (
    <View style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 32, fontWeight: '700', color: T.ink, letterSpacing: -0.6 }}>Shop</Text>
        <Pressable onPress={() => setCartOpen(true)} style={{
          width: 44, height: 44, borderRadius: 22, backgroundColor: T.surface,
          borderWidth: 1, borderColor: T.hairline,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="bag" size={20} color={T.ink} />
          {cartCount > 0 ? (
            <View style={{
              position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, paddingHorizontal: 5,
              borderRadius: 10, backgroundColor: T.brand,
              borderWidth: 2, borderColor: T.bg,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{cartCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14,
          height: 50, borderRadius: 16, backgroundColor: T.surface,
          borderWidth: 1, borderColor: T.hairline,
        }}>
          <Icon name="search" size={18} color={T.inkMuted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search food, toys, leashes…"
            placeholderTextColor={T.inkMuted}
            style={{ flex: 1, fontFamily: FONT.sans, fontSize: 15, color: T.ink }}
          />
          {q ? (
            <Pressable onPress={() => setQ('')} style={{
              width: 22, height: 22, borderRadius: 11, backgroundColor: T.surfaceAlt,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="x" size={11} color={T.inkSoft} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 6, gap: 12 }}>
        {/* "All" card */}
        <Pressable onPress={() => setCat('all')} style={({ pressed }) => ({
          alignItems: 'center', gap: 8, opacity: pressed ? 0.7 : 1,
        })}>
          <View style={{
            width: 64, height: 64, borderRadius: 18,
            backgroundColor: cat === 'all' ? T.brand : T.surface,
            borderWidth: 1, borderColor: cat === 'all' ? T.brand : T.hairline,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="bag" size={28} color={cat === 'all' ? '#fff' : T.inkMuted} />
          </View>
          <Text numberOfLines={1} style={{
            fontSize: 12, fontWeight: '600',
            color: cat === 'all' ? T.brand : T.ink,
          }}>All</Text>
        </Pressable>

        {SHOP_CATEGORIES.map(c => {
          const active = cat === c.id;
          return (
            <Pressable key={c.id} onPress={() => setCat(c.id)} style={({ pressed }) => ({
              alignItems: 'center', gap: 8, opacity: pressed ? 0.7 : 1,
            })}>
              <View style={{
                width: 64, height: 64, borderRadius: 18,
                backgroundColor: active ? T.brand : T.surface,
                borderWidth: 1, borderColor: active ? T.brand : T.hairline,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={c.icon} size={28} color={active ? '#fff' : T.inkMuted} />
              </View>
              <Text numberOfLines={1} style={{
                fontSize: 12, fontWeight: '600',
                color: active ? T.brand : T.ink,
              }}>{c.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Featured items — small squares scrolling left → right, mirrors Home. */}
      <SectionHeader title="Featured" T={T} />
      {featured.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
          {featured.map(p => {
            const vendor = vendorById.get(p.vendorId);
            const closed = vendor ? !openStatus(vendor.weeklyHours).open : false;
            return (
              <FeaturedTile
                key={p.id} p={p} T={T}
                preorder={closed}
                fav={favorites.includes(p.id)}
                onToggleFav={() => toggleFav(p.id)}
                onPress={() => setProductDetailOpen(p)}
              />
            );
          })}
        </ScrollView>
      ) : (
        <View style={{
          marginHorizontal: 20, padding: 18, borderRadius: 16,
          backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
          borderStyle: 'dashed', alignItems: 'center', gap: 8,
        }}>
          <Icon name="bag" size={20} color={T.inkMuted} />
          <Text style={{ fontSize: 13, color: T.inkMuted, textAlign: 'center' }}>
            {q || cat !== 'all' ? 'No items match. Try a different search or category.' : 'No products listed yet.'}
          </Text>
        </View>
      )}

      {/* Big cards — storefronts that sell. Tap opens ProviderDetail, same as Home. */}
      <SectionHeader title="Storefronts" T={T} />
      {shopProviders.length ? (
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {shopProviders.map(p => (
            <StorefrontCard key={p.id} p={p} T={T} onPress={() => setProviderShopOpen(p)} />
          ))}
        </View>
      ) : (
        <View style={{
          marginHorizontal: 20, padding: 18, borderRadius: 16,
          backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
          borderStyle: 'dashed', alignItems: 'center', gap: 8,
        }}>
          <Icon name="storefront" size={20} color={T.inkMuted} />
          <Text style={{ fontSize: 13, color: T.inkMuted, textAlign: 'center' }}>
            No storefronts selling yet. Discover them as providers list products.
          </Text>
        </View>
      )}
    </ScrollView>

    {/* Floating cart pill — sits above the bottom tab bar. */}
    {cartCount > 0 ? (
      <Pressable
        onPress={() => setCartOpen(true)}
        style={{
          position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 56,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingVertical: 14, paddingHorizontal: 18, borderRadius: 18,
          backgroundColor: T.ink,
          shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.18, shadowRadius: 12, elevation: 6,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{
            width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.18)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="bag" size={15} color="#fff" />
          </View>
          <Text style={{ color: '#fff', fontSize: 14.5, fontWeight: '700' }}>
            {cartCount} {cartCount === 1 ? 'item' : 'items'} in cart
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Review</Text>
          <Icon name="chevron-right" size={14} color="#fff" />
        </View>
      </Pressable>
    ) : null}

    </View>
  );
}

function FeaturedTile({ p, T, fav, onToggleFav, preorder, onPress }: {
  p: Product; T: Theme; fav: boolean; onToggleFav: () => void;
  preorder?: boolean;
  onPress?: () => void;
}) {
  const stockLabel = p.stockCount === 0 ? 'Out of stock' : null;
  return (
    <View style={{ width: 150 }}>
      <View>
        <Pressable onPress={onPress}>
          <ProductImage p={p} T={T} radius={16} ratio={1} />
        </Pressable>
        {preorder ? (
          <View style={{
            position: 'absolute', bottom: 6, left: 6,
            paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
            backgroundColor: T.accent, flexDirection: 'row', alignItems: 'center', gap: 4,
          }}>
            <Icon name="clock" size={10} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.3 }}>
              Pre-order
            </Text>
          </View>
        ) : null}
        <Pressable onPress={onToggleFav} hitSlop={8} style={{
          position: 'absolute', top: 6, right: 6, width: 30, height: 30, borderRadius: 15,
          backgroundColor: 'rgba(255,255,255,0.92)',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon
            name="heart" size={14}
            color={fav ? T.brand : T.inkSoft}
            fill={fav ? T.brand : 'none'}
            strokeWidth={fav ? 2.4 : 1.6}
          />
        </Pressable>
        <View style={{ position: 'absolute', bottom: 6, right: 6 }}>
          <CartCounter p={p} T={T} preorder={preorder} size="sm" />
        </View>
        {stockLabel ? (
          <View style={{ position: 'absolute', top: 6, left: 6 }}>
            <Pill T={T} color={p.stockCount === 0 ? 'danger' : 'warn'} size="sm">{stockLabel}</Pill>
          </View>
        ) : null}
      </View>
      <Pressable onPress={onPress}>
        <Text numberOfLines={2} style={{ marginTop: 8, fontSize: 13, fontWeight: '600', color: T.ink, lineHeight: 16 }}>
          {p.name}
        </Text>
        {p.subtitle ? <Text style={{ fontSize: 11.5, color: T.inkMuted, marginTop: 2 }}>{p.subtitle}</Text> : null}
        <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink, marginTop: 4 }}>${p.price.toFixed(2)}</Text>
      </Pressable>
    </View>
  );
}

const chipStyle = (active: boolean, T: Theme) => ({
  height: 34, paddingHorizontal: 14, borderRadius: 17,
  backgroundColor: active ? T.brand : T.surface,
  borderWidth: 1, borderColor: active ? T.brand : T.hairline,
  flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5,
});
