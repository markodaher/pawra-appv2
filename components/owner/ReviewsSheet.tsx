import { Animated, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../../lib/AppContext';
import { useEnterAnim } from '../../lib/transitions';
import type { Provider, Theme } from '../../types';
import { Icon } from '../Icon';
import { Avatar } from '../primitives';

/**
 * Full-screen list of every review left for a provider. Reached by tapping
 * the "Reviews" block on the provider detail page when there are more than
 * the 2 surfaced inline. Same card aesthetic — just no truncation.
 */
export function ReviewsSheet({ T, provider, onClose }: {
  T: Theme;
  provider: Provider;
  onClose: () => void;
}) {
  const { reviews } = useApp();
  // Already sorted newest-first by loadAllReviews. We re-filter on each render
  // so realtime review inserts/edits flow through immediately.
  const list = reviews.filter(r => r.providerId === provider.id);
  const avg = list.length > 0
    ? list.reduce((s, r) => s + r.rating, 0) / list.length
    : 0;

  // Distribution — 5★ row first, like the typical "rating breakdown" block.
  const dist = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: list.filter(r => r.rating === stars).length,
  }));
  const maxCount = Math.max(1, ...dist.map(d => d.count));

  const anim = useEnterAnim('right');
  return (
    <Animated.View style={[{ position: 'absolute', inset: 0, zIndex: 90, backgroundColor: T.bg }, anim.sheet]}>
      <View style={{
        paddingTop: 14, paddingHorizontal: 20, paddingBottom: 12,
        flexDirection: 'row', alignItems: 'center', gap: 12,
      }}>
        <Pressable onPress={onClose} style={{
          width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface,
          borderWidth: 1, borderColor: T.hairline,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="chevron-left" size={20} color={T.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 11, fontWeight: '700', color: T.inkMuted,
            letterSpacing: 0.4, textTransform: 'uppercase',
          }}>{provider.name || 'Provider'}</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: T.ink, letterSpacing: -0.3, marginTop: 2 }}>
            All reviews
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 60, gap: 14 }}>
        {/* Summary — average + distribution */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 16,
          padding: 16, borderRadius: 18,
          backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
        }}>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 36, fontWeight: '700', color: T.ink, letterSpacing: -1 }}>
              {list.length > 0 ? avg.toFixed(1) : '—'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 2 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <Icon
                  key={n}
                  name={n <= Math.round(avg) ? 'star' : 'star-line'}
                  size={11}
                  color={n <= Math.round(avg) ? T.warn : T.inkMuted}
                />
              ))}
            </View>
            <Text style={{ fontSize: 11, color: T.inkMuted }}>
              {list.length} {list.length === 1 ? 'review' : 'reviews'}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            {dist.map(d => (
              <View key={d.stars} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: T.inkSoft, width: 10 }}>{d.stars}</Text>
                <Icon name="star" size={10} color={T.warn} />
                <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: T.surfaceAlt }}>
                  <View style={{
                    width: `${(d.count / maxCount) * 100}%`,
                    height: 6, borderRadius: 3, backgroundColor: T.warn,
                  }} />
                </View>
                <Text style={{ fontSize: 11, color: T.inkMuted, width: 18, textAlign: 'right' }}>{d.count}</Text>
              </View>
            ))}
          </View>
        </View>

        {list.length === 0 ? (
          <View style={{
            padding: 28, borderRadius: 18,
            backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
            alignItems: 'center', gap: 8,
          }}>
            <Icon name="star-line" size={28} color={T.inkMuted} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>No reviews yet</Text>
            <Text style={{ fontSize: 13, color: T.inkMuted, textAlign: 'center', lineHeight: 18 }}>
              Reviews show up here once owners leave one after their booking.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {list.map(r => (
              <View key={r.id} style={{
                padding: 14, borderRadius: 16,
                backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
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
                  <Text style={{ marginVertical: 6, fontSize: 13.5, color: T.inkSoft, lineHeight: 19 }}>{r.text}</Text>
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
                    marginTop: 10, padding: 10, borderRadius: 10,
                    backgroundColor: T.brandSoft,
                    borderLeftWidth: 3, borderLeftColor: T.brand, gap: 2,
                  }}>
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: T.brand, letterSpacing: 0.2, textTransform: 'uppercase' }}>
                      {provider.name?.split(' ')[0] ?? 'Provider'} replied
                    </Text>
                    <Text style={{ fontSize: 13, color: T.brandInk, lineHeight: 18 }}>{r.response}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}
