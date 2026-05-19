import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../../lib/AppContext';
import { bookingCategoryLabel } from '../../lib/bookingLabels';
import type { Booking, Order, Theme } from '../../types';
import { Icon } from '../Icon';
import { Avatar, Pill } from '../primitives';
import { DeclineReasonSheet } from './DeclineReasonSheet';
import { InteractiveStatusTimeline } from './InteractiveStatusTimeline';

const ORDER_STEPS = [
  { id: 'placed',    label: 'Placed' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'shipped',   label: 'Shipped' },
  { id: 'completed', label: 'Completed' },
];

const ORDER_NEXT_VERB: Record<string, string> = {
  confirmed: 'accept',
  shipped:   'ship',
  completed: 'complete',
};

function BlinkDot() {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.25, duration: 500, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1,    duration: 500, useNativeDriver: true }),
      ]),
    ).start();
  }, [anim]);
  return <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff', opacity: anim }} />;
}

function DataRow({ T, icon, label, v }: { T: Theme; icon: string; label: string; v: string }) {
  return (
    <View style={{
      paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10,
      backgroundColor: T.bg, borderWidth: 1, borderColor: T.hairline,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon name={icon} size={11} color={T.inkMuted} />
        <Text style={{ fontSize: 10.5, color: T.inkMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</Text>
      </View>
      <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '600', color: T.ink, marginTop: 3 }}>{v}</Text>
    </View>
  );
}

export function ProviderInbox({ T }: { T: Theme }) {
  const {
    providerIncoming, providerIncomingOrders,
    acceptBooking, rejectBooking, startBooking, completeBooking,
    acceptOrder, declineOrder, shipOrder, completeOrder,
    providerAlerting, feedbackEnabled, setFeedbackEnabled,
  } = useApp();
  const pendingBookingCount = providerIncoming.filter(b => b.status === 'pending').length;
  const placedOrderCount = providerIncomingOrders.filter(o => o.status === 'placed').length;
  const pendingCount = pendingBookingCount + placedOrderCount;

  // Merge bookings and orders into one feed sorted by createdAt desc so the
  // provider sees their inbox as a unified stream, just like the owner's
  // Activity tab merges its own bookings + orders.
  const feed: ({ kind: 'booking'; b: Booking } | { kind: 'order'; o: Order })[] = [
    ...providerIncoming.map(b => ({ kind: 'booking' as const, b })),
    ...providerIncomingOrders.map(o => ({ kind: 'order' as const, o })),
  ].sort((a, b) => {
    const at = a.kind === 'booking' ? a.b.createdAt : a.o.createdAt;
    const bt = b.kind === 'booking' ? b.b.createdAt : b.o.createdAt;
    return bt - at;
  });

  // Decline-reason sheet state — holds what we're about to decline
  // until the provider confirms with (or without) a reason.
  type DeclinePending =
    | { kind: 'booking'; id: string; label: string }
    | { kind: 'order';   id: string; label: string };
  const [declinePending, setDeclinePending] = useState<DeclinePending | null>(null);

  const advanceBooking = (id: string, next: 'confirmed' | 'in_progress' | 'completed') => {
    if (next === 'confirmed') acceptBooking(id);
    else if (next === 'in_progress') startBooking(id);
    else if (next === 'completed') completeBooking(id);
  };

  const advanceOrder = (id: string, next: string) => {
    if (next === 'confirmed') acceptOrder(id);
    else if (next === 'shipped') shipOrder(id);
    else if (next === 'completed') completeOrder(id);
  };

  return (
    <View style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <Text style={{ fontSize: 30, fontWeight: '700', color: T.ink, letterSpacing: -0.6 }}>Inbox</Text>
        <Text style={{ fontSize: 13, color: T.inkMuted, marginTop: 4 }}>
          {pendingCount === 0 ? 'No new requests' : `${pendingCount} new ${pendingCount === 1 ? 'request' : 'requests'}`}
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable
          onPress={() => setFeedbackEnabled(!feedbackEnabled)}
          hitSlop={6}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999,
            backgroundColor: feedbackEnabled ? T.brandSoft : T.surfaceAlt,
            borderWidth: 1, borderColor: feedbackEnabled ? T.brand : T.hairline,
          }}
        >
          <Icon name="speaker" size={13} color={feedbackEnabled ? T.brandInk : T.inkMuted} />
          <Text style={{
            color: feedbackEnabled ? T.brandInk : T.inkMuted,
            fontSize: 12, fontWeight: '600',
          }}>
            {feedbackEnabled ? 'Sound + haptics on' : 'Sound + haptics off'}
          </Text>
        </Pressable>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 6,
          paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999,
          backgroundColor: providerAlerting ? T.accentSoft : T.surfaceAlt,
          borderWidth: 1, borderColor: providerAlerting ? T.accent : T.hairline,
          opacity: feedbackEnabled ? 1 : 0.55,
        }}>
          <Icon name="vibrate" size={13} color={providerAlerting ? T.accent : T.inkSoft} />
          <Text style={{
            color: providerAlerting ? T.accent : T.inkSoft,
            fontSize: 12, fontWeight: '600',
          }}>
            {feedbackEnabled ? (providerAlerting ? 'Alerting…' : 'Idle') : 'Muted'}
          </Text>
        </View>
      </View>

      {feed.length === 0 ? (
        <View style={{
          marginTop: 24, marginHorizontal: 20, padding: 28, borderRadius: 18,
          backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
          alignItems: 'center', gap: 10,
        }}>
          <Icon name="inbox" size={28} color={T.inkMuted} />
          <Text style={{ fontSize: 15, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>Inbox is empty</Text>
          <Text style={{ fontSize: 13, color: T.inkMuted, textAlign: 'center', lineHeight: 18 }}>
            When owners book your services or buy from your shop, requests show up here.
          </Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 12 }}>
          {feed.map((entry, idx) => {
            // Order card — sits alongside booking cards with the same aesthetic.
            if (entry.kind === 'order') {
              const o = entry.o;
              const isNew = o.status === 'placed' && idx === 0;
              const items = o.items ?? [];
              const itemCount = items.reduce((s, x) => s + x.qty, 0) || o.itemCount;
              // Provider only sees the city — never the buyer's label, street,
              // floor, or notes. Keeps delivery info actionable without leaking
              // home-address details over what's effectively a public order list.
              const addrText = o.address?.area || '—';
              return (
                <View key={`o_${o.id}`} style={{
                  backgroundColor: isNew ? T.surface : T.bgRaised,
                  borderRadius: 22, padding: 16,
                  borderWidth: 1.5, borderColor: isNew ? T.brand : T.hairline,
                  shadowColor: isNew ? T.brand : 'transparent',
                  shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: isNew ? 4 : 0,
                }}>
                  {isNew ? (
                    <View style={{
                      position: 'absolute', top: 12, right: 12,
                      flexDirection: 'row', alignItems: 'center', gap: 5,
                      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
                      backgroundColor: T.brand,
                    }}>
                      <BlinkDot />
                      <Text style={{ fontSize: 10.5, color: '#fff', fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' }}>New</Text>
                    </View>
                  ) : null}

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Avatar name={o.ownerName || 'Buyer'} size={44} T={T} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: T.inkMuted }}>{o.ownerName || 'Buyer'} ordered</Text>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>
                        Shop order · {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </Text>
                    </View>
                  </View>

                  {/* Item breakdown — mirrors the bookings services breakdown. */}
                  {items.length > 0 ? (
                    <View style={{
                      marginTop: 12, padding: 12, borderRadius: 14,
                      backgroundColor: T.bg, borderWidth: 1, borderColor: T.hairline, gap: 8,
                    }}>
                      {items.map((it) => (
                        <View key={it.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13.5, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>{it.name}</Text>
                            <Text style={{ fontSize: 11.5, color: T.inkMuted, marginTop: 2 }}>
                              ${it.price.toFixed(2)} · × {it.qty}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 13.5, fontWeight: '700', color: T.ink }}>${it.lineTotal.toFixed(2)}</Text>
                        </View>
                      ))}
                      <View style={{
                        paddingTop: 8, borderTopWidth: 1, borderTopColor: T.hairline,
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
                      }}>
                        <Text style={{ fontSize: 12.5, fontWeight: '700', color: T.inkMuted, textTransform: 'uppercase', letterSpacing: 0.3 }}>Total</Text>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>${o.total.toFixed(2)}</Text>
                      </View>
                    </View>
                  ) : null}

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    <View style={{ flex: 1 }}>
                      <DataRow T={T} icon="clock" label="Placed" v={o.when} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <DataRow T={T} icon="pin" label="Deliver to" v={addrText} />
                    </View>
                  </View>

                  {/* Buyer's free-form note still shown — that's text the buyer
                      explicitly typed for the seller. Street/floor/exact label
                      stay private. */}
                  {o.paymentMethod ? (
                    <View style={{ marginTop: 10 }}>
                      <DataRow T={T} icon={o.paymentMethod.icon} label="Payment" v={o.paymentMethod.label} />
                    </View>
                  ) : null}

                  {o.note ? (
                    <View style={{ marginTop: 10, padding: 10, borderRadius: 12, backgroundColor: T.surfaceAlt }}>
                      <Text style={{ fontSize: 13, color: T.inkSoft, lineHeight: 18 }}>"{o.note}"</Text>
                    </View>
                  ) : null}

                  {o.status === 'declined' || o.status === 'cancelled' ? (
                    <View style={{
                      marginTop: 12, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12,
                      backgroundColor: T.surfaceAlt,
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                    }}>
                      <Icon name="x" size={14} color={T.inkMuted} />
                      <Text style={{ color: T.inkMuted, fontSize: 13, fontWeight: '600' }}>
                        {o.status === 'declined' ? 'Declined' : 'Cancelled'}
                      </Text>
                    </View>
                  ) : o.status === 'completed' ? (
                    <View style={{
                      marginTop: 12, alignSelf: 'flex-start',
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999,
                      backgroundColor: T.brandSoft,
                    }}>
                      <Icon name="check-circle" size={13} color={T.brand} />
                      <Text style={{ color: T.brandInk, fontSize: 12, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' }}>
                        Completed
                      </Text>
                    </View>
                  ) : (
                    <View style={{
                      marginTop: 14, paddingTop: 14,
                      borderTopWidth: 1, borderTopColor: T.hairline,
                    }}>
                      <InteractiveStatusTimeline
                        status={o.status}
                        onAdvance={(next) => advanceOrder(o.id, next)}
                        steps={ORDER_STEPS}
                        nextVerb={ORDER_NEXT_VERB}
                        T={T}
                      />
                      {o.status === 'placed' ? (
                        <Pressable
                          onPress={() => setDeclinePending({ kind: 'order', id: o.id, label: `${o.ownerName || 'Buyer'} · ${o.itemCount} ${o.itemCount === 1 ? 'item' : 'items'}` })}
                          hitSlop={10}
                          style={{ alignSelf: 'center', marginTop: 12, paddingVertical: 4, paddingHorizontal: 10 }}
                        >
                          <Text style={{ color: T.inkMuted, fontSize: 12.5, fontWeight: '600' }}>
                            Decline this order
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  )}
                </View>
              );
            }

            const b = entry.b;
            const isNew = b.status === 'pending' && idx === 0;
            return (
              <View key={`b_${b.id}`} style={{
                backgroundColor: isNew ? T.surface : T.bgRaised,
                borderRadius: 22, padding: 16,
                borderWidth: 1.5, borderColor: isNew ? T.brand : T.hairline,
                shadowColor: isNew ? T.brand : 'transparent',
                shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: isNew ? 4 : 0,
              }}>
                {isNew ? (
                  <View style={{
                    position: 'absolute', top: 12, right: 12,
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
                    backgroundColor: T.brand,
                  }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />
                    <Text style={{ fontSize: 10.5, color: '#fff', fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' }}>New</Text>
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Avatar name={b.ownerName} size={44} T={T} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: T.inkMuted }}>{b.ownerName} requested</Text>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>
                      {bookingCategoryLabel(b)} · {b.pet?.name || 'pet'}
                    </Text>
                  </View>
                </View>

                {/* Services breakdown — only for new multi-line bookings. */}
                {b.services && b.services.length > 0 ? (
                  <View style={{
                    marginTop: 12, padding: 12, borderRadius: 14,
                    backgroundColor: T.bg, borderWidth: 1, borderColor: T.hairline, gap: 8,
                  }}>
                    {b.services.map((s) => (
                      <View key={s.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13.5, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>{s.name}</Text>
                          <Text style={{ fontSize: 11.5, color: T.inkMuted, marginTop: 2 }}>
                            ${s.price}{s.unit}
                            {s.dogMult && b.petsList && b.petsList.length > 1 ? ` · × ${b.petsList.length} pets` : ''}
                            {s.qty > 1 ? ` · × ${s.qty}` : ''}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 13.5, fontWeight: '700', color: T.ink }}>${s.lineTotal.toFixed(2)}</Text>
                      </View>
                    ))}
                    <View style={{
                      paddingTop: 8, borderTopWidth: 1, borderTopColor: T.hairline,
                      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
                    }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: T.inkMuted, textTransform: 'uppercase', letterSpacing: 0.3 }}>Total</Text>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>${b.amount.toFixed(2)}</Text>
                    </View>
                  </View>
                ) : null}

                {/* Pets — multi-pet aware. Falls back to legacy single pet. */}
                {b.sharePassport ? (
                  <View style={{ gap: 8, marginTop: 12 }}>
                    {(b.petsList && b.petsList.length > 0 ? b.petsList : [b.pet]).map((pet, i) => (
                      <View key={pet.id || i} style={{
                        flexDirection: 'row', gap: 12, padding: 12, borderRadius: 14,
                        backgroundColor: T.bg, borderWidth: 1, borderColor: T.hairline,
                      }}>
                        <Avatar name={pet.name} size={40} type="pet" T={T} imageUrl={pet.imageUrl} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink }}>{pet.name}</Text>
                            <Pill T={T} color="brand" size="sm" icon="shield">Passport</Pill>
                          </View>
                          <Text style={{ fontSize: 11.5, color: T.inkMuted, marginTop: 2 }}>
                            {pet.breed} · {pet.age}y · {pet.weight}kg · {pet.sex}
                            {pet.species === 'dog' ? ` · ${pet.blood}` : ''}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <View style={{ flex: 1 }}>
                    <DataRow T={T} icon="clock" label="When" v={b.when} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <DataRow T={T} icon="pin" label="Where" v={b.address || `${b.distanceKm}km away`} />
                  </View>
                </View>

                {b.note ? (
                  <View style={{ marginTop: 10, padding: 10, borderRadius: 12, backgroundColor: T.surfaceAlt }}>
                    <Text style={{ fontSize: 13, color: T.inkSoft, lineHeight: 18 }}>"{b.note}"</Text>
                  </View>
                ) : null}

                {b.status === 'declined' || b.status === 'cancelled' ? (
                  <View style={{
                    marginTop: 12, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12,
                    backgroundColor: T.surfaceAlt,
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                  }}>
                    <Icon name="x" size={14} color={T.inkMuted} />
                    <Text style={{ color: T.inkMuted, fontSize: 13, fontWeight: '600' }}>
                      {b.status === 'declined' ? 'Declined' : 'Cancelled'}
                    </Text>
                  </View>
                ) : b.status === 'completed' ? (
                  // Done — no progress bar, just a single completed pill.
                  <View style={{
                    marginTop: 12, alignSelf: 'flex-start',
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999,
                    backgroundColor: T.brandSoft,
                  }}>
                    <Icon name="check-circle" size={13} color={T.brand} />
                    <Text style={{ color: T.brandInk, fontSize: 12, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' }}>
                      Completed
                    </Text>
                  </View>
                ) : (
                  <View style={{
                    marginTop: 14, paddingTop: 14,
                    borderTopWidth: 1, borderTopColor: T.hairline,
                  }}>
                    <InteractiveStatusTimeline
                      status={b.status}
                      onAdvance={(next) => advanceBooking(b.id, next as 'confirmed' | 'in_progress' | 'completed')}
                      T={T}
                    />
                    {b.status === 'pending' ? (
                      <Pressable
                        onPress={() => setDeclinePending({ kind: 'booking', id: b.id, label: `${bookingCategoryLabel(b)} · ${b.ownerName}` })}
                        hitSlop={10}
                        style={{ alignSelf: 'center', marginTop: 12, paddingVertical: 4, paddingHorizontal: 10 }}
                      >
                        <Text style={{ color: T.inkMuted, fontSize: 12.5, fontWeight: '600' }}>
                          Decline this request
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>

      {declinePending ? (
        <DeclineReasonSheet
          T={T}
          kind={declinePending.kind}
          targetName={declinePending.label}
          onConfirm={(reason) => {
            if (declinePending.kind === 'booking') {
              rejectBooking(declinePending.id, reason);
            } else {
              declineOrder(declinePending.id, reason);
            }
            setDeclinePending(null);
          }}
          onCancel={() => setDeclinePending(null)}
        />
      ) : null}
    </View>
  );
}
