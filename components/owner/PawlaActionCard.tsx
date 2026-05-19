import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useApp } from '../../lib/AppContext';
import type { Theme } from '../../types';
import type { PawlaAction, BookingDraftPayload, OrderDraftPayload } from '../../types/pawla';
import { Icon } from '../Icon';

type Status = 'idle' | 'busy' | 'done' | 'error';

export function PawlaActionCard({ action, T, onAfterConfirm }: {
  action: PawlaAction; T: Theme; onAfterConfirm: () => void;
}) {
  switch (action.kind) {
    case 'booking_draft':  return <BookingCard d={action.data} T={T} onAfterConfirm={onAfterConfirm} />;
    case 'order_draft':    return <OrderCard d={action.data} T={T} onAfterConfirm={onAfterConfirm} />;
    case 'cancel_booking': return <CancelBookingCard bookingId={action.bookingId} reason={action.reason} T={T} onAfterConfirm={onAfterConfirm} />;
    case 'reorder':        return <ReorderCard orderId={action.orderId} T={T} onAfterConfirm={onAfterConfirm} />;
    case 'open_review':    return <OpenReviewCard bookingId={action.bookingId} T={T} onAfterConfirm={onAfterConfirm} />;
    case 'open_screen':    return <OpenScreenCard screen={action.screen} T={T} onAfterConfirm={onAfterConfirm} />;
    case 'provider_picks': return null;
    case 'product_picks':  return null;
    default:               return null;
  }
}

// ─── Booking draft ──────────────────────────────────────────────────────────

function BookingCard({ d, T, onAfterConfirm }: {
  d: BookingDraftPayload; T: Theme; onAfterConfirm: () => void;
}) {
  const { providers, pets, allProviderServices, savedPaymentMethods, createBooking, showNotif } = useApp();
  const [status, setStatus] = useState<Status>('idle');

  const provider = providers.find(p => p.id === d.providerId);
  const myPets = d.petIds.map(id => pets.find(p => p.id === id)).filter(Boolean);
  // allProviderServices[id] is a Record<ServiceCategoryId, ProviderService[]>.
  // Flatten and tag each row with its category so we can pass it into the
  // BookingDraft (which needs categoryId on every line item).
  const flatServices = provider
    ? Object.entries(allProviderServices[provider.id] ?? {}).flatMap(([cat, arr]) =>
        (arr ?? []).map(s => ({ ...s, categoryId: cat as import('../../types').ServiceCategoryId })),
      )
    : [];
  const services = flatServices.filter(s => d.serviceIds.includes(s.id));
  const canConfirm = !!provider && myPets.length === d.petIds.length && services.length === d.serviceIds.length;

  const confirm = async () => {
    if (!provider || !canConfirm) return;
    setStatus('busy');
    try {
      // Map propose-output → BookingDraft shape AppContext.createBooking expects.
      const draftServices = services.map(s => ({
        id: s.id, name: s.name, price: s.price, unit: s.unit, qty: 1,
        categoryId: s.categoryId,
      }));
      const day = whenLabelParts(d.whenIso);
      const time = whenTime(d.whenIso);
      const address = [provider.name, provider.area].filter(Boolean).join(' · ') || provider.name || 'Provider location';
      const payment = d.paymentMethodId && d.paymentMethodId !== 'cash'
        ? savedPaymentMethods.find(m => m.id === d.paymentMethodId) ?? { id: 'cash', label: 'Pay in cash', icon: 'wallet' }
        : { id: 'cash', label: 'Pay in cash', icon: 'wallet' };

      await createBooking({
        provider,
        services: draftServices,
        pets: myPets as never,
        day, time,
        sharePassport: d.sharePassport,
        note: d.note ?? '',
        address,
        paymentMethod: payment as never,
      });
      setStatus('done');
      showNotif({ title: 'Booking sent', body: provider.name, icon: 'check' }, 3500);
      onAfterConfirm();
    } catch {
      setStatus('error');
    }
  };

  return (
    <Card T={T}>
      <CardHeader T={T} kind="Booking" tint={T.brand} icon="calendar" />
      <Row T={T} label="Provider"  value={d.providerName} />
      <Row T={T} label="Services"  value={d.serviceLabels.join(', ')} />
      <Row T={T} label="Pets"      value={d.petNames.join(', ')} />
      <Row T={T} label="When"      value={d.whenLabel} />
      <Row T={T} label="Payment"   value={d.paymentLabel ?? 'Pay in cash'} />
      {d.note ? <Row T={T} label="Note" value={d.note} /> : null}
      <TotalRow T={T} label="Estimated total" value={`$${d.estTotal.toFixed(2)}`} />
      {!canConfirm ? (
        <Warning T={T} text="Some details look out of date — open the booking sheet to finish manually." />
      ) : null}
      <Actions T={T} status={status} confirmLabel="Confirm booking" onConfirm={confirm} onDismiss={onAfterConfirm} />
    </Card>
  );
}

