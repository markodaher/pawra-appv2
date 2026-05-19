import { ActivityIndicator, Animated, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePawraTheme } from '../constants/theme';
import { useApp } from '../lib/AppContext';
import { useEnterAnim } from '../lib/transitions';

import { Icon } from '../components/Icon';
import { KeyboardDoneBar, TabBar } from '../components/primitives';
import { NotifBanner } from '../components/NotifBanner';
import { ChatSheet } from '../components/ChatSheet';
import { NotifCenterSheet } from '../components/NotifCenterSheet';
import { Onboarding } from '../components/Onboarding';

import { OwnerHome } from '../components/owner/Home';
import { OwnerBrowse } from '../components/owner/Browse';
import { OwnerFavorites } from '../components/owner/Saved';
import { OwnerActivity } from '../components/owner/Activity';
import { OwnerShop } from '../components/owner/Shop';
import { OwnerProfile } from '../components/owner/Profile';
import { PawlaChat } from '../components/owner/PawlaChat';
import { OwnerProfileSetup } from '../components/owner/ProfileSetup';
import { PetSheet } from '../components/owner/PetSheet';
import { ActivityDetailSheet } from '../components/owner/ActivityDetailSheet';
import { OrderDetailSheet } from '../components/owner/OrderDetailSheet';
import { LeaveReviewSheet } from '../components/owner/LeaveReviewSheet';
import { ReviewsSheet } from '../components/owner/ReviewsSheet';
import { ProviderDetail } from '../components/owner/ProviderDetail';
import { ProviderShopSheet } from '../components/owner/ProviderShopSheet';
import { GlobalProductDetailSheet } from '../components/owner/ProductDetailModal';
import { ServiceBookingSheet } from '../components/owner/ServiceBookingSheet';
import { CategoryStorefrontSheet } from '../components/owner/CategoryStorefrontSheet';
import { CartDrawer } from '../components/owner/CartDrawer';
import { OrderCheckoutSheet } from '../components/owner/OrderCheckoutSheet';
import { CheckoutSheet } from '../components/owner/CheckoutSheet';
import { EmergencyVetSheet } from '../components/owner/EmergencyVetSheet';
import { LocationSheet } from '../components/owner/LocationSheet';
import { AddressEditorSheet } from '../components/owner/AddressEditorSheet';
import { PaymentMethodsSheet } from '../components/owner/PaymentMethodsSheet';
import { PaymentMethodEditorSheet } from '../components/owner/PaymentMethodEditorSheet';
import { PawPointsSheet } from '../components/owner/PawPointsSheet';
import { LostPetSheet, LostPetReportSheet } from '../components/owner/LostPetSheet';
import { ReferralSheet } from '../components/owner/ReferralSheet';

import { ProviderShell } from '../components/provider/Shell';
import { ProviderInbox } from '../components/provider/Inbox';
import { ProviderSchedule } from '../components/provider/Schedule';
import { ProviderServicesScreen } from '../components/provider/Services';
import { ProviderShopManager } from '../components/provider/ShopManager';
import { ProviderProfile } from '../components/provider/Profile';
import { AddProductSheet } from '../components/provider/AddProductSheet';
import { AddOfferingSheet } from '../components/provider/AddOfferingSheet';
import { ProviderOnboarding } from '../components/provider/Onboarding';

const OWNER_TABS = [
  { id: 'home', icon: 'home', label: 'Home' },
  { id: 'browse', icon: 'search', label: 'Browse' },
  { id: 'favorites', icon: 'heart', label: 'Saved' },
  { id: 'activity', icon: 'list', label: 'Activity' },
  { id: 'shop', icon: 'bag', label: 'Shop' },
];

