import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../../lib/AppContext';
import type { Order, Theme } from '../../types';
import { Icon } from '../Icon';
import { Button, ProductImage, SectionHeader } from '../primitives';

function Stat({ T, label, v, delta }: { T: Theme; label: string; v: string; delta?: string }) {
  return (
    <View style={{
      flex: 1, padding: 14, borderRadius: 16, backgroundColor: T.bgRaised,
      borderWidth: 1, borderColor: T.hairline,
    }}>
      <Text style={{ fontSize: 11, color: T.inkMuted, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' }}>{label}</Text>
      <Text style={{ fontSize: 22, fontWeight: '700', color: T.ink, letterSpacing: -0.5, marginTop: 4 }}>{v}</Text>
      {delta ? <Text style={{ fontSize: 11, fontWeight: '600', color: T.success, marginTop: 2 }}>{delta}</Text> : null}
    </View>
  );
}

type ShopTab = 'listings' | 'current' | 'past';

export function ProviderShopManager({ T }: { T: Theme }) {
  const { products, orders, setAddProductOpen, setOrderDetailOpen, user } = useApp();
  const myProducts = products.filter(p => p.vendorId === user.id);
  const totalSales = myProducts.reduce((s, p) => s + p.sales, 0);
  const totalRevenue = myProducts.reduce((s, p) => s + p.sales * p.price, 0);

  const myOrders = useMemo(() => orders.filter(o => o.vendorId === user.id), [orders, user.id]);
  const currentOrders = useMemo(
    () => myOrders
      .filter(o => o.status === 'confirmed' || o.status === 'shipped')
      .sort((a, b) => b.createdAt - a.createdAt),
    [myOrders],
  );
  const pastOrders = useMemo(
    () => myOrders
      .filter(o => o.status === 'completed' || o.status === 'cancelled' || o.status === 'declined')
      .sort((a, b) => b.createdAt - a.createdAt),
    [myOrders],
  );

  const [tab, setTab] = useState<ShopTab>('listings');

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
      <View style={{
        paddingHorizontal: 20, paddingTop: 14,
        flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
      }}>
        <View>
          <Text style={{ fontSize: 30, fontWeight: '700', color: T.ink, letterSpacing: -0.6 }}>Shop</Text>
          <Text style={{ fontSize: 13, color: T.inkMuted, marginTop: 4 }}>
            {myProducts.length} {myProducts.length === 1 ? 'listing' : 'listings'}
            {totalSales > 0 ? ` · ${totalSales} sold` : ''}
          </Text>
        </View>
        <Button T={T} size="sm" onPress={() => setAddProductOpen('new')} icon="plus">Add</Button>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 16 }}>
        <Stat T={T} label="Revenue" v={`$${totalRevenue.toFixed(0)}`} />
        <Stat T={T} label="Items sold" v={String(totalSales)} />
      </View>

      {/* Sub-tabs: Listings / Current orders / Past orders. Same chip styling
          as the owner Activity filters so the aesthetic stays consistent. */}
      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingTop: 16 }}>
        {([
          { id: 'listings', label: 'Listings', count: myProducts.length },
          { id: 'current',  label: 'Current',  count: currentOrders.length },
          { id: 'past',     label: 'Past',     count: pastOrders.length },
        ] as { id: ShopTab; label: string; count: number }[]).map(t => {
          const sel = tab === t.id;
          return (
            <Pressable key={t.id} onPress={() => setTab(t.id)} style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              height: 32, paddingHorizontal: 14, borderRadius: 16,
              backgroundColor: sel ? T.ink : 'transparent',
            }}>
              <Text style={{ color: sel ? T.bg : T.inkSoft, fontWeight: '600', fontSize: 13 }}>{t.label}</Text>
              {t.count > 0 ? (
                <View style={{
                  minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9,
                  backgroundColor: sel ? T.bg : T.surfaceAlt,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: sel ? T.ink : T.inkSoft }}>
                    {t.count}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {tab === 'listings' ? (
        <>
          <SectionHeader title="Listings" T={T} />
          {myProducts.length === 0 ? (
            <View style={{
              marginHorizontal: 20, padding: 28, borderRadius: 18,
              backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
              alignItems: 'center', gap: 10,
            }}>
              <Icon name="bag" size={28} color={T.inkMuted} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>No listings yet</Text>
              <Text style={{ fontSize: 13, color: T.inkMuted, textAlign: 'center', lineHeight: 18 }}>
                Tap "Add" to publish your first product. It'll show up in the owner shop right away.
              </Text>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 20, gap: 8 }}>
              {myProducts.map(p => (
                <View key={p.id} style={{
                  flexDirection: 'row', gap: 12, padding: 12, borderRadius: 16,
                  backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
                  alignItems: 'center',
                }}>
                  <ProductImage p={p} T={T} radius={12} ratio={1} style={{ width: 56, height: 56 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>{p.name}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      <Text style={{ fontWeight: '700', color: T.ink, fontSize: 11.5 }}>${p.price.toFixed(2)}</Text>
                      <Text style={{ fontSize: 11.5, color: T.inkMuted }}>·</Text>
                      {p.stockCount === 0 ? (
                        <Text style={{ fontSize: 11.5, fontWeight: '600', color: T.danger }}>
                          Out of stock
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <Pressable
                    onPress={() => setAddProductOpen(p)}
                    hitSlop={6}
                    style={{
                      width: 32, height: 32, borderRadius: 16, backgroundColor: T.surfaceAlt,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                    <Icon name="edit" size={14} color={T.ink} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </>
      ) : tab === 'current' ? (
        <>
          <SectionHeader title="Current orders" T={T} />
          {currentOrders.length === 0 ? (
            <EmptyOrders
              T={T}
              icon="package"
              title="No orders in progress"
              body="Orders you accept from the inbox will move here until they're delivered."
            />
          ) : (
            <View style={{ paddingHorizontal: 20, gap: 10 }}>
              {currentOrders.map(o => (
                <OrderRow key={o.id} order={o} T={T} onPress={() => setOrderDetailOpen(o)} />
              ))}
            </View>
          )}
        </>
      ) : (
        <>
          <SectionHeader title="Past orders" T={T} />
          {pastOrders.length === 0 ? (
            <EmptyOrders
              T={T}
              icon="check-circle"
              title="No past orders yet"
              body="Once an order is completed, it shows up here for your records."
            />
          ) : (
            <View style={{ paddingHorizontal: 20, gap: 10 }}>
              {pastOrders.map(o => (
                <OrderRow key={o.id} order={o} T={T} onPress={() => setOrderDetailOpen(o)} />
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function EmptyOrders({ T, icon, title, body }: { T: Theme; icon: string; title: string; body: string }) {
  return (
    <View style={{
      marginHorizontal: 20, padding: 28, borderRadius: 18,
      backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
      alignItems: 'center', gap: 10,
    }}>
      <Icon name={icon} size={28} color={T.inkMuted} />
      <Text style={{ fontSize: 15, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>{title}</Text>
      <Text style={{ fontSize: 13, color: T.inkMuted, textAlign: 'center', lineHeight: 18 }}>{body}</Text>
    </View>
  );
}

function statusMeta(status: Order['status'], T: Theme) {
  switch (status) {
    case 'confirmed': return { label: 'Confirmed', icon: 'check', bg: T.brandSoft, fg: T.brandInk };
    case 'shipped':   return { label: 'Shipped',   icon: 'truck', bg: T.accentSoft, fg: T.accent };
    case 'completed': return { label: 'Delivered', icon: 'check-circle', bg: T.brandSoft, fg: T.brandInk };
    case 'declined':  return { label: 'Declined',  icon: 'x', bg: T.surfaceAlt, fg: T.inkMuted };
    case 'cancelled': return { label: 'Cancelled', icon: 'x', bg: T.surfaceAlt, fg: T.inkMuted };
    default:          return { label: 'Placed',    icon: 'clock', bg: T.surfaceAlt, fg: T.inkSoft };
  }
}

function OrderRow({ order, T, onPress }: { order: Order; T: Theme; onPress: () => void }) {
  const meta = statusMeta(order.status, T);
  const itemCount = order.items?.reduce((s, i) => s + i.qty, 0) ?? order.itemCount;
  const accent =
    order.status === 'shipped' ? T.accent :
    order.status === 'completed' ? T.success :
    order.status === 'declined' || order.status === 'cancelled' ? T.inkMuted :
    T.brand;
  return (
    <Pressable onPress={onPress} style={{
      padding: 14, borderRadius: 16,
      backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
    }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ width: 4, borderRadius: 2, backgroundColor: accent }} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
              backgroundColor: meta.bg,
            }}>
              <Icon name={meta.icon} size={11} color={meta.fg} />
              <Text style={{
                color: meta.fg, fontSize: 10, fontWeight: '700',
                letterSpacing: 0.3, textTransform: 'uppercase',
              }}>
                {meta.label}
              </Text>
            </View>
            <Text style={{ fontSize: 11.5, color: T.inkMuted, fontWeight: '600' }}>
              {order.orderNumber ? `#${order.orderNumber}` : ''}
            </Text>
          </View>
          <Text style={{ fontSize: 14.5, fontWeight: '700', color: T.ink, marginTop: 4, letterSpacing: -0.2 }}>
            {order.ownerName || 'Buyer'} · {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </Text>
          {order.address?.area ? (
            <Text numberOfLines={1} style={{ fontSize: 12, color: T.inkSoft, marginTop: 2 }}>
              {order.address.area}
            </Text>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink }}>${order.total.toFixed(2)}</Text>
          <Icon name="chevron-right" size={14} color={T.inkMuted} />
        </View>
      </View>
    </Pressable>
  );
}
