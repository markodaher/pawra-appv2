import { useEffect, useMemo, useState } from 'react';
import {
  Animated, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View,
} from 'react-native';
import { WhishPaymentSheet } from './WhishPaymentSheet';
import { SERVICE_TYPES } from '../../constants/data';
import { FONT } from '../../constants/theme';
import { useApp } from '../../lib/AppContext';
import type { BookingDraft } from '../../lib/AppContext';
import { firstBookableDayIndex, openStatus, slotsForDate } from '../../lib/hours';
import { useEnterAnim } from '../../lib/transitions';
import type { PaymentMethod, Pet, Provider, ProviderService, ServiceCategoryId, Theme } from '../../types';
import { Icon } from '../Icon';
import { Avatar, Button } from '../primitives';

const SLOTS = ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '17:30', '18:30'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type Selection = { svc: ProviderService; qty: number; categoryId: ServiceCategoryId };

export function ServiceBookingSheet({ T, provider, onClose }: {
  T: Theme;
  provider: Provider;
  onClose: () => void;
}) {
  const {
    pets, allProviderServices, createBooking,
    paymentMethods, setPaymentMethodEditorOpen, pawPoints,
  } = useApp();

  // Group active offerings by category so step 1 + step 4 both render with section headers.
  const offeringsByCategory = useMemo(() => {
    const map = allProviderServices[provider.id];
    if (!map) return [] as { cat: ServiceCategoryId; services: ProviderService[] }[];
    return (provider.categories || [])
      .map((cat: ServiceCategoryId) => ({
        cat,
        services: (map[cat] || []).filter(s => s.active),
      }))
      .filter(g => g.services.length > 0);
  }, [allProviderServices, provider.id, provider.categories]);

  const hasAnyOffering = offeringsByCategory.some(g => g.services.length > 0);

  const today = useMemo(() => new Date(), []);
  // If the shop is closed right now, default-select the first day with an
  // open slot. Mirrors how delivery apps surface "next open time" instead of
  // forcing the user to discover it.
  const initialDay = useMemo(
    () => firstBookableDayIndex(provider.weeklyHours, today, 14, SLOTS),
    [provider.weeklyHours, today],
  );
  const status = useMemo(() => openStatus(provider.weeklyHours, today), [provider.weeklyHours, today]);

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [selections, setSelections] = useState<Record<string, Selection>>({});
  const [petIds, setPetIds] = useState<string[]>(pets[0] ? [pets[0].id] : []);
  const [recurring, setRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [usePoints, setUsePoints] = useState(false);
  const [day, setDay] = useState(initialDay);
  const [time, setTime] = useState<string | null>(null);
  const [note, setNote] = useState('');
  // Bookings happen at the store — the "address" on the booking row is the
  // provider's location for the provider's records, not something the owner
  // enters. Build it from the provider so the review screen + DB stay accurate.
  const address = [provider.name, provider.area].filter(Boolean).join(' · ') || provider.area || provider.name || 'Provider location';
  const [paymentId, setPaymentId] = useState<string>('cash');
  const [submitting, setSubmitting] = useState(false);

  const dayDates = useMemo(() => {
    const out: Date[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i);
      out.push(d);
    }
    return out;
  }, [today]);
  const days = useMemo(
    () => dayDates.map(d => ({ label: DAY_LABELS[d.getDay()], num: d.getDate(), mon: MONTHS[d.getMonth()] })),
    [dayDates],
  );
  // Pre-compute per-day slot availability against the provider's hours so the
  // date and time pickers can disable everything outside the open window.
  const daySlotAvailability = useMemo(
    () => dayDates.map(d => slotsForDate(provider.weeklyHours, d, SLOTS, today)),
    [dayDates, provider.weeklyHours, today],
  );

  // If the user lands on / moves to a day with no open slots, hop to the
  // next bookable one. Also clear a previously-picked time if the new day's
  // slot grid has invalidated it.
  useEffect(() => {
    const here = daySlotAvailability[day];
    const stillValid = time && here?.find(s => s.time === time)?.available;
    if (!stillValid) setTime(null);
  }, [day, daySlotAvailability, time]);

  const selectedPets = pets.filter(p => petIds.includes(p.id));
  const selectedServices = Object.values(selections);
  const petsCount = selectedPets.length;

  // Each service is booked per pet, so the total scales with petsCount.
  const subtotal = useMemo(() =>
    selectedServices.reduce((sum, { svc, qty }) =>
      sum + svc.price * qty * Math.max(1, petsCount), 0),
  [selectedServices, petsCount]);

  const paymentMethod: PaymentMethod = paymentMethods.find(p => p.id === paymentId) || paymentMethods[0];

  const toggleService = (svc: ProviderService, categoryId: ServiceCategoryId) => {
    setSelections(curr => {
      const next = { ...curr };
      if (next[svc.id]) delete next[svc.id];
      else next[svc.id] = { svc, qty: 1, categoryId };
      return next;
    });
  };

  const setQty = (id: string, qty: number) => {
    if (qty < 1) return;
    setSelections(curr => curr[id] ? { ...curr, [id]: { ...curr[id], qty } } : curr);
  };

  const togglePet = (id: string) => {
    setPetIds(curr => curr.includes(id) ? curr.filter(x => x !== id) : [...curr, id]);
  };

  // Validation per step
  const canAdvanceStep0 = selectedServices.length > 0 && selectedPets.length > 0;
  const canAdvanceStep1 = !!time;
  const canAdvanceStep2 = !!paymentId;

  const [whishOpen,  setWhishOpen]  = useState(false);
  const [pendingDraft, setPendingDraft] = useState<BookingDraft | null>(null);

  const onPrimary = async () => {
    Keyboard.dismiss();
    if (step === 0 && canAdvanceStep0) { setStep(1); return; }
    if (step === 1 && canAdvanceStep1) { setStep(2); return; }
    if (step === 2 && canAdvanceStep2) { setStep(3); return; }
    if (step === 3) {
      if (!time) return;
      setSubmitting(true);
      const draft: BookingDraft = {
        provider,
        services: selectedServices.map(({ svc, qty, categoryId }) => ({
          id: svc.id, name: svc.name, price: svc.price, unit: svc.unit, qty, categoryId,
        })),
        pets: selectedPets,
        day: days[day],
        time,
        sharePassport: true,
        note,
        address,
        paymentMethod,
        recurring,
        recurringInterval: recurring ? recurringInterval : undefined,
        pointsRedeemed: usePoints ? Math.min(pawPoints, Math.floor(subtotal * 20)) : 0,
      };
      // Whish: open payment sheet before confirming booking.
      if (paymentMethod?.kind === 'whish') {
        setPendingDraft(draft);
        setSubmitting(false);
        setWhishOpen(true);
        return;
      }
      await createBooking(draft);
      // createBooking closes us via setBookingOpen(null) in context
    }
  };

  const onBack = () => {
    if (step === 0) onClose();
    else setStep(s => (s - 1) as 0 | 1 | 2 | 3);
  };

  const titleByStep = ['Pick services & dogs', 'Date & time', 'Payment', 'Review booking'];
  const ctaByStep = ['Next: date & time', 'Next: payment', 'Review', 'Confirm booking'];
  const ctaIconByStep = [undefined, undefined, undefined, 'check'] as const;
  const canAdvanceByStep = [canAdvanceStep0, canAdvanceStep1, canAdvanceStep2, true];
  const multiPet = petsCount > 1 && selectedServices.length > 0;

  const anim = useEnterAnim('right');
  return (
    <>
    <Animated.View style={[{ position: 'absolute', inset: 0, zIndex: 92 }, anim.sheet]}>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: T.bg }}
    >
      {/* Header */}
      <View style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={onBack} style={{
            width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface,
            borderWidth: 1, borderColor: T.hairline,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name={step === 0 ? 'x' : 'chevron-left'} size={18} color={T.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: T.inkMuted, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' }}>
              Step {step + 1} of 4 · {provider.name || 'Provider'}
            </Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>
              {titleByStep[step]}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 12 }}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= step ? T.brand : T.surfaceAlt }} />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        {/* Step 0 — services + pets */}
        {step === 0 ? (
          <>
            <Text style={SECT(T)}>Services</Text>
            {!hasAnyOffering ? (
              <View style={{
                padding: 18, borderRadius: 16, backgroundColor: T.surface,
                borderWidth: 1, borderColor: T.hairline, borderStyle: 'dashed',
                alignItems: 'center',
              }}>
                <Text style={{ fontSize: 13.5, color: T.inkMuted, textAlign: 'center' }}>
                  This provider hasn't published any services yet.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 18 }}>
                {offeringsByCategory.map(({ cat, services: svcs }) => {
                  const meta = SERVICE_TYPES.find(s => s.id === cat);
                  return (
                    <View key={cat}>
                      {/* Category header */}
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8,
                      }}>
                        <View style={{
                          width: 28, height: 28, borderRadius: 9, backgroundColor: T.brandSoft,
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Icon name={meta?.icon || 'tag'} size={14} color={T.brand} />
                        </View>
                        <Text style={{
                          fontSize: 13, fontWeight: '700', color: T.ink, letterSpacing: 0.3,
                          textTransform: 'uppercase',
                        }}>{meta?.label || cat}</Text>
                      </View>
                      <View style={{ gap: 8 }}>
                        {svcs.map(svc => {
                          const sel = !!selections[svc.id];
                          const qty = selections[svc.id]?.qty ?? 1;
                          return (
                            <Pressable key={svc.id} onPress={() => toggleService(svc, cat)} style={{
                              padding: 14, borderRadius: 16,
                              backgroundColor: sel ? T.brandSoft : T.surface,
                              borderWidth: 1.5, borderColor: sel ? T.brand : T.hairline,
                            }}>
                              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                                <View style={{
                                  width: 24, height: 24, borderRadius: 6, marginTop: 2,
                                  backgroundColor: sel ? T.brand : 'transparent',
                                  borderWidth: 1.5, borderColor: sel ? T.brand : T.inkMuted,
                                  alignItems: 'center', justifyContent: 'center',
                                }}>
                                  {sel ? <Icon name="check" size={14} color="#fff" strokeWidth={2.5} /> : null}
                                </View>
                                <View style={{ flex: 1 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={{ fontSize: 15, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>{svc.name}</Text>
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink }}>
                                      ${svc.price}
                                      <Text style={{ fontSize: 11, fontWeight: '500', color: T.inkMuted }}>{svc.unit}</Text>
                                    </Text>
                                  </View>
                                  {svc.desc ? (
                                    <Text style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 4, lineHeight: 17 }}>{svc.desc}</Text>
                                  ) : null}
                                  {sel ? (
                                    <View style={{
                                      marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: T.hairline,
                                      flexDirection: 'row', alignItems: 'center', gap: 12,
                                    }}>
                                      <Text style={{ fontSize: 12.5, fontWeight: '600', color: T.inkSoft }}>How many sessions?</Text>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 18, backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline }}>
                                        <Pressable onPress={(e) => { e?.stopPropagation?.(); setQty(svc.id, qty - 1); }} hitSlop={6} style={qtyBtn}>
                                          <Icon name="minus" size={13} color={qty <= 1 ? T.inkMuted : T.ink} />
                                        </Pressable>
                                        <Text style={{ width: 28, textAlign: 'center', fontWeight: '700', color: T.ink, fontSize: 14 }}>{qty}</Text>
                                        <Pressable onPress={(e) => { e?.stopPropagation?.(); setQty(svc.id, qty + 1); }} hitSlop={6} style={qtyBtn}>
                                          <Icon name="plus" size={13} color={T.ink} />
                                        </Pressable>
                                      </View>
                                    </View>
                                  ) : null}
                                </View>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <Text style={SECT(T)}>For which pets?</Text>
            {pets.length === 0 ? (
              <View style={{
                padding: 18, borderRadius: 16, backgroundColor: T.surface,
                borderWidth: 1, borderColor: T.hairline, borderStyle: 'dashed',
                alignItems: 'center', gap: 8,
              }}>
                <Icon name="paw" size={26} color={T.inkMuted} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>Add a pet first</Text>
                <Text style={{ fontSize: 12.5, color: T.inkMuted, textAlign: 'center' }}>
                  Add at least one pet from your profile to book a service.
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {pets.map(p => {
                  const sel = petIds.includes(p.id);
                  return (
                    <Pressable key={p.id} onPress={() => togglePet(p.id)} style={{
                      width: '48%', padding: 14, borderRadius: 16,
                      backgroundColor: sel ? T.brandSoft : T.surface,
                      borderWidth: 1.5, borderColor: sel ? T.brand : T.hairline,
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Avatar name={p.name} size={34} type="pet" T={T} imageUrl={p.imageUrl} />
                        <View style={{ flex: 1 }}>
                          <Text numberOfLines={1} style={{ fontWeight: '700', color: T.ink, fontSize: 14 }}>{p.name}</Text>
                          <Text numberOfLines={1} style={{ fontSize: 11, color: T.inkMuted }}>{p.breed}</Text>
                        </View>
                        <View style={{
                          width: 18, height: 18, borderRadius: 4,
                          backgroundColor: sel ? T.brand : 'transparent',
                          borderWidth: 1.5, borderColor: sel ? T.brand : T.inkMuted,
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          {sel ? <Icon name="check" size={11} color="#fff" strokeWidth={2.5} /> : null}
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {multiPet ? (
              <View style={{
                marginTop: 14, padding: 12, borderRadius: 12,
                backgroundColor: T.accentSoft, flexDirection: 'row', alignItems: 'center', gap: 8,
              }}>
                <Icon name="paw" size={14} color={T.accent} />
                <Text style={{ flex: 1, fontSize: 12.5, color: T.accent, fontWeight: '600' }}>
                  Each service is booked per pet — total reflects {petsCount} pets.
                </Text>
              </View>
            ) : null}
          </>
        ) : null}

        {/* Step 1 — date + time + address + note */}
        {step === 1 ? (
          <>
            {!status.open ? (
              <View style={{
                marginBottom: 4, padding: 12, borderRadius: 14,
                backgroundColor: T.surfaceAlt, borderWidth: 1, borderColor: T.hairline,
                flexDirection: 'row', alignItems: 'center', gap: 10,
              }}>
                <Icon name="clock" size={14} color={T.inkSoft} />
                <Text style={{ flex: 1, fontSize: 12.5, color: T.inkSoft, fontWeight: '600', lineHeight: 17 }}>
                  Closed right now. Pick the next open slot — the provider sees the request the moment they open.
                </Text>
              </View>
            ) : null}

            <Text style={SECT(T)}>Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
              {days.map((d, i) => {
                const sel = day === i;
                const dayHasOpenSlots = daySlotAvailability[i].some(s => s.available);
                const disabled = !dayHasOpenSlots;
                return (
                  <Pressable
                    key={i}
                    onPress={() => !disabled && setDay(i)}
                    disabled={disabled}
                    style={{
                      width: 56, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 14,
                      backgroundColor: sel ? T.brand : T.surface,
                      borderWidth: 1, borderColor: sel ? T.brand : T.hairline,
                      alignItems: 'center', gap: 2,
                      opacity: disabled ? 0.4 : 1,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: sel ? '#fff' : T.ink, opacity: 0.85 }}>{d.label}</Text>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: sel ? '#fff' : T.ink }}>{d.num}</Text>
                    <Text style={{ fontSize: 10, color: sel ? '#fff' : T.ink, opacity: 0.7 }}>{d.mon}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={SECT(T)}>Time</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SLOTS.map((s, i) => {
                const sel = time === s;
                const available = daySlotAvailability[day][i]?.available ?? false;
                return (
                  <Pressable
                    key={s}
                    onPress={() => available && setTime(s)}
                    disabled={!available}
                    style={{
                      width: '23%', height: 44, borderRadius: 12,
                      backgroundColor: sel ? T.ink : T.surface,
                      borderWidth: 1, borderColor: sel ? T.ink : T.hairline,
                      alignItems: 'center', justifyContent: 'center',
                      opacity: available ? 1 : 0.35,
                    }}
                  >
                    <Text style={{
                      color: sel ? T.bg : T.ink,
                      fontWeight: '600', fontSize: 13.5,
                      textDecorationLine: !available ? 'line-through' : 'none',
                    }}>{s}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={SECT(T)}>Note for provider (optional)</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Anything they should know? E.g. behavior, allergies, gate code…"
              placeholderTextColor={T.inkMuted}
              multiline
              inputAccessoryViewID={Platform.OS === 'ios' ? 'pawra-done-bar' : undefined}
              style={{
                minHeight: 90, padding: 14, borderRadius: 16,
                backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
                fontFamily: FONT.sans, fontSize: 14.5, color: T.ink, textAlignVertical: 'top',
              }}
            />
          </>
        ) : null}

        {/* Step 2 — payment method */}
        {step === 2 ? (
          <>
            <Text style={SECT(T)}>Choose how to pay</Text>
            <View style={{ gap: 8 }}>
              {paymentMethods.map(pm => {
                const sel = paymentId === pm.id;
                return (
                  <Pressable key={pm.id} onPress={() => setPaymentId(pm.id)} style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    padding: 14, borderRadius: 16,
                    backgroundColor: sel ? T.brandSoft : T.surface,
                    borderWidth: 1.5, borderColor: sel ? T.brand : T.hairline,
                  }}>
                    <View style={{
                      width: 40, height: 40, borderRadius: 12,
                      backgroundColor: sel ? T.brand : T.surfaceAlt,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name={pm.icon} size={18} color={sel ? '#fff' : T.ink} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14.5, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>{pm.label}</Text>
                      {pm.sub ? <Text style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>{pm.sub}</Text> : null}
                    </View>
                    <View style={{
                      width: 22, height: 22, borderRadius: 11,
                      backgroundColor: sel ? T.brand : 'transparent',
                      borderWidth: 1.5, borderColor: sel ? T.brand : T.inkMuted,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {sel ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} /> : null}
                    </View>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setPaymentMethodEditorOpen('new')}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  padding: 14, borderRadius: 16,
                  borderWidth: 1.5, borderColor: T.hairline, borderStyle: 'dashed',
                }}>
                <View style={{
                  width: 40, height: 40, borderRadius: 12, backgroundColor: T.surfaceAlt,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="plus" size={18} color={T.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>
                    Add new payment method
                  </Text>
                  <Text style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>
                    Saved to your profile · usable on every checkout
                  </Text>
                </View>
              </Pressable>
            </View>
            <View style={{
              marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8,
              padding: 12, borderRadius: 12, backgroundColor: T.surfaceAlt,
            }}>
              <Icon name="shield" size={14} color={T.inkSoft} />
              <Text style={{ flex: 1, fontSize: 12, color: T.inkSoft, lineHeight: 17 }}>
                You're only charged when the booking completes. Cancel free up to 2h before.
              </Text>
            </View>
          </>
        ) : null}

        {/* Step 3 — review */}
        {step === 3 ? (
          <>
            {/* Provider summary */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              padding: 14, borderRadius: 16,
              backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
            }}>
              <View style={{
                width: 44, height: 44, borderRadius: 12, backgroundColor: T.brandSoft,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={provider.icon} size={20} color={T.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>{provider.name}</Text>
                <Text style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>
                  {provider.staff || 'Provider'}{provider.area ? ` · ${provider.area}` : ''}
                </Text>
              </View>
            </View>

            <Text style={SECT(T)}>Services</Text>
            <View style={{ gap: 10 }}>
              {offeringsByCategory.map(({ cat, services: svcs }) => {
                const meta = SERVICE_TYPES.find(s => s.id === cat);
                const selectedInCat = svcs
                  .map(s => selections[s.id] ? { svc: s, qty: selections[s.id]!.qty } : null)
                  .filter((x): x is { svc: ProviderService; qty: number } => x !== null);
                if (selectedInCat.length === 0) return null;
                return (
                  <View key={cat} style={{
                    padding: 14, borderRadius: 16,
                    backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, gap: 10,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <View style={{
                        width: 24, height: 24, borderRadius: 8, backgroundColor: T.brandSoft,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon name={meta?.icon || 'tag'} size={12} color={T.brand} />
                      </View>
                      <Text style={{
                        fontSize: 12, fontWeight: '700', color: T.ink,
                        letterSpacing: 0.3, textTransform: 'uppercase',
                      }}>
                        {meta?.label || cat}
                      </Text>
                    </View>
                    {selectedInCat.map(({ svc, qty }, i) => {
                      const lineTotal = svc.price * qty * Math.max(1, petsCount);
                      return (
                        <View key={svc.id} style={{
                          flexDirection: 'row', justifyContent: 'space-between', gap: 10,
                          paddingTop: i > 0 ? 8 : 0,
                          borderTopWidth: i > 0 ? 1 : 0, borderTopColor: T.hairline,
                        }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>{svc.name}</Text>
                            <Text style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>
                              ${svc.price}{svc.unit}
                              {petsCount > 1 ? ` · × ${petsCount} pets` : ''}
                              {qty > 1 ? ` · × ${qty}` : ''}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink }}>${lineTotal.toFixed(2)}</Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>

            <Text style={SECT(T)}>Booking details</Text>
            <View style={{
              padding: 14, borderRadius: 16,
              backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, gap: 10,
            }}>
              <Row T={T} k="Pets" v={selectedPets.map(p => p.name).join(', ') || '—'} />
              <Row T={T} k="When" v={`${days[day].label} ${days[day].num} ${days[day].mon} · ${time}`} />
              <Row T={T} k="At" v={[provider.name, provider.area].filter(Boolean).join(' · ') || 'Provider location'} />
              {note ? (
                <View style={{ paddingTop: 6, borderTopWidth: 1, borderTopColor: T.hairline }}>
                  <Text style={{ fontSize: 12, color: T.inkMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 }}>Note</Text>
                  <Text style={{ marginTop: 4, fontSize: 13.5, color: T.inkSoft, lineHeight: 18, fontStyle: 'italic' }}>"{note}"</Text>
                </View>
              ) : null}
            </View>

            {/* Recurring toggle */}
            <Pressable
              onPress={() => setRecurring(r => !r)}
              style={{
                marginTop: 16,
                flexDirection: 'row', alignItems: 'center', gap: 14,
                padding: 14, borderRadius: 16,
                backgroundColor: recurring ? T.brandSoft : T.surface,
                borderWidth: 1, borderColor: recurring ? T.brand : T.hairline,
              }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: recurring ? T.brand : T.surfaceAlt,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="calendar" size={16} color={recurring ? '#fff' : T.inkMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>
                  Make this recurring
                </Text>
                <Text style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>
                  Auto-books the next one when this completes
                </Text>
              </View>
              <View style={{
                width: 44, height: 26, borderRadius: 13,
                backgroundColor: recurring ? T.brand : T.surfaceAlt,
                justifyContent: 'center', paddingHorizontal: 2,
              }}>
                <View style={{
                  width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff',
                  alignSelf: recurring ? 'flex-end' : 'flex-start',
                  shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.15, shadowRadius: 2, elevation: 2,
                }} />
              </View>
            </Pressable>

            {/* Frequency selector — only when recurring is on */}
            {recurring ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                {(['weekly', 'biweekly', 'monthly'] as const).map(opt => {
                  const label = opt === 'weekly' ? 'Weekly' : opt === 'biweekly' ? 'Every 2 weeks' : 'Monthly';
                  const sel = recurringInterval === opt;
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => setRecurringInterval(opt)}
                      style={{
                        flex: 1, height: 36, borderRadius: 10,
                        backgroundColor: sel ? T.brand : T.surface,
                        borderWidth: 1, borderColor: sel ? T.brand : T.hairline,
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: sel ? '#fff' : T.inkMuted }}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <Text style={SECT(T)}>Payment</Text>
            <View style={{
              padding: 14, borderRadius: 16,
              backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
              flexDirection: 'row', alignItems: 'center', gap: 12,
            }}>
              <View style={{
                width: 40, height: 40, borderRadius: 12, backgroundColor: T.brandSoft,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={paymentMethod.icon} size={18} color={T.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: T.inkMuted, fontWeight: '600' }}>Paying with</Text>
                <Text style={{ fontSize: 14.5, fontWeight: '700', color: T.ink, letterSpacing: -0.2, marginTop: 2 }}>{paymentMethod.label}</Text>
              </View>
              <Pressable onPress={() => setStep(2)} hitSlop={6}>
                <Text style={{ color: T.brand, fontSize: 13, fontWeight: '600' }}>Change</Text>
              </Pressable>
            </View>

            {multiPet ? (
              <View style={{
                marginTop: 16, padding: 12, borderRadius: 12,
                backgroundColor: T.accentSoft, flexDirection: 'row', alignItems: 'center', gap: 8,
              }}>
                <Icon name="paw" size={14} color={T.accent} />
                <Text style={{ flex: 1, fontSize: 12.5, color: T.accent, fontWeight: '600' }}>
                  Each service is booked per pet — total reflects {petsCount} pets.
                </Text>
              </View>
            ) : null}

            {/* Paw Points redemption — only if owner has ≥100 pts */}
            {pawPoints >= 100 ? (() => {
              const maxPts = Math.min(pawPoints, Math.floor(subtotal * 20));
              const discount = maxPts / 100;
              return (
                <Pressable
                  onPress={() => setUsePoints(u => !u)}
                  style={{
                    marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12,
                    padding: 14, borderRadius: 16,
                    backgroundColor: usePoints ? '#fff8e1' : T.surface,
                    borderWidth: 1, borderColor: usePoints ? T.warn : T.hairline,
                  }}
                >
                  <Text style={{ fontSize: 20 }}>🐾</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>
                      Use Paw Points
                    </Text>
                    <Text style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>
                      {usePoints
                        ? `Using ${maxPts} pts · saves $${discount.toFixed(2)}`
                        : `${pawPoints} pts available · save up to $${discount.toFixed(2)}`}
                    </Text>
                  </View>
                  <View style={{
                    width: 44, height: 26, borderRadius: 13,
                    backgroundColor: usePoints ? T.warn : T.surfaceAlt,
                    justifyContent: 'center', paddingHorizontal: 2,
                  }}>
                    <View style={{
                      width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff',
                      alignSelf: usePoints ? 'flex-end' : 'flex-start',
                      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.15, shadowRadius: 2, elevation: 2,
                    }} />
                  </View>
                </Pressable>
              );
            })() : null}

            {(() => {
              const ptsUsed = usePoints ? Math.min(pawPoints, Math.floor(subtotal * 20)) : 0;
              const ptsDiscount = ptsUsed / 100;
              const finalTotal = Math.max(0, subtotal - ptsDiscount);
              return (
                <View style={{
                  marginTop: 16, padding: 16, borderRadius: 18,
                  backgroundColor: T.brandSoft, borderWidth: 1, borderColor: T.brand, gap: 6,
                }}>
                  {usePoints && ptsDiscount > 0 ? (
                    <>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12.5, color: T.brandInk, opacity: 0.8 }}>Subtotal</Text>
                        <Text style={{ fontSize: 13, color: T.brandInk, opacity: 0.8 }}>${subtotal.toFixed(2)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12.5, color: T.brandInk, opacity: 0.8 }}>
                          Paw Points ({ptsUsed.toLocaleString()})
                        </Text>
                        <Text style={{ fontSize: 13, color: T.brandInk, opacity: 0.8 }}>−${ptsDiscount.toFixed(2)}</Text>
                      </View>
                      <View style={{ height: 1, backgroundColor: T.brand + '30', marginVertical: 4 }} />
                    </>
                  ) : null}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: T.brandInk, letterSpacing: 0.3, textTransform: 'uppercase' }}>Total</Text>
                    <Text style={{ fontSize: 24, fontWeight: '700', color: T.brandInk, letterSpacing: -0.5 }}>
                      ${finalTotal.toFixed(2)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11.5, color: T.brandInk, opacity: 0.85, marginTop: 2 }}>
                    Charged on completion · free cancellation up to 2h before
                  </Text>
                </View>
              );
            })()}
          </>
        ) : null}
      </ScrollView>

      {/* Sticky footer with subtotal + primary CTA */}
      <View style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28,
        backgroundColor: T.bg, borderTopWidth: 1, borderTopColor: T.hairline,
        flexDirection: 'row', alignItems: 'center', gap: 12,
      }}>
        <View>
          <Text style={{ fontSize: 10.5, color: T.inkMuted, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' }}>
            {step === 3 && usePoints ? 'Total' : 'Subtotal'}
          </Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: T.ink, letterSpacing: -0.4, marginTop: 2 }}>
            ${(step === 3 ? Math.max(0, subtotal - (usePoints ? Math.min(pawPoints, Math.floor(subtotal * 20)) / 100 : 0)) : subtotal).toFixed(2)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Button
            T={T} full size="lg"
            onPress={onPrimary}
            icon={ctaIconByStep[step]}
            disabled={submitting || !canAdvanceByStep[step]}
          >
            {submitting && step === 3 ? 'Sending…' : ctaByStep[step]}
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
    </Animated.View>
    <WhishPaymentSheet
      visible={whishOpen}
      T={T}
      amount={subtotal}
      reference={`booking_pending_${Date.now()}`}
      description={`Pawra booking · ${provider.name}`}
      onSuccess={async () => {
        setWhishOpen(false);
        if (pendingDraft) { await createBooking(pendingDraft); setPendingDraft(null); }
      }}
      onClose={() => { setWhishOpen(false); setPendingDraft(null); }}
    />
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

const qtyBtn = { width: 32, height: 32, alignItems: 'center' as const, justifyContent: 'center' as const };
