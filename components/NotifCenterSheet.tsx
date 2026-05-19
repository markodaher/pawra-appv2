import { useEffect } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../lib/AppContext';
import type { LoggedNotif } from '../lib/AppContext';
import { useEnterAnim } from '../lib/transitions';
import type { Theme } from '../types';
import { Icon } from './Icon';

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function NotifCenterSheet({ T, onClose }: { T: Theme; onClose: () => void }) {
  const {
    notifLog, markNotifRead, markAllNotifsRead, clearNotifs, unreadNotifCount,
    bookings, orders, setActivityDetailOpen, setOrderDetailOpen, setNotifCenterOpen,
    setChatTarget,
  } = useApp();

  // Opening the center counts as "seen" — clear the badge immediately.
  useEffect(() => {
    if (unreadNotifCount > 0) markAllNotifsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTap = (n: LoggedNotif) => {
    markNotifRead(n.id);
    if (!n.targetKind) return;
    // Close sheet first so the detail screen slides in cleanly.
    setNotifCenterOpen(false);
    if (n.targetKind === 'booking' && n.targetId) {
      const b = bookings.find(x => x.id === n.targetId);
      if (b) setActivityDetailOpen(b);
    } else if (n.targetKind === 'order' && n.targetId) {
      const o = orders.find(x => x.id === n.targetId);
      if (o) setOrderDetailOpen(o);
    } else if (n.targetKind === 'chat') {
      setChatTarget({
        bookingId:   n.chatBookingId,
        orderId:     n.chatOrderId,
        otherName:   n.chatOtherName || 'Chat',
        recipientId: n.chatRecipientId,
      });
    }
  };

  const anim = useEnterAnim('bottom');
  return (
    <Animated.View style={[{ position: 'absolute', inset: 0, zIndex: 70 }, anim.backdrop]}>
      <Pressable onPress={onClose} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)' }} />
      <Animated.View style={[{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        backgroundColor: T.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        maxHeight: '85%',
        // flex layout so the ScrollView gets a bounded height and can actually scroll.
        // Without this, maxHeight alone doesn't give the ScrollView a defined parent size.
        display: 'flex', flexDirection: 'column',
      }, anim.sheet]}>
        {/* Grabber */}
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: T.hairline }} />
        </View>

        {/* Header row — fixed, never scrolls */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12,
        }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: T.ink, letterSpacing: -0.4 }}>
            Notifications
            {unreadNotifCount > 0 ? (
              <Text style={{ color: T.inkMuted, fontWeight: '500' }}> · {unreadNotifCount} new</Text>
            ) : null}
          </Text>
          <Pressable onPress={onClose} style={{
            width: 36, height: 36, borderRadius: 18, backgroundColor: T.surfaceAlt,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="x" size={16} color={T.ink} />
          </Pressable>
        </View>

        {/* Action bar — fixed */}
        {notifLog.length > 0 ? (
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 12 }}>
            {unreadNotifCount > 0 ? (
              <Pressable onPress={markAllNotifsRead} style={{
                paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999,
                backgroundColor: T.brandSoft,
              }}>
                <Text style={{ color: T.brandInk, fontSize: 12, fontWeight: '600' }}>Mark all read</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={clearNotifs} style={{
              paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999,
              backgroundColor: T.surfaceAlt,
            }}>
              <Text style={{ color: T.inkSoft, fontSize: 12, fontWeight: '600' }}>Clear</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Scrollable list — flex: 1 fills whatever height remains in the capped sheet */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20, paddingBottom: 36, gap: 8,
            flexGrow: notifLog.length === 0 ? 1 : undefined,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {notifLog.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 60 }}>
              <View style={{
                width: 64, height: 64, borderRadius: 32, backgroundColor: T.surface,
                borderWidth: 1, borderColor: T.hairline,
                alignItems: 'center', justifyContent: 'center', marginBottom: 14,
              }}>
                <Icon name="bell" size={26} color={T.inkMuted} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>Nothing yet</Text>
              <Text style={{ fontSize: 13, color: T.inkMuted, marginTop: 6, lineHeight: 18, textAlign: 'center' }}>
                Booking updates, new orders, and other alerts will land here.
              </Text>
            </View>
          ) : notifLog.map(n => <NotifRow key={n.id} n={n} T={T} onPress={() => handleTap(n)} />)}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

function NotifRow({ n, T, onPress }: { n: LoggedNotif; T: Theme; onPress: () => void }) {
  const tappable = !!n.targetId;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      flexDirection: 'row', gap: 12, padding: 14, borderRadius: 18,
      backgroundColor: pressed ? T.surfaceAlt : (n.read ? T.bgRaised : T.surface),
      borderWidth: 1, borderColor: n.read ? T.hairline : T.brand,
    })}>
      <View style={{
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: n.read ? T.surfaceAlt : T.brand,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={n.icon || 'bell'} size={18} color={n.read ? T.inkSoft : '#fff'} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text numberOfLines={1} style={{
            fontSize: 14.5, fontWeight: '700', color: T.ink, letterSpacing: -0.2,
            flex: 1,
          }}>{n.title}</Text>
          <Text style={{ fontSize: 11, color: T.inkMuted }}>{timeAgo(n.createdAt)}</Text>
        </View>
        <Text style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 2, lineHeight: 17 }}>{n.body}</Text>
      </View>
      {tappable ? (
        <Icon name="chevron-right" size={14} color={T.inkMuted} />
      ) : !n.read ? (
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: T.brand, marginTop: 6 }} />
      ) : null}
    </Pressable>
  );
}
