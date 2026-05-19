import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { CATEGORY_TO_PROVIDER_TYPE, SERVICE_TYPES } from '../../constants/data';
import { useApp } from '../../lib/AppContext';
import { useEnterAnim } from '../../lib/transitions';
import type { Provider, ProviderType, ServiceCategoryId, Theme } from '../../types';
import { Icon } from '../Icon';
import { StorefrontCard } from './StorefrontCard';

function categoryFromType(type: ProviderType): ServiceCategoryId {
  return (Object.keys(CATEGORY_TO_PROVIDER_TYPE) as ServiceCategoryId[])
    .find(c => CATEGORY_TO_PROVIDER_TYPE[c] === type) ?? 'walk';
}

export function CategoryStorefrontSheet({ T, type, onClose, onPick }: {
  T: Theme;
  type: ProviderType;
  onClose: () => void;
  onPick: (p: Provider) => void;
}) {
  const { providers } = useApp();

  const cat = categoryFromType(type);
  const meta = SERVICE_TYPES.find(s => s.id === cat);
  const filtered = providers
    .filter(p => p.type === type || (p.categories && p.categories.includes(cat)))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const anim = useEnterAnim('right');
  return (
    <Animated.View style={[{ position: 'absolute', inset: 0, zIndex: 91, backgroundColor: T.bg }, anim.sheet]}>
      <View style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={onClose} style={{
          width: 38, height: 38, borderRadius: 19, backgroundColor: T.surface,
          borderWidth: 1, borderColor: T.hairline,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="x" size={16} color={T.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: T.inkMuted, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' }}>
            Pick a provider
          </Text>
          <Text style={{ fontSize: 17, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>
            {meta?.label || type} · {filtered.length} nearby
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 6, paddingBottom: 40, gap: 12 }}>
        {filtered.length === 0 ? (
          <View style={{
            padding: 28, borderRadius: 18, backgroundColor: T.surface,
            borderWidth: 1, borderColor: T.hairline, alignItems: 'center', gap: 10,
            marginTop: 40,
          }}>
            <Icon name={meta?.icon || 'search'} size={28} color={T.inkMuted} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>
              No providers in this category nearby.
            </Text>
            <Text style={{ fontSize: 13, color: T.inkMuted, textAlign: 'center', lineHeight: 18 }}>
              Check back soon — new providers join regularly.
            </Text>
          </View>
        ) : filtered.map(p => (
          <StorefrontCard key={p.id} p={p} T={T} onPress={() => onPick(p)} />
        ))}
      </ScrollView>
    </Animated.View>
  );
}
