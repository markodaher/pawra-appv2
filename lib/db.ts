import type { RealtimeChannel } from '@supabase/supabase-js';
import { formatTimestamp } from './dateUtils';
import type {
  Address, AddressIcon, AddressKind, Booking, BookingLineItem, BookingStatus, ChatTarget, Coords,
  IdVerification, Message, Order, PaymentMethod, PaymentMethodKind, PaymentMethodMeta, Pet,
  Product, Provider, ProviderService, ProviderServices, Review, Role, ServiceCategoryId, User, WeeklyHours,
} from '../types';
import { supabase } from './supabase';

// ============================================================================
// Row shapes (snake_case as stored in Postgres)
// ============================================================================

type ProfileRow = {
  id: string; email: string | null;
  name: string; dob: string;
  role: Role | null;
  neighborhood: string;
  coords: Coords | null;
  referral_code?: string | null;
  referred_by_code?: string | null;
};

type PetRow = {
  id: string; owner_id: string;
  name: string; species: 'dog' | 'cat'; breed: string;
  age: number; weight: number; sex: 'male' | 'female'; blood: string;
  color: string | null; neutered: boolean | null; notes: string | null;
  image_url: string | null;
};

type ProviderRow = {
  id: string;
  name: string; type: Provider['type']; icon: string;
  area: string; distance_km: number;
  rating: number; reviews: number;
  price: string; price_label: string;
  verified: boolean; tags: string[]; hours: string; staff: string;
  categories: ServiceCategoryId[]; display_pic: string | null;
  bio: string | null; whatsapp: string | null; gmaps_link: string | null;
  coords: Coords | null;
  weekly_hours: WeeklyHours | null;
  work_photos: string[]; emergency: boolean; published: boolean;
  auto_accept_enabled?: boolean;
  auto_accept_max_amount?: number | null;
  auto_accept_min_hours_ahead?: number | null;
};

type ServiceRow = {
  id: string; provider_id: string; category: ServiceCategoryId;
  name: string; price: number; unit: string; description: string; active: boolean;
};

type ProductRow = {
  id: string; vendor_id: string;
  name: string; subtitle: string;
  price: number; category: string;
  stock_count: number; sales: number;
  accent: string; distance_km: number;
  image_url: string | null;
  description: string | null;
};

export type BookingRow = {
  id: string;
  booking_number?: number | null;
  owner_id: string; owner_name: string;
  provider_id: string; provider_name: string; provider_type: Provider['type'];
  pet: Pet;
  service: string;
  when_text: string; when_label: string; booking_time: string;
  address: string; distance_km: number;
  amount: number; note: string; share_passport: boolean;
  status: BookingStatus;
  created_at: string;
  responded_at: string | null;
  services: BookingLineItem[] | null;
  pets_list: Pet[] | null;
  payment_method: PaymentMethod | null;
  owner_hidden?: boolean;
  provider_hidden?: boolean;
  decline_reason?: string | null;
  recurring?: boolean;
  recurring_interval?: string | null;
  points_redeemed?: number;
};

export type ReviewRow = {
  id: string;
  provider_id: string;
  booking_id: string;
  author_id: string;
  author_name: string;
  rating: number;
  body: string;
  photo_url: string | null;
  created_at: string;
  response: string | null;
  responded_at: string | null;
};

export type OrderRow = {
  id: string; owner_id: string;
  order_number?: number | null;
  owner_name: string | null;
  vendor_id: string | null;
  vendor_name: string; item_count: number; total: number;
  when_text: string; status: Order['status'];
  created_at: string;
  responded_at?: string | null;
  items?: Order['items'] | null;
  address?: Order['address'] | null;
  payment_method?: Order['paymentMethod'] | null;
  note?: string | null;
  decline_reason?: string | null;
};

// ============================================================================
// Row → app type converters
// ============================================================================

function userFromProfile(row: ProfileRow): Partial<User> {
  return {
    id: row.id,
    email: row.email ?? '',
    name: row.name,
    dob: row.dob,
    neighborhood: row.neighborhood,
    coords: row.coords,
    referralCode:    row.referral_code    ?? undefined,
    referredByCode:  row.referred_by_code ?? undefined,
  };
}

function petFromRow(row: PetRow): Pet {
  return {
    id: row.id,
    name: row.name, species: row.species, breed: row.breed,
    age: row.age, weight: row.weight, sex: row.sex, blood: row.blood,
    color: row.color ?? undefined,
    neutered: row.neutered ?? undefined,
    notes: row.notes ?? undefined,
    imageUrl: row.image_url ?? undefined,
  };
}

function providerFromRow(row: ProviderRow): Provider {
  return {
    id: row.id,
    name: row.name, type: row.type, icon: row.icon,
    area: row.area, distanceKm: row.distance_km,
    rating: row.rating, reviews: row.reviews,
    price: row.price, priceLabel: row.price_label,
    verified: row.verified, tags: row.tags ?? [],
    hours: row.hours, staff: row.staff,
    categories: row.categories ?? [],
    displayPic: row.display_pic,
    bio: row.bio ?? undefined,
    whatsapp: row.whatsapp ?? undefined,
    gmapsLink: row.gmaps_link ?? undefined,
    coords: row.coords ?? null,
    weeklyHours: row.weekly_hours,
    workPhotos: row.work_photos ?? [],
    emergency: row.emergency,
    autoAcceptEnabled:        row.auto_accept_enabled        ?? false,
    autoAcceptMaxAmount:      row.auto_accept_max_amount     ?? undefined,
    autoAcceptMinHoursAhead:  row.auto_accept_min_hours_ahead ?? undefined,
  };
}

function serviceFromRow(row: ServiceRow): ProviderService {
  return {
    id: row.id, name: row.name, price: row.price, unit: row.unit,
    desc: row.description, active: row.active,
  };
}

function productFromRow(row: ProductRow, vendorName: string): Product {
  return {
    id: row.id, name: row.name, subtitle: row.subtitle,
    price: row.price, cat: row.category,
    vendor: vendorName, vendorId: row.vendor_id,
    stockCount: row.stock_count, sales: row.sales,
    accent: row.accent, distanceKm: row.distance_km,
    imageUrl: row.image_url ?? undefined,
    description: row.description ?? undefined,
  };
}

