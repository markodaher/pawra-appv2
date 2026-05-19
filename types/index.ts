export type Role = 'owner' | 'provider';

export type ServiceCategoryId = 'walk' | 'groom' | 'vet' | 'board' | 'taxi' | 'funeral';
export type ProviderType = 'walker' | 'groomer' | 'vet' | 'boarder' | 'taxi' | 'funeral';

export type User = {
  id: string;
  email: string;
  name: string;            // empty until set in profile
  dob: string;             // empty until set; "DD/MM/YYYY"
  neighborhood: string;    // empty until pin dropped on map
  coords: { lat: number; lng: number } | null;
  referralCode?: string;     // assigned automatically when the profile row is created
  referredByCode?: string;   // optional — set if they entered a friend's code on signup
};

export type Pet = {
  id: string;
  name: string;
  species: 'dog' | 'cat';
  breed: string;
  age: number;
  weight: number;
  sex: 'male' | 'female';
  blood: string;
  color?: string;
  neutered?: boolean;
  notes?: string;
  /** Optional pet photo. Falls back to first-letter avatar in the UI. */
  imageUrl?: string;
};

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type DayHours = {
  open: boolean;
  from: string;           // "HH:MM" 24h
  to: string;             // "HH:MM" 24h
};

export type WeeklyHours = Record<DayKey, DayHours>;

export type Coords = { lat: number; lng: number };

export type Provider = {
  id: string;
  name: string;
  type: ProviderType;
  icon: string;
  area: string;
  distanceKm: number;
  rating: number;        // 0 for new providers
  reviews: number;
  price: string;         // display string e.g. "$12"
  priceLabel: string;    // e.g. "/walk"
  verified: boolean;
  tags: string[];
  hours: string;         // legacy display string (derived from weeklyHours)
  staff: string;
  categories: ServiceCategoryId[]; // multi-select
  displayPic: string | null;
  // Extended profile (all optional — populated by the rich setup flow)
  bio?: string;
  whatsapp?: string;
  gmapsLink?: string;
  coords?: Coords | null;
  weeklyHours?: WeeklyHours | null;
  workPhotos?: string[];
  emergency?: boolean;            // 24/7 emergency vet flag (only meaningful with vet category)
  published?: boolean;            // only set for the user's own selfProvider record
  // Auto-accept rules — applied to incoming bookings for this provider.
  autoAcceptEnabled?: boolean;
  autoAcceptMaxAmount?: number;        // dollars, inclusive
  autoAcceptMinHoursAhead?: number;    // hours of lead time required
};

export type ServiceType = {
  id: ServiceCategoryId;
  label: string;
  icon: string;
};

export type ShopCategory = {
  id: string;
  label: string;
  icon: string;
};

export type Product = {
  id: string;
  name: string;
  subtitle: string;          // empty if not provided
  price: number;
  cat: string;
  vendor: string;
  vendorId: string;          // FK to provider
  stockCount: number;        // numeric inventory (managed by provider)
  sales: number;
  accent: string;
  distanceKm: number;        // 0 if vendor location unknown
  imageUrl?: string;         // hero photo (provider-photos bucket); falls back to placeholder
  description?: string;      // longer product description shown in the item detail modal
};

export type CartItem = Product & { qty: number };

export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'declined';

/**
 * One line item inside a multi-service booking. Computed total per line is
 * `price * qty * (dogMult ? petsCount : 1)` — kept on the row so the provider
 * inbox doesn't have to recompute.
 */
export type BookingLineItem = {
  id: string;          // matches ProviderService.id
  name: string;
  price: number;
  unit: string;        // e.g. '/walk', '/dog/walk'
  qty: number;
  dogMult: boolean;    // true if `unit` includes '/dog' (multiplies by pets.length)
  lineTotal: number;
  // Category this line item belongs to. Optional for backward-compat with rows
  // saved before the field existed; readers fall back to providerType.
  categoryId?: ServiceCategoryId;
};

export type PaymentMethodKind = 'cash' | 'card' | 'whish';

