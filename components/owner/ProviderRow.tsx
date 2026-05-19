import { Image, Pressable, Text, View } from 'react-native';
import { useApp } from '../../lib/AppContext';
import { formatDistance } from '../../lib/distance';
import { computeTier, TIER_META } from '../../lib/badges';
import type { Provider, Theme } from '../../types';
import { Icon } from '../Icon';
import { ImagePlaceholder, Pill } from '../primitives';

export function ProviderRow({ p, T, onPress, compact }: { p: Provider; T: Theme; onPress: () => void; compact?: boolean }) {
  const { providerFavorites, toggleProviderFav } = useApp();
  const fav  = providerFavorites.includes(p.id);
  const tier = computeTier(p.reviews, p.rating);
  const tierMeta = TIER_META[tier];

  return (
    <View style={{
      borderRadius: 18,
      backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
      position: 'relative',
    }}>
      <Pressable onPress={onPress} style={{
        flexDirection: 'row', gap: 12, padding: 12,
        alignItems: 'center',
      }}>
        {p.displayPic ? (
          <Image
            source={{ uri: p.displayPic }}
            style={{
              width: 64, height: 64, borderRadius: 14,
              borderWidth: 1, borderColor: T.hairline,
            }}
            resizeMode="cover"
          />
        ) : (
          <ImagePlaceholder
            label={p.type} T={T} radius={14} ratio={1}
            accent={T.brand}
            style={{ width: 64, height: 64 }}
          />
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingRight: 28 }}>
            <Text numberOfLines={1} style={{ fontWeight: '700', fontSize: 15, color: T.ink, letterSpacing: -0.3, flexShrink: 1 }}>{p.name}</Text>
            {p.verified ? <Icon name="check-circle" size={14} color={T.brand} /> : null}
            {tierMeta.show && tier !== 'rising' ? (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 3,
                paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
                backgroundColor: tierMeta.color(T) + '18',
              }}>
                <Icon name={tierMeta.icon} size={10} color={tierMeta.color(T)} />
                <Text style={{ fontSize: 10, fontWeight: '700', color: tierMeta.color(T) }}>
                  {tierMeta.label}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <Icon name="star" size={12} color={T.warn} />
            <Text style={{ color: T.ink, fontWeight: '600', fontSize: 12.5 }}>{p.rating}</Text>
            <Text style={{ color: T.inkMuted, fontSize: 12.5 }}>
              · {p.reviews} reviews{formatDistance(p.distanceKm) ? ` · ${formatDistance(p.distanceKm)}` : ''}
            </Text>
          </View>
          {!compact ? (
            <View style={{ flexDirection: 'row', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
              {p.tags.slice(0, 2).map(t => <Pill key={t} T={T} color="neutral" size="sm">{t}</Pill>)}
            </View>
          ) : null}
        </View>
      </Pressable>
      {/* Heart sits as a sibling (not nested inside the nav Pressable), so taps don't bubble. */}
      <Pressable
        onPress={() => toggleProviderFav(p.id)}
        hitSlop={8}
        style={{
          position: 'absolute', top: 8, right: 8,
          width: 30, height: 30, borderRadius: 15,
          backgroundColor: T.bg,
          borderWidth: 1, borderColor: T.hairline,
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
    </View>
  );
}