// ─── Order draft ────────────────────────────────────────────────────────────

function OrderCard({ d, T, onAfterConfirm }: {
  d: OrderDraftPayload; T: Theme; onAfterConfirm: () => void;
}) {
  const {
    products, cart, savedAddresses, savedPaymentMethods,
    clearCart, addToCart, changeQty, checkout, showNotif,
  } = useApp();
  const [status, setStatus] = useState<Status>('idle');

  const confirm = async () => {
    setStatus('busy');
    try {
      // Cart must be from a single vendor — clear if mismatched.
      const cartVendorMismatch = cart.length > 0 && cart[0].vendorId !== d.vendorId;
      if (cartVendorMismatch) clearCart();

      // Add each item at the requested quantity.
      for (const item of d.items) {
        const product = products.find(p => p.id === item.productId);
        if (!product) continue;
        const existing = cart.find(c => c.id === product.id);
        if (existing && !cartVendorMismatch) {
          changeQty(product.id, existing.qty + item.qty);
        } else {
          addToCart(product);
          for (let i = 1; i < item.qty; i++) changeQty(product.id, i + 1);
        }
      }

      const address = d.addressId ? savedAddresses.find(a => a.id === d.addressId) ?? null : null;
      const payment = d.paymentMethodId && d.paymentMethodId !== 'cash'
        ? savedPaymentMethods.find(m => m.id === d.paymentMethodId) ?? null
        : null;

      await checkout({ address, paymentMethod: payment, note: d.note });
      setStatus('done');
      showNotif({ title: 'Order placed', body: d.vendorName, icon: 'check' }, 3500);
      onAfterConfirm();
    } catch {
      setStatus('error');
    }
  };

  return (
    <Card T={T}>
      <CardHeader T={T} kind="Order" tint={T.brand} icon="bag" />
      <Row T={T} label="From" value={d.vendorName} />
      <View style={{ gap: 4, marginTop: 2 }}>
        {d.items.map(i => (
          <Text key={i.productId} style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 17 }}>
            · {i.qty} × {i.productName}  <Text style={{ color: T.inkMuted }}>(${(i.qty * i.unitPrice).toFixed(2)})</Text>
          </Text>
        ))}
      </View>
      <Row T={T} label="Address" value={d.addressLabel ?? 'No address selected'} />
      <Row T={T} label="Payment" value={d.paymentLabel ?? 'Pay in cash'} />
      {d.note ? <Row T={T} label="Note" value={d.note} /> : null}
      <TotalRow T={T} label="Total" value={`$${d.total.toFixed(2)}`} />
      <Actions T={T} status={status} confirmLabel="Place order" onConfirm={confirm} onDismiss={onAfterConfirm} />
    </Card>
  );
}

// ─── Cancel booking ─────────────────────────────────────────────────────────

