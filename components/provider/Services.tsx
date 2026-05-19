import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SERVICE_TYPES } from '../../constants/data';
import { useApp } from '../../lib/AppContext';
import type { ServiceCategoryId, Theme } from '../../types';
import { Icon } from '../Icon';
import { Button } from '../primitives';
import { AddOfferingSheet } from './AddOfferingSheet';

export function ProviderServicesScreen({ T }: { T: Theme }) {
  const { providerCategories, providerServices, toggleServiceActive } = useApp();
  const [adding, setAdding] = useState<ServiceCategoryId | null>(null);

  const cats: ServiceCategoryId[] = providerCategories.length
    ? providerCategories
    : (Object.keys(providerServices) as ServiceCategoryId[]);

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 130 }}>
      <View>
        <Text style={{ fontSize: 30, fontWeight: '700', color: T.ink, letterSpacing: -0.6 }}>Services</Text>
        <Text style={{ fontSize: 13.5, color: T.inkSoft, marginTop: 4 }}>
          What you offer, organized by category. Toggle to pause a listing.
        </Text>
      </View>

      {providerCategories.length === 0 ? (
        <View style={{
          marginTop: 24, padding: 28, borderRadius: 18,
          backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
          alignItems: 'center', gap: 10,
        }}>
          <Icon name="tag" size={28} color={T.inkMuted} />
          <Text style={{ fontSize: 15, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>No categories selected</Text>
          <Text style={{ fontSize: 13, color: T.inkMuted, textAlign: 'center', lineHeight: 18 }}>
            Pick the services you offer in your business setup, then add specific offerings here.
          </Text>
        </View>
      ) : null}

      {cats.map(cat => {
        const meta = SERVICE_TYPES.find(s => s.id === cat);
        const list = providerServices[cat] || [];
        return (
          <View key={cat} style={{ marginTop: 22 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <View style={{
                width: 32, height: 32, borderRadius: 10, backgroundColor: T.brandSoft,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={meta?.icon || 'tag'} size={16} color={T.brand} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>{meta?.label || cat}</Text>
              <View style={{ flex: 1 }} />
              <Text style={{ fontSize: 12, color: T.inkMuted, fontWeight: '600' }}>
                {list.length} {list.length === 1 ? 'offering' : 'offerings'}
              </Text>
            </View>
            {list.length === 0 ? (
              <View style={{
                padding: 16, borderRadius: 14, backgroundColor: T.surface,
                borderWidth: 1, borderColor: T.hairline, borderStyle: 'dashed',
                alignItems: 'center',
              }}>
                <Text style={{ fontSize: 13.5, color: T.inkSoft, marginBottom: 10 }}>No offerings yet for {meta?.label || cat}.</Text>
                <Button T={T} variant="ghost" icon="plus" onPress={() => setAdding(cat)}>Add offering</Button>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {list.map(svc => (
                  <View key={svc.id} style={{
                    padding: 14, borderRadius: 16, backgroundColor: T.surface,
                    borderWidth: 1, borderColor: T.hairline,
                    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
                    opacity: svc.active ? 1 : 0.55,
                  }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>{svc.name}</Text>
                        {!svc.active ? (
                          <View style={{ paddingVertical: 2, paddingHorizontal: 7, borderRadius: 8, backgroundColor: T.surfaceAlt }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: T.inkMuted, letterSpacing: 0.3, textTransform: 'uppercase' }}>Paused</Text>
                          </View>
                        ) : null}
                      </View>
                      {svc.desc ? <Text style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 4, lineHeight: 18 }}>{svc.desc}</Text> : null}
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 8 }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: T.ink, letterSpacing: -0.4 }}>${svc.price}</Text>
                        <Text style={{ fontSize: 12, color: T.inkMuted, fontWeight: '600' }}>{svc.unit}</Text>
                      </View>
                    </View>
                    <Pressable onPress={() => toggleServiceActive(cat, svc.id)} style={{
                      width: 44, height: 26, borderRadius: 13, padding: 2,
                      backgroundColor: svc.active ? T.brand : T.surfaceAlt,
                      borderWidth: 1, borderColor: svc.active ? T.brand : T.hairline,
                      justifyContent: 'center',
                    }}>
                      <View style={{
                        width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff',
                        marginLeft: svc.active ? 18 : 0,
                        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 1,
                      }} />
                    </Pressable>
                  </View>
                ))}
                <Pressable onPress={() => setAdding(cat)} style={{
                  padding: 12, paddingHorizontal: 14, borderRadius: 14,
                  borderWidth: 1.5, borderColor: T.hairline, borderStyle: 'dashed',
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <Icon name="plus" size={14} color={T.inkSoft} />
                  <Text style={{ color: T.inkSoft, fontWeight: '600', fontSize: 13.5 }}>Add another offering</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}

      {adding ? (
        <AddOfferingSheet T={T} cat={adding} onClose={() => setAdding(null)} />
      ) : null}
    </ScrollView>
  );
}