function bookingFromRow(row: BookingRow): Booking {
  return {
    id: row.id,
    bookingNumber: row.booking_number ?? undefined,
    ownerId: row.owner_id, ownerName: row.owner_name,
    providerId: row.provider_id, providerName: row.provider_name, providerType: row.provider_type,
    pet: row.pet,
    service: row.service,
    when: row.when_text, whenLabel: row.when_label, time: row.booking_time,
    address: row.address, distanceKm: row.distance_km,
    amount: row.amount, note: row.note, sharePassport: row.share_passport,
    status: row.status,
    createdAt: new Date(row.created_at).getTime(),
    respondedAt: row.responded_at ? new Date(row.responded_at).getTime() : undefined,
    services: row.services ?? undefined,
    petsList: row.pets_list ?? undefined,
    paymentMethod: row.payment_method ?? undefined,
    declineReason: row.decline_reason ?? undefined,
    recurring: row.recurring ?? false,
    recurringInterval: (row.recurring_interval as Booking['recurringInterval']) ?? undefined,
    pointsRedeemed: row.points_redeemed ?? 0,
  };
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d === 1 ? '' : 's'} ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} week${w === 1 ? '' : 's'} ago`;
  const mo = Math.floor(d / 30);
  return `${mo} month${mo === 1 ? '' : 's'} ago`;
}

function reviewFromRow(row: ReviewRow): Review {
  const ts = new Date(row.created_at).getTime();
  return {
    id: row.id,
    providerId: row.provider_id,
    bookingId: row.booking_id,
    authorId: row.author_id,
    author: row.author_name || 'Pet owner',
    rating: row.rating,
    text: row.body,
    photoUrl: row.photo_url ?? undefined,
    when: timeAgo(ts),
    createdAt: ts,
    response:    row.response    ?? undefined,
    respondedAt: row.responded_at ? new Date(row.responded_at).getTime() : undefined,
  };
}

export async function respondToReview(id: string, response: string): Promise<void> {
  const { error } = await supabase.from('reviews').update({
    response,
    responded_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw new Error(error.message);
}

function orderFromRow(row: OrderRow): Order {
  return {
    id: row.id,
    orderNumber: row.order_number ?? undefined,
    ownerId: row.owner_id,
    ownerName: row.owner_name ?? '',
    vendorId: row.vendor_id ?? '',
    vendorName: row.vendor_name, itemCount: row.item_count, total: row.total,
    // Derive 'when' from the timestamp, not the stored string (which may be stale
    // e.g. was "Today" when placed, now out of date). formatTimestamp gives
    // "Today, 14:30" / "Yesterday, 14:30" / "Tue 5 May, 14:30".
    when: formatTimestamp(new Date(row.created_at).getTime()),
    status: row.status, createdAt: new Date(row.created_at).getTime(),
    respondedAt: row.responded_at ? new Date(row.responded_at).getTime() : undefined,
    items: row.items ?? undefined,
    address: row.address ?? undefined,
    paymentMethod: row.payment_method ?? undefined,
    note: row.note ?? undefined,
    declineReason: row.decline_reason ?? undefined,
  };
}

// ============================================================================
// Profile
// ============================================================================

export type LoadedProfile = Partial<User> & { role?: Role | null };

export async function loadProfile(userId: string): Promise<LoadedProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as ProfileRow;
  return { ...userFromProfile(row), role: row.role ?? null };
}

export async function upsertProfile(patch: { name?: string; dob?: string; role?: Role; neighborhood?: string; coords?: Coords | null }) {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) return { error: 'Not authenticated' };
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: session.user.id, ...patch }, { onConflict: 'id' });
  if (error) return { error: error.message };
  return {};
}

// ============================================================================
// Pets
// ============================================================================

export async function loadPets(): Promise<Pet[]> {
  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as PetRow[]).map(petFromRow);
}

export async function insertPet(pet: Pet): Promise<Pet | null> {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) return null;
  const { data, error } = await supabase
    .from('pets')
    .insert({
      owner_id: session.user.id,
      name: pet.name, species: pet.species, breed: pet.breed,
      age: pet.age, weight: pet.weight, sex: pet.sex, blood: pet.blood,
      color: pet.color ?? null, neutered: pet.neutered ?? null, notes: pet.notes ?? null,
      image_url: pet.imageUrl ?? null,
    })
    .select('*')
    .single();
  if (error || !data) return null;
  return petFromRow(data as PetRow);
}

export async function updatePetById(id: string, patch: Partial<Pet>): Promise<void> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.species !== undefined) dbPatch.species = patch.species;
  if (patch.breed !== undefined) dbPatch.breed = patch.breed;
  if (patch.age !== undefined) dbPatch.age = patch.age;
  if (patch.weight !== undefined) dbPatch.weight = patch.weight;
  if (patch.sex !== undefined) dbPatch.sex = patch.sex;
  if (patch.blood !== undefined) dbPatch.blood = patch.blood;
  if (patch.color !== undefined) dbPatch.color = patch.color ?? null;
  if (patch.neutered !== undefined) dbPatch.neutered = patch.neutered ?? null;
  if (patch.notes !== undefined) dbPatch.notes = patch.notes ?? null;
  if (patch.imageUrl !== undefined) dbPatch.image_url = patch.imageUrl ?? null;
  await supabase.from('pets').update(dbPatch).eq('id', id);
}

export async function deletePetById(id: string): Promise<void> {
  await supabase.from('pets').delete().eq('id', id);
}

// ============================================================================
// Providers
// ============================================================================

export async function loadAllProviders(): Promise<Provider[]> {
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('published', true);
  if (error || !data) return [];
  return (data as ProviderRow[]).map(providerFromRow);
}

export async function loadSelfProvider(userId: string): Promise<Provider | null> {
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return providerFromRow(data as ProviderRow);
}

export async function upsertSelfProvider(userId: string, patch: Partial<Provider>): Promise<Provider | null> {
  const dbPatch: Record<string, unknown> = { id: userId };
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.type !== undefined) dbPatch.type = patch.type;
  if (patch.icon !== undefined) dbPatch.icon = patch.icon;
  if (patch.area !== undefined) dbPatch.area = patch.area;
  if (patch.distanceKm !== undefined) dbPatch.distance_km = patch.distanceKm;
  if (patch.rating !== undefined) dbPatch.rating = patch.rating;
  if (patch.reviews !== undefined) dbPatch.reviews = patch.reviews;
  if (patch.price !== undefined) dbPatch.price = patch.price;
  if (patch.priceLabel !== undefined) dbPatch.price_label = patch.priceLabel;
  if (patch.verified !== undefined) dbPatch.verified = patch.verified;
  if (patch.tags !== undefined) dbPatch.tags = patch.tags;
  if (patch.hours !== undefined) dbPatch.hours = patch.hours;
  if (patch.staff !== undefined) dbPatch.staff = patch.staff;
  if (patch.categories !== undefined) dbPatch.categories = patch.categories;
  if (patch.displayPic !== undefined) dbPatch.display_pic = patch.displayPic;
  if (patch.bio !== undefined) dbPatch.bio = patch.bio ?? null;
  if (patch.whatsapp !== undefined) dbPatch.whatsapp = patch.whatsapp ?? null;
  if (patch.gmapsLink !== undefined) dbPatch.gmaps_link = patch.gmapsLink ?? null;
  if (patch.coords !== undefined) dbPatch.coords = patch.coords;
  if (patch.weeklyHours !== undefined) dbPatch.weekly_hours = patch.weeklyHours;
  if (patch.workPhotos !== undefined) dbPatch.work_photos = patch.workPhotos;
  if (patch.emergency !== undefined) dbPatch.emergency = patch.emergency;
  if (patch.published !== undefined) dbPatch.published = patch.published;
  // Auto-accept rules — only included when changed so unmigrated DBs keep working.
  if (patch.autoAcceptEnabled       !== undefined) dbPatch.auto_accept_enabled         = patch.autoAcceptEnabled;
  if (patch.autoAcceptMaxAmount     !== undefined) dbPatch.auto_accept_max_amount      = patch.autoAcceptMaxAmount     ?? null;
  if (patch.autoAcceptMinHoursAhead !== undefined) dbPatch.auto_accept_min_hours_ahead = patch.autoAcceptMinHoursAhead ?? null;

  const { data, error } = await supabase
    .from('providers')
    .upsert(dbPatch, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[db.upsertSelfProvider]', error.message);
    return null;
  }
  if (!data) return null;
  return providerFromRow(data as ProviderRow);
}

export async function setProviderPublished(userId: string, published: boolean): Promise<void> {
  await supabase.from('providers').update({ published }).eq('id', userId);
}

// ============================================================================
// Provider services
// ============================================================================

export async function loadAllProviderServices(): Promise<Record<string, ProviderServices>> {
  // Returns a map of provider_id → ProviderServices, batched in one query.
  const { data, error } = await supabase.from('provider_services').select('*');
  if (error || !data) return {};
  const map: Record<string, ProviderServices> = {};
  for (const row of data as ServiceRow[]) {
    if (!map[row.provider_id]) map[row.provider_id] = { walk: [], groom: [], vet: [], board: [], taxi: [], funeral: [] };
    map[row.provider_id][row.category].push(serviceFromRow(row));
  }
  return map;
}

export async function loadProviderServices(providerId: string): Promise<ProviderServices> {
  const { data, error } = await supabase
    .from('provider_services')
    .select('*')
    .eq('provider_id', providerId);
  const out: ProviderServices = { walk: [], groom: [], vet: [], board: [], taxi: [], funeral: [] };
  if (error || !data) return out;
  for (const row of data as ServiceRow[]) out[row.category].push(serviceFromRow(row));
  return out;
}

// Replace a provider's full services list. Old rows are deleted, new ones inserted.
export async function replaceProviderServicesDb(providerId: string, services: ProviderServices): Promise<void> {
  // Delete existing
  await supabase.from('provider_services').delete().eq('provider_id', providerId);
  // Bulk insert
  const rows: Omit<ServiceRow, 'id'>[] = [];
  (Object.keys(services) as ServiceCategoryId[]).forEach(cat => {
    services[cat].forEach(s => {
      rows.push({
        provider_id: providerId, category: cat,
        name: s.name, price: s.price, unit: s.unit,
        description: s.desc, active: s.active,
      });
    });
  });
  if (rows.length) await supabase.from('provider_services').insert(rows);
}

export async function upsertProviderService(providerId: string, cat: ServiceCategoryId, svc: ProviderService): Promise<void> {
  await supabase.from('provider_services').upsert({
    id: svc.id.startsWith('s_db_') ? svc.id : undefined, // let Postgres assign for new
    provider_id: providerId, category: cat,
    name: svc.name, price: svc.price, unit: svc.unit, description: svc.desc, active: svc.active,
  } as Partial<ServiceRow>);
}

export async function setServiceActive(serviceId: string, active: boolean): Promise<void> {
  await supabase.from('provider_services').update({ active }).eq('id', serviceId);
}

// ============================================================================
// Products
// ============================================================================

export async function loadAllProducts(providers: Provider[]): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*');
  if (error || !data) return [];
  const vendorMap = new Map(providers.map(p => [p.id, p.name || 'Shop']));
  return (data as ProductRow[]).map(r => productFromRow(r, vendorMap.get(r.vendor_id) || 'Shop'));
}

export async function insertProduct(vendorId: string, vendorName: string, input: {
  name: string; subtitle?: string; description?: string; price: number; category: string; stockCount: number;
  accent?: string; imageUrl?: string;
}): Promise<{ product?: Product; error?: string }> {
  const payload: Record<string, unknown> = {
    vendor_id: vendorId,
    name: input.name, subtitle: input.subtitle ?? '', price: input.price,
    category: input.category, stock_count: input.stockCount,
    accent: input.accent ?? '#3E8EC9',
  };
  // Only set image_url when the provider actually attached a photo, so DBs
  // that haven't run migration 0012 yet can still accept text-only listings.
  if (input.imageUrl) payload.image_url = input.imageUrl;
  if (input.description) payload.description = input.description;
  const { data, error } = await supabase
    .from('products')
    .insert(payload)
    .select('*')
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[db.insertProduct]', error.message);
    return { error: error.message };
  }
  if (!data) return { error: 'No row returned' };
  return { product: productFromRow(data as ProductRow, vendorName) };
}

export async function updateProductById(id: string, patch: Partial<Product>): Promise<void> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.subtitle !== undefined) dbPatch.subtitle = patch.subtitle;
  if (patch.price !== undefined) dbPatch.price = patch.price;
  if (patch.cat !== undefined) dbPatch.category = patch.cat;
  if (patch.stockCount !== undefined) dbPatch.stock_count = patch.stockCount;
  if (patch.sales !== undefined) dbPatch.sales = patch.sales;
  if (patch.accent !== undefined) dbPatch.accent = patch.accent;
  if (patch.imageUrl !== undefined) dbPatch.image_url = patch.imageUrl;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  await supabase.from('products').update(dbPatch).eq('id', id);
}

export async function deleteProductById(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[db.deleteProductById]', error.message);
    return { error: error.message };
  }
  return {};
}

// ============================================================================
// Bookings
// ============================================================================

export async function loadBookingsForUser(userId: string): Promise<Booking[]> {
  // RLS already restricts to participants, but be explicit.
  // Hide rows the actor has soft-deleted from their own side.
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .or(`and(owner_id.eq.${userId},owner_hidden.eq.false),and(provider_id.eq.${userId},provider_hidden.eq.false)`)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as BookingRow[]).map(bookingFromRow);
}

export async function insertBooking(b: Booking): Promise<Booking | null> {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      id: b.id || undefined,                  // let Postgres generate if not provided
      owner_id: b.ownerId, owner_name: b.ownerName,
      provider_id: b.providerId, provider_name: b.providerName, provider_type: b.providerType,
      pet: b.pet,
      service: b.service,
      when_text: b.when, when_label: b.whenLabel, booking_time: b.time,
      address: b.address, distance_km: b.distanceKm,
      amount: b.amount, note: b.note, share_passport: b.sharePassport,
      status: b.status,
      services: b.services ?? null,
      pets_list: b.petsList ?? null,
      payment_method: b.paymentMethod ?? null,
      // New columns — only sent when non-default so unmigrated DBs still work
      ...(b.recurring            ? { recurring: true, recurring_interval: b.recurringInterval ?? null } : {}),
      ...(b.pointsRedeemed       ? { points_redeemed: b.pointsRedeemed }                               : {}),
    })
    .select('*')
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[db.insertBooking]', error.message);
    return null;
  }
  if (!data) return null;
  return bookingFromRow(data as BookingRow);
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
  declineReason?: string,
): Promise<{ error?: string }> {
  const patch: Record<string, unknown> = { status };
  if (declineReason !== undefined) patch.decline_reason = declineReason || null;
  const { error } = await supabase.from('bookings').update(patch).eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[db.updateBookingStatus]', error.message);
    return { error: error.message };
  }
  return {};
}

export async function deleteBooking(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('bookings').delete().eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[db.deleteBooking]', error.message);
    return { error: error.message };
  }
  return {};
}

// Soft-delete: only flips owner_hidden/provider_hidden for the calling user,
// so the other side still sees the booking. The actor stops seeing it.
export async function hideBookingForMe(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.rpc('hide_booking_for_me', { _id: id });
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[db.hideBookingForMe]', error.message);
    return { error: error.message };
  }
  return {};
}

// ============================================================================
// Reviews
// ============================================================================

export async function loadAllReviews(): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as ReviewRow[]).map(reviewFromRow);
}

export async function loadReviewsForProvider(providerId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as ReviewRow[]).map(reviewFromRow);
}

export async function insertReview(input: {
  providerId: string;
  bookingId: string;
  authorName: string;
  rating: number;
  body: string;
  photoUrl?: string;
}): Promise<{ review?: Review; error?: string }> {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) return { error: 'Not authenticated' };
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      provider_id: input.providerId,
      booking_id: input.bookingId,
      author_id: session.user.id,
      author_name: input.authorName,
      rating: input.rating,
      body: input.body,
      photo_url: input.photoUrl ?? null,
    })
    .select('*')
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[db.insertReview]', error.message);
    return { error: error.message };
  }
  if (!data) return { error: 'No row returned' };
  return { review: reviewFromRow(data as ReviewRow) };
}

export async function deleteReview(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('reviews').delete().eq('id', id);
  if (error) return { error: error.message };
  return {};
}

// ============================================================================
// Pet Health Records
// ============================================================================

type HealthRecordRow = {
  id: string;
  pet_id: string;
  owner_id: string;
  type: import('../types').HealthRecordType;
  title: string;
  date: string | null;
  notes: string | null;
  next_due: string | null;
  dosage: string | null;
  frequency: string | null;
  weight_kg: number | null;
  severity: string | null;
  created_at: string;
};

// Convert "YYYY-MM-DD" (Postgres) ↔ "DD/MM/YYYY" (app display)
function fromISODate(s: string | null | undefined): string | undefined {
  if (!s) return undefined;
  const p = s.split('-');
  if (p.length !== 3) return s;
  return `${p[2]}/${p[1]}/${p[0]}`;
}
function toISODate(s: string | null | undefined): string | null {
  if (!s?.trim()) return null;
  const p = s.trim().split('/');
  if (p.length !== 3) return null;
  const [dd, mm, yyyy] = p;
  if (!dd || !mm || !yyyy || yyyy.length !== 4) return null;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

function healthRecordFromRow(row: HealthRecordRow): import('../types').HealthRecord {
  return {
    id: row.id,
    petId: row.pet_id,
    ownerId: row.owner_id,
    type: row.type,
    title: row.title,
    date:      fromISODate(row.date),
    notes:     row.notes     ?? undefined,
    nextDue:   fromISODate(row.next_due),
    dosage:    row.dosage    ?? undefined,
    frequency: row.frequency ?? undefined,
    weightKg:  row.weight_kg ?? undefined,
    severity:  (row.severity as import('../types').HealthRecord['severity']) ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export async function loadHealthRecordsForOwner(): Promise<import('../types').HealthRecord[]> {
  const { data } = await supabase
    .from('pet_health_records')
    .select('*')
    .order('created_at', { ascending: false });
  return (data ?? []).map(r => healthRecordFromRow(r as HealthRecordRow));
}

export async function insertHealthRecord(
  ownerId: string,
  petId: string,
  input: Omit<import('../types').HealthRecord, 'id' | 'ownerId' | 'petId' | 'createdAt'>,
): Promise<import('../types').HealthRecord> {
  const { data, error } = await supabase
    .from('pet_health_records')
    .insert({
      pet_id: petId, owner_id: ownerId,
      type: input.type, title: input.title,
      date:      toISODate(input.date),
      notes:     input.notes     ?? null,
      next_due:  toISODate(input.nextDue),
      dosage:    input.dosage    ?? null,
      frequency: input.frequency ?? null,
      weight_kg: input.weightKg  ?? null,
      severity:  input.severity  ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('No data returned');
  return healthRecordFromRow(data as HealthRecordRow);
}

export async function updateHealthRecord(
  id: string,
  patch: Partial<import('../types').HealthRecord>,
): Promise<void> {
  const d: Record<string, unknown> = {};
  if (patch.type      !== undefined) d.type      = patch.type;
  if (patch.title     !== undefined) d.title     = patch.title;
  if (patch.date      !== undefined) d.date      = toISODate(patch.date);
  if (patch.notes     !== undefined) d.notes     = patch.notes     ?? null;
  if (patch.nextDue   !== undefined) d.next_due  = toISODate(patch.nextDue);
  if (patch.dosage    !== undefined) d.dosage    = patch.dosage    ?? null;
  if (patch.frequency !== undefined) d.frequency = patch.frequency ?? null;
  if (patch.weightKg  !== undefined) d.weight_kg = patch.weightKg  ?? null;
  if (patch.severity  !== undefined) d.severity  = patch.severity  ?? null;
  await supabase.from('pet_health_records').update(d).eq('id', id);
}

export async function deleteHealthRecord(id: string): Promise<void> {
  await supabase.from('pet_health_records').delete().eq('id', id);
}

// ============================================================================
// Lost Pet Alerts
// ============================================================================

type LostPetAlertRow = {
  id: string;
  pet_id: string;
  owner_id: string;
  owner_name: string;
  owner_phone: string | null;
  pet_name: string;
  pet_species: 'dog' | 'cat';
  pet_breed: string | null;
  pet_image_url: string | null;
  last_seen_label: string;
  last_seen_coords: { lat: number; lng: number } | null;
  notes: string | null;
  status: import('../types').LostPetAlertStatus;
  created_at: string;
  resolved_at: string | null;
};

function lostPetAlertFromRow(r: LostPetAlertRow): import('../types').LostPetAlert {
  return {
    id: r.id,
    petId: r.pet_id,
    ownerId: r.owner_id,
    ownerName: r.owner_name,
    ownerPhone: r.owner_phone ?? undefined,
    petName: r.pet_name,
    petSpecies: r.pet_species,
    petBreed: r.pet_breed ?? undefined,
    petImageUrl: r.pet_image_url ?? undefined,
    lastSeenLabel: r.last_seen_label,
    lastSeenCoords: r.last_seen_coords ?? null,
    notes: r.notes ?? undefined,
    status: r.status,
    createdAt: new Date(r.created_at).getTime(),
    resolvedAt: r.resolved_at ? new Date(r.resolved_at).getTime() : undefined,
  };
}

export async function loadLostPetAlerts(): Promise<import('../types').LostPetAlert[]> {
  const { data } = await supabase
    .from('lost_pet_alerts')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  return (data ?? []).map(r => lostPetAlertFromRow(r as LostPetAlertRow));
}

export async function insertLostPetAlert(
  input: Omit<import('../types').LostPetAlert, 'id' | 'status' | 'createdAt' | 'resolvedAt'>,
): Promise<import('../types').LostPetAlert> {
  const { data, error } = await supabase
    .from('lost_pet_alerts')
    .insert({
      pet_id: input.petId, owner_id: input.ownerId, owner_name: input.ownerName,
      owner_phone: input.ownerPhone ?? null,
      pet_name: input.petName, pet_species: input.petSpecies,
      pet_breed: input.petBreed ?? null,
      pet_image_url: input.petImageUrl ?? null,
      last_seen_label: input.lastSeenLabel,
      last_seen_coords: input.lastSeenCoords ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('No data returned');
  return lostPetAlertFromRow(data as LostPetAlertRow);
}

export async function resolveLostPetAlert(id: string, status: 'found' | 'closed'): Promise<void> {
  const { error } = await supabase
    .from('lost_pet_alerts')
    .update({ status, resolved_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ============================================================================
// Paw Points
// ============================================================================

type PawPointsRow = {
  id: string;
  owner_id: string;
  type: 'earn' | 'redeem';
  points: number;
  description: string;
  reference_id: string | null;
  created_at: string;
};

export async function loadPawPointsEvents(): Promise<import('../types').PawPointsEvent[]> {
  const { data } = await supabase
    .from('paw_points_ledger')
    .select('*')
    .order('created_at', { ascending: false });
  return (data ?? []).map((r: PawPointsRow) => ({
    id: r.id,
    ownerId: r.owner_id,
    type: r.type,
    points: r.points,
    description: r.description,
    referenceId: r.reference_id ?? undefined,
    createdAt: new Date(r.created_at).getTime(),
  }));
}

// Award points for a completed booking or order. Server validates
// ownership, status, and amount — clients cannot forge points (see
// migration 0032_paw_points_lock_writes.sql).
export async function awardPawPointsForReference(
  referenceId: string,
  kind: 'booking' | 'order',
): Promise<{ points?: number; error?: string }> {
  const { data, error } = await supabase.rpc('award_paw_points', {
    p_reference_id: referenceId,
    p_kind:         kind,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[db.awardPawPointsForReference]', error.message);
    return { error: error.message };
  }
  return { points: typeof data === 'number' ? data : 0 };
}

// Redeem points against a booking/order. Server checks balance.
export async function redeemPawPointsRpc(
  referenceId: string,
  points: number,
  description: string,
): Promise<{ points?: number; error?: string }> {
  const { data, error } = await supabase.rpc('redeem_paw_points', {
    p_reference_id: referenceId,
    p_points:       points,
    p_description:  description,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[db.redeemPawPointsRpc]', error.message);
    return { error: error.message };
  }
  return { points: typeof data === 'number' ? data : 0 };
}

// Redeem an admin-issued one-time promo code. Server enforces uniqueness,
// one-redemption-per-user, and writes a 'bonus' row to the ledger.
export async function redeemPromoCode(
  code: string,
): Promise<{ points?: number; error?: string }> {
  const { data, error } = await supabase.rpc('redeem_promo_code', {
    p_code: code,
  });
  if (error) {
    return { error: humanisePromoError(error.message) };
  }
  return { points: typeof data === 'number' ? data : 0 };
}

// ============================================================================
// Pawla concierge chat
// ============================================================================

export async function pawlaChat(
  messages: { role: 'user' | 'assistant'; content: string }[],
): Promise<import('../types/pawla').PawlaResponse> {
  const { data, error } = await supabase.functions.invoke<import('../types/pawla').PawlaResponse>(
    'pawla-chat',
    { body: { messages } },
  );
  if (error) {
    return {
      reply: "I'm having trouble connecting right now. Try again in a moment? 🐾",
    };
  }
  return data ?? { reply: "I didn't catch that — try again? 🐾" };
}

function humanisePromoError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('already redeemed')) return 'You have already redeemed a promo code.';
  if (m.includes('already been used')) return 'This code has already been used.';
  if (m.includes('no longer active'))  return 'This code is no longer active.';
  if (m.includes('invalid code'))      return 'That code doesn’t look right.';
  if (m.includes('code required'))     return 'Enter a code first.';
  return raw;
}

// ============================================================================
// Orders
// ============================================================================

export async function loadOrdersForOwner(ownerId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as OrderRow[]).map(orderFromRow);
}

export async function insertOrder(o: Order): Promise<{ order?: Order; error?: string }> {
  // Let Postgres generate the uuid: the orders.id column is uuid-typed and our
  // optimistic local id is a short string ('o<timestamp>') that fails the cast.
  // Pre-fix, every order insert silently errored — the owner only saw the row
  // via optimistic local state, and providers never received it.
  const { data, error } = await supabase
    .from('orders')
    .insert({
      owner_id: o.ownerId,
      owner_name: o.ownerName,
      vendor_id: o.vendorId || null,
      vendor_name: o.vendorName, item_count: o.itemCount, total: o.total,
      when_text: o.when, status: o.status,
      items: o.items ?? [],
      address: o.address ?? null,
      payment_method: o.paymentMethod ?? null,
      note: o.note ?? null,
    })
    .select('*')
    .single();
  if (error || !data) {
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[db.insertOrder]', error.message);
    }
    return { error: error?.message || 'Insert failed' };
  }
  return { order: orderFromRow(data as OrderRow) };
}

export async function updateOrderStatus(
  id: string,
  next: Order['status'],
  declineReason?: string,
): Promise<{ error?: string }> {
  const patch: Record<string, unknown> = { status: next };
  if (declineReason !== undefined) patch.decline_reason = declineReason || null;
  const { error } = await supabase
    .from('orders')
    .update(patch)
    .eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[db.updateOrderStatus]', error.message);
    return { error: error.message };
  }
  return {};
}

export async function loadOrdersForVendor(vendorId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as OrderRow[]).map(orderFromRow);
}

// ============================================================================
// Favorites
// ============================================================================

export async function loadFavorites(): Promise<string[]> {
  const { data, error } = await supabase.from('favorites').select('product_id');
  if (error || !data) {
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[db.loadFavorites]', error.message);
    }
    return [];
  }
  return (data as { product_id: string }[]).map(r => r.product_id);
}

export async function addFavorite(productId: string): Promise<{ error?: string }> {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) return { error: 'Not authenticated' };
  // upsert with ignoreDuplicates so a quick double-tap doesn't blow up on PK collision.
  const { error } = await supabase
    .from('favorites')
    .upsert(
      { owner_id: session.user.id, product_id: productId },
      { onConflict: 'owner_id,product_id', ignoreDuplicates: true },
    );
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[db.addFavorite]', error.message);
    return { error: error.message };
  }
  return {};
}

export async function removeFavorite(productId: string): Promise<{ error?: string }> {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) return { error: 'Not authenticated' };
  const { error } = await supabase
    .from('favorites')
    .delete()
    .match({ owner_id: session.user.id, product_id: productId });
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[db.removeFavorite]', error.message);
    return { error: error.message };
  }
  return {};
}

// ============================================================================
// Addresses (owner saved places)
// ============================================================================

type AddressRow = {
  id: string;
  owner_id: string;
  label: string;
  kind: AddressKind;
  icon: AddressIcon | null;
  line1: string;
  area: string;
  floor: string | null;
  notes: string | null;
  coords: Coords | null;
};

function addressFromRow(row: AddressRow): Address {
  return {
    id: row.id,
    label: row.label,
    kind: row.kind,
    icon: row.icon ?? undefined,
    line1: row.line1,
    area: row.area,
    floor: row.floor ?? undefined,
    notes: row.notes ?? undefined,
    coords: row.coords ?? null,
  };
}

export async function loadAddresses(): Promise<Address[]> {
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .order('created_at', { ascending: true });
  if (error || !data) {
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[db.loadAddresses]', error.message);
    }
    return [];
  }
  return (data as AddressRow[]).map(addressFromRow);
}

export async function insertAddress(
  input: Omit<Address, 'id'>,
): Promise<{ address?: Address; error?: string }> {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) return { error: 'Not signed in' };
  const { data, error } = await supabase
    .from('addresses')
    .insert({
      owner_id: session.user.id,
      label: input.label,
      kind: input.kind,
      icon: input.icon ?? null,
      line1: input.line1,
      area: input.area,
      floor: input.floor ?? null,
      notes: input.notes ?? null,
      coords: input.coords ?? null,
    })
    .select('*')
    .single();
  if (error || !data) {
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[db.insertAddress]', error.message);
    }
    return { error: error?.message || 'Insert failed' };
  }
  return { address: addressFromRow(data as AddressRow) };
}

export async function updateAddressById(
  id: string,
  patch: Partial<Address>,
): Promise<{ address?: Address; error?: string }> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.label !== undefined) dbPatch.label = patch.label;
  if (patch.kind !== undefined) dbPatch.kind = patch.kind;
  if (patch.icon !== undefined) dbPatch.icon = patch.icon ?? null;
  if (patch.line1 !== undefined) dbPatch.line1 = patch.line1;
  if (patch.area !== undefined) dbPatch.area = patch.area;
  if (patch.floor !== undefined) dbPatch.floor = patch.floor ?? null;
  if (patch.notes !== undefined) dbPatch.notes = patch.notes ?? null;
  if (patch.coords !== undefined) dbPatch.coords = patch.coords;
  const { data, error } = await supabase
    .from('addresses')
    .update(dbPatch)
    .eq('id', id)
    .select('*')
    .single();
  if (error || !data) {
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[db.updateAddressById]', error.message);
    }
    return { error: error?.message || 'Update failed' };
  }
  return { address: addressFromRow(data as AddressRow) };
}

export async function deleteAddressById(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('addresses').delete().eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[db.deleteAddressById]', error.message);
    return { error: error.message };
  }
  return {};
}

// ============================================================================
// Payment methods (owner-saved cards / Whish profiles)
// ============================================================================

type PaymentMethodRow = {
  id: string;
  owner_id: string;
  kind: 'card' | 'whish';
  label: string;
  sub: string | null;
  icon: string;
  meta: PaymentMethodMeta | null;
};

function paymentMethodFromRow(row: PaymentMethodRow): PaymentMethod {
  return {
    id: row.id,
    kind: row.kind,
    label: row.label,
    sub: row.sub ?? undefined,
    icon: row.icon,
    meta: row.meta ?? undefined,
  };
}

export async function loadPaymentMethods(): Promise<PaymentMethod[]> {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .order('created_at', { ascending: true });
  if (error || !data) {
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[db.loadPaymentMethods]', error.message);
    }
    return [];
  }
  return (data as PaymentMethodRow[]).map(paymentMethodFromRow);
}

export async function insertPaymentMethod(
  input: Omit<PaymentMethod, 'id'>,
): Promise<{ method?: PaymentMethod; error?: string }> {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) return { error: 'Not signed in' };
  // 'cash' lives in the client only — never reaches this table.
  const kind: PaymentMethodKind = input.kind ?? 'card';
  if (kind === 'cash') return { error: 'Cash on delivery is built-in' };
  const { data, error } = await supabase
    .from('payment_methods')
    .insert({
      owner_id: session.user.id,
      kind,
      label: input.label,
      sub: input.sub ?? null,
      icon: input.icon,
      meta: input.meta ?? null,
    })
    .select('*')
    .single();
  if (error || !data) {
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[db.insertPaymentMethod]', error.message);
    }
    return { error: error?.message || 'Insert failed' };
  }
  return { method: paymentMethodFromRow(data as PaymentMethodRow) };
}

export async function updatePaymentMethodById(
  id: string,
  patch: Partial<PaymentMethod>,
): Promise<{ method?: PaymentMethod; error?: string }> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.kind !== undefined && patch.kind !== 'cash') dbPatch.kind = patch.kind;
  if (patch.label !== undefined) dbPatch.label = patch.label;
  if (patch.sub !== undefined) dbPatch.sub = patch.sub ?? null;
  if (patch.icon !== undefined) dbPatch.icon = patch.icon;
  if (patch.meta !== undefined) dbPatch.meta = patch.meta ?? null;
  const { data, error } = await supabase
    .from('payment_methods')
    .update(dbPatch)
    .eq('id', id)
    .select('*')
    .single();
  if (error || !data) {
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[db.updatePaymentMethodById]', error.message);
    }
    return { error: error?.message || 'Update failed' };
  }
  return { method: paymentMethodFromRow(data as PaymentMethodRow) };
}

export async function deletePaymentMethodById(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('payment_methods').delete().eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[db.deletePaymentMethodById]', error.message);
    return { error: error.message };
  }
  return {};
}

// ---- Provider favorites (favorited shops) ----

export async function loadProviderFavorites(): Promise<string[]> {
  const { data, error } = await supabase.from('favorite_providers').select('provider_id');
  if (error || !data) {
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[db.loadProviderFavorites]', error.message);
    }
    return [];
  }
  return (data as { provider_id: string }[]).map(r => r.provider_id);
}

export async function addProviderFavorite(providerId: string): Promise<{ error?: string }> {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) return { error: 'Not authenticated' };
  const { error } = await supabase
    .from('favorite_providers')
    .upsert(
      { owner_id: session.user.id, provider_id: providerId },
      { onConflict: 'owner_id,provider_id', ignoreDuplicates: true },
    );
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[db.addProviderFavorite]', error.message);
    return { error: error.message };
  }
  return {};
}

export async function removeProviderFavorite(providerId: string): Promise<{ error?: string }> {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) return { error: 'Not authenticated' };
  const { error } = await supabase
    .from('favorite_providers')
    .delete()
    .match({ owner_id: session.user.id, provider_id: providerId });
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[db.removeProviderFavorite]', error.message);
    return { error: error.message };
  }
  return {};
}

// ============================================================================
// Realtime — subscribe to cross-user-visible tables
// ============================================================================

export type RealtimeHandlers = {
  /** A row changed in any of the catalog-shaped tables (providers/services/products). */
  publicCatalogChanged: () => void;
  /** A new booking appeared (visible to participants). */
  bookingInserted: (row: BookingRow) => void;
  /** An existing booking changed (status flip, etc.). */
  bookingUpdated: (newRow: BookingRow, oldRow: BookingRow) => void;
  /** A booking was deleted (cleanup of expired declined bookings). */
  bookingDeleted: (row: BookingRow) => void;
  /** A new order appeared (visible to its owner + vendor). */
  orderInserted: (row: OrderRow) => void;
  /** An existing order changed (status flip from the provider, etc.). */
  orderUpdated: (newRow: OrderRow, oldRow: OrderRow) => void;
  /** Reviews table changed — owner submitted/edited/deleted. */
  reviewsChanged: () => void;
  /** The admin updated this provider's verification status. */
  idVerificationUpdated: (row: IdVerificationRow) => void;
};

// ============================================================================
// Messages / Chat
// ============================================================================

type MessageRow = {
  id: string;
  booking_id: string | null;
  order_id: string | null;
  sender_id: string;
  sender_name: string;
  body: string;
  created_at: string;
  read_at: string | null;
  recipient_id: string | null;
};

export type { MessageRow };

function messageFromRow(row: MessageRow): Message {
  return {
    id:          row.id,
    bookingId:   row.booking_id  ?? undefined,
    orderId:     row.order_id    ?? undefined,
    senderId:    row.sender_id,
    senderName:  row.sender_name,
    body:        row.body,
    createdAt:   new Date(row.created_at).getTime(),
    readAt:      row.read_at ? new Date(row.read_at).getTime() : undefined,
    recipientId: row.recipient_id ?? undefined,
  };
}

export async function loadMessages(target: { bookingId?: string; orderId?: string }): Promise<Message[]> {
  let q = supabase.from('messages').select('*').order('created_at', { ascending: true });
  if (target.bookingId) q = q.eq('booking_id', target.bookingId);
  else if (target.orderId) q = q.eq('order_id', target.orderId);
  else return [];
  const { data, error } = await q;
  if (error) { console.warn('[db.loadMessages]', error.message); return []; }
  return (data as MessageRow[]).map(messageFromRow);
}

export async function sendMessage(input: {
  bookingId?: string;
  orderId?: string;
  senderId: string;
  senderName: string;
  recipientId?: string;
  body: string;
}): Promise<{ message?: Message; error?: string }> {
  const payload: Record<string, unknown> = {
    sender_id:   input.senderId,
    sender_name: input.senderName,
    body:        input.body.trim(),
  };
  // Only set recipient_id if it's provided — avoids failures on DBs that
  // haven't yet run migration 0021.
  if (input.recipientId) payload.recipient_id = input.recipientId;
  if (input.bookingId) payload.booking_id = input.bookingId;
  else if (input.orderId) payload.order_id = input.orderId;
  else return { error: 'No conversation target' };

  const { data, error } = await supabase
    .from('messages').insert(payload).select('*').single();
  if (error) { console.warn('[db.sendMessage]', error.message); return { error: error.message }; }
  return { message: messageFromRow(data as MessageRow) };
}

export async function markMessagesRead(target: { bookingId?: string; orderId?: string }, readerId: string): Promise<void> {
  let q = supabase.from('messages')
    .update({ read_at: new Date().toISOString() })
    .neq('sender_id', readerId)
    .is('read_at', null);
  if (target.bookingId) q = q.eq('booking_id', target.bookingId);
  else if (target.orderId) q = q.eq('order_id', target.orderId);
  await q;
}

export async function loadUnreadMessageCount(userId: string): Promise<number> {
  // Count messages not sent by this user and not yet read.
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .neq('sender_id', userId)
    .is('read_at', null);
  if (error) return 0;
  return count ?? 0;
}

// ============================================================================
// ID Verification
// ============================================================================

type IdVerificationRow = {
  id: string;
  provider_id: string;
  front_url: string;
  back_url: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at: string | null;
  admin_note: string | null;
};

export type { IdVerificationRow };

function idVerificationFromRow(row: IdVerificationRow): IdVerification {
  return {
    id: row.id,
    providerId: row.provider_id,
    frontUrl: row.front_url,
    backUrl: row.back_url,
    status: row.status,
    submittedAt: new Date(row.submitted_at).getTime(),
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).getTime() : undefined,
    adminNote: row.admin_note ?? undefined,
  };
}

export async function loadIdVerification(providerId: string): Promise<IdVerification | null> {
  const { data, error } = await supabase
    .from('id_verifications')
    .select('*')
    .eq('provider_id', providerId)
    .maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[db.loadIdVerification]', error.message);
    return null;
  }
  if (!data) return null;
  return idVerificationFromRow(data as IdVerificationRow);
}

export async function upsertIdVerification(
  providerId: string,
  frontUrl: string,
  backUrl: string,
): Promise<{ verification?: IdVerification; error?: string }> {
  const { data, error } = await supabase
    .from('id_verifications')
    .upsert(
      {
        provider_id: providerId,
        front_url: frontUrl,
        back_url: backUrl,
        status: 'pending',
        submitted_at: new Date().toISOString(),
        reviewed_at: null,
        admin_note: null,
      },
      { onConflict: 'provider_id' },
    )
    .select('*')
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[db.upsertIdVerification]', error.message);
    return { error: error.message };
  }
  if (!data) return { error: 'No row returned' };
  return { verification: idVerificationFromRow(data as IdVerificationRow) };
}

export function subscribeRealtime(handlers: RealtimeHandlers): RealtimeChannel {
  return supabase
    .channel('pawra-public-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'providers' },
      () => handlers.publicCatalogChanged())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'provider_services' },
      () => handlers.publicCatalogChanged())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' },
      () => handlers.publicCatalogChanged())
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' },
      (payload) => handlers.bookingInserted(payload.new as BookingRow))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings' },
      (payload) => handlers.bookingUpdated(payload.new as BookingRow, payload.old as BookingRow))
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'bookings' },
      (payload) => handlers.bookingDeleted(payload.old as BookingRow))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' },
      (payload) => handlers.orderInserted(payload.new as OrderRow))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' },
      (payload) => handlers.orderUpdated(payload.new as OrderRow, payload.old as OrderRow))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' },
      () => handlers.reviewsChanged())
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'id_verifications' },
      (payload) => handlers.idVerificationUpdated(payload.new as IdVerificationRow))
    .subscribe();
  // Note: messages are subscribed per-conversation inside ChatSheet with explicit
  // row filters. Subscribing globally here without a filter breaks the channel
  // on RLS-enabled tables, taking down booking/order subscriptions.
}
