import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { FONT } from '../../constants/theme';
import { useApp } from '../../lib/AppContext';
import type { Review, ServiceCategoryId, Theme } from '../../types';
import { Avatar } from '../primitives';
import { Icon } from '../Icon';

const W       = Dimensions.get('window').width;
const CHART_W = W - 80;
const BAR_H   = 110;
const DONUT_R = 48;
const DONUT_STROKE = 14;

// ─── Animation hook ───────────────────────────────────────────────────────────
// Animates 0→1 with ease-out cubic on every trigger change.
function useChartProgress(trigger: string): number {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    setProgress(0);
    const start = Date.now();
    const duration = 680;
    let raf: ReturnType<typeof requestAnimationFrame>;
    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      setProgress(1 - Math.pow(1 - t, 3));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [trigger]);
  return progress;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function pct(v: number, total: number) {
  return total === 0 ? 0 : v / total;
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const sx = cx + r * Math.cos(toRad(startAngle - 90));
  const sy = cy + r * Math.sin(toRad(startAngle - 90));
  const ex = cx + r * Math.cos(toRad(endAngle - 90));
  const ey = cy + r * Math.sin(toRad(endAngle - 90));
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
}

// ─── Filter types ─────────────────────────────────────────────────────────────
type Period   = '7d' | '1m' | '6m' | '1y';
type DataType = 'all' | 'bookings' | 'orders';

const PERIOD_LABELS: Record<Period, string> = {
  '7d': '7 days', '1m': '1 month', '6m': '6 months', '1y': '1 year',
};

const CAT_LABELS: Record<string, string> = {
  walk: 'Walking', groom: 'Grooming', vet: 'Vet',
  board: 'Boarding', taxi: 'Pet Taxi', funeral: 'Funeral',
};

function periodStart(p: Period): number {
  const now = new Date(); now.setHours(23, 59, 59, 999);
  if (p === '7d') {
    const d = new Date(now); d.setDate(now.getDate() - 6);   d.setHours(0,0,0,0); return d.getTime();
  }
  if (p === '1m') {
    const d = new Date(now); d.setDate(now.getDate() - 29);  d.setHours(0,0,0,0); return d.getTime();
  }
  if (p === '6m') {
    const d = new Date(now); d.setMonth(now.getMonth() - 5); d.setDate(1); d.setHours(0,0,0,0); return d.getTime();
  }
  const d = new Date(now); d.setFullYear(now.getFullYear() - 1); d.setDate(1); d.setHours(0,0,0,0); return d.getTime();
}

