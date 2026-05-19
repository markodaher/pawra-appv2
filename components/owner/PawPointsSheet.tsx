import { useMemo, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../lib/AppContext';
import { useEnterAnim } from '../../lib/transitions';
import type { Theme } from '../../types';
import { Icon } from '../Icon';

// ─── Fake reward catalog (placeholder — will be DB-backed later) ──────────────

type Reward = {
  id: string;
  icon: string;
  title: string;
  desc: string;
  points: number;
  accent: 'brand' | 'success' | 'warn' | 'danger' | 'accent';
};

const REWARDS: Reward[] = [
  { id: 'walk-1',      icon: 'walk',         title: '$5 off any walk',      desc: 'Apply to your next walking booking',     points: 500,   accent: 'brand'   },
  { id: 'wash-1',      icon: 'sparkle',      title: 'Free basic wash',      desc: 'Wash & dry, any participating groomer',  points: 1000,  accent: 'success' },
  { id: 'shop-10',     icon: 'bag',          title: '$10 off shop order',   desc: 'Minimum order $30',                       points: 1000,  accent: 'warn'    },
  { id: 'groom-pack',  icon: 'scissors',     title: 'Grooming starter pack', desc: 'Brush, shampoo, treats (delivered)',     points: 2500,  accent: 'brand'   },
  { id: 'walk-week',   icon: 'paw',          title: 'Free week of walks',   desc: '5 dog walks with any provider',          points: 5000,  accent: 'success' },
  { id: 'vet-vip',     icon: 'stethoscope',  title: 'VIP vet visit',        desc: 'Skip the queue at any 24/7 clinic',      points: 7500,  accent: 'danger'  },
  { id: 'birthday',    icon: 'heart',        title: 'Pet birthday party',   desc: 'Treats, toys, and a card delivered',     points: 10000, accent: 'accent'  },
];

function accentColor(a: Reward['accent'], T: Theme): string {
  return a === 'brand' ? T.brand : a === 'success' ? T.success : a === 'warn' ? T.warn : a === 'danger' ? T.danger : T.accent;
}

// ─── Reward card ──────────────────────────────────────────────────────────────

function RewardCard({ r, T, available, onPress }: {
  r: Reward; T: Theme; available: boolean; onPress: () => void;
}) {
  const c = accentColor(r.accent, T);
  return (
    <Pressable
      onPress={available ? onPress : undefined}
      style={({ pressed }) => ({
        padding: 14, borderRadius: 16,
        backgroundColor: T.surface,
        borderWidth: 1, borderColor: T.hairline,
        opacity: pressed ? 0.85 : 1,
        gap: 10,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{
          width: 38, height: 38, borderRadius: 11,
          backgroundColor: c + '18',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={r.icon} size={18} color={c} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>
            {r.title}
          </Text>
          <Text numberOfLines={2} style={{ fontSize: 11.5, color: T.inkMuted, marginTop: 2, lineHeight: 16 }}>
            {r.desc}
          </Text>
        </View>
      </View>
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 8, borderTopWidth: 1, borderTopColor: T.hairline,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 15 }}>🐾</Text>
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>
            {r.points.toLocaleString()} pts
          </Text>
        </View>
        <View style={{
          paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
          backgroundColor: available ? c : T.surfaceAlt,
        }}>
          <Text style={{ fontSize: 11.5, fontWeight: '700', color: available ? '#fff' : T.inkMuted }}>
            {available ? 'Redeem' : 'Locked'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Confirmation modal ───────────────────────────────────────────────────────

function ConfirmModal({ r, T, onCancel, onConfirm }: {
  r: Reward; T: Theme; onCancel: () => void; onConfirm: () => Promise<void>;
}) {
  const [redeeming, setRedeeming] = useState(false);
  const c = accentColor(r.accent, T);
  const handleConfirm = async () => {
    setRedeeming(true);
    await onConfirm();
    setRedeeming(false);
  };
  return (
    <View style={{
      position: 'absolute', inset: 0, zIndex: 100,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <View style={{
        width: '100%', maxWidth: 360, padding: 22, borderRadius: 22,
        backgroundColor: T.bg, gap: 14, alignItems: 'center',
      }}>
        <View style={{
          width: 60, height: 60, borderRadius: 18,
          backgroundColor: c + '18',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={r.icon} size={28} color={c} />
        </View>
        <Text style={{ fontSize: 19, fontWeight: '700', color: T.ink, letterSpacing: -0.4, textAlign: 'center' }}>
          Redeem {r.title}?
        </Text>
        <Text style={{ fontSize: 13.5, color: T.inkSoft, textAlign: 'center', lineHeight: 19 }}>
          {r.desc}
        </Text>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 6,
          paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
          backgroundColor: T.brandSoft,
        }}>
          <Text style={{ fontSize: 16 }}>🐾</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: T.brandInk }}>
            {r.points.toLocaleString()} pts
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, width: '100%' }}>
          <Pressable onPress={onCancel} disabled={redeeming} style={{
            flex: 1, height: 44, borderRadius: 12,
            borderWidth: 1, borderColor: T.hairline,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: T.inkSoft }}>Cancel</Text>
          </Pressable>
          <Pressable onPress={handleConfirm} disabled={redeeming} style={{
            flex: 1.5, height: 44, borderRadius: 12, backgroundColor: c,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
              {redeeming ? 'Redeeming…' : 'Confirm'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Main sheet ───────────────────────────────────────────────────────────────

export function PawPointsSheet({ T, onClose }: { T: Theme; onClose: () => void }) {
  const { pawPoints, redeemPawPoints, bookings, orders, user, showNotif } = useApp();
  const [confirming, setConfirming] = useState<Reward | null>(null);
  const [justRedeemed, setJustRedeemed] = useState<string | null>(null);

  // Activity log — last 10 earn/redeem events derived from completed bookings/orders
  const activity = useMemo(() => {
    type Event = { id: string; kind: 'earn' | 'redeem'; points: number; label: string; ts: number };
    const events: Event[] = [];

    bookings
      .filter(b => b.ownerId === user.id && b.status === 'completed')
      .forEach(b => events.push({
        id: `b-${b.id}`, kind: 'earn', points: Math.floor(b.amount * 10),
        label: `Booking · ${b.service || 'Service'}`, ts: b.respondedAt ?? b.createdAt,
      }));
    orders
      .filter(o => o.ownerId === user.id && o.status === 'completed')
      .forEach(o => events.push({
        id: `o-${o.id}`, kind: 'earn', points: Math.floor(o.total * 10),
        label: `Order · ${o.vendorName}`, ts: o.respondedAt ?? o.createdAt,
      }));
    if (justRedeemed) {
      const r = REWARDS.find(x => x.id === justRedeemed);
      if (r) events.push({ id: `r-${justRedeemed}`, kind: 'redeem', points: -r.points, label: r.title, ts: Date.now() });
    }
    return events.sort((a, b) => b.ts - a.ts).slice(0, 10);
  }, [bookings, orders, user.id, justRedeemed]);

  // Stats
  const earnedThisMonth = useMemo(() => {
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const ms = monthStart.getTime();
    return (
      bookings.filter(b => b.ownerId === user.id && b.status === 'completed' && (b.respondedAt ?? b.createdAt) >= ms)
        .reduce((s, b) => s + Math.floor(b.amount * 10), 0)
      + orders.filter(o => o.ownerId === user.id && o.status === 'completed' && (o.respondedAt ?? o.createdAt) >= ms)
        .reduce((s, o) => s + Math.floor(o.total * 10), 0)
    );
  }, [bookings, orders, user.id]);

  const handleRedeem = async () => {
    if (!confirming) return;
    const r = confirming;
    await redeemPawPoints(r.id, r.points, `Redeemed: ${r.title}`);
    setConfirming(null);
    setJustRedeemed(r.id);
    showNotif({
      title: 'Reward redeemed! 🎉',
      body: `${r.title} — we'll be in touch to fulfil it.`,
      icon: 'check-circle',
    });
  };

  const anim = useEnterAnim('right');

  return (
    <Animated.View style={[{ position: 'absolute', inset: 0, zIndex: 90, backgroundColor: T.bg }, anim.sheet]}>
      {/* Header */}
      <View style={{
        paddingTop: 14, paddingHorizontal: 20, paddingBottom: 12,
        flexDirection: 'row', alignItems: 'center', gap: 12,
      }}>
        <Pressable onPress={onClose} style={{
          width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface,
          borderWidth: 1, borderColor: T.hairline, alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="chevron-left" size={20} color={T.ink} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>
          Paw Points
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Hero card */}
        <View style={{ paddingHorizontal: 20 }}>
          <LinearGradient
            colors={[T.brand, '#0C1A35']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              padding: 22, borderRadius: 22, gap: 14,
              shadowColor: T.brand, shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{
                width: 52, height: 52, borderRadius: 16,
                backgroundColor: 'rgba(255,255,255,0.18)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 28 }}>🐾</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 1.2, opacity: 0.75, textTransform: 'uppercase' }}>
                  Your balance
                </Text>
                <Text style={{ fontSize: 36, fontWeight: '700', color: '#fff', letterSpacing: -1, marginTop: 2 }}>
                  {pawPoints.toLocaleString()}
                </Text>
                <Text style={{ fontSize: 12.5, color: '#fff', opacity: 0.75, marginTop: 2 }}>
                  = ${(pawPoints / 100).toFixed(2)} in rewards
                </Text>
              </View>
            </View>

            {/* Stats row */}
            <View style={{
              flexDirection: 'row', gap: 10, marginTop: 4,
              paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)',
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff', opacity: 0.7, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                  Earned this month
                </Text>
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff', marginTop: 2 }}>
                  +{earnedThisMonth.toLocaleString()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff', opacity: 0.7, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                  Earning rate
                </Text>
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff', marginTop: 2 }}>
                  10 pts / $1
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Available rewards */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingTop: 24, paddingBottom: 10,
        }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: T.inkMuted, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            Redeem rewards
          </Text>
          <Text style={{ fontSize: 12, color: T.inkMuted }}>
            {REWARDS.filter(r => r.points <= pawPoints).length} available
          </Text>
        </View>
        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          {REWARDS.map(r => (
            <RewardCard
              key={r.id}
              r={r} T={T}
              available={r.points <= pawPoints}
              onPress={() => setConfirming(r)}
            />
          ))}
        </View>

        {/* Activity log */}
        {activity.length > 0 ? (
          <>
            <Text style={{
              paddingHorizontal: 20, paddingTop: 28, paddingBottom: 10,
              fontSize: 13, fontWeight: '700', color: T.inkMuted, letterSpacing: 0.4, textTransform: 'uppercase',
            }}>
              Recent activity
            </Text>
            <View style={{ paddingHorizontal: 20, gap: 8 }}>
              {activity.map(e => (
                <View key={e.id} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  padding: 12, borderRadius: 14,
                  backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
                }}>
                  <View style={{
                    width: 32, height: 32, borderRadius: 10,
                    backgroundColor: e.kind === 'earn' ? T.success + '18' : T.warn + '18',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={e.kind === 'earn' ? 'plus' : 'minus'} size={14} color={e.kind === 'earn' ? T.success : T.warn} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: '600', color: T.ink, letterSpacing: -0.2 }}>
                      {e.label}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: T.inkMuted, marginTop: 2 }}>
                      {new Date(e.ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                  <Text style={{
                    fontSize: 14, fontWeight: '700',
                    color: e.kind === 'earn' ? T.success : T.warn, letterSpacing: -0.2,
                  }}>
                    {e.kind === 'earn' ? '+' : ''}{e.points.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* How to earn more */}
        <Text style={{
          paddingHorizontal: 20, paddingTop: 28, paddingBottom: 10,
          fontSize: 13, fontWeight: '700', color: T.inkMuted, letterSpacing: 0.4, textTransform: 'uppercase',
        }}>
          How to earn more
        </Text>
        <View style={{ paddingHorizontal: 20, gap: 8 }}>
          {[
            { icon: 'calendar',    title: 'Complete a booking',         desc: 'Earn 10 pts for every $1 spent on services' },
            { icon: 'bag',         title: 'Order from the shop',        desc: 'Same rate — 10 pts per $1 on pet supplies' },
            { icon: 'star',        title: 'Leave a review',             desc: 'Coming soon — bonus points for verified reviews' },
            { icon: 'heart',       title: 'Refer a friend',             desc: 'Coming soon — earn pts when they book' },
          ].map((tip, i) => (
            <View key={i} style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              padding: 14, borderRadius: 14,
              backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
            }}>
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: T.brandSoft, alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={tip.icon} size={16} color={T.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>
                  {tip.title}
                </Text>
                <Text style={{ fontSize: 11.5, color: T.inkMuted, marginTop: 2, lineHeight: 16 }}>
                  {tip.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={{
          fontSize: 11, color: T.inkMuted, textAlign: 'center',
          paddingHorizontal: 30, paddingTop: 24, lineHeight: 16,
        }}>
          100 pts = $1 in rewards · Points never expire while your account is active
        </Text>
      </ScrollView>

      {/* Confirmation modal */}
      {confirming ? (
        <ConfirmModal
          r={confirming} T={T}
          onCancel={() => setConfirming(null)}
          onConfirm={handleRedeem}
        />
      ) : null}
    </Animated.View>
  );
}
