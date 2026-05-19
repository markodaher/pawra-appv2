import { Fragment, useState } from 'react';
import { Animated, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../../lib/AppContext';
import { ChatSheet } from '../ChatSheet';
import { useEnterAnim } from '../../lib/transitions';
import type { Order, Theme } from '../../types';
import { Icon } from '../Icon';
import { Avatar, Button } from '../primitives';

const STATUS_LABEL: Record<string, string> = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  completed: 'Delivered',
  cancelled: 'Cancelled',
  declined: 'Declined',
};

const STATUS_STEPS = ['placed', 'confirmed', 'shipped', 'completed'] as const;

function StatusTimeline({ current, T }: { current: string; T: Theme }) {
  const idx = STATUS_STEPS.indexOf(current as typeof STATUS_STEPS[number]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 4 }}>
      {STATUS_STEPS.map((s, i) => (
        <Fragment key={s}>
          <View style={{ alignItems: 'center', gap: 6, width: 70 }}>
            <View style={{
              width: 14, height: 14, borderRadius: 7,
              backgroundColor: i <= idx ? T.brand : T.surfaceAlt,
              borderWidth: i === idx ? 3 : 0, borderColor: T.brandSoft,
            }} />
            <Text style={{
              fontSize: 9.5, fontWeight: '600',
              color: i <= idx ? T.ink : T.inkMuted,
              textTransform: 'uppercase', letterSpacing: 0.3,
              textAlign: 'center',
            }}>{STATUS_LABEL[s]}</Text>
          </View>
          {i < STATUS_STEPS.length - 1 ? (
            <View style={{
              flex: 1, height: 2, marginTop: 6,
              backgroundColor: i < idx ? T.brand : T.surfaceAlt,
            }} />
          ) : null}
        </Fragment>
      ))}
    </View>
  );
}

