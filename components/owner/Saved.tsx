import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../../lib/AppContext';
import type { Theme } from '../../types';
import { Icon } from '../Icon';
import { Button, ProductImage } from '../primitives';
import { ProviderRow } from './ProviderRow';

export function OwnerFavorites({ T, onShop }: { T: Theme; onShop: () => void }) {
  const {
    products, favorites, toggleFav, addToCart,
    providers, providerFavorites, setProviderDetailOpen,
  } = useApp();
  const [tab, setTab] = useState<'shops' | 'items'>('shops');

  const favProducts = products.filter(p => favorites.includes(p.id));
  const favShops = providers.filter(p => providerFavorites.includes(p.id));

  const showingItems = tab === 'items';
  const list = showingItems ? favProducts : favShops;
  const isEmpty = list.length === 0;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <Text style={{ fontSize: 32, fontWeight: '700', color: T.ink, letterSpacing: -0.6 }}>Saved</Text>
        <Text style={{ fontSize: 13, color: T.inkMuted, marginTop: 4 }}>Shops & products you love</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingTop: 14 }}>
        {(['shops', 'items'] as const).map(t => {
          const count = t === 'shops' ? favShops.length : favProducts.length;
          return (
            <Pressable key={t} onPress={() => setTab(t)} style={{
              height: 32, paddingHorizontal: 14, borderRadius: 16,
              backgroundColor: tab === t ? T.ink : 'transparent',
              alignItems: 'center', justifyContent: 'center',
              flexDirection: 'row', gap: 6,
            }}>
              <Text style={{ color: tab === t ? T.bg : T.inkSoft, fontWeight: '600', fontSize: 13, textTransform: 'capitalize' }}>{t}</Text>
              {count > 0 ? (
                <View style={{
                  paddingHorizontal: 6, minWidth: 18, height: 18, borderRadius: 9,
                  backgroundColor: tab === t ? T.bg : T.surfaceAlt,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{
                    fontSize: 10, fontWeight: '700',
                    color: tab === t ? T.ink : T.inkSoft,
                  }}>{count}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {isEmpty ? (
        <View style={{ alignItems: 'center', padding: 60, paddingHorizontal: 32 }}>
          <View style={{
            width: 64, height: 64, borderRadius: 32, backgroundColor: T.surface,
            borderWidth: 1, borderColor: T.hairline,
            alignItems: 'center', justifyContent: 'center', marginBottom: 14,
          }}>
            <Icon name={showingItems ? 'bag' : 'storefront'} size={26} color={T.inkMuted} />
          </View>
          <Text style={{ fontSize: 16, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>
            {showingItems ? 'No saved items yet' : 'No saved shops yet'}
          </Text>
          <Text style={{ fontSize: 13, color: T.inkMuted, marginTop: 6, lineHeight: 19, textAlign: 'center' }}>
            {showingItems
              ? 'Tap the heart on any product to keep it here.'
              : 'Tap the heart on any shop you like and they’ll appear here.'}
          </Text>
          <View style={{ marginTop: 16 }}>
            <Button T={T} onPress={onShop} icon={showingItems ? 'bag' : 'storefront'}>
              {showingItems ? 'Browse the shop' : 'Discover shops'}
            </Button>
          </View>
        </View>
      ) : showingItems ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {favProducts.map(p => (
            <View key={p.id} style={{ width: '48%' }}>
              <View>
                <ProductImage p={p} T={T} radius={16} ratio={1} />
                <Pressable onPress={() => toggleFav(p.id)} hitSlop={8} style={{
                  position: 'absolute', top: 6, right: 6, width: 32, height: 32, borderRadius: 16,
                  backgroundColor: 'rgba(255,255,255,0.92)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="heart" size={16} color={T.brand} fill={T.brand} strokeWidth={2.4} />
                </Pressable>
                <Pressable onPress={() => addToCart(p)} hitSlop={8} style={{
                  position: 'absolute', bottom: 6, right: 6, width: 32, height: 32, borderRadius: 16,
                  backgroundColor: T.ink,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="plus" size={16} color={T.bg} />
                </Pressable>
              </View>
              <Text numberOfLines={2} style={{ marginTop: 8, fontSize: 13.5, fontWeight: '600', color: T.ink, lineHeight: 16 }}>{p.name}</Text>
              <Text style={{ fontSize: 11.5, color: T.inkMuted, marginTop: 2 }}>{p.vendor}</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: T.ink, marginTop: 4, letterSpacing: -0.3 }}>${p.price.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 10 }}>
          {favShops.map(p => (
            <ProviderRow key={p.id} p={p} T={T} onPress={() => setProviderDetailOpen(p)} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
