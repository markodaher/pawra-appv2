import { Image, Linking, Pressable, Text, View } from 'react-native';
import { useApp } from '../../lib/AppContext';
import { formatDistance } from '../../lib/distance';
import { openStatus } from '../../lib/hours';
import type { Provider, Theme } from '../../types';
import { Icon } from '../Icon';
import { ImagePlaceholder, Pill } from '../primitives';

export function StorefrontCard({ p, T, onPress }: {
  p: Provider; T: Theme; onPress: () => void;
}) {
  const { providerFavorites, toggleProviderFav } = useApp();
  const fav = providerFavorites.includes(p.id);
  const accent = T.brand;

  const distanceLabel = formatDistance(p.distanceKm);
  const status = openStatus(p.weeklyHours);

  return (
    <View style={{
      borderRadius: 20,
      backgroundColor: T.surface,
      borderWidth: 1, borderColor: T.hairline,
      overflow: 'hidden',
    }}>
      <Pressable onPress={onPress}>
        {/* 16:9 cover */}
        <View>
          {p.displayPic ? (
            <Image source={{ uri: p.displayPic }} style={{ width: '100%', aspectRatio: 16 / 9 }} resizeMode="cover" />
          ) : (
            <ImagePlaceholder
              label={p.type} T={T} radius={0} accent={accent}
              ratio={16 / 9}
              style={{ borderRadius: 0, borderWidth: 0 }}
            />
          )}

          {/* Top-left: only Verified badge (category pill removed). */}
          {p.verified ? (
            <View style={{
              position: 'absolute', top: 10, left: 10,
              flexDirection: 'row', gap: 6, flexWrap: 'wrap', maxWidth: '70%',
            }}>
              <Pill T={T} color="success" size="sm" icon="check-circle">Verified</Pill>
            </View>
          ) : null}
        </View>

        {/* Body */}
        <View style={{ padding: 14, gap: 10 }}>
          {/* Row 1: name + rating chip */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>
                {p.name || 'Storefront'}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: 12.5, color: T.inkMuted, marginTop: 2 }}>
                {p.area}
              </Text>
            </View>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999,
              backgroundColor: T.surfaceAlt,
            }}>
              <Icon name="star" size={11} color={T.warn} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: T.ink }}>
                {p.reviews > 0 ? p.rating.toFixed(1) : 'New'}
              </Text>
              {p.reviews > 0 ? (
                <Text style={{ fontSize: 11.5, color: T.inkMuted }}>({p.reviews})</Text>
              ) : null}
            </View>
          </View>

          {/* Row 2: open status + distance + Book CTA */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
                backgroundColor: status.open ? 'rgba(60,160,90,0.14)' : 'rgba(200,74,72,0.12)',
              }}>
                <View style={{
                  width: 6, height: 6, borderRadius: 3,
                  backgroundColor: status.open ? T.success : T.danger,
                }} />
                <Text style={{
                  fontSize: 11, fontWeight: '700',
                  color: status.open ? T.success : T.danger,
                  letterSpacing: 0.3, textTransform: 'uppercase',
                }}>
                  {status.open ? 'Open' : 'Closed'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 }}>
                <Icon name="pin" size={12} color={T.inkMuted} />
                <Text numberOfLines={1} style={{ fontSize: 12.5, color: T.inkMuted, fontWeight: '600' }}>
                  {distanceLabel || 'Distance not set'}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: T.brand, fontWeight: '700', fontSize: 13.5 }}>Book</Text>
              <Icon name="chevron-right" size={14} color={T.brand} />
            </View>
          </View>
          {!status.open && status.nextOpening ? (
            <Text style={{ fontSize: 11.5, color: T.inkMuted, marginTop: -2 }}>
              Opens {status.nextOpening.label} · {status.nextOpening.timeLabel}
            </Text>
          ) : null}
        </View>
      </Pressable>

      {/* "Open in Maps" sits as a sibling so its tap doesn't bubble to the
          card's onPress. Only renders when the provider has shared a link. */}
      {p.gmapsLink ? (
        <Pressable
          onPress={() => Linking.openURL(p.gmapsLink!).catch(() => {})}
          hitSlop={6}
          style={{
            position: 'absolute', top: 10, right: 52,
            flexDirection: 'row', alignItems: 'center', gap: 5,
            paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.92)',
          }}
        >
          <Icon name="navigation" size={12} color="#1a1a1a" />
          <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#1a1a1a' }}>
            Maps
          </Text>
        </Pressable>
      ) : null}

      {/* Heart sits as a sibling; same isolation pattern as ProviderRow. */}
      <Pressable
        onPress={() => toggleProviderFav(p.id)}
        hitSlop={8}
        style={{
          position: 'absolute', top: 10, right: 10,
          width: 34, height: 34, borderRadius: 17,
          backgroundColor: 'rgba(255,255,255,0.92)',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon
          name="heart" size={16}
          color={fav ? T.brand : '#1a1a1a'}
          fill={fav ? T.brand : 'none'}
          strokeWidth={fav ? 2.4 : 1.6}
        />
      </Pressable>
    </View>
  );
}
