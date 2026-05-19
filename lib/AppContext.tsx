import type { RealtimeChannel, Session } from '@supabase/supabase-js';
import * as Location from 'expo-location';
import {
  createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { CATEGORY_TO_PROVIDER_TYPE, PROVIDER_TYPE_TO_PRICE_LABEL } from '../constants/data';
import { getCurrentSession, onAuthStateChange, readRole, signOut as authSignOut, updateUserMetadata } from './auth';
import { DAY_LABELS, formatBookingDate, formatTimestamp, MONTHS, nowWhen, parseWhenLabel } from './dateUtils';
import { supabase } from './supabase';
import { bookingCategoryLabel } from './bookingLabels';
import * as db from './db';
import { haversineKm } from './distance';
import { notify as notifyFeedback } from './feedback';
import {
  bookingSentNotif, bookingStatusNotifForOwner, bookingStatusNotifForProvider,
  newBookingRequestNotif,
} from './notifTexts';
import type {
  ActivityItem, Address, Booking, BookingLineItem, BookingStatus, CartItem, ChatTarget,
  EmergencyVet, Coords, HealthRecord, IdVerification, LostPetAlert, Notif, Order, PaymentMethod, PawPointsEvent, Pet, Product, Provider,
  ProviderServices, ProviderType, Review, Role, ServiceCategoryId, ThemeName, User, WeeklyHours,
} from '../types';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const EMPTY_PROVIDER_SERVICES: ProviderServices = { walk: [], groom: [], vet: [], board: [], taxi: [], funeral: [] };

// How long a *responded* booking (declined / past-pending) lingers in the
// provider's incoming inbox. Hoisted to module scope so the useMemo deps
// can omit it (and the linter is happy).
const INBOX_RESPONDED_WINDOW_MS = 10 * 60 * 1000;
const ORDER_DECLINED_INBOX_MS = 15 * 60 * 1000;

function emptyUser(): User {
  return { id: '', email: '', name: '', dob: '', neighborhood: '', coords: null };
}

function deriveProviderFromCategories(
  base: Provider,
  categories: ServiceCategoryId[],
  services: ProviderServices,
): Provider {
  const primary = categories[0];
  const type: ProviderType = primary ? CATEGORY_TO_PROVIDER_TYPE[primary] : base.type;
  const priceLabel = PROVIDER_TYPE_TO_PRICE_LABEL[type] || '';
  const activePrices = categories.flatMap(c => services[c]?.filter(s => s.active).map(s => s.price) || []);
  const minPrice = activePrices.length ? Math.min(...activePrices) : 0;
  return {
    ...base,
    type,
    icon: primary === 'walk' ? 'walk' : primary === 'groom' ? 'scissors' : primary === 'vet' ? 'stethoscope' : primary === 'taxi' ? 'car' : primary === 'funeral' ? 'flower' : 'house',
    categories,
    price: minPrice > 0 ? `$${minPrice}` : '$—',
    priceLabel,
  };
}

function bookingToActivity(b: Booking): ActivityItem {
  const isMulti = (b.services?.length ?? 0) > 1;
  const petsLabel = b.petsList && b.petsList.length > 1
    ? `${b.petsList.length} pets`
    : b.pet?.name;
  // Title reflects the booked category (e.g. "Grooming"), not the provider's
  // primary type — so a grooming-only booking from a multi-category provider
  // doesn't read as "Boarding".
  const categoryLabel = bookingCategoryLabel(b);
  return {
    id: b.id, kind: 'booking',
    title: isMulti
      ? `${categoryLabel} · ${b.services!.length} services`
      : `${categoryLabel} · ${petsLabel || ''}`.trim().replace(/ · $/, ''),
    sub: isMulti
      ? `${petsLabel || 'pet'} · ${b.providerName}`
      : `${b.providerName} · ${b.service}`,
    // Format at display time so "Today" stays accurate as days change.
    when: formatBookingDate(b.whenLabel, b.time),
    status: b.status,
    amount: b.amount,
    providerId: b.providerId,
  };
}

function orderToActivity(o: Order): ActivityItem {
  return {
    id: o.id, kind: 'order',
    title: o.orderNumber ? `Order #${o.orderNumber}` : 'Order',
    sub: `${o.itemCount} item${o.itemCount === 1 ? '' : 's'} · ${o.vendorName}`,
    // Derive from timestamp so old orders show the actual date, not "Today".
    when: formatTimestamp(o.createdAt),
    status: o.status,
    amount: o.total,
    providerId: o.vendorId || undefined,
  };
}

// ----------------------------------------------------------------------------
// Context shape
// ----------------------------------------------------------------------------

type Ctx = {
  // theme
  theme: ThemeName; setTheme: (t: ThemeName) => void;
  dark: boolean; setDark: (d: boolean) => void;

  // auth
  authChecking: boolean;
  isAuthenticated: boolean;
  onboarded: boolean; setOnboarded: (v: boolean) => void;
  role: Role; setRole: (r: Role) => void;
  signOut: () => Promise<void>;

  // user
  user: User; setUser: (u: User) => void;
  updateProfile: (patch: Partial<User>) => Promise<void>;

  // pets
  pets: Pet[];
  addPet: (input: Omit<Pet, 'id'>) => Promise<void>;
  updatePet: (id: string, patch: Partial<Pet>) => Promise<void>;
  removePet: (id: string) => Promise<void>;
  // pet health records
  healthRecords: HealthRecord[];
  addHealthRecord: (petId: string, input: Omit<HealthRecord, 'id' | 'ownerId' | 'petId' | 'createdAt'>) => Promise<void>;
  updateHealthRecord: (id: string, patch: Partial<HealthRecord>) => Promise<void>;
  removeHealthRecord: (id: string) => Promise<void>;
  // paw points
  pawPoints: number;
  earnPawPoints: (referenceId: string, amount: number, description: string) => Promise<void>;
  redeemPawPoints: (referenceId: string, points: number, description: string) => Promise<void>;
  redeemPromoCode: (code: string) => Promise<{ points?: number; error?: string }>;
  // lost pet alerts
  lostPetAlerts: LostPetAlert[];
  reportLostPet: (input: Omit<LostPetAlert, 'id' | 'ownerId' | 'ownerName' | 'status' | 'createdAt' | 'resolvedAt'>) => Promise<void>;
  resolveLostPetAlert: (id: string, status: 'found' | 'closed') => Promise<void>;
  refreshLostPetAlerts: () => Promise<void>;
  lostPetOpen: boolean; setLostPetOpen: (v: boolean) => void;
  lostPetReportFor: Pet | null; setLostPetReportFor: (p: Pet | null) => void;
  referralOpen: boolean; setReferralOpen: (v: boolean) => void;

  // addresses (owner saved places + recents + active selection)
  savedAddresses: Address[];
  recentAddresses: Address[];
  currentAddressId: string | null;
  currentAddress: Address | null;
  setCurrentAddress: (a: Address) => void;
  addAddress: (input: Omit<Address, 'id'>) => Promise<Address | null>;
  updateAddress: (id: string, patch: Partial<Address>) => Promise<void>;
  removeAddress: (id: string) => Promise<void>;
  locationOpen: boolean; setLocationOpen: (v: boolean) => void;
  addressEditorOpen: Address | 'new' | null; setAddressEditorOpen: (v: Address | 'new' | null) => void;

  // payment methods (owner saved cards / Whish + cash built-in)
  /** All methods the user can pick from: cash built-in followed by saved rows. */
  paymentMethods: PaymentMethod[];
  /** DB-backed only (excludes cash). Used by the payment methods management page. */
  savedPaymentMethods: PaymentMethod[];
  addPaymentMethod: (input: Omit<PaymentMethod, 'id'>) => Promise<PaymentMethod | null>;
  updatePaymentMethod: (id: string, patch: Partial<PaymentMethod>) => Promise<void>;
  removePaymentMethod: (id: string) => Promise<void>;
  paymentMethodsOpen: boolean; setPaymentMethodsOpen: (v: boolean) => void;
  paymentMethodEditorOpen: PaymentMethod | 'new' | null;
  setPaymentMethodEditorOpen: (v: PaymentMethod | 'new' | null) => void;

  // providers
  providers: Provider[];
  /** Map of provider_id → their full services list (per category). Loaded with the catalog. */
  allProviderServices: Record<string, ProviderServices>;
  selfProvider: Provider | null;
  isSelfPublished: boolean;
  publishSelfProvider: () => Promise<void>;
  updateSelfProvider: (patch: Partial<Provider>) => Promise<void>;
  saveAndPublishProvider: (input: {
    name: string;
    area?: string;
    bio?: string;
    displayPic?: string | null;
    categories: ServiceCategoryId[];
    services?: ProviderServices;
    weeklyHours?: WeeklyHours | null;
    whatsapp?: string;
    emergency?: boolean;
    coords?: Coords | null;
    gmapsLink?: string;
  }) => Promise<void>;

  // products
  products: Product[];
  publishProduct: (input: { name: string; price: number; cat: string; stockCount: number; subtitle?: string; description?: string; accent?: string; imageUrl?: string }) => Promise<void>;
  updateProduct: (id: string, patch: Partial<Product>) => Promise<void>;

  // services
  providerCategories: ServiceCategoryId[];
  setProviderCategories: (c: ServiceCategoryId[]) => Promise<void>;
  providerServices: ProviderServices;
  toggleServiceActive: (cat: ServiceCategoryId, id: string) => Promise<void>;
  addOffering: (cat: ServiceCategoryId, name: string, price: number, unit: string, desc: string) => Promise<void>;
  replaceProviderServices: (next: ProviderServices) => Promise<void>;

  // bookings + orders
  bookings: Booking[];
  orders: Order[];
  ownerActivity: ActivityItem[];
  providerIncoming: Booking[];
  /** Orders where this provider is the vendor — surfaced in the provider inbox. */
  providerIncomingOrders: Order[];
  createBooking: (data: BookingDraft) => Promise<void>;
  acceptBooking: (id: string) => Promise<void>;
  rejectBooking: (id: string, reason?: string) => Promise<void>;
  cancelBooking: (id: string, reason?: string) => Promise<void>;
  startBooking: (id: string) => Promise<void>;
  completeBooking: (id: string) => Promise<void>;
  deleteBooking: (id: string) => Promise<void>;
  // order lifecycle (provider acts on these)
  acceptOrder: (id: string) => Promise<void>;
  declineOrder: (id: string, reason?: string) => Promise<void>;
  shipOrder: (id: string) => Promise<void>;
  completeOrder: (id: string) => Promise<void>;

  // owner-only
  ownerTab: string; setOwnerTab: (t: string) => void;
  favorites: string[]; toggleFav: (id: string) => Promise<void>;
  providerFavorites: string[]; toggleProviderFav: (id: string) => Promise<void>;
  cart: CartItem[];
  cartCount: number; cartTotal: number;
  addToCart: (p: Product) => void;
  changeQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  checkout: (input?: OrderCheckoutInput) => Promise<void>;
  lastOrderTotal: number;
  lastCheckoutMeta: CheckoutMeta | null;

  // provider-only
  providerTab: string; setProviderTab: (t: string) => void;
  providerAlerting: boolean; setProviderAlerting: (v: boolean) => void;
  idVerification: IdVerification | null;
  submitIdVerification: (frontUri: string, backUri: string) => Promise<{ error?: string }>;
  payoutSetup: boolean;
  setPayoutSetup: (v: boolean) => void;
  payoutSetupOpen: boolean; setPayoutSetupOpen: (v: boolean) => void;
  // Sound + haptics for the provider's incoming requests / status pings.
  // Toggle via the pill on the Inbox header. Persists to user_metadata.
  feedbackEnabled: boolean;
  setFeedbackEnabled: (v: boolean) => void;
  providerDisplayPic: string | null; setProviderDisplayPic: (p: string | null) => void;

  // emergency vets / reviews
  emergencyVets: EmergencyVet[];
  reviews: Review[];
  addReview: (input: { providerId: string; bookingId: string; rating: number; text: string; photoUrl?: string }) => Promise<{ error?: string }>;
  removeReview: (id: string) => Promise<void>;
  refreshReviews: () => Promise<void>;
  respondToReview: (id: string, response: string) => Promise<void>;

  // overlays
  bookingOpen: Provider | null; setBookingOpen: (b: Provider | null) => void;
  storefrontCategoryOpen: ProviderType | null; setStorefrontCategoryOpen: (t: ProviderType | null) => void;
  providerDetailOpen: Provider | null; setProviderDetailOpen: (p: Provider | null) => void;
  providerShopOpen: Provider | null; setProviderShopOpen: (p: Provider | null) => void;
  productDetailOpen: Product | null; setProductDetailOpen: (p: Product | null) => void;
  cartOpen: boolean; setCartOpen: (v: boolean) => void;
  orderCheckoutOpen: boolean; setOrderCheckoutOpen: (v: boolean) => void;
  checkoutOpen: boolean; setCheckoutOpen: (v: boolean) => void;
  emergencyOpen: boolean; setEmergencyOpen: (v: boolean) => void;
  profileOpen: boolean; setProfileOpen: (v: boolean) => void;
  pawPointsOpen: boolean; setPawPointsOpen: (v: boolean) => void;
  addProductOpen: Product | 'new' | null; setAddProductOpen: (v: Product | 'new' | null) => void;
  unlistProduct: (id: string) => Promise<void>;
  providerSetupOpen: boolean; setProviderSetupOpen: (v: boolean) => void;
  ownerProfileSetupOpen: boolean; setOwnerProfileSetupOpen: (v: boolean) => void;
  petSheetOpen: boolean; setPetSheetOpen: (v: boolean) => void;
  petSheetEdit: Pet | null; setPetSheetEdit: (p: Pet | null) => void;
  activityDetailOpen: Booking | null; setActivityDetailOpen: (b: Booking | null) => void;
  orderDetailOpen: Order | null; setOrderDetailOpen: (o: Order | null) => void;
  reviewSheetFor: Booking | null; setReviewSheetFor: (b: Booking | null) => void;
  reviewsListForProvider: Provider | null; setReviewsListForProvider: (p: Provider | null) => void;

  // chat
  chatTarget: ChatTarget | null;
  setChatTarget: (t: ChatTarget | null) => void;
  unreadChatCount: number;
  refreshUnreadChatCount: () => void;

  // notif
  notif: Notif | null; setNotif: (n: Notif | null) => void;
  showNotif: (n: Notif, dur?: number) => void;
  notifLog: LoggedNotif[];
  unreadNotifCount: number;
  notifCenterOpen: boolean; setNotifCenterOpen: (v: boolean) => void;
  markNotifRead: (id: string) => void;
  markAllNotifsRead: () => void;
  clearNotifs: () => void;
};

export type LoggedNotif = Notif & {
  id: string;
  createdAt: number;
  read: boolean;
};

/**
 * The data ServiceBookingSheet collects across its 4 steps.
 * AppContext.createBooking turns this into a Booking row with line items,
 * pets array, and payment method written to the bookings table.
 */
export type BookingDraft = {
  provider: Provider;
  /**
   * Selected provider services with the user's chosen quantity. dogMult and
   * lineTotal are computed by createBooking from the services + pets count.
   * categoryId carries which service category each line was picked from so the
   * booking renders as the actual booked service, not the provider's primary type.
   */
  services: {
    id: string; name: string; price: number; unit: string; qty: number;
    categoryId: ServiceCategoryId;
  }[];
  pets: Pet[];                     // ≥ 1 pet
  day: { label: string; num: number; mon: string };
  time: string;
  sharePassport: boolean;
  note: string;
  address: string;
  paymentMethod: PaymentMethod;
  recurring?: boolean;
  recurringInterval?: 'weekly' | 'biweekly' | 'monthly';
  pointsRedeemed?: number;
};

/** Extra payload the OrderCheckoutSheet passes through when placing an order. */
export type OrderCheckoutInput = {
  address: Address | null;
  paymentMethod: PaymentMethod | null;
  note?: string;
};

/** Drives the CheckoutSheet success copy. */
export type CheckoutMeta =
  | { kind: 'order'; total: number }
  | { kind: 'booking'; total: number; count: number; providerNames: string[] };

export function isDogUnit(unit: string): boolean {
  return /\/dog(\b|\/)/.test(unit);
}

const AppCtx = createContext<Ctx | null>(null);

// ----------------------------------------------------------------------------
// Provider
// ----------------------------------------------------------------------------

export function AppProvider({ children }: { children: ReactNode }) {
  // ---- ui state ----
  const [theme, setTheme] = useState<ThemeName>('lbci');
  const [dark, setDark] = useState(false);

  // ---- auth state ----
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [role, setRoleState] = useState<Role>('owner');

  // ---- account-scoped data ----
  const [user, setUser] = useState<User>(emptyUser());
  const [pets, setPets] = useState<Pet[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [pawPointsEvents, setPawPointsEvents] = useState<PawPointsEvent[]>([]);
  const [lostPetAlerts,   setLostPetAlerts]   = useState<LostPetAlert[]>([]);
  const [lostPetOpen,     setLostPetOpen]     = useState(false);
  const [lostPetReportFor, setLostPetReportFor] = useState<Pet | null>(null);
  const [referralOpen,    setReferralOpen]    = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [recentAddresses, setRecentAddresses] = useState<Address[]>([]);
  const [currentAddressId, setCurrentAddressId] = useState<string | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [addressEditorOpen, setAddressEditorOpen] = useState<Address | 'new' | null>(null);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethodsOpen, setPaymentMethodsOpen] = useState(false);
  const [paymentMethodEditorOpen, setPaymentMethodEditorOpen] = useState<PaymentMethod | 'new' | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [providerFavorites, setProviderFavorites] = useState<string[]>([]);

  // ---- shared / cross-user data ----
  const [providersList, setProvidersList] = useState<Provider[]>([]);
  const [allProviderServices, setAllProviderServices] = useState<Record<string, ProviderServices>>({});
  const [selfProvider, setSelfProvider] = useState<Provider | null>(null);
  const [providerCategories, _setProviderCategories] = useState<ServiceCategoryId[]>([]);
  const [providerServices, setProviderServices] = useState<ProviderServices>(EMPTY_PROVIDER_SERVICES);
  const [providerDisplayPic, setProviderDisplayPic] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // ---- tabs / cart / overlays / notif ----
  const [ownerTab, setOwnerTab] = useState('home');
  const [providerTab, setProviderTab] = useState('inbox');
  const [idVerification, setIdVerification] = useState<IdVerification | null>(null);
  const [payoutSetup, setPayoutSetupState] = useState(false);
  const [payoutSetupOpen, setPayoutSetupOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lastOrderTotal, setLastOrderTotal] = useState(0);
  const [providerAlerting, setProviderAlerting] = useState(false);
  // Always-on owner location. Initialized once we have permission + a fix; takes
  // priority over saved-address coords for distance computation so the closest-
  // first ordering reflects where the owner actually is right now.
  const [liveOwnerCoords, setLiveOwnerCoords] = useState<Coords | null>(null);
  const [feedbackEnabled, setFeedbackEnabledState] = useState(true);
  const feedbackEnabledRef = useRef(feedbackEnabled);
  useEffect(() => { feedbackEnabledRef.current = feedbackEnabled; }, [feedbackEnabled]);
  const setFeedbackEnabled = (v: boolean) => {
    setFeedbackEnabledState(v);
    updateUserMetadata({ feedbackEnabled: v }).catch(() => {});
  };

  const setPayoutSetup = (v: boolean) => {
    setPayoutSetupState(v);
    updateUserMetadata({ payoutSetup: v }).catch(() => {});
  };
  const [bookingOpen, setBookingOpen] = useState<Provider | null>(null);
  const [storefrontCategoryOpen, setStorefrontCategoryOpen] = useState<ProviderType | null>(null);
  const [providerDetailOpen, setProviderDetailOpen] = useState<Provider | null>(null);
  const [providerShopOpen, setProviderShopOpen] = useState<Provider | null>(null);
  const [productDetailOpen, setProductDetailOpen] = useState<Product | null>(null);
  const [lastCheckoutMeta, setLastCheckoutMeta] = useState<CheckoutMeta | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderCheckoutOpen, setOrderCheckoutOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pawPointsOpen, setPawPointsOpen] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState<Product | 'new' | null>(null);
  const [providerSetupOpen, setProviderSetupOpen] = useState(false);
  const [ownerProfileSetupOpen, setOwnerProfileSetupOpen] = useState(false);
  const [petSheetOpen, setPetSheetOpen] = useState(false);
  const [petSheetEdit, setPetSheetEdit] = useState<Pet | null>(null);
  const [activityDetailOpen, setActivityDetailOpen] = useState<Booking | null>(null);
  const [orderDetailOpen, setOrderDetailOpen] = useState<Order | null>(null);
  const [reviewSheetFor, setReviewSheetFor] = useState<Booking | null>(null);
  const [reviewsListForProvider, setReviewsListForProvider] = useState<Provider | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [chatTarget, setChatTarget] = useState<ChatTarget | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const refreshUnreadChatCount = useCallback(async () => {
    if (!userIdRef.current) return;
    const n = await db.loadUnreadMessageCount(userIdRef.current);
    setUnreadChatCount(n);
  }, []);

  const [notif, setNotif] = useState<Notif | null>(null);
  const [notifLog, setNotifLog] = useState<LoggedNotif[]>([]);
  const [notifCenterOpen, setNotifCenterOpen] = useState(false);

  // Tick used by time-based UI filters (e.g. inbox 10-min expiry).
  const [now, setNow] = useState(() => Date.now());

  // Used by realtime + manual refresh callbacks; refs avoid a stale-closure subscription.
  const userIdRef = useRef('');
  const roleRef = useRef<Role>('owner');
  const providersListRef = useRef<Provider[]>([]);
  const ordersRef        = useRef<Order[]>([]);
  const selfProviderRef  = useRef<Provider | null>(null);
  useEffect(() => { userIdRef.current = user.id; }, [user.id]);
  useEffect(() => { roleRef.current = role; }, [role]);

  // ---- derived ----
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const isSelfPublished = !!selfProvider?.published;

  const ownerActivity = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [
      ...bookings.filter(b => b.ownerId === user.id).map(bookingToActivity),
      ...orders.filter(o => o.ownerId === user.id).map(orderToActivity),
    ];
    items.sort((a, b) => {
      const aSrc = bookings.find(x => x.id === a.id) || orders.find(x => x.id === a.id);
      const bSrc = bookings.find(x => x.id === b.id) || orders.find(x => x.id === b.id);
      return (bSrc?.createdAt || 0) - (aSrc?.createdAt || 0);
    });
    return items;
  }, [bookings, orders, user.id]);

  // Inbox = active requests (pending) + recently-responded bookings (within 10 min of accept/decline)
  // so the provider can see context for what they just acted on. Completed and
  // cancelled jobs are NOT active — they belong in Schedule, not the inbox.
  const providerIncoming = useMemo(
    () => bookings
      .filter(b => b.providerId === user.id)
      .filter(b => b.status !== 'completed' && b.status !== 'cancelled')
      .filter(b => {
        if (b.status === 'pending') return true;
        // Old rows (declined before migration 0005's respondedAt trigger
        // existed) have no respondedAt — fall back to createdAt so they
        // expire on the same schedule as anything else, instead of clinging
        // to the inbox forever.
        const ts = b.respondedAt ?? b.createdAt;
        return now - ts < INBOX_RESPONDED_WINDOW_MS;
      })
      .sort((a, b) => b.createdAt - a.createdAt),
    [bookings, user.id, now],
  );

  // Provider's incoming orders. Active orders stay until they're completed or
  // cancelled. Declined orders linger for 15 minutes (longer than the booking
  // window) so the provider can see what they just rejected before it falls
  // off the inbox.
  const providerIncomingOrders = useMemo(
    () => orders
      .filter(o => o.vendorId === user.id)
      .filter(o => o.status !== 'completed' && o.status !== 'cancelled')
      .filter(o => {
        if (o.status === 'declined') {
          if (!o.respondedAt) return false;
          return now - o.respondedAt < ORDER_DECLINED_INBOX_MS;
        }
        if (o.status === 'placed') return true;
        // confirmed / shipped: keep visible until they hit a final state.
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt),
    [orders, user.id, now],
  );

  // ---- DB helpers (refresh public catalog + my data) ----

  const refreshPublic = useCallback(async () => {
    const provs = await db.loadAllProviders();
    const servicesMap = await db.loadAllProviderServices();
    setAllProviderServices(servicesMap);
    const enriched = provs.map(p =>
      deriveProviderFromCategories(p, p.categories || [], servicesMap[p.id] || EMPTY_PROVIDER_SERVICES),
    );
    setProvidersList(enriched);
    const prods = await db.loadAllProducts(enriched);
    setProducts(prods);
  }, []);

  const refreshSelfProviderData = useCallback(async (uid: string) => {
    const me = await db.loadSelfProvider(uid);
    if (me) {
      setSelfProvider(me);
      _setProviderCategories(me.categories || []);
      setProviderDisplayPic(me.displayPic ?? null);
    }
    const myServices = await db.loadProviderServices(uid);
    setProviderServices(myServices);
    const verif = await db.loadIdVerification(uid);
    setIdVerification(verif);
  }, []);

  const refreshLostPetAlerts = useCallback(async () => {
    const all = await db.loadLostPetAlerts();
    setLostPetAlerts(all);
  }, []);

  const refreshReviews = useCallback(async () => {
    const all = await db.loadAllReviews();
    setReviews(all);
  }, []);

  const refreshMyData = useCallback(async (uid: string, r: Role | null) => {
    const [myPets, myHealthRecords, myPawPoints, fav, favShops, myBookings, myOrders, myAddresses, myPaymentMethods] = await Promise.all([
      db.loadPets(),
      db.loadHealthRecordsForOwner(),
      db.loadPawPointsEvents(),
      db.loadFavorites(),
      db.loadProviderFavorites(),
      db.loadBookingsForUser(uid),
      r === 'provider' ? db.loadOrdersForVendor(uid) : db.loadOrdersForOwner(uid),
      db.loadAddresses(),
      db.loadPaymentMethods(),
    ]);
    setPets(myPets);
    setHealthRecords(myHealthRecords);
    setPawPointsEvents(myPawPoints);
    setFavorites(fav);
    setProviderFavorites(favShops);
    setBookings(myBookings);
    setOrders(myOrders);
    setSavedAddresses(myAddresses);
    setSavedPaymentMethods(myPaymentMethods);
    if (r === 'provider') await refreshSelfProviderData(uid);
  }, [refreshSelfProviderData]);

  // ---- Notif ----
  const showNotif = useCallback((n: Notif, dur = 4500) => {
    const logged: LoggedNotif = {
      ...n,
      id: 'n_' + Date.now() + Math.random().toString(36).slice(2, 5),
      createdAt: Date.now(),
      read: false,
    };
    // Keep the last 50 only — anything older falls off.
    setNotifLog(arr => [logged, ...arr].slice(0, 50));
    setNotif(n);
    // Honor the provider's "Sound + haptics" toggle. When off, the banner still
    // appears but the device stays quiet. The Alerting pill mirrors the same
    // gate so it never lights up while feedback is muted.
    if (feedbackEnabledRef.current) {
      notifyFeedback(); // loud ping + heavy haptic
      setProviderAlerting(true);
      setTimeout(() => setProviderAlerting(false), 1600);
    }
    setTimeout(() => setNotif(c => c === n ? null : c), dur);
  }, []);

  const markNotifRead = (id: string) =>
    setNotifLog(arr => arr.map(x => x.id === id ? { ...x, read: true } : x));
  const markAllNotifsRead = () =>
    setNotifLog(arr => arr.map(x => ({ ...x, read: true })));
  const clearNotifs = () => setNotifLog([]);
  const unreadNotifCount = notifLog.filter(x => !x.read).length;

  // ---- Auth bootstrap + listener + realtime ----
  useEffect(() => {
    let cancelled = false;
    let realtimeChannel: RealtimeChannel | null = null;

    const reset = () => {
      setIsAuthenticated(false);
      setUser(emptyUser());
      setOnboarded(false);
      setProvidersList([]);
      setAllProviderServices({});
      setSelfProvider(null);
      _setProviderCategories([]);
      setProviderServices(EMPTY_PROVIDER_SERVICES);
      setProviderDisplayPic(null);
      setBookings([]);
      setOrders([]);
      setProducts([]);
      setCart([]);
      setFavorites([]);
      setProviderFavorites([]);
      setPets([]);
      setHealthRecords([]);
      setPawPointsEvents([]);
      setLostPetAlerts([]);
      setLostPetOpen(false);
      setLostPetReportFor(null);
      setReferralOpen(false);
      setOwnerProfileSetupOpen(false);
      setPetSheetOpen(false);
      setPetSheetEdit(null);
      setActivityDetailOpen(null);
      setOrderDetailOpen(null);
      setReviewSheetFor(null);
      setReviewsListForProvider(null);
      setReviews([]);
      setStorefrontCategoryOpen(null);
      setLastCheckoutMeta(null);
      setOrderCheckoutOpen(false);
      setSavedAddresses([]);
      setRecentAddresses([]);
      setCurrentAddressId(null);
      setLocationOpen(false);
      setAddressEditorOpen(null);
      setSavedPaymentMethods([]);
      setPaymentMethodsOpen(false);
      setPaymentMethodEditorOpen(null);
    };

    const apply = async (session: Session | null) => {
      if (cancelled) return;
      if (!session) { reset(); return; }

      setIsAuthenticated(true);

      // Hydrate profile from DB (falls back to session metadata for transitional accounts).
      const profile = await db.loadProfile(session.user.id);
      const fallbackMeta = (session.user.user_metadata ?? {}) as Record<string, unknown>;
      const next: User = {
        id: session.user.id,
        email: session.user.email ?? profile?.email ?? '',
        name: profile?.name ?? (typeof fallbackMeta.name === 'string' ? fallbackMeta.name : ''),
        dob: profile?.dob ?? (typeof fallbackMeta.dob === 'string' ? fallbackMeta.dob : ''),
        neighborhood: profile?.neighborhood ?? '',
        coords: profile?.coords ?? null,
      };
      setUser(next);

      // Sound + haptics preference persisted per-user. Defaults on.
      if (typeof fallbackMeta.feedbackEnabled === 'boolean') {
        setFeedbackEnabledState(fallbackMeta.feedbackEnabled);
      }
      if (typeof fallbackMeta.payoutSetup === 'boolean') {
        setPayoutSetupState(fallbackMeta.payoutSetup);
      } else {
        setFeedbackEnabledState(true);
      }
      // Active address persisted in user_metadata so it survives logout per device.
      if (typeof fallbackMeta.activeAddressId === 'string') {
        setCurrentAddressId(fallbackMeta.activeAddressId);
      }

      const r = profile?.role ?? readRole(session);
      if (r) {
        setRoleState(r);
        setOnboarded(true);
      } else {
        setOnboarded(false);
      }

      await Promise.all([
        refreshMyData(session.user.id, r ?? null),
        refreshPublic(),
        refreshReviews(),
        refreshLostPetAlerts(),
        db.loadUnreadMessageCount(session.user.id).then(setUnreadChatCount),
      ]);
    };

    getCurrentSession()
      .then(s => apply(s))
      .catch(() => apply(null))           // stale token already cleared in getCurrentSession
      .finally(() => { if (!cancelled) setAuthChecking(false); });

    const sub = onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      // TOKEN_REFRESHED errors arrive here when Supabase background-refresh
      // fails; treat them as a sign-out so the user sees the login screen.
      if (event === 'TOKEN_REFRESHED' && !session) { apply(null); return; }
      apply(session).catch(() => apply(null));
    });

    const refreshMyBookings = () => {
      const uid = userIdRef.current;
      if (uid) db.loadBookingsForUser(uid).then(setBookings).catch(() => {});
    };
    const refreshMyOrders = () => {
      const uid = userIdRef.current;
      if (!uid) return;
      if (roleRef.current === 'provider') {
        db.loadOrdersForVendor(uid).then(setOrders).catch(() => {});
      } else {
        db.loadOrdersForOwner(uid).then(setOrders).catch(() => {});
      }
    };

    realtimeChannel = db.subscribeRealtime({
      publicCatalogChanged: () => {
        refreshPublic();
        if (roleRef.current === 'provider' && userIdRef.current) {
          refreshSelfProviderData(userIdRef.current).catch(() => {});
        }
      },
      bookingInserted: (row) => {
        refreshMyBookings();
        const uid = userIdRef.current;
        // Provider receiving a new request → notify them. Skip when *I* (the owner) am the actor.
        if (uid && row.provider_id === uid && roleRef.current === 'provider') {
          // Check auto-accept rules first.
          const me = selfProviderRef.current;
          if (me?.autoAcceptEnabled && row.status === 'pending') {
            const maxOk = me.autoAcceptMaxAmount == null || row.amount <= me.autoAcceptMaxAmount;
            const bDate = row.when_label ? parseWhenLabel(row.when_label) : null;
            const hoursAhead = bDate ? (bDate.getTime() - Date.now()) / 3_600_000 : 0;
            const hoursOk = me.autoAcceptMinHoursAhead == null || hoursAhead >= me.autoAcceptMinHoursAhead;
            if (maxOk && hoursOk) {
              // Auto-confirm and surface a distinct notification.
              db.updateBookingStatus(row.id, 'confirmed').catch(() => {});
              showNotif({
                title: 'Auto-accepted booking',
                body: `${row.owner_name || 'A new client'} · ${row.service || 'service'} · $${row.amount.toFixed(2)}`,
                icon: 'check-circle',
                targetId: row.id, targetKind: 'booking',
              });
              return;
            }
          }
          // Manual review needed — normal new-request notification.
          showNotif({
            ...newBookingRequestNotif({
              providerType: row.provider_type,
              services: row.services ?? undefined,
              ownerName: row.owner_name,
              petName: row.pet?.name,
            }),
            targetId: row.id, targetKind: 'booking',
          });
        }
      },
      bookingDeleted: (row) => {
        // Drop the row locally so both parties stay in sync after a cleanup delete.
        setBookings(arr => arr.filter(b => b.id !== row.id));
      },
      bookingUpdated: (newRow, oldRow) => {
        const uid = userIdRef.current;
        // Soft-delete: if the actor's hide flag flipped on, drop locally and stop —
        // the other side's view is unchanged.
        const ownerJustHid = !!newRow.owner_hidden && !oldRow.owner_hidden;
        const providerJustHid = !!newRow.provider_hidden && !oldRow.provider_hidden;
        if (uid && ownerJustHid && newRow.owner_id === uid) {
          setBookings(arr => arr.filter(b => b.id !== newRow.id));
          return;
        }
        if (uid && providerJustHid && newRow.provider_id === uid) {
          setBookings(arr => arr.filter(b => b.id !== newRow.id));
          return;
        }
        refreshMyBookings();
        // Owner seeing the provider flip status → fire a status-specific notif.
        if (uid && newRow.owner_id === uid && roleRef.current === 'owner'
            && newRow.status !== oldRow.status) {
          const n = bookingStatusNotifForOwner({
            providerType: newRow.provider_type,
            services: newRow.services ?? undefined,
            providerName: newRow.provider_name,
            petName: newRow.pet?.name,
          }, newRow.status as 'confirmed' | 'in_progress' | 'completed' | 'declined' | 'cancelled');
          if (n) showNotif({ ...n, targetId: newRow.id, targetKind: 'booking' });
        }
      },
      orderInserted: (row) => {
        refreshMyOrders();
        const uid = userIdRef.current;
        // Vendor seeing a new order. Skip when I'm the owner placing it.
        if (uid && row.vendor_id === uid && roleRef.current === 'provider') {
          const itemWord = row.item_count === 1 ? 'item' : 'items';
          const buyer = row.owner_name || 'A buyer';
          showNotif({
            title: `New order from ${buyer}`,
            body: `${row.item_count} ${itemWord} · $${Number(row.total).toFixed(2)}`,
            icon: 'bag',
            targetId: row.id, targetKind: 'order',
          });
        }
      },
      orderUpdated: (newRow, oldRow) => {
        refreshMyOrders();
        const uid = userIdRef.current;
        // Owner sees the vendor flip status → fire a status-specific notif.
        if (uid && newRow.owner_id === uid && roleRef.current === 'owner'
            && newRow.status !== oldRow.status) {
          const t = (() => {
            switch (newRow.status) {
              case 'confirmed': return { title: 'Order confirmed', body: `${newRow.vendor_name} accepted your order.`, icon: 'check-circle' };
              case 'shipped':   return { title: 'Order on the way', body: `${newRow.vendor_name} dispatched your order.`, icon: 'truck' };
              case 'completed': return { title: 'Order delivered',  body: `${newRow.vendor_name} marked it complete.`,    icon: 'check' };
              case 'declined':  return { title: 'Order declined',   body: `${newRow.vendor_name} couldn't fulfil this order.`, icon: 'x' };
              case 'cancelled': return { title: 'Order cancelled',  body: `${newRow.vendor_name} cancelled your order.`,  icon: 'x' };
              default: return null;
            }
          })();
          if (t) showNotif({ ...t, targetId: newRow.id, targetKind: 'order' });
        }
      },
      reviewsChanged: () => {
        refreshReviews();
        // The provider rating trigger fires too — refresh providers so the
        // updated avg shows up immediately.
        refreshPublic();
      },
      idVerificationUpdated: (row) => {
        const uid = userIdRef.current;
        if (!uid || row.provider_id !== uid) return;
        const verif = {
          id: row.id,
          providerId: row.provider_id,
          frontUrl: row.front_url,
          backUrl: row.back_url,
          status: row.status,
          submittedAt: new Date(row.submitted_at).getTime(),
          reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).getTime() : undefined,
          adminNote: row.admin_note ?? undefined,
        } satisfies IdVerification;
        setIdVerification(verif);
        if (row.status === 'approved') {
          showNotif({ title: 'ID verified!', body: 'Your identity has been approved. You now have the verified badge.', icon: 'shield' }, 6000);
        } else if (row.status === 'rejected') {
          showNotif({ title: 'ID not accepted', body: row.admin_note || 'Please resubmit with clearer photos.', icon: 'x' }, 7000);
        }
      },
    });

    return () => {
      cancelled = true;
      sub.unsubscribe();
      realtimeChannel?.unsubscribe();
    };
  }, [refreshMyData, refreshPublic, refreshSelfProviderData, refreshReviews, refreshLostPetAlerts, showNotif]);

  // ---- Per-user message notification channel ----
  // Subscribes with recipient_id filter so RLS never blocks it and the
  // global booking/order channel stays healthy.
  useEffect(() => {
    if (!user.id) return;
    const channel = supabase
      .channel(`msg-notif-${user.id}`)
      .on('postgres_changes' as const, {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `recipient_id=eq.${user.id}`,
      }, (payload: { new: Record<string, unknown> }) => {
        const row = payload.new;
        setUnreadChatCount(n => n + 1);

        // Resolve the sender's display name. If the sender is a provider in our
        // list, prefer their shop name. Otherwise fall back to the denormalised
        // sender_name from the message row (which is the owner's profile name).
        const senderId   = String(row.sender_id ?? '');
        const senderRaw  = String(row.sender_name ?? '').trim();
        const provider   = providersListRef.current.find(p => p.id === senderId);
        const displayName = provider?.name?.trim() || senderRaw || 'New message';

        // Build chat target so tapping the notification opens the conversation.
        const bookingId = row.booking_id ? String(row.booking_id) : undefined;
        const orderId   = row.order_id   ? String(row.order_id)   : undefined;

        showNotif({
          title: displayName,
          body: String(row.body || '').length > 60
            ? String(row.body || '').slice(0, 60) + '…'
            : String(row.body || ''),
          icon: 'send',
          targetKind: 'chat',
          targetId: bookingId || orderId,
          chatBookingId: bookingId,
          chatOrderId: orderId,
          chatOtherName: displayName,
          chatRecipientId: senderId,
        }, 5000);
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [user.id, showNotif]);

  // ---- Always-on owner location ----
  // While the user is acting as an owner, keep a live GPS fix in state so
  // distance to every provider stays accurate as they move. Subscription is
  // torn down on logout / role change.
  useEffect(() => {
    if (role !== 'owner' || !isAuthenticated) {
      setLiveOwnerCoords(null);
      return;
    }
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted || cancelled) return;
      try {
        const first = await Location.getCurrentPositionAsync({});
        if (!cancelled) {
          setLiveOwnerCoords({ lat: first.coords.latitude, lng: first.coords.longitude });
        }
      } catch { /* fall through to watcher */ }
      try {
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 50, timeInterval: 30_000 },
          (pos) => {
            if (!cancelled) {
              setLiveOwnerCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            }
          },
        );
      } catch { /* watcher may not be available; the one-shot fix above still works */ }
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [role, isAuthenticated]);

  // ---- Inbox expiry tick + declined cleanup ----
  // Re-evaluate the 10-min inbox window every 30s, and sweep stale declined
  // bookings out of the DB when running as the provider.
  const bookingsRef = useRef(bookings);
  useEffect(() => { bookingsRef.current = bookings; }, [bookings]);
  useEffect(() => { ordersRef.current = orders; }, [orders]);
  useEffect(() => { providersListRef.current = providersList; }, [providersList]);
  useEffect(() => { selfProviderRef.current = selfProvider; }, [selfProvider]);

  useEffect(() => {
    const tick = () => {
      const t = Date.now();
      setNow(t);

      // Cleanup: provider-only. Expired declined bookings get a hard delete.
      // Falls back to createdAt for rows declined before the respondedAt
      // trigger landed, so old leftovers stuck in the inbox finally clear.
      if (roleRef.current !== 'provider' || !userIdRef.current) return;
      const cutoff = t - INBOX_RESPONDED_WINDOW_MS;
      const stale = bookingsRef.current.filter(b => {
        if (b.providerId !== userIdRef.current) return false;
        if (b.status !== 'declined') return false;
        const ts = b.respondedAt ?? b.createdAt;
        return ts < cutoff;
      });
      if (stale.length === 0) return;
      stale.forEach(b => { db.deleteBooking(b.id).catch(() => {}); });
      // Optimistic local: realtime DELETE will also fire and reconcile.
      setBookings(arr => arr.filter(b => !stale.find(s => s.id === b.id)));
    };
    // First tick on mount, then every 30s.
    tick();
    const id = setInterval(tick, 30 * 1000);
    return () => clearInterval(id);
  }, []);

  const signOut = async () => {
    await authSignOut();
    // Auth listener fires SIGNED_OUT → reset() runs.
  };

  // ---- Profile / role ----

  const updateProfile = async (patch: Partial<User>) => {
    setUser(curr => ({ ...curr, ...patch }));
    await db.upsertProfile({
      name: patch.name,
      dob: patch.dob,
      neighborhood: patch.neighborhood,
      coords: patch.coords,
    });
  };

  const setRole = (r: Role) => {
    setRoleState(r);
    db.upsertProfile({ role: r }).catch(() => {});
  };

  // ---- Pets ----

  const addPet = async (input: Omit<Pet, 'id'>) => {
    const saved = await db.insertPet({ id: '', ...input } as Pet);
    if (saved) setPets(arr => [...arr, saved]);
  };

  const updatePet = async (id: string, patch: Partial<Pet>) => {
    setPets(arr => arr.map(p => p.id === id ? { ...p, ...patch } : p));
    await db.updatePetById(id, patch);
  };

  const removePet = async (id: string) => {
    setPets(arr => arr.filter(p => p.id !== id));
    await db.deletePetById(id);
  };

  const addHealthRecord = async (
    petId: string,
    input: Omit<HealthRecord, 'id' | 'ownerId' | 'petId' | 'createdAt'>,
  ) => {
    const saved = await db.insertHealthRecord(user.id, petId, input);
    setHealthRecords(arr => [saved, ...arr]);
  };

  const updateHealthRecord = async (id: string, patch: Partial<HealthRecord>) => {
    setHealthRecords(arr => arr.map(r => r.id === id ? { ...r, ...patch } : r));
    await db.updateHealthRecord(id, patch);
  };

  const removeHealthRecord = async (id: string) => {
    setHealthRecords(arr => arr.filter(r => r.id !== id));
    await db.deleteHealthRecord(id);
  };

  // Earned = 10 pts per $1 on all completed bookings/orders owned by this user.
  // Redeemed = ledger entries (only written in owner context, safe for RLS).
  const pawPoints = useMemo(() => {
    const earned =
      bookings.filter(b => b.ownerId === user.id && b.status === 'completed').reduce((s, b) => s + Math.floor(b.amount * 10), 0)
      + orders.filter(o => o.ownerId === user.id && o.status === 'completed').reduce((s, o) => s + Math.floor(o.total * 10), 0);
    // 'bonus' rows come from admin-issued promo codes (migration 0035).
    // Must be summed into the balance so they can actually be spent.
    const bonus = pawPointsEvents.filter(e => e.type === 'bonus').reduce((s, e) => s + e.points, 0);
    const redeemed = pawPointsEvents.filter(e => e.type === 'redeem').reduce((s, e) => s + Math.abs(e.points), 0);
    return Math.max(0, earned + bonus - redeemed);
  }, [bookings, orders, pawPointsEvents, user.id]);

  // Award and redeem go through SECURITY DEFINER RPCs so the client can't forge
  // points (see migration 0032). The optimistic local row is dropped if the
  // server rejects the operation.
  const earnPawPoints = async (referenceId: string, _amount: number, description: string) => {
    // Optimistic estimate — server is the source of truth on the actual points.
    const optimisticPts = Math.floor(_amount * 10);
    if (optimisticPts <= 0) return;
    const optimistic: PawPointsEvent = { id: 'tmp_' + Date.now(), ownerId: user.id, type: 'earn', points: optimisticPts, description, referenceId, createdAt: Date.now() };
    setPawPointsEvents(arr => [optimistic, ...arr]);
    // Determine reference kind: booking ids and order ids are both uuids — we
    // look them up locally to figure out which table the server should check.
    const isBooking = bookingsRef.current.some(b => b.id === referenceId);
    const kind: 'booking' | 'order' = isBooking ? 'booking' : 'order';
    const res = await db.awardPawPointsForReference(referenceId, kind);
    if (res.error) {
      // Roll back optimistic row.
      setPawPointsEvents(arr => arr.filter(e => e.id !== optimistic.id));
      showNotif({ title: "Couldn't award points", body: res.error, icon: 'x' }, 5000);
      return;
    }
    // Reload from DB so the optimistic row gets the real id + final point value.
    db.loadPawPointsEvents().then(setPawPointsEvents).catch(() => {});
  };

  const redeemPawPoints = async (referenceId: string, points: number, description: string) => {
    if (points <= 0 || points > pawPoints) return;
    const optimistic: PawPointsEvent = { id: 'tmp_' + Date.now(), ownerId: user.id, type: 'redeem', points: -points, description, referenceId, createdAt: Date.now() };
    setPawPointsEvents(arr => [optimistic, ...arr]);
    const res = await db.redeemPawPointsRpc(referenceId, points, description);
    if (res.error) {
      setPawPointsEvents(arr => arr.filter(e => e.id !== optimistic.id));
      showNotif({ title: "Couldn't redeem points", body: res.error, icon: 'x' }, 5000);
      return;
    }
    db.loadPawPointsEvents().then(setPawPointsEvents).catch(() => {});
  };

  const redeemPromoCode = async (code: string) => {
    const res = await db.redeemPromoCode(code);
    if (res.error) return res;
    // Reload ledger so the bonus row shows up in pawPointsEvents → balance.
    db.loadPawPointsEvents().then(setPawPointsEvents).catch(() => {});
    return res;
  };

  // ---- Lost Pet Alerts ----
  // (refreshLostPetAlerts is declared earlier so the auth-bootstrap useEffect
  // can use it without hitting a temporal-dead-zone error.)

  const reportLostPet = async (
    input: Omit<LostPetAlert, 'id' | 'ownerId' | 'ownerName' | 'status' | 'createdAt' | 'resolvedAt'>,
  ) => {
    const saved = await db.insertLostPetAlert({
      ...input,
      ownerId: user.id,
      ownerName: user.name || user.email || 'Pet owner',
    });
    setLostPetAlerts(arr => [saved, ...arr]);
    showNotif({
      title: 'Lost pet alert posted',
      body: `${saved.petName}'s alert is now visible to the Pawra community.`,
      icon: 'send',
    });
  };

  const resolveLostPetAlertAction = async (id: string, status: 'found' | 'closed') => {
    setLostPetAlerts(arr => arr.filter(a => a.id !== id));
    await db.resolveLostPetAlert(id, status);
  };

  // ---- Addresses ----

  const currentAddress: Address | null = (() => {
    const fromSaved = savedAddresses.find(a => a.id === currentAddressId);
    if (fromSaved) return fromSaved;
    const fromRecent = recentAddresses.find(a => a.id === currentAddressId);
    if (fromRecent) return fromRecent;
    // Fallback to the first saved place (acts as Home).
    return savedAddresses[0] ?? null;
  })();

  const setCurrentAddress = (a: Address) => {
    // If the address isn't in saved (it's a search/recent ad-hoc), prepend to recents.
    if (!savedAddresses.find(s => s.id === a.id)) {
      setRecentAddresses(arr => {
        const filtered = arr.filter(x => x.id !== a.id);
        return [a, ...filtered].slice(0, 4);
      });
    }
    setCurrentAddressId(a.id);
    // Persist for next launch.
    updateUserMetadata({ activeAddressId: a.id }).catch(() => {});
  };

  const addAddress = async (input: Omit<Address, 'id'>): Promise<Address | null> => {
    const { address: saved, error } = await db.insertAddress(input);
    if (error || !saved) {
      showNotif({
        title: "Couldn't save address",
        body: error || 'Try again.',
        icon: 'x',
      }, 4500);
      return null;
    }
    setSavedAddresses(arr => [...arr, saved]);
    // First address auto-becomes the current one.
    if (!currentAddressId) {
      setCurrentAddressId(saved.id);
      updateUserMetadata({ activeAddressId: saved.id }).catch(() => {});
    }
    return saved;
  };

  const updateAddress = async (id: string, patch: Partial<Address>) => {
    // Optimistic local — instantly visible everywhere savedAddresses is read.
    const prev = savedAddresses.find(a => a.id === id);
    if (!prev) return;
    setSavedAddresses(arr => arr.map(a => a.id === id ? { ...a, ...patch } : a));
    const { address: saved, error } = await db.updateAddressById(id, patch);
    if (error || !saved) {
      // Roll back so the UI matches what's actually stored.
      setSavedAddresses(arr => arr.map(a => a.id === id ? prev : a));
      showNotif({
        title: "Couldn't update address",
        body: error || 'Try again.',
        icon: 'x',
      }, 4500);
      return;
    }
    // Reconcile with the persisted row (in case the DB normalized anything).
    setSavedAddresses(arr => arr.map(a => a.id === id ? saved : a));
  };

  // ---- Payment methods ----
  // Cash on delivery is the always-available built-in. Saved cards / Whish
  // come from the payment_methods table. Both checkout sheets and the profile
  // management page read from `paymentMethods` so they stay in sync.
  const CASH_BUILTIN: PaymentMethod = {
    id: 'cash',
    kind: 'cash',
    label: 'Cash on delivery',
    sub: 'Pay the courier when it arrives',
    icon: 'tag',
  };
  const paymentMethods: PaymentMethod[] = [CASH_BUILTIN, ...savedPaymentMethods];

  const addPaymentMethod = async (
    input: Omit<PaymentMethod, 'id'>,
  ): Promise<PaymentMethod | null> => {
    const { method, error } = await db.insertPaymentMethod(input);
    if (error || !method) {
      showNotif({
        title: "Couldn't save payment method",
        body: error || 'Try again.',
        icon: 'x',
      }, 4500);
      return null;
    }
    setSavedPaymentMethods(arr => [...arr, method]);
    return method;
  };

  const updatePaymentMethod = async (id: string, patch: Partial<PaymentMethod>) => {
    if (id === 'cash') return;
    const prev = savedPaymentMethods.find(m => m.id === id);
    if (!prev) return;
    setSavedPaymentMethods(arr => arr.map(m => m.id === id ? { ...m, ...patch } : m));
    const { method, error } = await db.updatePaymentMethodById(id, patch);
    if (error || !method) {
      setSavedPaymentMethods(arr => arr.map(m => m.id === id ? prev : m));
      showNotif({
        title: "Couldn't update payment method",
        body: error || 'Try again.',
        icon: 'x',
      }, 4500);
      return;
    }
    setSavedPaymentMethods(arr => arr.map(m => m.id === id ? method : m));
  };

  const removePaymentMethod = async (id: string) => {
    if (id === 'cash') return;
    const prev = savedPaymentMethods.find(m => m.id === id);
    setSavedPaymentMethods(arr => arr.filter(m => m.id !== id));
    const { error } = await db.deletePaymentMethodById(id);
    if (error && prev) {
      setSavedPaymentMethods(arr => arr.find(m => m.id === id) ? arr : [...arr, prev]);
      showNotif({
        title: "Couldn't remove payment method",
        body: error,
        icon: 'x',
      }, 4500);
    }
  };

  const removeAddress = async (id: string) => {
    const prev = savedAddresses.find(a => a.id === id);
    setSavedAddresses(arr => arr.filter(a => a.id !== id));
    const wasCurrent = currentAddressId === id;
    if (wasCurrent) setCurrentAddressId(null);
    const { error } = await db.deleteAddressById(id);
    if (error && prev) {
      setSavedAddresses(arr => arr.find(a => a.id === id) ? arr : [...arr, prev]);
      if (wasCurrent) setCurrentAddressId(id);
      showNotif({
        title: "Couldn't remove address",
        body: error,
        icon: 'x',
      }, 4500);
    }
  };

  // ---- Favorites ----

  const toggleFav = async (id: string) => {
    const isFav = favorites.includes(id);
    // Optimistic local toggle so the heart fills/unfills instantly.
    setFavorites(f => isFav ? f.filter(x => x !== id) : [...f, id]);
    const res = isFav ? await db.removeFavorite(id) : await db.addFavorite(id);
    if (res.error) {
      // Roll back so the UI matches what's actually stored.
      setFavorites(f => isFav ? [...f, id] : f.filter(x => x !== id));
      showNotif({ title: "Couldn't save favorite", body: res.error, icon: 'x' }, 4000);
    }
  };

  const toggleProviderFav = async (id: string) => {
    const isFav = providerFavorites.includes(id);
    setProviderFavorites(f => isFav ? f.filter(x => x !== id) : [...f, id]);
    const res = isFav ? await db.removeProviderFavorite(id) : await db.addProviderFavorite(id);
    if (res.error) {
      setProviderFavorites(f => isFav ? [...f, id] : f.filter(x => x !== id));
      showNotif({ title: "Couldn't save shop", body: res.error, icon: 'x' }, 4000);
    }
  };

  // ---- Cart / checkout ----

  const addToCart = (p: Product) => {
    setCart(c => {
      const ex = c.find(i => i.id === p.id);
      if (ex) return c.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { ...p, qty: 1 }];
    });
    showNotif({ title: 'Added to cart', body: p.name, icon: 'bag' }, 2200);
  };

  const changeQty = (id: string, qty: number) =>
    setCart(c => qty <= 0 ? c.filter(i => i.id !== id) : c.map(i => i.id === id ? { ...i, qty } : i));

  const removeFromCart = (id: string) => setCart(c => c.filter(i => i.id !== id));
  const clearCart = () => setCart([]);

  const checkout = async (input?: OrderCheckoutInput) => {
    if (!cart.length) return;
    // Group by vendorId → one Order each. (vendorId carries through to the DB so the
    // vendor's app picks up "new order" via realtime.)
    const byVendor = new Map<string, CartItem[]>();
    for (const i of cart) {
      const arr = byVendor.get(i.vendorId) || [];
      arr.push(i);
      byVendor.set(i.vendorId, arr);
    }
    const ownerName = user.name || user.email || 'Owner';
    const newOrders: Order[] = [];
    let totalAcrossOrders = 0;
    byVendor.forEach((items, vendorId) => {
      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      const fee = 0;
      const total = subtotal + fee;
      totalAcrossOrders += total;
      const lineItems = items.map(i => ({
        id: i.id, name: i.name, price: i.price, qty: i.qty,
        lineTotal: i.price * i.qty,
        imageUrl: i.imageUrl,
        vendor: i.vendor,
      }));
      newOrders.push({
        id: 'o' + Date.now() + Math.random().toString(36).slice(2, 5),
        ownerId: user.id,
        ownerName,
        vendorId,
        vendorName: items[0]?.vendor || 'Shop',
        itemCount: items.reduce((s, i) => s + i.qty, 0),
        total,
        when: nowWhen(),
        status: 'placed',
        createdAt: Date.now(),
        items: lineItems,
        address: input?.address ?? null,
        paymentMethod: input?.paymentMethod ?? undefined,
        note: input?.note,
      });
    });
    // Optimistic local: decrement stock, push orders, clear cart, open checkout sheet.
    setProducts(ps => ps.map(p => {
      const inCart = cart.find(c => c.id === p.id);
      return inCart ? { ...p, stockCount: Math.max(0, p.stockCount - inCart.qty), sales: p.sales + inCart.qty } : p;
    }));
    setOrders(o => [...newOrders, ...o]);
    setLastOrderTotal(totalAcrossOrders);
    setLastCheckoutMeta({ kind: 'order', total: totalAcrossOrders });
    setCart([]);
    setCartOpen(false);
    setCheckoutOpen(true);

    // Persist orders + product stock updates. Each insert returns the row the
    // DB stored (with its server-assigned uuid); reconcile by swapping the
    // optimistic-local row in place so realtime updates land on the right id.
    const inserts = await Promise.all(newOrders.map(o => db.insertOrder(o)));
    const failures: string[] = [];
    inserts.forEach((res, idx) => {
      const optimisticId = newOrders[idx].id;
      if (res.error || !res.order) {
        failures.push(res.error || 'Insert failed');
        // Drop the optimistic row so the user doesn't see a "ghost" order that
        // never reached the DB.
        setOrders(arr => arr.filter(o => o.id !== optimisticId));
        return;
      }
      // Replace optimistic id with the persisted row.
      const saved = res.order;
      setOrders(arr => arr.map(o => o.id === optimisticId ? saved : o));
    });
    if (failures.length) {
      // Surface whichever error came back so the user can act on it (most
      // commonly: migration 0013 not yet applied to the project).
      showNotif({
        title: failures.length === newOrders.length ? "Couldn't place order" : "Some orders didn't go through",
        body: failures[0],
        icon: 'x',
      }, 6000);
    }
    await Promise.all(
      cart.map(c => db.updateProductById(c.id, {
        stockCount: Math.max(0, (products.find(p => p.id === c.id)?.stockCount ?? 0) - c.qty),
        sales: (products.find(p => p.id === c.id)?.sales ?? 0) + c.qty,
      })),
    );
  };

  // ---- Provider self ----

  const ensureSelfBlank = (uid: string): Provider => ({
    id: uid,
    name: '',
    type: 'walker',
    icon: 'walk',
    area: '',
    distanceKm: 0,
    rating: 0,
    reviews: 0,
    price: '$—',
    priceLabel: '',
    verified: false,
    tags: [],
    hours: '',
    staff: '',
    categories: [],
    displayPic: null,
  });

  const updateSelfProvider = async (patch: Partial<Provider>) => {
    if (!user.id) return;
    const base = selfProvider ?? ensureSelfBlank(user.id);
    const next: Provider = { ...base, ...patch };
    setSelfProvider(next);
    if (next.published) {
      setProvidersList(arr => arr.map(p => p.id === user.id ? next : p));
    }
    await db.upsertSelfProvider(user.id, patch);
  };

  const setProviderCategories = async (cats: ServiceCategoryId[]) => {
    _setProviderCategories(cats);
    if (!user.id) return;
    const base = selfProvider ?? ensureSelfBlank(user.id);
    const next = deriveProviderFromCategories(base, cats, providerServices);
    setSelfProvider(next);
    if (next.published) setProvidersList(arr => arr.map(p => p.id === user.id ? next : p));
    await db.upsertSelfProvider(user.id, { categories: cats, type: next.type, icon: next.icon, price: next.price, priceLabel: next.priceLabel });
  };

  const publishSelfProvider = async () => {
    if (!user.id) return;
    const base = selfProvider ?? ensureSelfBlank(user.id);
    const synced = deriveProviderFromCategories(
      { ...base, displayPic: providerDisplayPic, published: true },
      providerCategories, providerServices,
    );
    setSelfProvider(synced);
    setProvidersList(arr => {
      const filtered = arr.filter(p => p.id !== user.id);
      return [synced, ...filtered];
    });
    await db.upsertSelfProvider(user.id, synced);
  };

  // Single atomic save used by the provider onboarding/edit flow.
  // Builds the full record once (avoids races between updateSelfProvider /
  // setProviderCategories / publishSelfProvider all reading stale closures).
  const saveAndPublishProvider: Ctx['saveAndPublishProvider'] = async ({
    name, area, bio, displayPic, categories, services, weeklyHours, coords, gmapsLink,
    whatsapp, emergency,
  }) => {
    if (!user.id) return;
    const base = selfProvider ?? ensureSelfBlank(user.id);
    const effectiveServices = services ?? providerServices;
    const merged: Provider = {
      ...base,
      name,
      area: area ?? base.area,
      bio: bio ?? base.bio,
      staff: name, // legacy display field
      categories,
      displayPic: displayPic ?? base.displayPic,
      weeklyHours: weeklyHours !== undefined ? weeklyHours : base.weeklyHours ?? null,
      coords: coords !== undefined ? coords : base.coords ?? null,
      gmapsLink: gmapsLink !== undefined ? gmapsLink : base.gmapsLink,
      whatsapp: whatsapp !== undefined ? whatsapp : base.whatsapp,
      emergency: emergency !== undefined ? emergency : base.emergency,
      published: true,
    };
    const synced = deriveProviderFromCategories(merged, categories, effectiveServices);

    // Optimistic local
    setSelfProvider(synced);
    _setProviderCategories(categories);
    if (services) setProviderServices(services);
    if (displayPic !== undefined) setProviderDisplayPic(displayPic);
    setProvidersList(arr => {
      const filtered = arr.filter(p => p.id !== user.id);
      return [synced, ...filtered];
    });

    // Persist — sequential so each completes before the next.
    await db.upsertSelfProvider(user.id, synced);
    if (services) await db.replaceProviderServicesDb(user.id, services);
  };

  const toggleServiceActive = async (cat: ServiceCategoryId, id: string) => {
    let toggledService = null as { active: boolean } | null;
    setProviderServices(s => {
      const next = {
        ...s,
        [cat]: s[cat].map(svc => {
          if (svc.id === id) { toggledService = { active: !svc.active }; return { ...svc, active: !svc.active }; }
          return svc;
        }),
      };
      if (selfProvider) {
        const synced = deriveProviderFromCategories(selfProvider, providerCategories, next);
        setSelfProvider(synced);
        if (synced.published) setProvidersList(arr => arr.map(p => p.id === user.id ? synced : p));
      }
      return next;
    });
    if (toggledService) await db.setServiceActive(id, toggledService.active);
  };

  const addOffering = async (cat: ServiceCategoryId, name: string, price: number, unit: string, desc: string) => {
    if (!user.id) return;
    // Insert via upsert (no id provided → DB generates uuid).
    const tempId = 's_' + Date.now() + Math.random().toString(36).slice(2, 5);
    const optimistic = { id: tempId, name, price, unit, desc, active: true };
    setProviderServices(s => {
      const next = { ...s, [cat]: [...s[cat], optimistic] };
      if (selfProvider) {
        const synced = deriveProviderFromCategories(selfProvider, providerCategories, next);
        setSelfProvider(synced);
        if (synced.published) setProvidersList(arr => arr.map(p => p.id === user.id ? synced : p));
      }
      return next;
    });
    await db.upsertProviderService(user.id, cat, optimistic);
    // Refresh to swap temp id for the DB-assigned uuid.
    const fresh = await db.loadProviderServices(user.id);
    setProviderServices(fresh);
  };

  const replaceProviderServices = async (next: ProviderServices) => {
    setProviderServices(next);
    if (selfProvider) {
      const synced = deriveProviderFromCategories(selfProvider, providerCategories, next);
      setSelfProvider(synced);
      if (synced.published) setProvidersList(arr => arr.map(p => p.id === user.id ? synced : p));
    }
    if (user.id) {
      await db.replaceProviderServicesDb(user.id, next);
      const fresh = await db.loadProviderServices(user.id);
      setProviderServices(fresh);
    }
  };

  // ---- Products ----

  const publishProduct = async (input: { name: string; price: number; cat: string; stockCount: number; subtitle?: string; description?: string; accent?: string; imageUrl?: string }) => {
    if (!user.id) return;
    const vendor = selfProvider?.name || 'My Shop';
    const { product, error } = await db.insertProduct(user.id, vendor, {
      name: input.name, subtitle: input.subtitle, description: input.description, price: input.price,
      category: input.cat, stockCount: input.stockCount, accent: input.accent,
      imageUrl: input.imageUrl,
    });
    if (error || !product) {
      showNotif({ title: "Couldn't publish listing", body: error || 'Try again.', icon: 'x' }, 5000);
      return;
    }
    setProducts(ps => [product, ...ps]);
    showNotif({ title: 'Listing published', body: 'It is now visible to owners in the shop.', icon: 'check-circle' });
  };

  const updateProduct = async (id: string, patch: Partial<Product>) => {
    setProducts(ps => ps.map(p => p.id === id ? { ...p, ...patch } : p));
    await db.updateProductById(id, patch);
  };

  const unlistProduct = async (id: string) => {
    const prev = products.find(p => p.id === id);
    if (!prev) return;
    setProducts(ps => ps.filter(p => p.id !== id));
    const { error } = await db.deleteProductById(id);
    if (error) {
      setProducts(ps => ps.find(p => p.id === id) ? ps : [prev, ...ps]);
      showNotif({ title: "Couldn't unlist", body: error, icon: 'x' }, 4000);
      return;
    }
    showNotif({ title: 'Listing removed', body: 'It is no longer visible in the shop.', icon: 'check' }, 3000);
  };

  // ---- Bookings ----

  const createBooking = async (data: BookingDraft) => {
    // Canonical storage string — never "Today", always explicit date.
    const fullWhen = `${data.day.label} ${data.day.num} ${data.day.mon}, ${data.time}`;
    const petsCount = data.pets.length || 1;
    const primaryPet = data.pets[0];

    // Materialize line items. Each service applies *per pet*, so the total scales
    // with petsCount regardless of the unit string. `dogMult` becomes the marker
    // "was multiplied by pets" for downstream display.
    const services: BookingLineItem[] = data.services.map(s => {
      const dogMult = petsCount > 1;
      const lineTotal = s.price * s.qty * Math.max(1, petsCount);
      return {
        id: s.id, name: s.name, price: s.price, unit: s.unit,
        qty: s.qty, dogMult, lineTotal,
        categoryId: s.categoryId,
      };
    });
    const pointsDiscount = Math.min(data.pointsRedeemed ?? 0, pawPoints) / 100;
    const total = Math.max(0, services.reduce((sum, s) => sum + s.lineTotal, 0) - pointsDiscount);
    const summary = services.length === 1
      ? services[0].name
      : `${services.length} services`;

    const draft: Booking = {
      id: '',
      ownerId: user.id,
      ownerName: user.name || user.email || 'Owner',
      providerId: data.provider.id,
      providerName: data.provider.name,
      providerType: data.provider.type,
      pet: primaryPet,
      service: summary,
      // when is stored as the canonical string in the DB; display code
      // re-formats to "Today / Tomorrow / Tue 5 May" at render time.
      when: fullWhen,
      whenLabel: `${data.day.label} ${data.day.num} ${data.day.mon}`,
      time: data.time,
      address: data.address || user.neighborhood || '—',
      distanceKm: data.provider.distanceKm,
      amount: total,
      note: data.note,
      sharePassport: data.sharePassport,
      status: 'pending',
      createdAt: Date.now(),
      services,
      petsList: data.pets,
      paymentMethod: data.paymentMethod,
      recurring: data.recurring ?? false,
      recurringInterval: data.recurringInterval,
      pointsRedeemed: data.pointsRedeemed ?? 0,
    };

    setBookingOpen(null);
    setProviderDetailOpen(null);
    setLastCheckoutMeta({
      kind: 'booking', total, count: services.length, providerNames: [data.provider.name],
    });
    setCheckoutOpen(true);
    setOwnerTab('activity');
    setTimeout(() => {
      showNotif(bookingSentNotif({
        providerType: data.provider.type,
        services,
        providerName: data.provider.name,
        petName: primaryPet?.name,
      }));
    }, 300);

    const saved = await db.insertBooking(draft);
    if (saved) {
      setBookings(b => [saved, ...b]);
      if ((data.pointsRedeemed ?? 0) > 0) {
        await redeemPawPoints(saved.id, data.pointsRedeemed!, `Redeemed on booking: ${summary}`);
      }
    }
  };

  const advance = async (
    id: string,
    next: BookingStatus,
    successNotif: Notif | null,
    reason?: string,
  ) => {
    const prev = bookings.find(b => b.id === id)?.status;
    setBookings(b => b.map(x => x.id === id ? { ...x, status: next, declineReason: reason ?? x.declineReason } : x));
    const { error } = await db.updateBookingStatus(id, next, reason);
    if (error) {
      if (prev) setBookings(b => b.map(x => x.id === id ? { ...x, status: prev } : x));
      showNotif({ title: 'Update failed', body: error, icon: 'x' }, 5000);
      return;
    }
    if (successNotif) showNotif(successNotif);
  };

  const notifFor = (id: string, status: 'confirmed' | 'in_progress' | 'completed') => {
    const b = bookings.find(x => x.id === id);
    if (!b) return null;
    return bookingStatusNotifForProvider({
      providerType: b.providerType,
      services: b.services,
      providerName: b.providerName,
      petName: b.pet?.name,
    }, status);
  };

  const acceptBooking  = (id: string) => advance(id, 'confirmed', notifFor(id, 'confirmed'));
  const rejectBooking  = (id: string, reason?: string) => advance(id, 'declined', null, reason);
  const cancelBooking  = (id: string, reason?: string) => advance(id, 'cancelled', null, reason);
  const startBooking = (id: string) => advance(id, 'in_progress', notifFor(id, 'in_progress'));

  const completeBooking = async (id: string) => {
    await advance(id, 'completed', notifFor(id, 'completed'));
    // Auto-generate next booking for recurring ones
    const b = bookings.find(x => x.id === id);
    if (!b?.recurring || !b.recurringInterval) return;
    const originalDate = parseWhenLabel(b.whenLabel);
    if (!originalDate) return;
    const daysToAdd = b.recurringInterval === 'weekly' ? 7 : b.recurringInterval === 'biweekly' ? 14 : 30;
    const nextDate = new Date(originalDate);
    nextDate.setDate(originalDate.getDate() + daysToAdd);
    const newWhenLabel = `${DAY_LABELS[nextDate.getDay()]} ${nextDate.getDate()} ${MONTHS[nextDate.getMonth()]}`;
    const newBooking: Booking = {
      ...b,
      id: '',
      status: 'pending',
      when: `${newWhenLabel}, ${b.time}`,
      whenLabel: newWhenLabel,
      createdAt: Date.now(),
      respondedAt: undefined,
      declineReason: undefined,
    };
    const saved = await db.insertBooking(newBooking);
    if (saved) {
      setBookings(arr => [saved, ...arr]);
      showNotif({ title: 'Recurring booking sent', body: `Next ${b.service} requested for ${newWhenLabel}.`, icon: 'calendar' });
    }
  };

  // ---- Order lifecycle (provider acts; status flips visible to owner via realtime) ----

  const advanceOrder = async (
    id: string,
    next: Order['status'],
    successNotif: Notif | null,
    reason?: string,
  ) => {
    const prev = orders.find(o => o.id === id)?.status;
    setOrders(arr => arr.map(o => o.id === id ? { ...o, status: next, declineReason: reason ?? o.declineReason } : o));
    const { error } = await db.updateOrderStatus(id, next, reason);
    if (error) {
      if (prev) setOrders(arr => arr.map(o => o.id === id ? { ...o, status: prev } : o));
      showNotif({ title: 'Update failed', body: error, icon: 'x' }, 5000);
      return;
    }
    if (successNotif) showNotif(successNotif);
  };

  const acceptOrder = (id: string) =>
    advanceOrder(id, 'confirmed', { title: 'Order accepted', body: 'The buyer has been notified.', icon: 'check-circle' });
  const declineOrder = (id: string, reason?: string) => advanceOrder(id, 'declined', null, reason);
  const shipOrder = (id: string) =>
    advanceOrder(id, 'shipped', { title: 'Order shipped', body: 'On its way to the buyer.', icon: 'truck' });
  const completeOrder = (id: string) =>
    advanceOrder(id, 'completed', { title: 'Order completed', body: 'Nice work.', icon: 'check' });

  // ---- ID Verification ----

  const submitIdVerification = async (frontUri: string, backUri: string): Promise<{ error?: string }> => {
    if (!user.id) return { error: 'Not signed in' };
    const { uploadIdPhoto } = await import('./storage');
    const [frontUrl, backUrl] = await Promise.all([
      uploadIdPhoto(frontUri, user.id, 'front'),
      uploadIdPhoto(backUri, user.id, 'back'),
    ]);
    if (!frontUrl || !backUrl) return { error: 'Photo upload failed. Check your connection.' };
    const { verification, error } = await db.upsertIdVerification(user.id, frontUrl, backUrl);
    if (error || !verification) return { error: error ?? 'Submission failed' };
    setIdVerification(verification);
    // Best-effort admin notification — ignore errors.
    const { supabase: sb } = await import('./supabase');
    sb.functions.invoke('notify-id-verification', {
      body: { provider_id: user.id, provider_name: selfProvider?.name || user.name || 'Unknown' },
    }).catch(() => {});
    showNotif({
      title: 'ID submitted for review',
      body: 'We\'ll notify you once it\'s reviewed, usually within 24 hours.',
      icon: 'shield',
    }, 5000);
    return {};
  };

  const deleteBooking = async (id: string) => {
    const prev = bookings.find(b => b.id === id);
    if (!prev) return;
    setBookings(arr => arr.filter(b => b.id !== id));
    const { error } = await db.hideBookingForMe(id);
    if (error) {
      setBookings(arr => arr.find(b => b.id === id) ? arr : [prev, ...arr]);
      showNotif({ title: "Couldn't delete", body: error, icon: 'x' }, 4000);
    }
  };

  // ---- Derived collections ----
  // Compute distance from the owner's current address pin to each provider
  // and sort closest-first. Falls back to the provider's stored distance_km
  // when either side has no pin yet.
  const providersWithDistance = useMemo<Provider[]>(() => {
    // Priority: live GPS → currently-selected address pin → profile coords.
    // Live GPS wins because the owner might be moving around the city.
    const ownerCoords = liveOwnerCoords ?? currentAddress?.coords ?? user.coords ?? null;
    const enriched = providersList.map(p => {
      if (ownerCoords && p.coords) {
        return { ...p, distanceKm: haversineKm(ownerCoords, p.coords) };
      }
      return p;
    });
    return enriched.slice().sort((a, b) => {
      const ad = a.distanceKm > 0 ? a.distanceKm : Number.POSITIVE_INFINITY;
      const bd = b.distanceKm > 0 ? b.distanceKm : Number.POSITIVE_INFINITY;
      return ad - bd;
    });
  }, [providersList, liveOwnerCoords, currentAddress, user.coords]);

  const emergencyVets = useMemo<EmergencyVet[]>(() => {
    return providersWithDistance
      .filter(p => p.emergency && p.categories.includes('vet'))
      .map(p => ({
        id: p.id,
        name: p.name || 'Emergency vet',
        area: p.area || 'Lebanon',
        phone: p.whatsapp || '',
        whatsapp: p.whatsapp,
        gmapsLink: p.gmapsLink,
        distanceKm: p.distanceKm,
        hours: '24h on-call',
        note: (p.bio || '').slice(0, 100),
      }));
  }, [providersWithDistance]);

  const addReview = async (input: { providerId: string; bookingId: string; rating: number; text: string; photoUrl?: string }) => {
    const authorName = user.name || user.email || 'Pet owner';
    const res = await db.insertReview({
      providerId: input.providerId,
      bookingId: input.bookingId,
      authorName,
      rating: input.rating,
      body: input.text,
      photoUrl: input.photoUrl,
    });
    if (res.error) return { error: res.error };
    if (res.review) setReviews(arr => [res.review!, ...arr.filter(r => r.id !== res.review!.id)]);
    showNotif({ title: 'Review posted', body: 'Thanks for the feedback!', icon: 'check-circle' });
    return {};
  };

  const removeReview = async (id: string) => {
    setReviews(arr => arr.filter(r => r.id !== id));
    await db.deleteReview(id);
  };

  const respondToReview = async (id: string, response: string) => {
    const prev = reviews.find(r => r.id === id);
    setReviews(arr => arr.map(r => r.id === id ? { ...r, response, respondedAt: Date.now() } : r));
    try {
      await db.respondToReview(id, response);
    } catch (e) {
      // Roll back optimistic update on failure
      if (prev) setReviews(arr => arr.map(r => r.id === id ? prev : r));
      throw e;
    }
  };

  // ---- value memo ----
  const value = useMemo<Ctx>(() => ({
    theme, setTheme, dark, setDark,
    authChecking, isAuthenticated, signOut,
    onboarded, setOnboarded, role, setRole,
    user, setUser, updateProfile,
    pets, addPet, removePet, updatePet,
    healthRecords, addHealthRecord, updateHealthRecord, removeHealthRecord,
    pawPoints, earnPawPoints, redeemPawPoints, redeemPromoCode,
    lostPetAlerts, reportLostPet, resolveLostPetAlert: resolveLostPetAlertAction, refreshLostPetAlerts,
    lostPetOpen, setLostPetOpen, lostPetReportFor, setLostPetReportFor,
    referralOpen, setReferralOpen,
    savedAddresses, recentAddresses, currentAddressId, currentAddress,
    setCurrentAddress, addAddress, updateAddress, removeAddress,
    locationOpen, setLocationOpen,
    addressEditorOpen, setAddressEditorOpen,
    paymentMethods, savedPaymentMethods,
    addPaymentMethod, updatePaymentMethod, removePaymentMethod,
    paymentMethodsOpen, setPaymentMethodsOpen,
    paymentMethodEditorOpen, setPaymentMethodEditorOpen,
    providers: providersWithDistance, allProviderServices, selfProvider, isSelfPublished,
    publishSelfProvider, updateSelfProvider, saveAndPublishProvider,
    products, publishProduct, updateProduct, unlistProduct,
    providerCategories, setProviderCategories,
    providerServices, toggleServiceActive, addOffering, replaceProviderServices,
    bookings, orders, ownerActivity, providerIncoming, providerIncomingOrders,
    createBooking, acceptBooking, rejectBooking, cancelBooking, startBooking, completeBooking, deleteBooking,
    acceptOrder, declineOrder, shipOrder, completeOrder,
    ownerTab, setOwnerTab,
    favorites, toggleFav,
    providerFavorites, toggleProviderFav,
    cart, cartCount, cartTotal, addToCart, changeQty, removeFromCart, clearCart, checkout,
    lastOrderTotal, lastCheckoutMeta,
    providerTab, setProviderTab,
    providerAlerting, setProviderAlerting,
    feedbackEnabled, setFeedbackEnabled,
    providerDisplayPic, setProviderDisplayPic,
    idVerification, submitIdVerification,
    payoutSetup, setPayoutSetup, payoutSetupOpen, setPayoutSetupOpen,
    emergencyVets, reviews, addReview, removeReview, refreshReviews, respondToReview,
    bookingOpen, setBookingOpen,
    storefrontCategoryOpen, setStorefrontCategoryOpen,
    providerDetailOpen, setProviderDetailOpen,
    providerShopOpen, setProviderShopOpen,
    productDetailOpen, setProductDetailOpen,
    cartOpen, setCartOpen,
    orderCheckoutOpen, setOrderCheckoutOpen,
    checkoutOpen, setCheckoutOpen,
    emergencyOpen, setEmergencyOpen,
    profileOpen, setProfileOpen,
    pawPointsOpen, setPawPointsOpen,
    addProductOpen, setAddProductOpen,
    providerSetupOpen, setProviderSetupOpen,
    ownerProfileSetupOpen, setOwnerProfileSetupOpen,
    petSheetOpen, setPetSheetOpen,
    petSheetEdit, setPetSheetEdit,
    activityDetailOpen, setActivityDetailOpen,
    orderDetailOpen, setOrderDetailOpen,
    reviewSheetFor, setReviewSheetFor,
    reviewsListForProvider, setReviewsListForProvider,
    chatTarget, setChatTarget, unreadChatCount, refreshUnreadChatCount,
    notif, setNotif, showNotif,
    notifLog, unreadNotifCount,
    notifCenterOpen, setNotifCenterOpen,
    markNotifRead, markAllNotifsRead, clearNotifs,
    // The action helpers below (acceptBooking, addAddress, etc.) are not wrapped
    // in useCallback — they're re-created each render and close over the latest
    // state. Listing them in deps would defeat the memo entirely. State vars they
    // depend on ARE in the deps, so when those change the memo recomputes and the
    // fresh function closures are exposed. T5-A audit (historically-forgotten
    // state: healthRecords, pawPointsEvents, lostPetAlerts, referralOpen,
    // lostPetReportFor) is satisfied by the state deps below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [
    theme, dark, authChecking, isAuthenticated, onboarded, role,
    user, pets, healthRecords, pawPointsEvents, lostPetAlerts, lostPetOpen, lostPetReportFor, referralOpen,
    savedAddresses, recentAddresses, currentAddressId,
    locationOpen, addressEditorOpen,
    savedPaymentMethods, paymentMethodsOpen, paymentMethodEditorOpen,
    providersList, providersWithDistance, allProviderServices, selfProvider, isSelfPublished,
    products, providerCategories, providerServices, providerDisplayPic,
    bookings, orders, ownerActivity, providerIncoming, providerIncomingOrders,
    ownerTab, providerTab, favorites, providerFavorites, cart, cartCount, cartTotal, lastOrderTotal,
    providerAlerting, feedbackEnabled, bookingOpen, storefrontCategoryOpen, providerDetailOpen, providerShopOpen, productDetailOpen,
    idVerification, payoutSetup, payoutSetupOpen,
    lastCheckoutMeta,
    cartOpen, orderCheckoutOpen, checkoutOpen, emergencyOpen, profileOpen, pawPointsOpen, addProductOpen, providerSetupOpen,
    ownerProfileSetupOpen, petSheetOpen, petSheetEdit,
    activityDetailOpen, orderDetailOpen, reviewSheetFor, reviewsListForProvider, reviews,
    chatTarget, unreadChatCount,
    emergencyVets, notif, notifLog, unreadNotifCount, notifCenterOpen,
  ]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
