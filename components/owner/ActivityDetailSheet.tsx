import { Fragment, useState } from 'react';
import { Animated, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../../lib/AppContext';
import { ChatSheet } from '../ChatSheet';
import { bookingCategoryLabel } from '../../lib/bookingLabels';
import { formatBookingDate } from '../../lib/dateUtils';
import { useEnterAnim } from '../../lib/transitions';
import { TYPE_META } from './HealthLogSheet';
import type { Booking, Theme } from '../../types';
import { Icon } from '../Icon';
import { Avatar, Button } from '../primitives';
import { DeclineReasonSheet } from '../provider/DeclineReasonSheet';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  declined: 'Declined',
};

const STATUS_STEPS = ['pending', 'confirmed', 'in_progress', 'completed'] as const;

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

export function ActivityDetailSheet({ T, booking, onClose, viewer = 'owner' }: {
  T: Theme;
  booking: Booking;
  onClose: () => void;
  /**
   * 'owner' = the buyer is viewing it (Activity tab) → shows review widget + "Book again".
   * 'provider' = the seller is viewing it (Schedule tab) → strips those.
   */
  viewer?: 'owner' | 'provider';
}) {
  const {
    providers, reviews, setReviewSheetFor, setProviderDetailOpen, setBookingOpen, removeReview,
    deleteBooking, healthRecords,
  } = useApp();

  const provider = providers.find(p => p.id === booking.providerId);
  const myReview = reviews.find(r => r.bookingId === booking.id);

  // Medical records — only relevant for vet bookings, owner view only
  const isVetBooking = booking.providerType === 'vet' || booking.services?.some(s => s.categoryId === 'vet');
  const bookedPetIds = (booking.petsList ?? (booking.pet ? [booking.pet] : [])).map(p => p.id).filter(Boolean);
  const petHealthRecords = isVetBooking && viewer === 'owner'
    ? healthRecords.filter(r => bookedPetIds.includes(r.petId))
    : [];

  const isCompleted = booking.status === 'completed';
  const isFinalState = isCompleted || booking.status === 'cancelled' || booking.status === 'declined';

  const serviceLabel = bookingCategoryLabel(booking);
  const completedTimestamp = isCompleted && booking.respondedAt
    ? new Date(booking.respondedAt).toLocaleString(undefined, {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: 'numeric', minute: '2-digit',
      })
    : null;

  const { cancelBooking, showNotif } = useApp();
  const [chatOpen,   setChatOpen]   = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  // Owner-side cancel — no reason required, but warn if it's last-minute
  const ownerCanCancel = viewer === 'owner'
    && (booking.status === 'confirmed' || booking.status === 'in_progress');

  const handleOwnerCancel = () => {
    cancelBooking(booking.id);
    // Count how many times this owner has cancelled confirmed bookings to detect pattern.
    // For now we simply warn if the booking is in_progress (most last-minute possible).
    if (booking.status === 'in_progress') {
      showNotif({
        title: 'Booking cancelled',
        body: 'Note: multiple last-minute cancellations may affect your standing with providers.',
        icon: 'x',
      }, 6000);
    }
    onClose();
  };

  // Chat is only open while the booking is active. Once completed/cancelled/declined,
  // the conversation locks — prevents off-platform poaching after the service ends.
  const canChat   = booking.status === 'confirmed' || booking.status === 'in_progress';
  const canCancel = viewer === 'provider' && (booking.status === 'confirmed' || booking.status === 'in_progress');
  const chatOtherName   = viewer === 'owner' ? booking.providerName : booking.ownerName;
  const chatRecipientId = viewer === 'owner' ? booking.providerId   : booking.ownerId;

  const onRebook = () => {
    onClose();
    if (provider) {
      setProviderDetailOpen(provider);
    }
  };

  const onDelete = async () => {
    onClose();
    await deleteBooking(booking.id);
  };

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
            {viewer === 'provider' ? 'Job details' : 'Booking details'}
          </Text>
          {booking.bookingNumber ? (
            <Text style={{ fontSize: 12, color: T.inkMuted, fontWeight: '600', marginTop: 1 }}>
              #{booking.bookingNumber}
            </Text>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 130 }}>
        {/* Header card — shows the other party from the viewer's perspective:
            owner sees the provider; provider sees the customer who booked them. */}
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
            <Avatar
              name={viewer === 'provider' ? (booking.ownerName || 'Customer') : (booking.providerName || '?')}
              size={52}
              T={T}
            />
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>
              {viewer === 'provider'
                ? (booking.ownerName || 'Customer')
                : (booking.providerName || 'The provider')}
            </Text>
            <Text style={{ fontSize: 12.5, color: T.inkMuted, marginTop: 2 }}>
              {serviceLabel} · {booking.pet?.name || 'pet'}
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
          {booking.status === 'declined' || booking.status === 'cancelled' ? (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="x" size={16} color={T.danger} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink }}>
                  {STATUS_LABEL[booking.status]}
                </Text>
                {booking.respondedAt ? (
                  <Text style={{ fontSize: 12, color: T.inkMuted }}>
                    · {new Date(booking.respondedAt).toLocaleString(undefined, {
                        day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
                      })}
                  </Text>
                ) : null}
              </View>
              {booking.declineReason ? (
                <View style={{
                  padding: 12, borderRadius: 12,
                  backgroundColor: T.surfaceAlt, borderLeftWidth: 3, borderLeftColor: T.danger,
                }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: T.inkMuted, letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 4 }}>
                    Reason
                  </Text>
                  <Text style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 19 }}>
                    {booking.declineReason}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : booking.status === 'completed' ? (
            // Done — collapse the progress bar into a single "Completed" pill + timestamp.
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999,
                backgroundColor: T.brandSoft,
              }}>
                <Icon name="check-circle" size={14} color={T.brand} />
                <Text style={{ color: T.brandInk, fontSize: 12.5, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' }}>
                  Completed
                </Text>
              </View>
              {completedTimestamp ? (
                <Text style={{ fontSize: 12.5, color: T.inkMuted }}>{completedTimestamp}</Text>
              ) : null}
            </View>
          ) : (
            <StatusTimeline current={booking.status} T={T} />
          )}
        </View>

        {/* Line items (booking = single service entry) */}
        {/* Services breakdown for multi-service bookings */}
        {booking.services && booking.services.length > 0 ? (
          <>
            <Text style={SECT(T)}>Services</Text>
            <View style={{
              padding: 14, borderRadius: 18,
              backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, gap: 10,
            }}>
              {booking.services.map(s => (
                <View key={s.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>{s.name}</Text>
                    <Text style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>
                      ${s.price}{s.unit}
                      {s.dogMult && booking.petsList && booking.petsList.length > 1 ? ` · × ${booking.petsList.length} pets` : ''}
                      {s.qty > 1 ? ` · × ${s.qty}` : ''}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink }}>${s.lineTotal.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Text style={SECT(T)}>Booking</Text>
        <View style={{
          padding: 14, borderRadius: 18,
          backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, gap: 10,
        }}>
          {(!booking.services || booking.services.length === 0) ? (
            <Row T={T} k="Service" v={`${serviceLabel} · ${booking.pet?.name || 'pet'}`} />
          ) : null}
          {booking.petsList && booking.petsList.length > 0 ? (
            <Row T={T} k="Pets" v={booking.petsList.map(p => p.name).join(', ')} />
          ) : null}
          <Row T={T} k="When"    v={formatBookingDate(booking.whenLabel, booking.time)} />
          {booking.address ? <Row T={T} k="Where"   v={booking.address} /> : null}
          <Row T={T} k="Passport shared" v={booking.sharePassport ? 'Yes' : 'No'} />
          {booking.recurring ? (
            <Row T={T} k="Recurring"
              v={booking.recurringInterval === 'weekly' ? 'Weekly' : booking.recurringInterval === 'biweekly' ? 'Every 2 weeks' : 'Monthly'}
            />
          ) : null}
          {booking.note ? (
            <View style={{ paddingTop: 6, borderTopWidth: 1, borderTopColor: T.hairline }}>
              <Text style={{ fontSize: 12, color: T.inkMuted, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' }}>Note</Text>
              <Text style={{ marginTop: 4, fontSize: 13.5, color: T.inkSoft, lineHeight: 18, fontStyle: 'italic' }}>"{booking.note}"</Text>
            </View>
          ) : null}
        </View>

        {/* Medical records — vet bookings, owner view */}
        {petHealthRecords.length > 0 ? (
          <>
            <Text style={SECT(T)}>Medical records</Text>
            <View style={{ gap: 8 }}>
              {petHealthRecords.map(r => {
                const meta = TYPE_META[r.type];
                const c = meta.color(T);
                const detail =
                  r.type === 'weight'  ? `${r.weightKg} kg` :
                  r.type === 'allergy' ? (r.severity ?? '') :
                  r.nextDue            ? `Next due ${r.nextDue}` :
                  r.date               ? r.date : '';
                return (
                  <View key={r.id} style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    padding: 12, borderRadius: 14,
                    backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
                  }}>
                    <View style={{
                      width: 34, height: 34, borderRadius: 10,
                      backgroundColor: c + '18', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name={meta.icon} size={15} color={c} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: T.ink }}>{r.title}</Text>
                      {detail ? (
                        <Text style={{ fontSize: 12, color: T.inkMuted, marginTop: 1 }}>{detail}</Text>
                      ) : null}
                      {r.notes ? (
                        <Text style={{ fontSize: 12, color: T.inkSoft, marginTop: 2, fontStyle: 'italic' }}>{r.notes}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

        {/* Total + payment */}
        <Text style={SECT(T)}>Payment</Text>
        <View style={{
          padding: 14, borderRadius: 18,
          backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, gap: 8,
        }}>
          <Row T={T} k="Subtotal" v={`$${booking.amount.toFixed(2)}`} />
          <View style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: T.hairline,
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink }}>Total</Text>
            <Text style={{ fontSize: 22, fontWeight: '700', color: T.ink, letterSpacing: -0.5 }}>
              ${booking.amount.toFixed(2)}
            </Text>
          </View>
          <Row T={T} k="Payment" v={booking.paymentMethod?.label || 'Cash on completion'} />
        </View>

        {/* Review module — owner-only, only for completed */}
        {viewer === 'owner' && isCompleted ? (
          <>
            <Text style={SECT(T)}>Your review</Text>
            {myReview ? (
              <View style={{
                padding: 14, borderRadius: 18,
                backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', gap: 3 }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <Icon key={n} name={n <= myReview.rating ? 'star' : 'star-line'} size={16} color={n <= myReview.rating ? T.warn : T.inkMuted} />
                    ))}
                  </View>
                  <Text style={{ fontSize: 11.5, color: T.inkMuted }}>{myReview.when}</Text>
                </View>
                {myReview.text ? (
                  <Text style={{ marginTop: 10, fontSize: 14, color: T.inkSoft, lineHeight: 20 }}>
                    {myReview.text}
                  </Text>
                ) : null}
                {myReview.photoUrl ? (
                  <Image
                    source={{ uri: myReview.photoUrl }}
                    style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 14, marginTop: 12 }}
                    resizeMode="cover"
                  />
                ) : null}
                <View style={{ marginTop: 12, alignItems: 'center' }}>
                  <Pressable onPress={() => removeReview(myReview.id)} hitSlop={8}>
                    <Text style={{ color: T.danger, fontSize: 13, fontWeight: '600' }}>
                      Delete review
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{
                padding: 18, borderRadius: 18,
                backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderStyle: 'dashed',
                alignItems: 'center', gap: 10,
              }}>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <Icon key={n} name="star-line" size={20} color={T.inkMuted} />
                  ))}
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>
                  How was the {serviceLabel.toLowerCase()}?
                </Text>
                <Text style={{ fontSize: 12.5, color: T.inkMuted, textAlign: 'center', lineHeight: 17, maxWidth: 260 }}>
                  Help other pet owners by leaving a star rating, comment, and photo.
                </Text>
                <View style={{ marginTop: 4 }}>
                  <Button T={T} icon="star" onPress={() => setReviewSheetFor(booking)}>
                    Leave a review
                  </Button>
                </View>
              </View>
            )}
          </>
        ) : null}

        {/* ── Provider Actions section ── */}
        {viewer === 'provider' && (canChat || canCancel) ? (
          <>
            <Text style={SECT(T)}>Actions</Text>
            <View style={{ gap: 10 }}>
              {canChat ? (
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
                    Chat with {booking.ownerName.split(' ')[0]}
                  </Text>
                </Pressable>
              ) : null}
              {canCancel ? (
                <Pressable
                  onPress={() => setCancelOpen(true)}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                    padding: 14, borderRadius: 16,
                    backgroundColor: pressed ? '#FEF2F2' : T.surface,
                    borderWidth: 1.5, borderColor: T.danger,
                  })}
                >
                  <Icon name="x" size={18} color={T.danger} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: T.danger }}>
                    Cancel this booking
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </>
        ) : null}

        {/* ── Owner Actions section ── */}
        {viewer === 'owner' ? (
          <>
            <Text style={SECT(T)}>Actions</Text>
            <View style={{ gap: 8 }}>
              {canChat ? (
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
                    Chat with {booking.providerName.split(' ')[0]}
                  </Text>
                </Pressable>
              ) : null}
              {provider ? (
                <Button T={T} variant="ghost" full icon="calendar" onPress={onRebook}>Book again</Button>
              ) : null}
              {ownerCanCancel ? (
                <Pressable
                  onPress={handleOwnerCancel}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                    padding: 14, borderRadius: 16,
                    backgroundColor: pressed ? '#FEF2F2' : T.surface,
                    borderWidth: 1.5, borderColor: T.danger,
                  })}
                >
                  <Icon name="x" size={18} color={T.danger} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: T.danger }}>
                    Cancel booking
                  </Text>
                </Pressable>
              ) : null}
              {isFinalState ? (
                <Pressable onPress={onDelete} hitSlop={6} style={{ alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 14 }}>
                  <Text style={{ color: T.danger, fontSize: 14, fontWeight: '600' }}>Delete this booking</Text>
                </Pressable>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Animated.View>
    {chatOpen && canChat ? (
      <ChatSheet
        target={{ bookingId: booking.id, otherName: chatOtherName, recipientId: chatRecipientId }}
        T={T}
        onClose={() => setChatOpen(false)}
      />
    ) : null}
    {cancelOpen ? (
      <DeclineReasonSheet
        T={T}
        kind="booking"
        targetName={`${bookingCategoryLabel(booking)} · ${booking.ownerName}`}
        onConfirm={(reason) => {
          cancelBooking(booking.id, reason);
          setCancelOpen(false);
          onClose();
        }}
        onCancel={() => setCancelOpen(false)}
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
