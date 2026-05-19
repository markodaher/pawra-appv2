import { useState } from 'react';
import {
  Animated, Image, Linking, Pressable, ScrollView,
  Text, TextInput, View,
} from 'react-native';
import { FONT } from '../../constants/theme';
import { SHOP_CATEGORIES } from '../../constants/data';
import { useApp } from '../../lib/AppContext';
import { CartCounter } from './CartCounter';
import { formatDistance } from '../../lib/distance';
import { openStatus } from '../../lib/hours';
import { useEnterAnim } from '../../lib/transitions';
import type { Product, Provider, Theme } from '../../types';
import { Icon } from '../Icon';
import { ImagePlaceholder, Pill, ProductImage } from '../primitives';
import { ProductDetailPage } from './ProductDetailModal';

// ─── Popular card (horizontal scroll) ────────────────────────────────────────

function PopularCard({ p, T, preorder, onPress }: {
  p: Product; T: Theme; preorder: boolean;
  onPress: () => void;
}) {
  const outOfStock = p.stockCount === 0;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      width: 160, borderRadius: 18, overflow: 'hidden',
      backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
      opacity: pressed ? 0.88 : 1,
    })}>
      {/* Image area — fills the card width, fixed height, image covers */}
      <View style={{ width: 160, height: 130, backgroundColor: T.surfaceAlt }}>
        {p.imageUrl ? (
          <Image
            source={{ uri: p.imageUrl }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            resizeMode="cover"
          />
        ) : (
          <ImagePlaceholder label={p.cat} T={T} radius={0} ratio={130 / 160} accent={p.accent}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 0 }}
          />
        )}
        {/* Quick-add counter */}
        <View style={{ position: 'absolute', bottom: 8, right: 8 }}>
          <CartCounter p={p} T={T} preorder={preorder} size="sm" />
        </View>
      </View>
      <View style={{ padding: 10, paddingTop: 8 }}>
        <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>
          {p.name}
        </Text>
        {p.subtitle ? (
          <Text numberOfLines={1} style={{ fontSize: 11, color: T.inkMuted, marginTop: 2 }}>{p.subtitle}</Text>
        ) : null}
        <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink, letterSpacing: -0.3, marginTop: 4 }}>
          ${p.price.toFixed(2)}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── List row (Toters-style) ──────────────────────────────────────────────────

function ProductRow({ p, T, preorder, onPress }: {
  p: Product; T: Theme; preorder: boolean;
  onPress: () => void;
}) {
  const outOfStock = p.stockCount === 0;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 14, paddingHorizontal: 20,
        backgroundColor: pressed ? T.surfaceAlt : T.bg,
      })}
    >
      {/* Left: text */}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 14.5, fontWeight: '700', color: outOfStock ? T.inkMuted : T.ink, letterSpacing: -0.2 }} numberOfLines={2}>
          {p.name}
        </Text>
        {p.subtitle ? (
          <Text style={{ fontSize: 12.5, color: T.inkMuted, lineHeight: 17 }} numberOfLines={2}>
            {p.subtitle}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: outOfStock ? T.inkMuted : T.ink, letterSpacing: -0.3 }}>
            ${p.price.toFixed(2)}
          </Text>
          {outOfStock ? (
            <Text style={{ fontSize: 11, color: T.danger, fontWeight: '600' }}>Out of stock</Text>
          ) : null}
        </View>
      </View>

      {/* Right: image + quick-add */}
      <View style={{ position: 'relative' }}>
        <View style={{ borderRadius: 14, overflow: 'hidden' }}>
          <ProductImage p={p} T={T} radius={0} ratio={1} style={{ width: 88, height: 88 }} />
          {outOfStock ? (
            <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.55)' }} />
          ) : null}
        </View>
        {/* Counter */}
        <View style={{ position: 'absolute', bottom: -10, right: -10 }}>
          <CartCounter p={p} T={T} preorder={preorder} size="sm" />
        </View>
      </View>
    </Pressable>
  );
}

// ─── Section separator ────────────────────────────────────────────────────────

function RowDivider({ T }: { T: Theme }) {
  return (
    <View style={{ height: 1, backgroundColor: T.hairline, marginHorizontal: 20 }} />
  );
}

// ─── Main sheet ───────────────────────────────────────────────────────────────