// ─── Segment control ──────────────────────────────────────────────────────────
function SegmentControl({ options, value, onChange, T }: {
  options: { key: string; label: string }[];
  value: string; onChange: (v: string) => void; T: Theme;
}) {
  return (
    <View style={{
      flexDirection: 'row', borderRadius: 12,
      backgroundColor: T.surfaceAlt, padding: 3, gap: 2,
    }}>
      {options.map(opt => {
        const active = value === opt.key;
        return (
          <Pressable key={opt.key} onPress={() => onChange(opt.key)} style={{
            flex: 1, height: 32, borderRadius: 10,
            backgroundColor: active ? T.surface : 'transparent',
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: active ? 0.07 : 0, shadowRadius: 2, elevation: active ? 1 : 0,
          }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: active ? T.ink : T.inkMuted }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Filter chip ──────────────────────────────────────────────────────────────
function FilterChip({ label, active, onPress, T }: {
  label: string; active: boolean; onPress: () => void; T: Theme;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      height: 34, paddingHorizontal: 14, borderRadius: 17,
      backgroundColor: active ? T.brand : T.surface,
      borderWidth: 1, borderColor: active ? T.brand : T.hairline,
      alignItems: 'center', justifyContent: 'center',
      opacity: pressed ? 0.75 : 1,
    })}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : T.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, T, accent }: {
  label: string; value: string; sub?: string; icon: string; T: Theme; accent?: string;
}) {
  const c = accent ?? T.brand;
  return (
    <View style={{
      flex: 1, padding: 14, borderRadius: 16,
      backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, gap: 8,
    }}>
      <View style={{
        width: 34, height: 34, borderRadius: 10, backgroundColor: c + '20',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={16} color={c} />
      </View>
      <View>
        <Text style={{ fontSize: 22, fontWeight: '700', color: T.ink, letterSpacing: -0.5 }}>
          {value}
        </Text>
        <Text style={{ fontSize: 11.5, color: T.inkMuted, fontWeight: '600', marginTop: 2 }}>
          {label}
        </Text>
        {sub ? <Text style={{ fontSize: 11, color: T.inkMuted, marginTop: 2 }}>{sub}</Text> : null}
      </View>
    </View>
  );
}

// ─── Animated bar chart ───────────────────────────────────────────────────────
function BarChart({ data, labels, T, progress }: {
  data: number[]; labels: string[]; T: Theme; progress: number;
}) {
  const max  = Math.max(...data, 1);
  const barW = (CHART_W - (data.length - 1) * 6) / data.length;

  if (data.every(d => d === 0)) {
    return (
      <View style={{ height: BAR_H + 30, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 13, color: T.inkMuted }}>No revenue data yet</Text>
      </View>
    );
  }

  return (
    <Svg width={CHART_W} height={BAR_H + 28}>
      {data.map((v, i) => {
        const fullH = Math.max(4, (v / max) * BAR_H);
        const barH  = fullH * progress;
        const x     = i * (barW + 6);
        const y     = BAR_H - barH;
        const isMax = v === max && v > 0;
        return (
          <G key={i}>
            <Rect x={x} y={y} width={barW} height={barH} rx={6} fill={isMax ? T.brand : T.brandSoft} />
            {/* Value label fades in at the end of the animation */}
            {v > 0 && progress > 0.85 ? (
              <SvgText
                x={x + barW / 2} y={BAR_H - fullH - 4}
                textAnchor="middle" fontSize={9} fill={T.inkMuted} fontWeight="600"
              >
                ${v.toFixed(0)}
              </SvgText>
            ) : null}
            <SvgText
              x={x + barW / 2} y={BAR_H + 20}
              textAnchor="middle" fontSize={9.5} fill={T.inkMuted} fontWeight="600"
            >
              {labels[i]}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ─── Animated donut chart ─────────────────────────────────────────────────────
// Animates as a single clockwise sweep that reveals each colour segment in order.
function DonutChart({ segments, T, progress }: {
  segments: { value: number; color: string; label: string }[];
  T: Theme; progress: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const cx = DONUT_R + DONUT_STROKE;
  const cy = DONUT_R + DONUT_STROKE;
  const size = (DONUT_R + DONUT_STROKE) * 2;

  if (total === 0) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', height: size }}>
        <Text style={{ fontSize: 12, color: T.inkMuted }}>No data yet</Text>
      </View>
    );
  }

  // Pre-compute segment start/end angles
  const segs: { start: number; end: number; color: string }[] = [];
  let angle = 0;
  for (const s of segments.filter(s => s.value > 0)) {
    const sweep = pct(s.value, total) * 360;
    segs.push({ start: angle, end: angle + sweep, color: s.color });
    angle += sweep;
  }

  // Total angle currently drawn (0→360 as progress 0→1)
  const drawnAngle = 360 * progress;

  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cy} r={DONUT_R} fill="none" stroke={T.surfaceAlt} strokeWidth={DONUT_STROKE} />
      {segs.map((seg, i) => {
        const drawEnd   = Math.min(seg.end, drawnAngle);
        const drawSweep = Math.max(0, drawEnd - seg.start);
        if (drawSweep < 0.5) return null;
        // Only apply the inter-segment gap when the segment is fully drawn
        const isFullDraw = drawEnd >= seg.end - 0.2;
        const endAngle = isFullDraw ? seg.start + drawSweep - 0.5 : seg.start + drawSweep;
        return (
          <Path
            key={i}
            d={arcPath(cx, cy, DONUT_R, seg.start, endAngle)}
            fill="none" stroke={seg.color}
            strokeWidth={DONUT_STROKE} strokeLinecap="round"
          />
        );
      })}
      <SvgText x={cx} y={cy - 6} textAnchor="middle" fontSize={16} fill={T.ink} fontWeight="700">
        {total}
      </SvgText>
      <SvgText x={cx} y={cy + 10} textAnchor="middle" fontSize={9} fill={T.inkMuted} fontWeight="600">
        TOTAL
      </SvgText>
    </Svg>
  );
}

// ─── Animated horizontal bar ──────────────────────────────────────────────────
function HBar({ label, value, total, color, T, progress }: {
  label: string; value: number; total: number; color: string; T: Theme; progress: number;
}) {
  const ratio = total === 0 ? 0 : value / total;
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 12.5, color: T.ink, fontWeight: '600' }}>{label}</Text>
        <Text style={{ fontSize: 12.5, color: T.inkMuted }}>${value.toFixed(0)}</Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: T.surfaceAlt }}>
        <View style={{
          height: 6, borderRadius: 3, backgroundColor: color,
          width: `${Math.round(ratio * progress * 100)}%`,
        }} />
      </View>
    </View>
  );
}

// ─── Status legend row ────────────────────────────────────────────────────────
function LegendRow({ label, value, color, T }: { label: string; value: number; color: string; T: Theme }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ flex: 1, fontSize: 13, color: T.inkSoft }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: T.ink }}>{value}</Text>
    </View>
  );
}