export type PaymentMethodMeta = {
  cardLast4?: string;
  cardBrand?: 'visa' | 'mastercard' | 'amex';
  cardExpiry?: string;       // 'MM/YY'
  whishPhone?: string;       // local number string e.g. '+961 70 xxx xxx'
};

export type PaymentMethod = {
  id: string;          // db uuid for saved methods, 'cash' for the built-in
  /** Optional for backward compat with rows saved before this field landed. */
  kind?: PaymentMethodKind;
  label: string;       // 'Pay in cash' / 'Visa •••• 4242' / 'Whish · 70 xxx xxx'
  sub?: string;        // small subtitle, e.g. 'Touch ID or Face ID' or 'Expires 09/27'
  icon: string;        // icon name from our icon set
  meta?: PaymentMethodMeta;
};

// Single record shared between owner activity and provider inbox.
export type Booking = {
  id: string;
  bookingNumber?: number;    // sequential human-readable number e.g. 1042
  ownerId: string; ownerName: string;
  providerId: string; providerName: string;
  providerType: ProviderType;
  pet: Pet;                              // legacy single-pet primary; first of pets[] for new bookings
  service: string;                       // legacy single-service primary; summary of services[] for new bookings
  when: string;                          // display string e.g. "Today, 5:30pm"
  whenLabel: string;                     // e.g. "Mon 28 Apr"
  time: string;                          // e.g. "17:30"
  address: string;
  distanceKm: number;
  amount: number;                        // total
  note: string;
  sharePassport: boolean;
  status: BookingStatus;
  declineReason?: string;
  createdAt: number;
  respondedAt?: number;                  // set when status first leaves 'pending'
  // New (multi-service / multi-pet bookings)
  services?: BookingLineItem[];          // line items
  petsList?: Pet[];                      // all selected pets
  paymentMethod?: PaymentMethod;
  recurring?: boolean;
  recurringInterval?: 'weekly' | 'biweekly' | 'monthly';
  pointsRedeemed?: number;
};

export type OrderStatus = 'placed' | 'confirmed' | 'shipped' | 'completed' | 'cancelled' | 'declined';

/**
 * One product line on an order. Mirrors BookingLineItem so the provider inbox
 * can render orders with the same shape as bookings.
 */
export type OrderLineItem = {
  id: string;          // product id
  name: string;
  price: number;       // unit price at time of order
  qty: number;
  lineTotal: number;   // price * qty
  imageUrl?: string;
  vendor?: string;
};

export type Order = {
  id: string;
  orderNumber?: number;    // sequential human-readable number e.g. 1042
  ownerId: string;
  ownerName: string;       // denormalised for provider display
  vendorId: string;        // FK to providers.id (the seller)
  vendorName: string;      // denormalised for display
  itemCount: number;
  total: number;
  when: string;
  status: OrderStatus;
  createdAt: number;
  respondedAt?: number;    // set when status first leaves 'placed'
  declineReason?: string;  // set when provider declines or cancels
  // Rich detail (populated for new orders; legacy rows may have these undefined)
  items?: OrderLineItem[];
  address?: Address | null;
  paymentMethod?: PaymentMethod;
  note?: string;
  pointsRedeemed?: number;
};

// View-model for the owner's Activity tab — derived from Booking | Order.
export type ActivityKind = 'booking' | 'order';
export type ActivityStatus = BookingStatus | OrderStatus;

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  title: string;
  sub: string;
  when: string;
  status: ActivityStatus;
  amount: number;
  providerId?: string;
};

export type Review = {
  id: string;
  providerId: string;
  bookingId: string;
  authorId: string;
  author: string;            // display name
  rating: number;            // 1-5
  text: string;
  photoUrl?: string;
  when: string;              // human-readable ("3 days ago")
  createdAt: number;         // millis
  response?: string;         // provider's public reply
  respondedAt?: number;      // millis
};

export type AddressKind = 'home' | 'work' | 'saved' | 'searched' | 'recent';
export type AddressIcon = 'home' | 'briefcase' | 'pin' | 'clock' | 'search';