export function OrderDetailSheet({ T, order, onClose, viewer = 'owner' }: {
  T: Theme;
  order: Order;
  onClose: () => void;
  /**
   * 'owner' = the buyer is viewing their order (Activity tab).
   * 'provider' = the seller is viewing it (Schedule tab).
   * Same layout either way — only labels and CTAs differ.
   */
  viewer?: 'owner' | 'provider';
}) {
  const { providers, setProviderShopOpen } = useApp();

  const provider = providers.find(p => p.id === order.vendorId);
  const isCompleted = order.status === 'completed';
  const items = order.items ?? [];
  const subtotal = items.length > 0
    ? items.reduce((s, i) => s + i.lineTotal, 0)
    : order.total;
  // Legacy orders saved with the old $2.50 delivery fee will still surface it
  // here as a non-zero residual. New orders are fee-less so this stays 0 and
  // the row hides itself.
  const fee = Math.max(0, order.total - subtotal);

  const completedTimestamp = isCompleted && order.respondedAt
    ? new Date(order.respondedAt).toLocaleString(undefined, {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: 'numeric', minute: '2-digit',
      })
    : null;

  const [chatOpen, setChatOpen] = useState(false);
  // Chat is only open while the order is active. Once completed/cancelled/declined,
  // the conversation locks — prevents off-platform poaching after delivery.
  const canChat = order.status === 'confirmed' || order.status === 'shipped';
  const chatOtherName = viewer === 'owner' ? (order.vendorName || 'Shop') : (order.ownerName || 'Buyer');
  const chatRecipientId = viewer === 'owner' ? (order.vendorId ?? undefined) : (order.ownerId ?? undefined);

  const onReorder = () => {
    onClose();
    if (provider) setProviderShopOpen(provider);
  };

  const headline = viewer === 'provider'
    ? `${order.ownerName || 'Buyer'} ordered`
    : (order.vendorName || 'Storefront');

  const headlineSub = viewer === 'provider'
    ? `${order.itemCount} ${order.itemCount === 1 ? 'item' : 'items'}`
    : `${order.itemCount} ${order.itemCount === 1 ? 'item' : 'items'}`;

  const anim = useEnterAnim('right');
  return (
    <>
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
          <Text style={{ fontSize: 18, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>
            Order details
          </Text>
          {order.orderNumber ? (
            <Text style={{ fontSize: 12, color: T.inkMuted, fontWeight: '600', marginTop: 1 }}>
              #{order.orderNumber}
            </Text>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 130 }}>
        {/* Vendor / buyer header — mirrors ActivityDetailSheet. */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 14,
          padding: 14, borderRadius: 18,
          backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
        }}>
          {viewer === 'owner' && provider?.displayPic ? (
            <Image source={{ uri: provider.displayPic }} style={{
              width: 52, height: 52, borderRadius: 26,
              borderWidth: 1, borderColor: T.hairline,
            }} />
          ) : (
            <Avatar name={headline} size={52} T={T} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>
              {headline}
            </Text>
            <Text style={{ fontSize: 12.5, color: T.inkMuted, marginTop: 2 }}>
              {headlineSub}{order.orderNumber ? ` · #${order.orderNumber}` : ''}
            </Text>
            {viewer === 'owner' && provider && provider.reviews > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Icon name="star" size={11} color={T.warn} />
                <Text style={{ fontSize: 11.5, color: T.inkSoft, fontWeight: '600' }}>
                  {provider.rating.toFixed(1)} · {provider.reviews} reviews
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Status */}
        <Text style={SECT(T)}>Status</Text>
        <View style={{
          padding: 14, borderRadius: 18,
          backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
        }}>
          {order.status === 'declined' || order.status === 'cancelled' ? (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="x" size={16} color={T.danger} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink }}>
                  {STATUS_LABEL[order.status]}
                </Text>
                {order.respondedAt ? (
                  <Text style={{ fontSize: 12, color: T.inkMuted }}>
                    · {new Date(order.respondedAt).toLocaleString(undefined, {
                        day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
                      })}
                  </Text>
                ) : null}
              </View>
              {order.declineReason ? (
                <View style={{
                  padding: 12, borderRadius: 12,
                  backgroundColor: T.surfaceAlt, borderLeftWidth: 3, borderLeftColor: T.danger,
                }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: T.inkMuted, letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 4 }}>
                    Reason
                  </Text>
                  <Text style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 19 }}>
                    {order.declineReason}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : isCompleted ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999,
                backgroundColor: T.brandSoft,
              }}>
                <Icon name="check-circle" size={14} color={T.brand} />
                <Text style={{ color: T.brandInk, fontSize: 12.5, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' }}>
                  Delivered
                </Text>
              </View>
              {completedTimestamp ? (
                <Text style={{ fontSize: 12.5, color: T.inkMuted }}>{completedTimestamp}</Text>
              ) : null}
            </View>
          ) : (
            <StatusTimeline current={order.status} T={T} />
          )}
        </View>

        {/* Items */}
        {items.length > 0 ? (
          <>
            <Text style={SECT(T)}>Items</Text>
            <View style={{
              padding: 14, borderRadius: 18,
              backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, gap: 10,
            }}>
              {items.map((it, i) => (
                <View key={it.id} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  paddingTop: i > 0 ? 10 : 0,
                  borderTopWidth: i > 0 ? 1 : 0, borderTopColor: T.hairline,
                }}>
                  {it.imageUrl ? (
                    <Image source={{ uri: it.imageUrl }} style={{
                      width: 48, height: 48, borderRadius: 10,
                      borderWidth: 1, borderColor: T.hairline,
                    }} />
                  ) : (
                    <View style={{
                      width: 48, height: 48, borderRadius: 10,
                      backgroundColor: T.surfaceAlt,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name="bag" size={18} color={T.inkMuted} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>{it.name}</Text>
                    <Text style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>
                      ${it.price.toFixed(2)} · × {it.qty}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink }}>${it.lineTotal.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* Delivery — provider only sees the city. Owner sees the full pin
            (label, street, floor, notes) since it's their own data. */}
        <Text style={SECT(T)}>Delivery</Text>
        <View style={{
          padding: 14, borderRadius: 18,
          backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, gap: 10,
        }}>
          {viewer === 'provider' ? (
            <Row T={T} k="Deliver to" v={order.address?.area || '—'} />
          ) : order.address ? (
            <>
              <Row T={T} k="To" v={order.address.label || order.address.line1 || '—'} />
              {order.address.line1 ? <Row T={T} k="Address" v={order.address.line1} /> : null}
              {order.address.area ? <Row T={T} k="Area"    v={order.address.area} /> : null}
              {order.address.floor ? <Row T={T} k="Floor"  v={order.address.floor} /> : null}
              {order.address.notes ? (
                <View style={{ paddingTop: 6, borderTopWidth: 1, borderTopColor: T.hairline }}>
                  <Text style={{ fontSize: 12, color: T.inkMuted, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' }}>Notes</Text>
                  <Text style={{ marginTop: 4, fontSize: 13.5, color: T.inkSoft, lineHeight: 18, fontStyle: 'italic' }}>"{order.address.notes}"</Text>
                </View>
              ) : null}
            </>
          ) : (
            <Row T={T} k="To" v="—" />
          )}
          <Row T={T} k="Placed" v={order.when} />
        </View>

        {/* Payment */}
        <Text style={SECT(T)}>Payment</Text>
        <View style={{
          padding: 14, borderRadius: 18,
          backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, gap: 8,
        }}>
          <Row T={T} k="Subtotal" v={`$${subtotal.toFixed(2)}`} />
          {fee > 0 ? <Row T={T} k="Delivery" v={`$${fee.toFixed(2)}`} /> : null}
          <View style={{
            paddingTop: 8, borderTopWidth: 1, borderTopColor: T.hairline,
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
          }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink }}>Total</Text>
            <Text style={{ fontSize: 22, fontWeight: '700', color: T.ink, letterSpacing: -0.5 }}>
              ${order.total.toFixed(2)}
            </Text>
          </View>
          <Row T={T} k="Method" v={order.paymentMethod?.label || 'Cash on delivery'} />
        </View>

        {/* Chat button — both sides */}
        {canChat ? (
          <View style={{ marginTop: 4 }}>
            <Pressable
              onPress={() => setChatOpen(true)}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: 14, borderRadius: 16,
                backgroundColor: pressed ? T.brandSoft : T.surface,
                borderWidth: 1.5, borderColor: T.brand,
              })}
            >
              <Icon name="send" size={18} color={T.brand} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: T.brand }}>
                {viewer === 'owner'
                  ? `Chat with ${(order.vendorName || 'Shop').split(' ')[0]}`
                  : `Chat with ${(order.ownerName || 'Buyer').split(' ')[0]}`}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Actions — owner can re-order from the same shop. */}
        {viewer === 'owner' && provider ? (
          <>
            <Text style={SECT(T)}>Actions</Text>
            <View style={{ gap: 8 }}>
              <Button T={T} variant="ghost" full icon="bag" onPress={onReorder}>Order again</Button>
            </View>
          </>
        ) : null}
      </ScrollView>
    </Animated.View>
    {chatOpen && canChat ? (
      <ChatSheet
        target={{ orderId: order.id, otherName: chatOtherName, recipientId: chatRecipientId }}
        T={T}
        onClose={() => setChatOpen(false)}
      />
    ) : null}
    </>
  );
}

function Row({ k, v, T }: { k: string; v: string; T: Theme }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ color: T.inkMuted, fontSize: 13.5 }}>{k}</Text>
      <Text style={{ color: T.ink, fontWeight: '600', fontSize: 13.5, textAlign: 'right', flexShrink: 1 }}>{v}</Text>
    </View>
  );
}

const SECT = (T: Theme) => ({
  fontSize: 13, fontWeight: '700' as const, color: T.inkMuted,
  letterSpacing: 0.3, textTransform: 'uppercase' as const,
  marginTop: 24, marginBottom: 10,
});
