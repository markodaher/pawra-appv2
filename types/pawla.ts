// Wire protocol between the Pawla edge function and the PawlaChat client.
//
// Pawla can do two things in a single reply:
//   1. Send a normal text message (always present).
//   2. Optionally attach a structured `action` the client should render as a
//      Confirm card. The user taps Confirm (or Cancel) and the client calls
//      the matching AppContext mutation — Pawla never mutates user data on
//      the server. This keeps RLS / ownership checks unchanged.

import type { ServiceCategoryId } from './index';

export type PawlaResponse = {
  reply: string;
  action?: PawlaAction;
};

export type PawlaAction =
  | { kind: 'booking_draft';   data: BookingDraftPayload }
  | { kind: 'order_draft';     data: OrderDraftPayload }
  | { kind: 'cancel_booking';  bookingId: string; reason?: string }
  | { kind: 'reorder';         orderId: string }
  | { kind: 'open_review';     bookingId: string }
  | { kind: 'open_screen';     screen: 'home' | 'browse' | 'favorites' | 'activity' | 'shop' | 'profile' | 'pawpoints' | 'referral' | 'emergency' }
  | { kind: 'provider_picks';  providers: ProviderPick[] }
  | { kind: 'product_picks';   products: ProductPick[] };

export type BookingDraftPayload = {
  providerId: string;
  providerName: string;            // for the confirm card
  providerType: string;            // for the confirm card
  serviceIds: string[];            // ProviderService ids
  serviceLabels: string[];         // human-readable summaries for the card
  petIds: string[];
  petNames: string[];              // for the confirm card
  whenIso: string;                 // ISO date/time of the slot
  whenLabel: string;               // "Tue 21 May, 5:30pm"
  addressId?: string | null;
  addressLabel?: string;           // "Home — Achrafieh" for the card
  paymentMethodId?: string | null; // 'cash' or saved method id
  paymentLabel?: string;
  note?: string;
  estTotal: number;
  sharePassport: boolean;
};

export type OrderDraftPayload = {
  vendorId: string;
  vendorName: string;
  items: { productId: string; productName: string; qty: number; unitPrice: number }[];
  addressId?: string | null;
  addressLabel?: string;
  paymentMethodId?: string | null;
  paymentLabel?: string;
  note?: string;
  total: number;
};

export type ProviderPick = {
  id: string;
  name: string;
  type: string;
  rating: number;
  reviews: number;
  distanceKm?: number;
  categories: ServiceCategoryId[];
  priceFrom?: number;
};

export type ProductPick = {
  id: string;
  name: string;
  vendorName: string;
  price: number;
  imageUrl?: string;
};