export function ProviderShopSheet({ provider, T, onClose }: {
  provider: Provider; T: Theme; onClose: () => void;
}) {
  const {
    products, favorites, toggleFav, addToCart,
    providerFavorites, toggleProviderFav,
    cartCount, setCartOpen, changeQty, cart,
    setReviewsListForProvider,
  } = useApp();

  const [detailOpen, setDetailOpen] = useState<Product | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');

  const items = products.filter(p => p.vendorId === provider.id);
  const fav = providerFavorites.includes(provider.id);
  const accent = T.brand;
  const status = openStatus(provider.weeklyHours);
  const closed = !status.open;
  const distanceLabel = formatDistance(provider.distanceKm);

  const needle = searchQ.trim().toLowerCase();
  const visibleItems = needle
    ? items.filter(p => (p.name + ' ' + p.subtitle + ' ' + p.cat).toLowerCase().includes(needle))
    : items;

  // Top 5 most-sold items with at least 1 sale.
  const popular = needle ? [] : [...items]
    .filter(p => p.sales > 0)
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);

  const handleQuickAdd = (p: Product) => {
    if (p.stockCount === 0) return;
    const inCart = cart.find(c => c.id === p.id);
    if (inCart) {
      changeQty(p.id, inCart.qty + 1);
    } else {
      addToCart(p);
    }
  };

  const handleAddQty = (p: Product, qty: number) => {
    const inCart = cart.find(c => c.id === p.id);
    if (inCart) {
      changeQty(p.id, inCart.qty + qty);
    } else {
      // addToCart adds 1; call repeatedly for qty > 1
      addToCart(p);
      for (let i = 1; i < qty; i++) changeQty(p.id, i + 1);
    }
  };

  const anim = useEnterAnim('right');

  return (
    <>
      <Animated.View style={[{ position: 'absolute', inset: 0, zIndex: 70, backgroundColor: T.bg }, anim.sheet]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>

          {/* ── Hero ── */}
          <View>
            {provider.displayPic ? (
              <Image source={{ uri: provider.displayPic }} style={{ width: '100%', aspectRatio: 16 / 9 }} resizeMode="cover" />
            ) : (
              <ImagePlaceholder
                label={provider.type} T={T} radius={0} accent={accent}
                ratio={16 / 9}
                style={{ borderRadius: 0, borderWidth: 0 }}
              />
            )}
            <Pressable onPress={onClose} style={{
              position: 'absolute', top: 14, left: 14, width: 40, height: 40, borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.92)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="chevron-left" size={20} color="#1a1a1a" />
            </Pressable>
            <View style={{ position: 'absolute', top: 14, right: 14, flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => { setSearchOpen(s => !s); setSearchQ(''); }} style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.92)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="search" size={17} color="#1a1a1a" />
              </Pressable>
              <Pressable onPress={() => toggleProviderFav(provider.id)} style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.92)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="heart" size={18} color={fav ? T.brand : '#1a1a1a'}
                  fill={fav ? T.brand : 'none'} strokeWidth={fav ? 2.4 : 1.6} />
              </Pressable>
            </View>
          </View>

          {/* ── Search bar (appears when toggled) ── */}
          {searchOpen ? (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              paddingHorizontal: 20, paddingVertical: 12,
              backgroundColor: T.bg, borderBottomWidth: 1, borderBottomColor: T.hairline,
            }}>
              <View style={{
                flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: T.surface, borderRadius: 14,
                borderWidth: 1, borderColor: T.hairline,
                paddingHorizontal: 12, height: 44,
              }}>
                <Icon name="search" size={16} color={T.inkMuted} />
                <TextInput
                  value={searchQ}
                  onChangeText={setSearchQ}
                  placeholder="Search products…"
                  placeholderTextColor={T.inkMuted}
                  autoFocus
                  returnKeyType="search"
                  style={{ flex: 1, fontSize: 15, color: T.ink, fontFamily: FONT.sans, padding: 0 }}
                />
                {searchQ ? (
                  <Pressable onPress={() => setSearchQ('')} hitSlop={8}>
                    <Icon name="x" size={14} color={T.inkMuted} />
                  </Pressable>
                ) : null}
              </View>
              <Pressable onPress={() => { setSearchOpen(false); setSearchQ(''); }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: T.brand }}>Cancel</Text>
              </Pressable>
            </View>
          ) : null}

          {/* ── Header ── */}
          <View style={{ padding: 20, paddingBottom: 16 }}>
            {provider.verified ? (
              <View style={{ marginBottom: 6 }}>
                <Pill T={T} color="success" size="sm" icon="check-circle">Verified</Pill>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: T.ink, letterSpacing: -0.5 }}>
                  {provider.name || 'Storefront'}
                </Text>
                <Text style={{ fontSize: 13, color: T.inkMuted, marginTop: 3 }}>{provider.area}</Text>
              </View>
              <Pressable
                onPress={() => setReviewsListForProvider(provider)}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999,
                  backgroundColor: T.surfaceAlt,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Icon name="star" size={12} color={T.warn} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: T.ink }}>
                  {provider.reviews > 0 ? provider.rating.toFixed(1) : 'New'}
                </Text>
                {provider.reviews > 0 ? (
                  <Text style={{ fontSize: 12, color: T.inkMuted }}>({provider.reviews})</Text>
                ) : null}
                <Icon name="chevron-right" size={11} color={T.inkMuted} />
              </Pressable>
            </View>

            {/* Bio */}
            {provider.bio ? (
              <Text style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 19, marginTop: 10 }}>
                {provider.bio}
              </Text>
            ) : null}

            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: T.hairline,
              flexWrap: 'wrap',
            }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
                backgroundColor: status.open ? 'rgba(60,160,90,0.14)' : 'rgba(200,74,72,0.12)',
              }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: status.open ? T.success : T.danger }} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: status.open ? T.success : T.danger, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                  {status.open ? 'Open' : 'Closed'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Icon name="pin" size={12} color={T.inkMuted} />
                <Text style={{ fontSize: 12.5, color: T.inkMuted, fontWeight: '600' }}>
                  {distanceLabel || 'Distance not set'}
                </Text>
              </View>
              {provider.gmapsLink ? (
                <Pressable
                  onPress={() => Linking.openURL(provider.gmapsLink!).catch(() => {})}
                  hitSlop={6}
                  style={{
                    marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5,
                    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
                    backgroundColor: T.surfaceAlt, borderWidth: 1, borderColor: T.hairline,
                  }}
                >
                  <Icon name="navigation" size={11} color={T.ink} />
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: T.ink }}>Open in Maps</Text>
                </Pressable>
              ) : null}
            </View>
            {!status.open && status.nextOpening ? (
              <Text style={{ fontSize: 12, color: T.inkMuted, marginTop: 6 }}>
                Opens {status.nextOpening.label} · {status.nextOpening.timeLabel}
              </Text>
            ) : null}
          </View>

          {/* ── Pre-order banner ── */}
          {closed ? (
            <View style={{
              marginHorizontal: 20, marginBottom: 16, padding: 14, borderRadius: 16,
              backgroundColor: T.accentSoft, borderWidth: 1, borderColor: T.accent,
              flexDirection: 'row', gap: 12, alignItems: 'flex-start',
            }}>
              <View style={{
                width: 34, height: 34, borderRadius: 10, backgroundColor: T.accent,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="clock" size={15} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: T.accent, letterSpacing: -0.2 }}>
                  Closed · pre-order available
                </Text>
                <Text style={{ fontSize: 12, color: T.inkSoft, marginTop: 2, lineHeight: 17 }}>
                  {status.nextOpening
                    ? `Ships when ${provider.name || 'this shop'} opens ${status.nextOpening.label} at ${status.nextOpening.timeLabel}.`
                    : "We'll dispatch the moment they reopen."}
                </Text>
              </View>
            </View>
          ) : null}

          {/* ── Empty / no-results state ── */}
          {items.length === 0 ? (
            <View style={{
              marginHorizontal: 20, padding: 24, borderRadius: 16,
              backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
              borderStyle: 'dashed', alignItems: 'center', gap: 8,
            }}>
              <Icon name="bag" size={22} color={T.inkMuted} />
              <Text style={{ fontSize: 13.5, color: T.inkMuted, textAlign: 'center' }}>
                This storefront hasn't listed products yet.
              </Text>
            </View>
          ) : (
            <>
              {/* ── No search results ── */}
              {needle && visibleItems.length === 0 ? (
                <View style={{
                  marginHorizontal: 20, padding: 24, borderRadius: 16,
                  backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
                  alignItems: 'center', gap: 8,
                }}>
                  <Icon name="search" size={24} color={T.inkMuted} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink }}>No results for "{searchQ}"</Text>
                  <Text style={{ fontSize: 13, color: T.inkMuted }}>Try a different keyword.</Text>
                </View>
              ) : null}

              {/* ── Popular section ── */}
              {popular.length > 0 ? (
                <View style={{ marginBottom: 8 }}>
                  <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: T.ink, letterSpacing: -0.4 }}>
                      🔥 Popular
                    </Text>
                    <Text style={{ fontSize: 12.5, color: T.inkMuted, marginTop: 2 }}>
                      Top picks from this shop
                    </Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
                  >
                    {popular.map(p => (
                      <PopularCard
                        key={p.id}
                        p={p} T={T}
                        preorder={closed}
                        onPress={() => setDetailOpen(p)}
                        
                      />
                    ))}
                  </ScrollView>
                  <View style={{ height: 1, backgroundColor: T.hairline, marginHorizontal: 20, marginTop: 20 }} />
                </View>
              ) : null}

              {/* ── Category sections (Toters-style rows) ── */}
              {visibleItems.length > 0 ? (() => {
                // When searching, flat list with a single "Results" header.
                if (needle) {
                  return (
                    <View style={{ paddingTop: 4 }}>
                      <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: T.ink, letterSpacing: -0.4 }}>Results</Text>
                        <Text style={{ fontSize: 12.5, color: T.inkMuted, marginTop: 2 }}>{visibleItems.length} {visibleItems.length === 1 ? 'item' : 'items'}</Text>
                      </View>
                      {visibleItems.map((p, i) => (
                        <View key={p.id}>
                          {i > 0 ? <RowDivider T={T} /> : null}
                          <ProductRow p={p} T={T} preorder={closed} onPress={() => setDetailOpen(p)} />
                        </View>
                      ))}
                    </View>
                  );
                }
                // Group by category, skipping empty categories.
                const catOrder = SHOP_CATEGORIES.map(c => c.id);
                const grouped = catOrder.map(catId => ({
                  catId,
                  label: SHOP_CATEGORIES.find(c => c.id === catId)?.label ?? catId,
                  icon: SHOP_CATEGORIES.find(c => c.id === catId)?.icon ?? 'tag',
                  items: visibleItems.filter(p => p.cat === catId),
                })).filter(g => g.items.length > 0);
                // Items with unknown cats go to "Other"
                const knownCatIds = new Set(catOrder);
                const otherItems = visibleItems.filter(p => !knownCatIds.has(p.cat));

                return (
                  <View style={{ paddingTop: 4 }}>
                    {grouped.map((g, gi) => (
                      <View key={g.catId} style={{ marginBottom: 4 }}>
                        {/* Section header */}
                        <View style={{
                          flexDirection: 'row', alignItems: 'center', gap: 8,
                          paddingHorizontal: 20, paddingVertical: 14,
                          borderTopWidth: gi === 0 ? 0 : 1, borderTopColor: T.hairline,
                        }}>
                          <View style={{
                            width: 28, height: 28, borderRadius: 8, backgroundColor: T.brandSoft,
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Icon name={g.icon} size={13} color={T.brandInk} />
                          </View>
                          <Text style={{ fontSize: 16, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>
                            {g.label}
                          </Text>
                          <Text style={{ fontSize: 12, color: T.inkMuted, fontWeight: '600' }}>
                            {g.items.length}
                          </Text>
                        </View>
                        {g.items.map((p, i) => (
                          <View key={p.id}>
                            {i > 0 ? <RowDivider T={T} /> : null}
                            <ProductRow p={p} T={T} preorder={closed} onPress={() => setDetailOpen(p)} />
                          </View>
                        ))}
                      </View>
                    ))}
                    {otherItems.length > 0 ? (
                      <View style={{ marginBottom: 4 }}>
                        <View style={{
                          flexDirection: 'row', alignItems: 'center', gap: 8,
                          paddingHorizontal: 20, paddingVertical: 14,
                          borderTopWidth: 1, borderTopColor: T.hairline,
                        }}>
                          <Text style={{ fontSize: 16, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>Other</Text>
                        </View>
                        {otherItems.map((p, i) => (
                          <View key={p.id}>
                            {i > 0 ? <RowDivider T={T} /> : null}
                            <ProductRow p={p} T={T} preorder={closed} onPress={() => setDetailOpen(p)} />
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })() : null}
            </>
          )}
        </ScrollView>

        {/* ── Floating cart pill ── */}
        {cartCount > 0 ? (
          <Pressable
            onPress={() => setCartOpen(true)}
            style={{
              position: 'absolute', left: 20, right: 20, bottom: 22,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              paddingVertical: 14, paddingHorizontal: 18, borderRadius: 18,
              backgroundColor: T.ink,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{
                width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.18)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={closed ? 'clock' : 'bag'} size={15} color="#fff" />
              </View>
              <View>
                <Text style={{ color: '#fff', fontSize: 14.5, fontWeight: '700' }}>
                  {cartCount} in cart{closed ? ' · pre-order' : ''}
                </Text>
                {closed && status.nextOpening ? (
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11.5, fontWeight: '600', marginTop: 1 }}>
                    Ships {status.nextOpening.label} · {status.nextOpening.timeLabel}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Review</Text>
              <Icon name="chevron-right" size={14} color="#fff" />
            </View>
          </Pressable>
        ) : null}
      </Animated.View>

      {/* ── Product detail page (rendered outside the animated sheet) ── */}
      {detailOpen ? (
        <ProductDetailPage
          p={detailOpen}
          T={T}
          preorder={closed}
          onClose={() => setDetailOpen(null)}
          onAdd={(qty) => handleAddQty(detailOpen, qty)}
        />
      ) : null}
    </>
  );
}