function CancelBookingCard({ bookingId, reason, T, onAfterConfirm }: {
  bookingId: string; reason?: string; T: Theme; onAfterConfirm: () => void;
}) {
  const { bookings, cancelBooking, showNotif } = useApp();
  const [status, setStatus] = useState<Status>('idle');
  const booking = bookings.find(b => b.id === bookingId);

  const confirm = async () => {
    if (!booking) return;
    setStatus('busy');
    try {
      await cancelBooking(bookingId);
      setStatus('done');
      showNotif({ title: 'Booking cancelled', body: booking.providerName, icon: 'check' }, 3500);
      onAfterConfirm();
    } catch {
      setStatus('error');
    }
  };

  return (
    <Card T={T}>
      <CardHeader T={T} kind="Cancel booking" tint={T.danger} icon="x" />
      {booking ? (
        <>
          <Row T={T} label="Provider" value={booking.providerName} />
          <Row T={T} label="Service"  value={booking.service} />
          <Row T={T} label="When"     value={booking.when} />
        </>
      ) : (
        <Warning T={T} text="Couldn't find that booking — it may already be cancelled." />
      )}
      {reason ? <Row T={T} label="Reason" value={reason} /> : null}
      <Actions
        T={T} status={status}
        confirmLabel="Cancel booking" confirmDanger
        onConfirm={confirm} onDismiss={onAfterConfirm}
      />
    </Card>
  );
}

// ─── Reorder ────────────────────────────────────────────────────────────────

function ReorderCard({ orderId, T, onAfterConfirm }: {
  orderId: string; T: Theme; onAfterConfirm: () => void;
}) {
  const { orders, products, cart, clearCart, addToCart, changeQty, setCartOpen, showNotif } = useApp();
  const [status, setStatus] = useState<Status>('idle');
  const order = orders.find(o => o.id === orderId);

  const confirm = async () => {
    if (!order?.items?.length) return;
    setStatus('busy');
    try {
      if (cart.length > 0) clearCart();
      for (const i of order.items) {
        const product = products.find(p => p.id === i.id);
        if (!product) continue;
        addToCart(product);
        for (let q = 1; q < i.qty; q++) changeQty(product.id, q + 1);
      }
      setStatus('done');
      showNotif({ title: 'Re-added to cart', body: order.vendorName, icon: 'bag' }, 3500);
      setCartOpen(true);
      onAfterConfirm();
    } catch {
      setStatus('error');
    }
  };

  return (
    <Card T={T}>
      <CardHeader T={T} kind="Re-order" tint={T.brand} icon="bag" />
      {order ? (
        <>
          <Row T={T} label="From"  value={order.vendorName} />
          <Row T={T} label="Items" value={String(order.itemCount)} />
          <TotalRow T={T} label="Last total" value={`$${order.total.toFixed(2)}`} />
        </>
      ) : (
        <Warning T={T} text="Couldn't find that order in your activity." />
      )}
      <Actions T={T} status={status} confirmLabel="Add to cart" onConfirm={confirm} onDismiss={onAfterConfirm} />
    </Card>
  );
}

// ─── Open review / open screen ──────────────────────────────────────────────

function OpenReviewCard({ bookingId, T, onAfterConfirm }: {
  bookingId: string; T: Theme; onAfterConfirm: () => void;
}) {
  const { bookings, setReviewSheetFor } = useApp();
  const booking = bookings.find(b => b.id === bookingId);
  return (
    <Card T={T}>
      <CardHeader T={T} kind="Leave a review" tint={T.brand} icon="star" />
      {booking ? (
        <Row T={T} label="For" value={`${booking.providerName} · ${booking.service}`} />
      ) : (
        <Warning T={T} text="Couldn't find that booking." />
      )}
      <Actions
        T={T} status="idle" confirmLabel="Open review"
        onConfirm={() => {
          if (booking) setReviewSheetFor(booking);
          onAfterConfirm();
        }}
        onDismiss={onAfterConfirm}
      />
    </Card>
  );
}

function OpenScreenCard({ screen, T, onAfterConfirm }: {
  screen: string; T: Theme; onAfterConfirm: () => void;
}) {
  const {
    setOwnerTab, setProfileOpen, setPawPointsOpen, setReferralOpen, setEmergencyOpen,
  } = useApp();
  const go = () => {
    switch (screen) {
      case 'profile':    setProfileOpen(true);     break;
      case 'pawpoints':  setPawPointsOpen(true);   break;
      case 'referral':   setReferralOpen(true);    break;
      case 'emergency':  setEmergencyOpen(true);   break;
      case 'home':
      case 'browse':
      case 'favorites':
      case 'activity':
      case 'shop':       setOwnerTab(screen);      break;
    }
    onAfterConfirm();
  };
  return (
    <Card T={T}>
      <CardHeader T={T} kind="Open screen" tint={T.brand} icon="chevron-right" />
      <Row T={T} label="Going to" value={prettyScreenName(screen)} />
      <Actions T={T} status="idle" confirmLabel="Open" onConfirm={go} onDismiss={onAfterConfirm} />
    </Card>
  );
}

