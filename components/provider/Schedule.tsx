import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../../lib/AppContext';
import { bookingCategoryLabel } from '../../lib/bookingLabels';
import { DAY_LABELS, MONTHS, formatBookingDate, parseWhenLabel } from '../../lib/dateUtils';
import type { Booking, Theme } from '../../types';
import { Icon } from '../Icon';
import { InteractiveStatusTimeline } from './InteractiveStatusTimeline';

type DayBucket = { label: string; date: number; month: string; fullDate: Date; bookings: Booking[] };

export function ProviderSchedule({ T }: { T: Theme }) {
  // Schedule is bookings-only. Shop orders live in the Shop tab's Current /
  // Past sub-tabs — keeping them out of here keeps the day-grid focused on
  // service appointments where time-of-day actually matters.
  const {
    bookings, user,
    acceptBooking, startBooking, completeBooking,
    setActivityDetailOpen,
  } = useApp();

  const advanceBooking = (id: string, next: 'confirmed' | 'in_progress' | 'completed') => {
    if (next === 'confirmed') acceptBooking(id);
    else if (next === 'in_progress') startBooking(id);
    else if (next === 'completed') completeBooking(id);
  };

  // weekOffset: 0 = current week, -1 = last week, +1 = next week, etc.
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected,   setSelected]   = useState(0);

  // Reset selected day to Monday of the new week when navigating.
  const goWeek = (delta: number) => {
    setWeekOffset(w => w + delta);
    setSelected(0);
  };

  const days = useMemo<DayBucket[]>(() => {
    const buckets: DayBucket[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    // Jump to the Monday of the current week, then shift by weekOffset weeks.
    const dayOfWeek = base.getDay(); // 0=Sun … 6=Sat
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    base.setDate(base.getDate() + mondayOffset + weekOffset * 7);

    for (let i = 0; i < 7; i++) {
      const d = new Date(base); d.setDate(base.getDate() + i);
      buckets.push({
        label:    DAY_LABELS[d.getDay()],
        date:     d.getDate(),
        month:    MONTHS[d.getMonth()],
        fullDate: d,
        bookings: [],
      });
    }

    bookings
      .filter(b => b.providerId === user.id)
      .filter(b => b.status === 'confirmed' || b.status === 'in_progress' || b.status === 'completed')
      .forEach(b => {
        const bookingDate = parseWhenLabel(b.whenLabel);
        if (bookingDate) {
          const bMs = bookingDate.getTime();
          const match = buckets.find(bkt => bkt.fullDate.getTime() === bMs);
          if (match) { match.bookings.push(b); return; }
          // Outside this week's window — only keep in_progress on any week's today slot.
          if (b.status === 'in_progress' && weekOffset === 0) buckets[0].bookings.push(b);
          return;
        }
        if (b.status === 'in_progress' && weekOffset === 0) buckets[0].bookings.push(b);
      });

    return buckets;
  }, [bookings, user.id, weekOffset]);

  const selectedBucket = days[selected];
  const totalJobs    = days.reduce((s, d) => s + d.bookings.length, 0);
  const totalRevenue = days.reduce((s, d) => s + d.bookings.reduce((s2, b) => s2 + b.amount, 0), 0);

  // Week label: "Mon 5 – Sun 11 May" or "Mon 28 Apr – Sun 4 May"
  const weekLabel = useMemo(() => {
    const first = days[0];
    const last  = days[6];
    const fMon  = `${first.label} ${first.date}`;
    const lSun  = `${last.label} ${last.date} ${last.month}`;
    return first.month === last.month ? `${fMon} – ${lSun}` : `${fMon} ${first.month} – ${lSun}`;
  }, [days]);

  return (
    <>
    <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <Text style={{ fontSize: 30, fontWeight: '700', color: T.ink, letterSpacing: -0.6 }}>Schedule</Text>
      </View>

      {/* Week navigator */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 12, gap: 8,
      }}>
        <Pressable
          onPress={() => goWeek(-1)}
          hitSlop={10}
          style={{
            width: 34, height: 34, borderRadius: 17,
            backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="chevron-left" size={16} color={T.ink} />
        </Pressable>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>
            {weekOffset === 0 ? 'This week' : weekOffset === -1 ? 'Last week' : weekOffset === 1 ? 'Next week' : weekLabel}
          </Text>
          <Text style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>
            {weekLabel} · {totalJobs} {totalJobs === 1 ? 'job' : 'jobs'}{totalRevenue > 0 ? ` · $${totalRevenue.toFixed(2)}` : ''}
          </Text>
        </View>

        <Pressable
          onPress={() => goWeek(1)}
          hitSlop={10}
          style={{
            width: 34, height: 34, borderRadius: 17,
            backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="chevron-right" size={16} color={T.ink} />
        </Pressable>

      </View>

      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingTop: 14 }}>
        {days.map((d, i) => {
          const sel = selected === i;
          return (
            <Pressable key={i} onPress={() => setSelected(i)} style={{
              flex: 1, paddingVertical: 10, borderRadius: 14,
              backgroundColor: sel ? T.ink : 'transparent',
              alignItems: 'center', gap: 2,
            }}>
              <Text style={{ fontSize: 10.5, fontWeight: '600', color: sel ? T.bg : T.ink, opacity: 0.7 }}>{d.label}</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: sel ? T.bg : T.ink }}>{d.date}</Text>
              <View style={{
                width: 4, height: 4, borderRadius: 2,
                backgroundColor: d.bookings.length ? (sel ? T.bg : T.brand) : 'transparent',
                marginTop: 2,
              }} />
            </Pressable>
          );
        })}
      </View>
      <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 10 }}>
        {selectedBucket.bookings.length ? selectedBucket.bookings.map(b => {
          const accent =
            b.status === 'in_progress' ? T.accent :
            b.status === 'completed' ? T.success :
            T.brand;
          return (
            <Pressable
              key={`b_${b.id}`}
              onPress={() => setActivityDetailOpen(b)}
              style={{
                padding: 14, borderRadius: 16,
                backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
              }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ width: 4, borderRadius: 2, backgroundColor: accent }} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 12, color: T.inkMuted, fontWeight: '600' }}>{formatBookingDate(b.whenLabel, b.time)}</Text>
                    {b.status === 'in_progress' ? (
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 4,
                        paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
                        backgroundColor: T.accentSoft,
                      }}>
                        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: T.accent }} />
                        <Text style={{ color: T.accent, fontSize: 10, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' }}>
                          In progress
                        </Text>
                      </View>
                    ) : null}
                    {b.status === 'completed' ? (
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 4,
                        paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
                        backgroundColor: T.brandSoft,
                      }}>
                        <Icon name="check" size={11} color={T.brand} strokeWidth={2.5} />
                        <Text style={{ color: T.brandInk, fontSize: 10, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' }}>
                          Completed
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 14.5, fontWeight: '700', color: T.ink, marginTop: 2 }}>
                    {bookingCategoryLabel(b)} · {b.pet.name} ({b.ownerName.split(' ')[0]})
                  </Text>
                  <Text style={{ fontSize: 12, color: T.inkSoft, marginTop: 2 }}>{b.address}</Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: T.ink, alignSelf: 'center' }}>${b.amount.toFixed(2)}</Text>
              </View>

              {b.status !== 'declined' && b.status !== 'cancelled' && b.status !== 'completed' ? (
                <View style={{
                  marginTop: 14, paddingTop: 14,
                  borderTopWidth: 1, borderTopColor: T.hairline,
                }}>
                  <InteractiveStatusTimeline
                    status={b.status}
                    onAdvance={(next) => advanceBooking(b.id, next as 'confirmed' | 'in_progress' | 'completed')}
                    T={T}
                  />
                </View>
              ) : null}
            </Pressable>
          );
        }) : (
          <View style={{ alignItems: 'center', padding: 40, gap: 8 }}>
            <Icon name="calendar" size={28} color={T.inkMuted} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink }}>
              {weekOffset < 0 ? 'No jobs this day' : 'Nothing scheduled'}
            </Text>
            <Text style={{ fontSize: 13, color: T.inkMuted, textAlign: 'center' }}>
              {weekOffset > 0 ? 'No bookings yet for this day.' : weekOffset < 0 ? 'No work logged for this day.' : 'No jobs scheduled for today.'}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
    </>
  );
}