export default function App() {
  const a = useApp();
  const T = usePawraTheme(a.theme, a.dark);

  // Provider — Alerting state and haptics are driven by showNotif so they
  // honor the Sound + haptics toggle on the Inbox header.
  const pendingCount =
    a.providerIncoming.filter(b => b.status === 'pending').length
    + a.providerIncomingOrders.filter(o => o.status === 'placed').length;

  // Pawla visibility — only on the tabs where it actually helps (Home, Browse,
  // Shop) and only when no overlay/sheet/modal is on top of the main view.
  const anyOverlayOpen =
    !!a.providerDetailOpen || !!a.providerShopOpen || !!a.bookingOpen
    || !!a.cartOpen || !!a.orderCheckoutOpen || !!a.checkoutOpen
    || !!a.emergencyOpen || !!a.profileOpen || !!a.pawPointsOpen
    || !!a.lostPetOpen || !!a.lostPetReportFor || !!a.referralOpen
    || !!a.ownerProfileSetupOpen || !!a.petSheetOpen
    || !!a.activityDetailOpen || !!a.orderDetailOpen
    || !!a.reviewSheetFor || !!a.reviewsListForProvider
    || !!a.chatTarget || !!a.notifCenterOpen
    || !!a.paymentMethodsOpen || !!a.paymentMethodEditorOpen
    || !!a.addressEditorOpen || !!a.locationOpen
    || !!a.storefrontCategoryOpen || !!a.productDetailOpen;
  const showPawla =
    a.role === 'owner'
    && a.isAuthenticated
    && a.onboarded
    && (a.ownerTab === 'home' || a.ownerTab === 'browse' || a.ownerTab === 'shop')
    && !anyOverlayOpen;

  let content;
  if (a.role === 'owner') {
    if (a.ownerTab === 'home') {
      content = (
        <OwnerHome
          T={T}
          onTab={a.setOwnerTab}
          onProvider={a.setProviderDetailOpen}
          onShop={() => a.setOwnerTab('shop')}
          onEmergency={() => a.setEmergencyOpen(true)}
          onProfile={() => a.setProfileOpen(true)}
        />
      );
    } else if (a.ownerTab === 'browse') {
      content = <OwnerBrowse T={T} onProvider={a.setProviderDetailOpen} onBack={() => a.setOwnerTab('home')} />;
    } else if (a.ownerTab === 'favorites') {
      content = <OwnerFavorites T={T} onShop={() => a.setOwnerTab('shop')} />;
    } else if (a.ownerTab === 'activity') {
      content = <OwnerActivity T={T} />;
    } else if (a.ownerTab === 'shop') {
      content = <OwnerShop T={T} />;
    }
  } else {
    if (a.providerTab === 'inbox') {
      content = <ProviderInbox T={T} />;
    } else if (a.providerTab === 'schedule') {
      content = <ProviderSchedule T={T} />;
    } else if (a.providerTab === 'services') {
      content = <ProviderServicesScreen T={T} />;
    } else if (a.providerTab === 'shop') {
      content = <ProviderShopManager T={T} />;
    } else if (a.providerTab === 'profile') {
      content = <ProviderProfile T={T} />;
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={{ flex: 1 }}>
        {a.role === 'owner' ? (
          <>
            <View style={{ flex: 1 }}>{content}</View>
            <TabBar
              T={T} dark={a.dark} active={a.ownerTab} onChange={a.setOwnerTab}
              tabs={OWNER_TABS}
              badge={{
                activity: a.bookings.filter(b => b.ownerId === a.user.id && b.status === 'confirmed').length
                        + (a.unreadChatCount > 0 ? a.unreadChatCount : 0),
              }}
            />
            {showPawla ? <PawlaChat T={T} /> : null}
          </>
        ) : (
          <ProviderShell
            T={T} dark={a.dark} tab={a.providerTab} onTab={a.setProviderTab}
            badge={{ inbox: pendingCount }}
          >
            <View style={{ flex: 1 }}>{content}</View>
          </ProviderShell>
        )}

        {a.providerDetailOpen ? (
          <ProviderDetailLayer key={a.providerDetailOpen.id} T={T}>
            <ProviderDetail
              provider={a.providerDetailOpen}
              T={T}
              onBack={() => a.setProviderDetailOpen(null)}
              onBook={(p) => a.setBookingOpen(p)}
            />
          </ProviderDetailLayer>
        ) : null}

        {a.providerShopOpen ? (
          <ProviderShopSheet
            provider={a.providerShopOpen}
            T={T}
            onClose={() => a.setProviderShopOpen(null)}
          />
        ) : null}

        {a.role === 'owner' ? <GlobalProductDetailSheet T={T} /> : null}

        {a.bookingOpen ? (
          <ServiceBookingSheet
            provider={a.bookingOpen}
            T={T}
            onClose={() => a.setBookingOpen(null)}
          />
        ) : null}

        {a.storefrontCategoryOpen ? (
          <CategoryStorefrontSheet
            T={T}
            type={a.storefrontCategoryOpen}
            onClose={() => a.setStorefrontCategoryOpen(null)}
            onPick={(p) => {
              a.setStorefrontCategoryOpen(null);
              a.setProviderDetailOpen(p);
            }}
          />
        ) : null}

        {a.cartOpen ? (
          <CartDrawer
            T={T} cart={a.cart}
            onClose={() => a.setCartOpen(false)}
            onChange={a.changeQty}
            onRemove={a.removeFromCart}
            onCheckout={() => { a.setCartOpen(false); a.setOrderCheckoutOpen(true); }}
          />
        ) : null}

        {a.orderCheckoutOpen ? (
          <OrderCheckoutSheet
            T={T}
            onClose={() => a.setOrderCheckoutOpen(false)}
          />
        ) : null}

        {a.checkoutOpen ? (
          <CheckoutSheet
            T={T}
            total={a.lastCheckoutMeta?.total ?? a.lastOrderTotal}
            onClose={() => a.setCheckoutOpen(false)}
          />
        ) : null}

        {a.emergencyOpen ? (
          <EmergencyVetSheet T={T} vets={a.emergencyVets} onClose={() => a.setEmergencyOpen(false)} />
        ) : null}

        {a.addProductOpen ? (
          <AddProductSheet
            T={T}
            edit={a.addProductOpen === 'new' ? null : a.addProductOpen}
            onClose={() => a.setAddProductOpen(null)}
          />
        ) : null}

        {a.addOfferingOpen ? (
          <AddOfferingSheet
            T={T}
            cat={a.addOfferingOpen}
            onClose={() => a.setAddOfferingOpen(null)}
          />
        ) : null}

        {a.providerSetupOpen ? (
          <ProviderOnboarding
            T={T}
            onComplete={() => a.setProviderSetupOpen(false)}
          />
        ) : null}

        {a.profileOpen && a.role === 'owner' ? (
          <View style={{ position: 'absolute', inset: 0, zIndex: 65, backgroundColor: T.bg }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              paddingHorizontal: 20, paddingVertical: 14,
              backgroundColor: T.bg, borderBottomWidth: 1, borderBottomColor: T.hairline,
            }}>
              <Pressable onPress={() => a.setProfileOpen(false)} style={{
                width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface,
                borderWidth: 1, borderColor: T.hairline,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="chevron-left" size={20} color={T.ink} />
              </Pressable>
              <Text style={{ fontSize: 17, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>Profile</Text>
            </View>
            <OwnerProfile T={T} />
          </View>
        ) : null}

        {a.pawPointsOpen && a.role === 'owner' ? (
          <PawPointsSheet T={T} onClose={() => a.setPawPointsOpen(false)} />
        ) : null}

        {a.lostPetOpen && a.role === 'owner' ? (
          <LostPetSheet T={T} onClose={() => a.setLostPetOpen(false)} />
        ) : null}

        {a.lostPetReportFor && a.role === 'owner' ? (
          <LostPetReportSheet T={T} pet={a.lostPetReportFor} onClose={() => a.setLostPetReportFor(null)} />
        ) : null}

        {a.referralOpen && a.role === 'owner' ? (
          <ReferralSheet T={T} onClose={() => a.setReferralOpen(false)} />
        ) : null}

        {a.authChecking ? (
          <View style={{
            position: 'absolute', inset: 0, zIndex: 95, backgroundColor: T.bg,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <ActivityIndicator color={T.brand} />
          </View>
        ) : !a.onboarded ? (
          <Onboarding
            T={T}
            startAtRolePick={a.isAuthenticated}
            initialEmail={a.user.email}
            onComplete={(r, email, isNewUser) => {
              // The auth listener will also flip onboarded once metadata is saved,
              // but we set it explicitly here to avoid a flicker.
              if (email) a.setUser({ ...a.user, email });
              a.setRole(r);
              a.setOnboarded(true);
              // Only send to setup screens for brand-new accounts. Returning
              // users signing in from a new device already have their data in
              // the DB — selfProvider is null only because the async load
              // hasn't finished yet, not because setup is missing.
              if (isNewUser) {
                if (r === 'provider') a.setProviderSetupOpen(true);
                else if (r === 'owner' && !a.user.name) a.setOwnerProfileSetupOpen(true);
              }
            }}
          />
        ) : null}

        {a.ownerProfileSetupOpen ? (
          <OwnerProfileSetup
            T={T}
            mode={a.user.name ? 'edit' : 'setup'}
            onComplete={() => a.setOwnerProfileSetupOpen(false)}
          />
        ) : null}

        {a.petSheetOpen ? (
          <PetSheet
            T={T}
            edit={a.petSheetEdit}
            onClose={() => { a.setPetSheetOpen(false); a.setPetSheetEdit(null); }}
          />
        ) : null}

        {a.activityDetailOpen ? (
          <ActivityDetailSheet
            T={T}
            booking={a.activityDetailOpen}
            onClose={() => a.setActivityDetailOpen(null)}
            viewer={a.role === 'provider' ? 'provider' : 'owner'}
          />
        ) : null}

        {a.orderDetailOpen ? (
          <OrderDetailSheet
            T={T}
            order={a.orderDetailOpen}
            onClose={() => a.setOrderDetailOpen(null)}
            viewer={a.role === 'provider' ? 'provider' : 'owner'}
          />
        ) : null}

        {a.reviewSheetFor ? (
          <LeaveReviewSheet
            T={T}
            booking={a.reviewSheetFor}
            onClose={() => a.setReviewSheetFor(null)}
          />
        ) : null}

        {a.reviewsListForProvider ? (
          <ReviewsSheet
            T={T}
            provider={a.reviewsListForProvider}
            onClose={() => a.setReviewsListForProvider(null)}
          />
        ) : null}

        {a.locationOpen && a.role === 'owner' ? (
          <LocationSheet T={T} onClose={() => a.setLocationOpen(false)} />
        ) : null}

        {a.addressEditorOpen && a.role === 'owner' ? (
          <AddressEditorSheet
            T={T}
            edit={a.addressEditorOpen === 'new' ? null : a.addressEditorOpen}
            onClose={() => a.setAddressEditorOpen(null)}
          />
        ) : null}

        {a.paymentMethodsOpen && a.role === 'owner' ? (
          <PaymentMethodsSheet T={T} onClose={() => a.setPaymentMethodsOpen(false)} />
        ) : null}

        {a.paymentMethodEditorOpen && a.role === 'owner' ? (
          <PaymentMethodEditorSheet
            T={T}
            edit={a.paymentMethodEditorOpen === 'new' ? null : a.paymentMethodEditorOpen}
            onClose={() => a.setPaymentMethodEditorOpen(null)}
          />
        ) : null}

        {/* Single Done-bar instance shared by every Input + multiline field in the app. */}
        <KeyboardDoneBar T={T} />
        <NotifBanner
          T={T}
          notif={a.notif}
          onDismiss={() => a.setNotif(null)}
          onPress={() => {
            const n = a.notif;
            if (!n) return;
            a.setNotif(null);
            if (n.targetKind === 'booking' && n.targetId) {
              const b = a.bookings.find(x => x.id === n.targetId);
              if (b) a.setActivityDetailOpen(b);
            } else if (n.targetKind === 'order' && n.targetId) {
              const o = a.orders.find(x => x.id === n.targetId);
              if (o) a.setOrderDetailOpen(o);
            } else if (n.targetKind === 'chat') {
              a.setChatTarget({
                bookingId:   n.chatBookingId,
                orderId:     n.chatOrderId,
                otherName:   n.chatOtherName || 'Chat',
                recipientId: n.chatRecipientId,
              });
            }
          }}
        />
        {a.notifCenterOpen ? <NotifCenterSheet T={T} onClose={() => a.setNotifCenterOpen(false)} /> : null}

        {/* Global ChatSheet — opens whenever chatTarget is set (e.g. from a notification tap). */}
        {a.chatTarget ? (
          <ChatSheet
            target={a.chatTarget}
            T={T}
            onClose={() => a.setChatTarget(null)}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

// Slide-in container for ProviderDetail. Same shape as the other Animated.View
// wrappers used inside the sheet components themselves — kept inline here
// because ProviderDetail is rendered from app/index.tsx, not from its own root.
import type { ReactNode } from 'react';
import type { Theme } from '../types';
function ProviderDetailLayer({ T, children }: { T: Theme; children: ReactNode }) {
  const anim = useEnterAnim('right');
  return (
    <Animated.View style={[{ position: 'absolute', inset: 0, zIndex: 50, backgroundColor: T.bg }, anim.sheet]}>
      {children}
    </Animated.View>
  );
}