// ─── Revenue Goal Tracker ─────────────────────────────────────────────────────
function GoalTracker({ monthRevenue, uid, T }: { monthRevenue: number; uid: string; T: Theme }) {
  const [goal, setGoal]         = useState<number | null>(null);
  const [editing, setEditing]   = useState(false);
  const [input, setInput]       = useState('');
  const storageKey = `@pawra/revenue_goal_${uid}`;

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then(v => { if (v) setGoal(Number(v)); });
  }, [uid]);

  const saveGoal = async () => {
    const n = parseFloat(input.replace(/[^0-9.]/g, ''));
    if (isNaN(n) || n <= 0) { setEditing(false); return; }
    setGoal(n);
    setEditing(false);
    await AsyncStorage.setItem(storageKey, String(n));
  };

  const ratio   = goal ? Math.min(monthRevenue / goal, 1) : 0;
  const pct     = Math.round(ratio * 100);
  const barColor = pct >= 100 ? T.success : pct >= 70 ? T.brand : pct >= 40 ? T.warn : T.accent;

  return (
    <View style={{
      padding: 16, borderRadius: 16,
      backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, gap: 12,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{
            width: 30, height: 30, borderRadius: 9, backgroundColor: T.brand + '20',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="check" size={14} color={T.brand} />
          </View>
          <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>
            Monthly Goal
          </Text>
        </View>
        <Pressable
          onPress={() => { setInput(goal ? String(goal) : ''); setEditing(e => !e); }}
          style={({ pressed }) => ({
            paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
            backgroundColor: pressed ? T.brandSoft : T.surfaceAlt,
            flexDirection: 'row', alignItems: 'center', gap: 5,
          })}
        >
          <Icon name="edit" size={12} color={T.inkSoft} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: T.inkSoft }}>
            {goal ? 'Edit' : 'Set goal'}
          </Text>
        </Pressable>
      </View>

      {editing ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
            paddingHorizontal: 14, height: 44, borderRadius: 12,
            backgroundColor: T.surfaceAlt, borderWidth: 1, borderColor: T.hairline,
          }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: T.inkMuted }}>$</Text>
            <TextInput
              value={input}
              onChangeText={setInput}
              keyboardType="decimal-pad"
              placeholder="e.g. 1500"
              placeholderTextColor={T.inkMuted}
              style={{ flex: 1, fontFamily: FONT.sans, fontSize: 15, color: T.ink }}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={saveGoal}
            />
          </View>
          <Pressable
            onPress={saveGoal}
            style={{
              height: 44, paddingHorizontal: 16, borderRadius: 12,
              backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Save</Text>
          </Pressable>
        </View>
      ) : goal ? (
        <>
          {/* Numbers */}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={{ fontSize: 26, fontWeight: '700', color: T.ink, letterSpacing: -0.6 }}>
              ${monthRevenue.toFixed(0)}
            </Text>
            <Text style={{ fontSize: 14, color: T.inkMuted, fontWeight: '600' }}>
              of ${goal.toFixed(0)} · {pct}%
            </Text>
          </View>
          {/* Progress bar */}
          <View style={{ height: 8, borderRadius: 4, backgroundColor: T.surfaceAlt }}>
            <View style={{
              height: 8, borderRadius: 4, backgroundColor: barColor,
              width: `${pct}%`,
            }} />
          </View>
          <Text style={{ fontSize: 12, color: pct >= 100 ? T.success : T.inkMuted }}>
            {pct >= 100
              ? '🎉 Goal reached this month!'
              : `$${Math.max(0, goal - monthRevenue).toFixed(0)} to go`}
          </Text>
        </>
      ) : (
        <View style={{ alignItems: 'center', paddingVertical: 8, gap: 4 }}>
          <Text style={{ fontSize: 13, color: T.inkMuted, textAlign: 'center' }}>
            Set a monthly target to track your progress here.
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── My Reviews (provider-side review management) ─────────────────────────────
function MyReviews({ reviews, onRespond, T }: {
  reviews: Review[];
  onRespond: (id: string, text: string) => Promise<void>;
  T: Theme;
}) {
  const [responding, setResponding] = useState<string | null>(null);
  const [draft, setDraft]           = useState('');
  const [saving, setSaving]         = useState(false);

  const [error, setError] = useState('');
  const submit = async (id: string) => {
    if (!draft.trim()) return;
    setSaving(true);
    setError('');
    try {
      await onRespond(id, draft.trim());
      setResponding(null);
      setDraft('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not post reply.';
      setError(msg.includes('does not exist') || msg.includes('column')
        ? 'Migration not applied — run 0023_review_responses.sql in Supabase first.'
        : msg);
    } finally {
      setSaving(false);
    }
  };

  if (reviews.length === 0) return null;

  return (
    <View style={{
      padding: 16, borderRadius: 16,
      backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, gap: 12,
    }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>
        Reviews · {reviews.length}
      </Text>
      {reviews.map(r => (
        <View key={r.id} style={{
          padding: 12, borderRadius: 14,
          backgroundColor: T.surfaceAlt,
          borderWidth: 1, borderColor: T.hairline, gap: 8,
        }}>
          {/* Review header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Avatar name={r.author} size={26} T={T} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: T.ink }}>{r.author}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 2 }}>
              {[1,2,3,4,5].map(n => (
                <Icon key={n} name={n <= r.rating ? 'star' : 'star-line'} size={10} color={n <= r.rating ? T.warn : T.inkMuted} />
              ))}
            </View>
          </View>
          {r.text ? <Text style={{ fontSize: 13, color: T.inkSoft, lineHeight: 18 }}>{r.text}</Text> : null}
          <Text style={{ fontSize: 11, color: T.inkMuted }}>{r.when}</Text>

          {/* Provider response */}
          {r.response ? (
            <View style={{
              padding: 10, borderRadius: 10,
              backgroundColor: T.brandSoft,
              borderLeftWidth: 3, borderLeftColor: T.brand,
              gap: 4,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: T.brand, letterSpacing: 0.2, textTransform: 'uppercase' }}>
                Your reply
              </Text>
              <Text style={{ fontSize: 12.5, color: T.brandInk, lineHeight: 17 }}>{r.response}</Text>
              <Pressable onPress={() => { setResponding(r.id); setDraft(r.response ?? ''); }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: T.brand, marginTop: 2 }}>Edit reply</Text>
              </Pressable>
            </View>
          ) : responding !== r.id ? (
            <Pressable
              onPress={() => { setResponding(r.id); setDraft(''); }}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingVertical: 6, opacity: pressed ? 0.7 : 1,
              })}
            >
              <Icon name="send" size={12} color={T.brand} />
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: T.brand }}>Reply publicly</Text>
            </Pressable>
          ) : null}

          {/* Reply input */}
          {responding === r.id ? (
            <View style={{ gap: 8 }}>
              {error ? (
                <Text style={{ fontSize: 12, color: T.danger, fontWeight: '600' }}>{error}</Text>
              ) : null}
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Write your reply…"
                placeholderTextColor={T.inkMuted}
                multiline
                autoFocus
                style={{
                  fontFamily: FONT.sans, fontSize: 13.5, color: T.ink, lineHeight: 19,
                  padding: 10, borderRadius: 10,
                  backgroundColor: T.surface,
                  borderWidth: 1, borderColor: T.brand,
                  minHeight: 72,
                }}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => { setResponding(null); setDraft(''); }}
                  style={{
                    flex: 1, height: 36, borderRadius: 10,
                    borderWidth: 1, borderColor: T.hairline,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: T.inkSoft }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => submit(r.id)}
                  disabled={saving || !draft.trim()}
                  style={{
                    flex: 2, height: 36, borderRadius: 10,
                    backgroundColor: draft.trim() ? T.brand : T.surfaceAlt,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: draft.trim() ? '#fff' : T.inkMuted }}>
                    {saving ? 'Saving…' : 'Post reply'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

// ─── Main analytics component ─────────────────────────────────────────────────
export function ProviderAnalytics({ T }: { T: Theme }) {
  const { bookings, orders, products, user, reviews, respondToReview } = useApp();
  const uid = user.id;

  // Current calendar-month start (for goal tracker)
  const monthStart = useMemo(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d.getTime();
  }, []);

  const [period,    setPeriod]    = useState<Period>('7d');
  const [dataType,  setDataType]  = useState<DataType>('all');
  const [catFilter, setCatFilter] = useState<string>('all');

  // Reset category filter when switching data type
  const handleDataType = (v: string) => {
    setDataType(v as DataType);
    setCatFilter('all');
  };

  const myBookings = useMemo(() => bookings.filter(b => b.providerId === uid), [bookings, uid]);
  const myOrders   = useMemo(() => orders.filter(o => o.vendorId === uid),     [orders, uid]);
  const myProducts = useMemo(() => products.filter(p => p.vendorId === uid),   [products, uid]);
  const myReviews  = useMemo(() => reviews.filter(r => r.providerId === uid),  [reviews, uid]);

  // Period start timestamp
  const pStart = useMemo(() => periodStart(period), [period]);

  // Period-filtered bookings (+ optional category filter)
  const fBookings = useMemo(() => {
    let b = myBookings.filter(b => b.createdAt >= pStart);
    if (catFilter !== 'all') {
      b = b.filter(b =>
        b.services?.some(s => s.categoryId === catFilter) ?? false
      );
    }
    return b;
  }, [myBookings, pStart, catFilter]);

  // Period-filtered orders
  const fOrders = useMemo(
    () => myOrders.filter(o => o.createdAt >= pStart),
    [myOrders, pStart],
  );

  // What each type toggle shows
  const visBookings = dataType === 'orders'   ? [] : fBookings;
  const visOrders   = dataType === 'bookings' ? [] : fOrders;

  // Categories present in the provider's bookings (for the chip row)
  const availableCats = useMemo(() => {
    const cats = new Set<string>();
    myBookings.forEach(b => b.services?.forEach(s => { if (s.categoryId) cats.add(s.categoryId); }));
    return Array.from(cats);
  }, [myBookings]);

  // Animate whenever any filter changes
  const animKey  = `${period}|${dataType}|${catFilter}`;
  const progress = useChartProgress(animKey);

  // ── Revenue chart (adapts buckets to period) ────────────────────────────────
  const { chartRevenue, chartLabels, chartTitle } = useMemo(() => {
    const now = new Date(); now.setHours(23, 59, 59, 999);
    const rev: number[] = [];
    const labs: string[] = [];

    const revenueInRange = (s: number, e: number) => {
      const bRev = (dataType !== 'orders' ? myBookings : [])
        .filter(b => {
          if (!['confirmed','in_progress','completed'].includes(b.status)) return false;
          if (b.createdAt < s || b.createdAt > e) return false;
          if (catFilter !== 'all' && !b.services?.some(sv => sv.categoryId === catFilter)) return false;
          return true;
        })
        .reduce((acc, b) => acc + b.amount, 0);
      const oRev = (dataType !== 'bookings' ? myOrders : [])
        .filter(o => ['confirmed','shipped','completed'].includes(o.status) && o.createdAt >= s && o.createdAt <= e)
        .reduce((acc, o) => acc + o.total, 0);
      return bRev + oRev;
    };

    let title = 'Revenue';

    if (period === '7d') {
      title = 'Revenue · last 7 days';
      const DAY = ['Su','Mo','Tu','We','Th','Fr','Sa'];
      for (let i = 6; i >= 0; i--) {
        const end = new Date(now); end.setDate(now.getDate() - i);
        const start = new Date(end); start.setHours(0, 0, 0, 0);
        rev.push(revenueInRange(start.getTime(), end.getTime()));
        labs.push(DAY[end.getDay()]);
      }
    } else if (period === '1m') {
      title = 'Revenue · last month';
      for (let i = 3; i >= 0; i--) {
        const end = new Date(now); end.setDate(now.getDate() - i * 7);
        const start = new Date(end); start.setDate(end.getDate() - 6); start.setHours(0, 0, 0, 0);
        rev.push(revenueInRange(start.getTime(), end.getTime()));
        labs.push(`W${4 - i}`);
      }
    } else if (period === '6m') {
      title = 'Revenue · last 6 months';
      const ML = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        rev.push(revenueInRange(d.getTime(), new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime()));
        labs.push(ML[d.getMonth()]);
      }
    } else {
      title = 'Revenue · last year';
      const ML = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        rev.push(revenueInRange(d.getTime(), new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime()));
        labs.push(ML[d.getMonth()]);
      }
    }

    return { chartRevenue: rev, chartLabels: labs, chartTitle: title };
  }, [myBookings, myOrders, period, dataType, catFilter]);

  // ── Donut data ──────────────────────────────────────────────────────────────
  const bookingStats = useMemo(() => ({
    completed:  visBookings.filter(b => b.status === 'completed').length,
    inProgress: visBookings.filter(b => b.status === 'in_progress' || b.status === 'confirmed').length,
    declined:   visBookings.filter(b => b.status === 'declined' || b.status === 'cancelled').length,
  }), [visBookings]);

  const orderStats = useMemo(() => ({
    completed: visOrders.filter(o => o.status === 'completed').length,
    active:    visOrders.filter(o => ['confirmed','shipped'].includes(o.status)).length,
    declined:  visOrders.filter(o => ['cancelled','declined'].includes(o.status)).length,
  }), [visOrders]);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const totalRevenue = useMemo(() => (
    visBookings.filter(b => ['confirmed','in_progress','completed'].includes(b.status)).reduce((s, b) => s + b.amount, 0)
    + visOrders.filter(o => ['confirmed','shipped','completed'].includes(o.status)).reduce((s, o) => s + o.total, 0)
  ), [visBookings, visOrders]);

  const completionRate = useMemo(() => {
    const responded = visBookings.filter(b => b.status !== 'pending').length;
    const completed = visBookings.filter(b => b.status === 'completed').length;
    return responded === 0 ? 0 : Math.round((completed / responded) * 100);
  }, [visBookings]);

  const avgValue = useMemo(() => {
    const all = [
      ...visBookings.filter(b => b.status === 'completed').map(b => b.amount),
      ...visOrders.filter(o => o.status === 'completed').map(o => o.total),
    ];
    return all.length === 0 ? 0 : all.reduce((s, v) => s + v, 0) / all.length;
  }, [visBookings, visOrders]);

  const avgRating = useMemo(() => {
    if (myReviews.length === 0) return null;
    return (myReviews.reduce((s, r) => s + r.rating, 0) / myReviews.length).toFixed(1);
  }, [myReviews]);

  // ── Revenue by service ──────────────────────────────────────────────────────
  const catRevenue = useMemo(() => {
    const map: Record<string, number> = {};
    visBookings.filter(b => b.status === 'completed').forEach(b => {
      const cat = (b.services?.[0]?.categoryId ?? 'other') as string;
      map[cat] = (map[cat] || 0) + b.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [visBookings]);
  const catTotal  = catRevenue.reduce((s, [, v]) => s + v, 0);
  const catColors = [T.brand, T.accent, T.success, T.warn, T.inkMuted];

  // Current month revenue (for goal tracker, always all data regardless of filters)
  const thisMonthRevenue = useMemo(() => (
    myBookings.filter(b => ['confirmed','in_progress','completed'].includes(b.status) && b.createdAt >= monthStart)
      .reduce((s, b) => s + b.amount, 0)
    + myOrders.filter(o => ['confirmed','shipped','completed'].includes(o.status) && o.createdAt >= monthStart)
      .reduce((s, o) => s + o.total, 0)
  ), [myBookings, myOrders, monthStart]);

  const showBookingDonut = dataType !== 'orders'   && (bookingStats.completed + bookingStats.inProgress + bookingStats.declined) > 0;
  const showOrderDonut   = dataType !== 'bookings' && (orderStats.completed + orderStats.active + orderStats.declined) > 0;

  return (
    <View style={{ gap: 16 }}>

      {/* ── Type toggle ── */}
      <SegmentControl
        T={T} value={dataType} onChange={handleDataType}
        options={[
          { key: 'all',      label: 'All' },
          { key: 'bookings', label: 'Bookings' },
          { key: 'orders',   label: 'Orders' },
        ]}
      />

      {/* ── Period chips ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {(['7d','1m','6m','1y'] as Period[]).map(p => (
          <FilterChip key={p} label={PERIOD_LABELS[p]} active={period === p} onPress={() => setPeriod(p)} T={T} />
        ))}
      </ScrollView>

      {/* ── Category chips (only when bookings are in view and provider has categories) ── */}
      {dataType !== 'orders' && availableCats.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <FilterChip label="All services" active={catFilter === 'all'} onPress={() => setCatFilter('all')} T={T} />
          {availableCats.map(cat => (
            <FilterChip
              key={cat}
              label={CAT_LABELS[cat] ?? cat}
              active={catFilter === cat}
              onPress={() => setCatFilter(cat)}
              T={T}
            />
          ))}
        </ScrollView>
      ) : null}

      {/* ── KPI row 1 ── */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <KpiCard T={T} icon="card" label="Total revenue" value={`$${totalRevenue.toFixed(0)}`} />
        {dataType !== 'orders' ? (
          <KpiCard T={T} icon="check" label="Completion" value={`${completionRate}%`}
            accent={completionRate >= 80 ? T.success : T.warn}
            sub={`${bookingStats.completed} completed`}
          />
        ) : (
          <KpiCard T={T} icon="bag" label="Orders placed" value={String(visOrders.length)}
            sub={`${orderStats.completed} completed`}
          />
        )}
      </View>

      {/* ── KPI row 2 ── */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <KpiCard T={T} icon="bag" label="Avg. value" value={avgValue > 0 ? `$${avgValue.toFixed(0)}` : '—'} />
        {avgRating ? (
          <KpiCard T={T} icon="star" label="Avg. rating"
            value={`${avgRating} ★`}
            sub={`${myReviews.length} ${myReviews.length === 1 ? 'review' : 'reviews'}`}
            accent="#F59E0B"
          />
        ) : null}
      </View>

      {/* ── Revenue chart ── */}
      <View style={{
        padding: 16, borderRadius: 16,
        backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
      }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink, letterSpacing: -0.2, marginBottom: 16 }}>
          {chartTitle}
        </Text>
        <BarChart data={chartRevenue} labels={chartLabels} T={T} progress={progress} />
      </View>

      {/* ── Booking status donut ── */}
      {showBookingDonut ? (
        <View style={{
          padding: 16, borderRadius: 16,
          backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
        }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink, letterSpacing: -0.2, marginBottom: 16 }}>
            Booking status
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
            <DonutChart T={T} progress={progress} segments={[
              { value: bookingStats.completed,  color: T.success,     label: 'Completed' },
              { value: bookingStats.inProgress, color: T.brand,       label: 'Active' },
              { value: bookingStats.declined,   color: T.surfaceAlt,  label: 'Declined' },
            ]} />
            <View style={{ flex: 1, gap: 10 }}>
              <LegendRow label="Completed" value={bookingStats.completed}  color={T.success}   T={T} />
              <LegendRow label="Active"    value={bookingStats.inProgress} color={T.brand}     T={T} />
              <LegendRow label="Declined"  value={bookingStats.declined}   color={T.inkMuted}  T={T} />
            </View>
          </View>
        </View>
      ) : null}

      {/* ── Order status donut ── */}
      {showOrderDonut ? (
        <View style={{
          padding: 16, borderRadius: 16,
          backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
        }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink, letterSpacing: -0.2, marginBottom: 16 }}>
            Order status
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
            <DonutChart T={T} progress={progress} segments={[
              { value: orderStats.completed, color: T.success,    label: 'Completed' },
              { value: orderStats.active,    color: T.brand,      label: 'Active' },
              { value: orderStats.declined,  color: T.surfaceAlt, label: 'Declined' },
            ]} />
            <View style={{ flex: 1, gap: 10 }}>
              <LegendRow label="Completed" value={orderStats.completed} color={T.success}  T={T} />
              <LegendRow label="Active"    value={orderStats.active}    color={T.brand}    T={T} />
              <LegendRow label="Declined"  value={orderStats.declined}  color={T.inkMuted} T={T} />
            </View>
          </View>
        </View>
      ) : null}

      {/* ── Revenue by service (bookings only) ── */}
      {catRevenue.length > 0 && dataType !== 'orders' ? (
        <View style={{
          padding: 16, borderRadius: 16,
          backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, gap: 12,
        }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>
            Revenue by service
          </Text>
          {catRevenue.map(([cat, value], i) => (
            <HBar
              key={cat}
              label={CAT_LABELS[cat] ?? cat}
              value={value} total={catTotal}
              color={catColors[i % catColors.length]}
              T={T} progress={progress}
            />
          ))}
        </View>
      ) : null}

      {/* ── Shop performance (not filtered by period — all-time) ── */}
      {myProducts.length > 0 && dataType !== 'bookings' ? (
        <View style={{
          padding: 16, borderRadius: 16,
          backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, gap: 12,
        }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>
            Shop performance
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { value: myProducts.length,                           label: 'LISTINGS',     danger: false },
              { value: myProducts.reduce((s, p) => s + p.sales, 0), label: 'ITEMS SOLD',  danger: false },
              { value: myProducts.filter(p => p.stockCount === 0).length, label: 'OUT OF STOCK', danger: true },
            ].map((item, i) => (
              <View key={i} style={{
                flex: 1, padding: 12, borderRadius: 12,
                backgroundColor: T.surfaceAlt, alignItems: 'center', gap: 4,
              }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: T.ink }}>{item.value}</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: item.danger ? T.danger : T.inkMuted }}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* ── Revenue goal tracker ── */}
      <GoalTracker monthRevenue={thisMonthRevenue} uid={uid} T={T} />

      {/* ── My reviews (with reply capability) ── */}
      <MyReviews reviews={myReviews} onRespond={respondToReview} T={T} />

    </View>
  );
}
