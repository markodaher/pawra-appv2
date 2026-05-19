import { Animated, Text, View } from 'react-native';
import { useApp } from '../../lib/AppContext';
import { useEnterAnim } from '../../lib/transitions';
import type { Theme } from '../../types';
import { Icon } from '../Icon';
import { Button } from '../primitives';

export function CheckoutSheet({ T, total, onClose }: { T: Theme; total: number; onClose: () => void }) {
  const { lastCheckoutMeta, setOwnerTab, bookings, orders } = useApp();
  const isBooking = lastCheckoutMeta?.kind === 'booking';
  const meta = lastCheckoutMeta;

  // Use the actual DB-assigned sequential number from the most recently created
  // booking/order. While the DB insert is in flight (~200ms after confirm), the
  // number may not be available yet — show "—" rather than a fake number that
  // would change on re-render.
  const recentBookingNumber = isBooking
    ? [...bookings].sort((a, b) => b.createdAt - a.createdAt)[0]?.bookingNumber
    : undefined;
  const recentOrderNumber = !isBooking
    ? [...orders].sort((a, b) => b.createdAt - a.createdAt)[0]?.orderNumber
    : undefined;
  const displayId = isBooking
    ? (recentBookingNumber ? `BR-${recentBookingNumber}` : '—')
    : (recentOrderNumber   ? `LB-${recentOrderNumber}`   : '—');

  const provider = isBooking && meta?.kind === 'booking' ? meta.providerNames[0] : null;
  const count = isBooking && meta?.kind === 'booking' ? meta.count : 0;

  const handleDone = () => {
    onClose();
    if (isBooking) setOwnerTab('activity');
  };

  const anim = useEnterAnim('fade');
  return (
    <Animated.View style={[{
      position: 'absolute', inset: 0, zIndex: 75, backgroundColor: T.bg,
      paddingTop: 20, paddingHorizontal: 24, paddingBottom: 28,
    }, anim.sheet]}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{
          width: 88, height: 88, borderRadius: 44, backgroundColor: T.brandSoft,
          alignItems: 'center', justifyContent: 'center', marginBottom: 20,
        }}>
          <Icon name={isBooking ? 'send' : 'check'} size={40} color={T.brand} strokeWidth={2.5} />
        </View>
        <Text style={{ fontSize: 26, fontWeight: '700', color: T.ink, letterSpacing: -0.5 }}>
          {isBooking ? 'Booking sent' : 'Order placed'}
        </Text>
        <Text style={{ fontSize: 15, color: T.inkSoft, lineHeight: 22, marginVertical: 10, marginBottom: 20, maxWidth: 300, textAlign: 'center' }}>
          {isBooking
            ? `${provider || 'The provider'} usually responds within minutes. You'll get a notification when it's confirmed.`
            : "Your order is being prepared. You'll get a notification when it's on the way."}
        </Text>
        <View style={{
          padding: 14, borderRadius: 16, backgroundColor: T.bgRaised,
          borderWidth: 1, borderColor: T.hairline,
          width: '100%', maxWidth: 300, gap: 6,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: T.inkSoft, fontSize: 13 }}>{isBooking ? 'Request' : 'Order'}</Text>
            <Text style={{ fontWeight: '700', color: T.ink, fontSize: 13 }}>#{displayId}</Text>
          </View>
          {isBooking && count > 0 ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: T.inkSoft, fontSize: 13 }}>Bookings</Text>
              <Text style={{ fontWeight: '700', color: T.ink, fontSize: 13 }}>
                {count} {count === 1 ? 'service' : 'services'}
              </Text>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: T.inkSoft, fontSize: 13 }}>{isBooking ? 'Estimated total' : 'Total'}</Text>
            <Text style={{ fontWeight: '700', color: T.ink, fontSize: 13 }}>${total.toFixed(2)}</Text>
          </View>
          {isBooking ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: T.inkSoft, fontSize: 13 }}>Charged</Text>
              <Text style={{ fontWeight: '700', color: T.ink, fontSize: 13 }}>On completion</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: T.inkSoft, fontSize: 13 }}>ETA</Text>
              <Text style={{ fontWeight: '700', color: T.ink, fontSize: 13 }}>Today, ~45 min</Text>
            </View>
          )}
        </View>
      </View>
      <Button T={T} full size="lg" onPress={handleDone} icon={isBooking ? 'list' : undefined}>
        {isBooking ? 'Track in Activity' : 'Done'}
      </Button>
    </Animated.View>
  );
}
