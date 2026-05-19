import { Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SERVICE_TYPES } from '../../constants/data';
import { useApp } from '../../lib/AppContext';
import { computeTier, TIER_META } from '../../lib/badges';
import { formatDistance } from '../../lib/distance';
import type { Provider, ProviderType, ServiceCategoryId, Theme } from '../../types';
import { Icon } from '../Icon';
import { Avatar, Button, ImagePlaceholder, Pill } from '../primitives';

const PROVIDER_TYPE_TO_CATEGORY: Record<ProviderType, ServiceCategoryId> = {
  walker:  'walk',
  groomer: 'groom',
  vet:     'vet',
  boarder: 'board',
  taxi:    'taxi',
  funeral: 'funeral',
};

function categoryMeta(cat: ServiceCategoryId) {
  return SERVICE_TYPES.find(s => s.id === cat);
}

export function ProviderDetail({ provider, T, onBack, onBook }: {
  provider: Provider; T: Theme; onBack: () => void; onBook: (p: Provider) => void;
}) {
  const { reviews, allProviderServices, providerFavorites, toggleProviderFav, setReviewsListForProvider } = useApp();
  const providerReviews = reviews.filter(r => r.providerId === provider.id);
  // Surface only the most recent two on the landing page; the full list lives
  // in ReviewsSheet, opened by tapping the section header.
  const TOP_REVIEW_COUNT = 2;
  const topReviews = providerReviews.slice(0, TOP_REVIEW_COUNT);
  const moreReviewsCount = Math.max(0, providerReviews.length - TOP_REVIEW_COUNT);
  const providerServices = allProviderServices[provider.id];
  const fav      = providerFavorites.includes(provider.id);
  const tier     = computeTier(provider.reviews, provider.rating);
  const tierMeta = TIER_META[tier];
  const offeredCategories: ServiceCategoryId[] =
    provider.categories && provider.categories.length
      ? provider.categories
      : (provider.type ? [PROVIDER_TYPE_TO_CATEGORY[provider.type]] : []);

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        <View>
          {provider.displayPic ? (
            <Image
              source={{ uri: provider.displayPic }}
              style={{ width: '100%', aspectRatio: 3 / 2 }}
              resizeMode="cover"
            />
          ) : (
            <ImagePlaceholder
              label={`${provider.type} · cover`}
              T={T} radius={0} ratio={3 / 2}
              accent={T.brand}
              style={{ borderRadius: 0 }}
            />
          )}
          <Pressable onPress={onBack} style={{
            position: 'absolute', top: 14, left: 14, width: 40, height: 40, borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.85)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="chevron-left" size={20} color="#1a1a1a" />
          </Pressable>
          <Pressable
            onPress={() => toggleProviderFav(provider.id)}
            style={{
              position: 'absolute', top: 14, right: 14, width: 40, height: 40, borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.92)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon
              name="heart" size={18}
              color={fav ? T.brand : '#1a1a1a'}
              fill={fav ? T.brand : 'none'}
              strokeWidth={fav ? 2.4 : 1.6}
            />
          </Pressable>
        </View>

        <View style={{ padding: 20, paddingBottom: 0 }}>
          {(provider.verified || tierMeta.show) ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              {provider.verified ? <Pill T={T} color="success" size="sm" icon="check-circle">Verified</Pill> : null}
              {tierMeta.show ? (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
                  backgroundColor: tierMeta.color(T) + '18',
                }}>
                  <Icon name={tierMeta.icon} size={11} color={tierMeta.color(T)} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: tierMeta.color(T) }}>
                    {tierMeta.label}
                  </Text>
                </View>
              ) : null}
              {provider.emergency ? (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
                  backgroundColor: T.danger + '18',
                }}>
                  <Icon name="sparkle" size={11} color={T.danger} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: T.danger }}>Emergency</Text>
                </View>
              ) : null}
            </View>
          ) : null}
          <Text style={{ fontSize: 24, fontWeight: '700', color: T.ink, letterSpacing: -0.5, marginVertical: 4 }}>
            {provider.name || 'Unnamed provider'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Icon name="pin" size={14} color={T.inkMuted} />
            <Text style={{ color: T.inkSoft, fontSize: 13 }}>
              {provider.area || 'Location not set'}
              {formatDistance(provider.distanceKm) ? ` · ${formatDistance(provider.distanceKm)} away` : ''}
            </Text>
            {provider.gmapsLink ? (
              <Pressable
                onPress={() => Linking.openURL(provider.gmapsLink!).catch(() => {})}
                hitSlop={6}
                style={{
                  marginLeft: 4,
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
                  backgroundColor: T.surfaceAlt, borderWidth: 1, borderColor: T.hairline,
                }}
              >
                <Icon name="navigation" size={11} color={T.ink} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: T.ink }}>Open in Maps</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Stats — bookings only show ratings; price is per-service (in the
              services list) and typical arrival isn't meaningful for service
              bookings since the provider comes to the owner's address. */}
          <Pressable
            onPress={() => setReviewsListForProvider(provider)}
            style={({ pressed }) => ({
              flexDirection: 'row', gap: 12, marginTop: 16, padding: 14, borderRadius: 16,
              backgroundColor: T.bgRaised, borderWidth: 1, borderColor: T.hairline,
              alignItems: 'center', justifyContent: 'center',
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="star" size={16} color={T.warn} />
              <Text style={{ fontSize: 17, fontWeight: '700', color: T.ink }}>
                {provider.reviews > 0 ? provider.rating.toFixed(1) : 'New'}
              </Text>
              <Text style={{ fontSize: 12, color: T.inkMuted, marginLeft: 2 }}>
                · {provider.reviews} {provider.reviews === 1 ? 'review' : 'reviews'}
              </Text>
              <Icon name="chevron-right" size={13} color={T.inkMuted} />
            </View>
          </Pressable>

          {(provider.staff || provider.tags.length || provider.hours) ? (
            <View style={{ marginTop: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: T.inkMuted, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 }}>About</Text>
              <Text style={{ fontSize: 14.5, color: T.inkSoft, lineHeight: 22 }}>
                {provider.staff ? `Run by ${provider.staff}. ` : ''}
                {provider.tags.length ? `${provider.tags.join(' · ')}. ` : ''}
                {provider.hours ? `Open ${provider.hours.toLowerCase()}.` : ''}
              </Text>
            </View>
          ) : null}

          {provider.tags.length ? (
            <View style={{ marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {provider.tags.map(t => <Pill key={t} T={T} color="neutral">{t}</Pill>)}
            </View>
          ) : null}

          {offeredCategories.length > 0 ? (
            <View style={{ marginTop: 24 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: T.inkMuted, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 10 }}>
                Services & pricing
              </Text>
              <View style={{ gap: 12 }}>
                {offeredCategories.map(cat => {
                  const meta = categoryMeta(cat);
                  const offerings = (providerServices?.[cat] || []).filter(s => s.active);
                  return (
                    <View key={cat} style={{
                      padding: 14, borderRadius: 16,
                      backgroundColor: T.bgRaised, borderWidth: 1, borderColor: T.hairline,
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: offerings.length ? 10 : 0 }}>
                        <View style={{
                          width: 30, height: 30, borderRadius: 9, backgroundColor: T.brandSoft,
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Icon name={meta?.icon || 'tag'} size={15} color={T.brand} />
                        </View>
                        <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>
                          {meta?.label || cat}
                        </Text>
                        {offerings.length === 0 ? (
                          <Text style={{ fontSize: 12, color: T.inkMuted, fontStyle: 'italic' }}>
                            No offerings yet
                          </Text>
                        ) : null}
                      </View>
                      {offerings.length > 0 ? (
                        <View style={{ gap: 8 }}>
                          {offerings.map(svc => (
                            <View key={svc.id} style={{
                              flexDirection: 'row', alignItems: 'flex-start', gap: 10,
                              paddingTop: 8, borderTopWidth: 1, borderTopColor: T.hairline,
                            }}>
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: T.ink }}>{svc.name}</Text>
                                {svc.desc ? (
                                  <Text style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 2, lineHeight: 17 }}>
                                    {svc.desc}
                                  </Text>
                                ) : null}
                              </View>
                              <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                                <Text style={{ fontSize: 15, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>
                                  ${svc.price}
                                </Text>
                                {svc.unit ? (
                                  <Text style={{ fontSize: 11, color: T.inkMuted }}>{svc.unit}</Text>
                                ) : null}
                              </View>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={{ marginTop: 24 }}>
            <Pressable
              onPress={() => setReviewsListForProvider(provider)}
              hitSlop={6}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: T.inkMuted, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                Reviews{providerReviews.length > 0 ? ` · ${providerReviews.length}` : ''}
              </Text>
              {providerReviews.length > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: T.brand }}>See all</Text>
                  <Icon name="chevron-right" size={14} color={T.brand} />
                </View>
              ) : null}
            </Pressable>
            {providerReviews.length === 0 ? (
              <View style={{
                padding: 16, borderRadius: 16, backgroundColor: T.bgRaised,
                borderWidth: 1, borderColor: T.hairline, alignItems: 'center',
              }}>
                <Text style={{ fontSize: 13, color: T.inkMuted }}>No reviews yet — be the first.</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {topReviews.map((r) => (
                  <View key={r.id} style={{
                    padding: 14, borderRadius: 16, backgroundColor: T.bgRaised,
                    borderWidth: 1, borderColor: T.hairline,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Avatar name={r.author} size={28} T={T} />
                        <Text style={{ fontSize: 13.5, fontWeight: '700', color: T.ink }}>{r.author}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 3 }}>
                        {[1, 2, 3, 4, 5].map(n => (
                          <Icon
                            key={n}
                            name={n <= r.rating ? 'star' : 'star-line'}
                            size={11}
                            color={n <= r.rating ? T.warn : T.inkMuted}
                          />
                        ))}
                      </View>
                    </View>
                    {r.text ? (
                      <Text numberOfLines={3} style={{ marginVertical: 6, fontSize: 13.5, color: T.inkSoft, lineHeight: 19 }}>{r.text}</Text>
                    ) : null}
                    {r.photoUrl ? (
                      <Image
                        source={{ uri: r.photoUrl }}
                        style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 12, marginTop: 8 }}
                        resizeMode="cover"
                      />
                    ) : null}
                    <Text style={{ marginTop: r.text || r.photoUrl ? 6 : 4, fontSize: 11, color: T.inkMuted }}>{r.when}</Text>
                    {r.response ? (
                      <View style={{
                        marginTop: 8, padding: 10, borderRadius: 10,
                        backgroundColor: T.brandSoft,
                        borderLeftWidth: 3, borderLeftColor: T.brand, gap: 2,
                      }}>
                        <Text style={{ fontSize: 10.5, fontWeight: '700', color: T.brand, letterSpacing: 0.2, textTransform: 'uppercase' }}>
                          {provider.name?.split(' ')[0] ?? 'Provider'} replied
                        </Text>
                        <Text style={{ fontSize: 12.5, color: T.brandInk, lineHeight: 17 }}>{r.response}</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
                {moreReviewsCount > 0 ? (
                  <Pressable
                    onPress={() => setReviewsListForProvider(provider)}
                    style={({ pressed }) => ({
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: 14, borderRadius: 16,
                      backgroundColor: pressed ? T.brandSoft : T.bgRaised,
                      borderWidth: 1, borderColor: T.hairline,
                    })}
                  >
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: T.brand }}>
                      Show all {providerReviews.length} reviews
                    </Text>
                    <Icon name="chevron-right" size={14} color={T.brand} />
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: 16, paddingBottom: 28, paddingTop: 12, backgroundColor: T.bg,
      }}>
        <Button T={T} full size="lg" onPress={() => onBook(provider)} icon="calendar">Book now</Button>
      </View>
    </View>
  );
}