function prettyScreenName(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Shared primitives ──────────────────────────────────────────────────────

function Card({ T, children }: { T: Theme; children: React.ReactNode }) {
  return (
    <View style={{
      marginHorizontal: 14, marginTop: 4, marginBottom: 4,
      padding: 14, borderRadius: 18,
      backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
      gap: 8,
    }}>
      {children}
    </View>
  );
}

function CardHeader({ T, kind, tint, icon }: { T: Theme; kind: string; tint: string; icon: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <View style={{
        width: 24, height: 24, borderRadius: 12, backgroundColor: tint,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={12} color="#fff" />
      </View>
      <Text style={{ fontSize: 11.5, fontWeight: '700', color: T.inkMuted, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        {kind}
      </Text>
    </View>
  );
}

function Row({ T, label, value }: { T: Theme; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Text style={{ width: 72, fontSize: 12, color: T.inkMuted, fontWeight: '600' }}>{label}</Text>
      <Text style={{ flex: 1, fontSize: 13, color: T.ink, lineHeight: 18 }}>{value}</Text>
    </View>
  );
}

function TotalRow({ T, label, value }: { T: Theme; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: T.hairline }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: T.inkMuted, letterSpacing: 0.3 }}>{label.toUpperCase()}</Text>
      <Text style={{ fontSize: 16, fontWeight: '700', color: T.ink }}>{value}</Text>
    </View>
  );
}

function Warning({ T, text }: { T: Theme; text: string }) {
  return (
    <Text style={{ fontSize: 12, color: T.warn, lineHeight: 17 }}>⚠ {text}</Text>
  );
}

function Actions({ T, status, confirmLabel, confirmDanger, onConfirm, onDismiss }: {
  T: Theme; status: Status; confirmLabel: string; confirmDanger?: boolean;
  onConfirm: () => void; onDismiss: () => void;
}) {
  const busy = status === 'busy';
  const done = status === 'done';
  const err  = status === 'error';
  const confirmBg = confirmDanger ? T.danger : T.ink;
  return (
    <View style={{ gap: 6, marginTop: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={onDismiss} disabled={busy}
          style={({ pressed }) => ({
            flex: 1, height: 40, borderRadius: 12,
            backgroundColor: T.surfaceAlt,
            alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: T.inkSoft }}>Dismiss</Text>
        </Pressable>
        <Pressable
          onPress={onConfirm} disabled={busy || done}
          style={({ pressed }) => ({
            flex: 1.5, height: 40, borderRadius: 12,
            backgroundColor: done ? T.success : confirmBg,
            alignItems: 'center', justifyContent: 'center',
            flexDirection: 'row', gap: 6,
            opacity: pressed && !busy && !done ? 0.85 : 1,
          })}
        >
          {busy ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : done ? (
            <>
              <Icon name="check" size={13} color="#fff" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Done</Text>
            </>
          ) : (
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{confirmLabel}</Text>
          )}
        </Pressable>
      </View>
      {err ? (
        <Text style={{ fontSize: 11.5, color: T.danger, textAlign: 'center' }}>
          Something went wrong — try again or use the regular flow.
        </Text>
      ) : null}
    </View>
  );
}

// ─── ISO → human helpers ────────────────────────────────────────────────────

function whenLabelParts(iso: string) {
  try {
    const d = new Date(iso);
    return {
      label: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
      num:   d.getDate(),
      mon:   d.toLocaleDateString('en-GB', { month: 'short' }),
    };
  } catch {
    return { label: iso, num: 0, mon: '' };
  }
}
function whenTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}
