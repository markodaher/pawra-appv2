import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { FONT } from '../../constants/theme';
import { useApp } from '../../lib/AppContext';
import type { Provider, ServiceCategoryId, Theme } from '../../types';
import { Icon } from '../Icon';
import { ProviderRow } from './ProviderRow';

const FILTERS: { id: 'all' | ServiceCategoryId; label: string }[] = [
  { id: 'all',     label: 'All' },
  { id: 'walk',    label: 'Walking' },
  { id: 'groom',   label: 'Grooming' },
  { id: 'vet',     label: 'Vet' },
  { id: 'board',   label: 'Boarding' },
  { id: 'taxi',    label: 'Pet Taxi' },
  { id: 'funeral', label: 'Funeral' },
];

export function OwnerBrowse({ T, onProvider, onBack }: {
  T: Theme; onProvider: (p: Provider) => void; onBack: () => void;
}) {
  const { providers } = useApp();
  const [filter, setFilter] = useState<'all' | ServiceCategoryId>('all');
  const [q, setQ] = useState('');
  // Match against the shop's full categories array, not just its primary type —
  // a shop that lists grooming as a secondary category should still appear under
  // the Grooming filter.
  const byFilter = filter === 'all'
    ? providers
    : providers.filter(p => (p.categories || []).includes(filter));
  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? byFilter.filter(p =>
        (p.name + ' ' + p.area + ' ' + p.type + ' ' + p.tags.join(' ')).toLowerCase().includes(needle))
    : byFilter;
  const sorted = [...filtered].sort((a, b) => a.distanceKm - b.distanceKm);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={onBack} style={{
          width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface,
          borderWidth: 1, borderColor: T.hairline,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="chevron-left" size={20} color={T.ink} />
        </Pressable>
        <Text style={{ fontSize: 28, fontWeight: '700', color: T.ink, letterSpacing: -0.6, flex: 1 }}>Nearby</Text>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14,
          height: 50, borderRadius: 16, backgroundColor: T.surface,
          borderWidth: 1, borderColor: T.hairline,
        }}>
          <Icon name="search" size={18} color={T.inkMuted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search shops, areas, services…"
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 14, gap: 8 }}>
        {FILTERS.map(f => {
          const active = filter === f.id;
          return (
            <Pressable key={f.id} onPress={() => setFilter(f.id)} style={{
              height: 34, paddingHorizontal: 14, borderRadius: 17,
              backgroundColor: active ? T.brand : T.surface,
              borderWidth: 1, borderColor: active ? T.brand : T.hairline,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ color: active ? '#fff' : T.ink, fontWeight: '600', fontSize: 13 }}>{f.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingVertical: 8 }}>
        <Text style={{ fontSize: 12, color: T.inkMuted, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' }}>
          {sorted.length} {sorted.length === 1 ? 'result' : 'results'} · sorted by distance
        </Text>
      </View>

      {sorted.length === 0 ? (
        <View style={{
          marginHorizontal: 20, padding: 28, borderRadius: 18,
          backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
          alignItems: 'center', gap: 10,
        }}>
          <Icon name="search" size={28} color={T.inkMuted} />
          <Text style={{ fontSize: 15, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>No providers yet</Text>
          <Text style={{ fontSize: 13, color: T.inkMuted, textAlign: 'center', lineHeight: 18 }}>
            When providers join Pawra in your area, they'll show up here.
          </Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          {sorted.map(p => <ProviderRow key={p.id} p={p} T={T} onPress={() => onProvider(p)} />)}
        </View>
      )}
    </ScrollView>
  );
}