export type Address = {
  id: string;
  label: string;          // "Home", "Work", "Mom's place"
  kind: AddressKind;
  icon?: AddressIcon;
  line1: string;
  area: string;
  floor?: string;
  notes?: string;
  coords?: Coords | null;
};

export type EmergencyVet = {
  id: string;
  name: string;
  area: string;
  phone: string;
  /** Optional WhatsApp number; defaults to phone when missing. */
  whatsapp?: string;
  /** Google Maps link to the clinic. Powers the "Get directions" CTA. */
  gmapsLink?: string;
  distanceKm: number;
  hours: string;
  note: string;
};

export type ProviderService = {
  id: string;
  name: string;
  price: number;
  unit: string;
  desc: string;
  active: boolean;
};

export type ProviderServices = Record<ServiceCategoryId, ProviderService[]>;

export type Notif = {
  title: string;
  body: string;
  icon: string;
  /** When set, tapping this notification in the centre navigates to the detail screen. */
  targetId?: string;
  targetKind?: 'booking' | 'order' | 'chat';
  /** Chat-specific extras — populated when targetKind === 'chat'. */
  chatBookingId?: string;
  chatOrderId?: string;
  chatOtherName?: string;
  chatRecipientId?: string;
};

// ── Lost Pet Alerts ───────────────────────────────────────────────────────────
export type LostPetAlertStatus = 'active' | 'found' | 'closed';
export type LostPetAlert = {
  id: string;
  petId: string;
  ownerId: string;
  ownerName: string;
  ownerPhone?: string;
  petName: string;
  petSpecies: 'dog' | 'cat';
  petBreed?: string;
  petImageUrl?: string;
  lastSeenLabel: string;
  lastSeenCoords?: { lat: number; lng: number } | null;
  notes?: string;
  status: LostPetAlertStatus;
  createdAt: number;
  resolvedAt?: number;
};

// ── Paw Points ────────────────────────────────────────────────────────────────
export type PawPointsEvent = {
  id: string;
  ownerId: string;
  type: 'earn' | 'redeem' | 'bonus';
  points: number;       // positive for earn/bonus, negative for redeem
  description: string;
  referenceId?: string;
  createdAt: number;
};

export type HealthRecordType = 'vaccination' | 'medication' | 'vet_visit' | 'deworming' | 'weight' | 'allergy';

export type HealthRecord = {
  id: string;
  petId: string;
  ownerId: string;
  type: HealthRecordType;
  title: string;
  date?: string;       // 'DD/MM/YYYY'
  notes?: string;
  nextDue?: string;    // 'DD/MM/YYYY' — vaccinations, deworming
  dosage?: string;     // medications
  frequency?: string;  // medications
  weightKg?: number;   // weight records
  severity?: 'mild' | 'moderate' | 'severe'; // allergies
  createdAt: number;
};

export type ThemeName = 'sky' | 'mist' | 'azure' | 'porcelain' | 'clay' | 'olive' | 'cedar' | 'midnight' | 'lbci' | 'mcfc' | 'gram' | 'pawra';

export type Message = {
  id: string;
  bookingId?: string;
  orderId?: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: number;
  readAt?: number;
  recipientId?: string;
};

export type ChatTarget = {
  bookingId?: string;
  orderId?: string;
  /** Display name of the other party shown in the chat header. */
  otherName: string;
  otherAvatar?: string;
  /** The other party's user ID — used to set recipient_id on outgoing messages. */
  recipientId?: string;
};

export type IdVerificationStatus = 'pending' | 'approved' | 'rejected';

export type IdVerification = {
  id: string;
  providerId: string;
  frontUrl: string;
  backUrl: string;
  status: IdVerificationStatus;
  submittedAt: number;
  reviewedAt?: number;
  adminNote?: string;
};

export type Theme = {
  bg: string;
  bgRaised: string;
  surface: string;
  surfaceAlt: string;
  ink: string;
  inkSoft: string;
  inkMuted: string;
  hairline: string;
  brand: string;
  brandSoft: string;
  brandInk: string;
  accent: string;
  accentSoft: string;
  warn: string;
  danger: string;
  success: string;
};
