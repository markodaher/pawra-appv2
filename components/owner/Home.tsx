import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CATEGORY_TO_PROVIDER_TYPE, SERVICE_TYPES } from '../../constants/data';
import { FONT } from '../../constants/theme';
import { useApp } from '../../lib/AppContext';
import { openStatus } from '../../lib/hours';
import type { Product, Provider, Theme } from '../../types';
import { Icon } from '../Icon';
import { Avatar, Pill, ProductImage, SectionHeader } from '../primitives';
import { CartCounter } from './CartCounter';
import { LocationPill } from './LocationPill';
import { ProviderRow } from './ProviderRow';
import { StorefrontCard } from './StorefrontCard';

function PulseRed() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, [anim]);
  const scale   = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.65] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', width: 44, height: 44, borderRadius: 12,
      backgroundColor: '#C22914',
      transform: [{ scale }], opacity,
    }} />
  );
}

export function OwnerHome({
  T, onTab, onProvider, onShop, onEmergency, onProfile,
}: {
  T: Theme;
  onTab: (t: string) => void;
  onProvider: (p: Provider) => void;
  onShop: () => void;
  onEmergency: () => void;
  onProfile: () => void;
}) {
  const {
    user, providers, products, favorites, toggleFav, unreadNotifCount, setNotifCenterOpen,
    setStorefrontCategoryOpen, pawPoints, setPawPointsOpen,
    setProductDetailOpen, cartCount, setCartOpen,
  } = useApp();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const featured = providers.slice(0, 3);

  // Tapping a shop tile on Home jumps to the Shop tab and opens the product
  // detail sheet so the user can see full info / add the right qty.
  const openProduct = (p: Product) => {
    setProductDetailOpen(p);
    onTab('shop');
  };

  // Vendor lookup is only needed for the preorder badge on shop tiles.
  const vendorById = new Map<string, Provider>(providers.map(pr => [pr.id, pr]));
  const searchResults = q
    ? providers.filter(p => (p.name + ' ' + p.area + ' ' + p.type + ' ' + p.tags.join(' ')).toLowerCase().includes(q.toLowerCase()))
    : null;

  const firstName = user.name ? user.name.split(' ')[0] : '';

  return (
    <View style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={{ paddingBottom: 130, paddingTop: 4 }}>
      {/* Top row: location pill (left) · bell + avatar (right) */}
      <View style={{
        paddingHorizontal: 20, paddingTop: 12,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <LocationPill T={T} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View>
            <Pressable onPress={() => setNotifCenterOpen(true)} style={{
              width: 44, height: 44, borderRadius: 22, backgroundColor: T.surface,
              borderWidth: 1, borderColor: T.hairline,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="bell" size={20} color={T.ink} />
            </Pressable>
            {unreadNotifCount > 0 ? (
              <View style={{
                position: 'absolute', top: -3, right: -4,
                minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9,
                backgroundColor: T.brand, borderWidth: 2, borderColor: T.bg,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </Text>
              </View>
            ) : null}
          </View>
          <Pressable onPress={onProfile} style={{
            width: 44, height: 44, borderRadius: 22, backgroundColor: T.surface,
            borderWidth: 1, borderColor: T.hairline,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Avatar name={user.name || user.email || 'You'} size={32} T={T} />
          </Pressable>
        </View>
      </View>

      {/* Greeting block (below the top row) */}
      <View style={{ paddingHorizontal: 20, marginTop: 14 }}>
        <Text style={{ fontSize: 13, color: T.inkMuted, fontWeight: '500', letterSpacing: 0.2 }}>Good afternoon</Text>
        {firstName ? (
          <Text style={{ fontSize: 26, fontWeight: '700', color: T.ink, letterSpacing: -0.5, marginTop: 2 }}>{firstName}</Text>
        ) : (
          <Text style={{ fontSize: 26, fontWeight: '700', color: T.ink, letterSpacing: -0.5, marginTop: 2 }}>Welcome to Pawra</Text>
        )}
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14,
          height: 50, borderRadius: 16, backgroundColor: T.surface,
          borderWidth: 1, borderColor: T.hairline,
        }}>
          <Icon name="search" size={18} color={T.inkMuted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search walkers, vets, groomers…"
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

      {/* Live search results */}
      {searchResults ? (
        <View style={{ marginTop: 14, paddingHorizontal: 20, gap: 10 }}>
          <Text style={{ fontSize: 11.5, fontWeight: '700', color: T.inkMuted, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            {searchResults.length} {searchResults.length === 1 ? 'match' : 'matches'}
          </Text>
          {searchResults.length === 0 ? (
            <View style={{
              padding: 20, borderRadius: 16, backgroundColor: T.surface,
              borderWidth: 1, borderColor: T.hairline, alignItems: 'center',
            }}>
              <Text style={{ fontSize: 13.5, color: T.inkMuted }}>No providers matched "{q}".</Text>
            </View>
          ) : searchResults.map(p => <ProviderRow key={p.id} p={p} T={T} onPress={() => onProvider(p)} />)}
        </View>
      ) : null}

      {/* Emergency vet button */}
      {!searchResults ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <Pressable onPress={onEmergency}>
            <LinearGradient
              colors={['#E33A22', '#C22914']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{
                width: '100%', padding: 14, borderRadius: 18,
                flexDirection: 'row', alignItems: 'center', gap: 12,
                shadowColor: '#C22914', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 6,
              }}
            >
              <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <PulseRed />
                <View style={{
                  width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="plus-medical" size={24} color="#fff" />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 1.2, opacity: 0.85, textTransform: 'uppercase' }}>Emergency</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: -0.3, marginTop: 1 }}>24/7 vets near you</Text>
                <Text style={{ fontSize: 12, color: '#fff', opacity: 0.85, marginTop: 1 }}>Tap to call any clinic instantly</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
      ) : null}

      {/* Paw Points banner */}
      {!searchResults ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
          <Pressable onPress={() => setPawPointsOpen(true)}>
            <LinearGradient
              colors={[T.brand, '#0C1A35']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: '100%', padding: 14, borderRadius: 18,
                flexDirection: 'row', alignItems: 'center', gap: 12,
                shadowColor: T.brand, shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.25, shadowRadius: 16, elevation: 4,
              }}
            >
              <View style={{
                width: 44, height: 44, borderRadius: 12,
                backgroundColor: 'rgba(255,255,255,0.18)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 22 }}>🐾</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 1.2, opacity: 0.85, textTransform: 'uppercase' }}>
                  Paw Points
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: -0.3, marginTop: 1 }}>
                  {pawPoints.toLocaleString()} pts
                </Text>
                <Text style={{ fontSize: 12, color: '#fff', opacity: 0.85, marginTop: 1 }}>
                  {pawPoints >= 500 ? 'Rewards available · tap to redeem' : 'Earn 10 pts per $1 spent'}
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
      ) : null}

      {!searchResults ? (
        <>
          <SectionHeader title="Book a service" T={T} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
          >
            {SERVICE_TYPES.map(s => (
              <Pressable
                key={s.id}
                onPress={() => setStorefrontCategoryOpen(CATEGORY_TO_PROVIDER_TYPE[s.id])}
                style={({ pressed }) => ({
                  alignItems: 'center', gap: 10,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View style={{
                  width: 76, height: 76, borderRadius: 22,
                  backgroundColor: T.brandSoft,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={s.icon} size={32} color={T.brand} />
                </View>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 12.5, fontWeight: '600', color: T.ink,
                    letterSpacing: -0.2, textAlign: 'center',
                  }}
                >
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <SectionHeader title="Near you" T={T} action={featured.length ? { label: 'See all', onPress: () => onTab('browse') } : undefined} />
          {featured.length ? (
            <View style={{ paddingHorizontal: 20, gap: 10 }}>
              {/* Tap → ProviderDetail (reviews + services list + pricing). Book CTA lives there. */}
              {featured.map(p => <ProviderRow key={p.id} p={p} T={T} onPress={() => onProvider(p)} />)}
            </View>
          ) : (
            <EmptyTile T={T} icon="pin" body="No providers near you yet. Check back soon." />
          )}

          <SectionHeader title="From the shop" T={T} action={products.length ? { label: 'Browse', onPress: onShop } : undefined} />
          {products.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
              {products.slice(0, 6).map(p => {
                const vendor = vendorById.get(p.vendorId);
                const preorder = vendor ? !openStatus(vendor.weeklyHours).open : false;
                const fav = favorites.includes(p.id);
                const outOfStock = p.stockCount === 0;
                return (
                  <View key={p.id} style={{ width: 150 }}>
                    <View>
                      {/* Tap → open the product detail sheet inside the Shop tab. */}
                      <Pressable onPress={() => openProduct(p)}>
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
                      <Pressable
                        onPress={() => toggleFav(p.id)}
                        hitSlop={8}
                        style={{
                          position: 'absolute', top: 6, right: 6, width: 30, height: 30, borderRadius: 15,
                          backgroundColor: 'rgba(255,255,255,0.92)',
                          alignItems: 'center', justifyContent: 'center',
                        }}
                      >
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
                      {outOfStock ? (
                        <View style={{ position: 'absolute', top: 6, left: 6 }}>
                          <Pill T={T} color="danger" size="sm">Out of stock</Pill>
                        </View>
                      ) : null}
                    </View>
                    <Pressable onPress={() => openProduct(p)}>
                      <Text numberOfLines={2} style={{ marginTop: 8, fontSize: 13, fontWeight: '600', color: T.ink, lineHeight: 16 }}>{p.name}</Text>
                      {p.subtitle ? <Text style={{ fontSize: 11.5, color: T.inkMuted, marginTop: 2 }}>{p.subtitle}</Text> : null}
                      <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink, marginTop: 4 }}>${p.price.toFixed(2)}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <EmptyTile T={T} icon="bag" body="No products listed yet." />
          )}

          <SectionHeader title="Storefronts" T={T} action={providers.length ? { label: 'Browse all', onPress: () => onTab('browse') } : undefined} />
          {providers.length ? (
            <View style={{ paddingHorizontal: 20, gap: 12 }}>
              {providers.map(p => (
                <StorefrontCard key={p.id} p={p} T={T} onPress={() => onProvider(p)} />
              ))}
            </View>
          ) : (
            <EmptyTile T={T} icon="storefront" body="No storefronts yet. Discover them as providers join Pawra." />
          )}
        </>
      ) : null}
    </ScrollView>

    {/* Floating cart pill — clears the bottom tab bar via safe-area insets. */}
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

function EmptyTile({ T, icon, body }: { T: Theme; icon: string; body: string }) {
  return (
    <View style={{
      marginHorizontal: 20, padding: 18, borderRadius: 16,
      backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
      borderStyle: 'dashed', alignItems: 'center', gap: 8,
    }}>
      <Icon name={icon} size={20} color={T.inkMuted} />
      <Text style={{ fontSize: 13, color: T.inkMuted, textAlign: 'center' }}>{body}</Text>
    </View>
  );
}
