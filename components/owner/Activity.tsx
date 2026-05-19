import { Fragment, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../../lib/AppContext';
import type { Theme } from '../../types';
import { Icon } from '../Icon';
import { StatusDot } from '../primitives';

const STEPS: { id: string; label: string }[] = [
  { id: 'pending',     label: 'Pending' },
  { id: 'confirmed',   label: 'Confirmed' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'completed',   label: 'Completed' },
];

function prettyStatus(s: string): string {
  const t = s.replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function StatusTimeline({ current, T }: { current: string; T: Theme }) {
  const idx = STEPS.findIndex(s => s.id === current);
  return (
    <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: T.hairline, flexDirection: 'row', alignItems: 'center' }}>
      {STEPS.map((s, i) => (
        <Fragment key={s.id} >
          <View style={{ alignItems: 'center', gap: 4 }}>
            <View style={{
              width: 14, height: 14, borderRadius: 7,
              backgroundColor: i <= idx ? T.brand : T.surfaceAlt,
              borderWidth: i === idx ? 3 : 0, borderColor: T.brandSoft,
            }} />
            <Text style={{ fontSize: 9.5, fontWeight: '600', color: i <= idx ? T.ink : T.inkMuted, textTransform: 'uppercase', letterSpacing: 0.3 }}>{s.label}</Text>
          </View>
          {i < STEPS.length - 1 ? <View style={{ flex: 1, height: 2, backgroundColor: i < idx ? T.brand : T.surfaceAlt, marginTop: -14 }} /> : null}
        </Fragment>
      ))}
    </View>
  );
}

export function OwnerActivity({ T }: { T: Theme }) {
  const { ownerActivity, bookings, orders, providers, setActivityDetailOpen, setOrderDetailOpen } = useApp();
  const [tab, setTab] = useState<'all' | 'bookings' | 'orders'>('all');
  const items = ownerActivity.filter(a =>
    tab === 'all' || (tab === 'bookings' && a.kind === 'booking') || (tab === 'orders' && a.kind === 'order')
  );

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <Text style={{ fontSize: 32, fontWeight: '700', color: T.ink, letterSpacing: -0.6 }}>Activity</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 }}>
        {(['all', 'bookings', 'orders'] as const).map(t => (
          <Pressable key={t} onPress={() => setTab(t)} style={{
            height: 32, paddingHorizontal: 14, borderRadius: 16,
            backgroundColor: tab === t ? T.ink : 'transparent',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ color: tab === t ? T.bg : T.inkSoft, fontWeight: '600', fontSize: 13, textTransform: 'capitalize' }}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {items.length === 0 ? (
        <View style={{
          marginTop: 24, marginHorizontal: 20, padding: 28, borderRadius: 18,
          backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
          alignItems: 'center', gap: 10,
        }}>
          <Icon name="list" size={28} color={T.inkMuted} />
          <Text style={{ fontSize: 15, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>Nothing here yet</Text>
          <Text style={{ fontSize: 13, color: T.inkMuted, textAlign: 'center', lineHeight: 18 }}>
            Bookings and orders you make will show up here.
          </Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 10 }}>
          {items.map(a => {
            // Look up the shop/provider so we can use their displayPic as the
            // activity icon — same as the bigger detail sheets do.
            const shop = a.providerId ? providers.find(p => p.id === a.providerId) : null;
            const onPressItem = () => {
              if (a.kind === 'booking') {
                const b = bookings.find(x => x.id === a.id);
                if (b) setActivityDetailOpen(b);
              } else {
                const o = orders.find(x => x.id === a.id);
                if (o) setOrderDetailOpen(o);
              }
            };
            return (
            <Pressable
              key={a.id}
              onPress={onPressItem}
              style={{
                padding: 14, borderRadius: 18, backgroundColor: T.surface,
                borderWidth: 1, borderColor: T.hairline,
              }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <View style={{ flexDirection: 'row', gap: 12, flex: 1 }}>
                  {shop?.displayPic ? (
                    <Image
                      source={{ uri: shop.displayPic }}
                      style={{
                        width: 40, height: 40, borderRadius: 12,
                        borderWidth: 1, borderColor: T.hairline,
                      }}
                    />
                  ) : (
                    <View style={{
                      width: 40, height: 40, borderRadius: 12,
                      backgroundColor: a.kind === 'booking' ? T.brandSoft : T.accentSoft,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon
                        name={a.kind === 'booking' ? 'calendar' : 'package'}
                        size={18}
                        color={a.kind === 'booking' ? T.brandInk : T.accent}
                      />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>{a.title}</Text>
                    <Text style={{ fontSize: 12.5, color: T.inkMuted, marginTop: 2 }}>{a.sub}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                      <Icon name="clock" size={12} color={T.inkMuted} />
                      <Text style={{ fontSize: 12, color: T.inkSoft }}>{a.when}</Text>
                    </View>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink }}>${a.amount.toFixed(2)}</Text>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6,
                    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: T.surfaceAlt,
                  }}>
                    <StatusDot status={a.status} T={T} />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: T.inkSoft }}>{prettyStatus(a.status)}</Text>
                  </View>
                </View>
              </View>
              {a.kind === 'booking' && (a.status === 'confirmed' || a.status === 'in_progress') ? (
                <StatusTimeline current={a.status} T={T} />
              ) : null}
            </Pressable>
          );
          })}
        </View>
      )}
    </ScrollView>
  );
}
