import { categoryLabelFromParts, categoryLabelLowerFromParts } from './bookingLabels';
import type { BookingLineItem, Notif, ProviderType, ServiceCategoryId } from '../types';

export type BookingNotifContext = {
  // The provider's primary type — kept as a fallback for legacy bookings whose
  // line items don't carry categoryId yet.
  providerType: ProviderType;
  // Actual booked categories. Notifications should reflect what the customer
  // *picked*, not what the provider primarily lists as. Pass the services array
  // through whenever it's available (BookingDraft, Booking, BookingRow).
  services?: BookingLineItem[];
  providerName?: string;
  ownerName?: string;
  petName?: string;
};

const safeService = (ctx: BookingNotifContext): string =>
  categoryLabelFromParts(ctx.services, ctx.providerType);

const safeServiceLower = (ctx: BookingNotifContext): string =>
  categoryLabelLowerFromParts(ctx.services, ctx.providerType);

function inProgressBody(ctx: BookingNotifContext, provider: string, pet: string): string {
  // Prefer the explicit booked category for accuracy. Fall back to
  // providerType only if no line item carried a categoryId.
  const cats = (ctx.services ?? [])
    .map(s => s.categoryId)
    .filter((c): c is ServiceCategoryId => !!c);
  const single = cats.length === 1 ? cats[0] : undefined;
  const fallback: ServiceCategoryId | undefined =
    !single && ctx.providerType
      ? (ctx.providerType === 'walker' ? 'walk'
        : ctx.providerType === 'groomer' ? 'groom'
        : ctx.providerType === 'vet' ? 'vet'
        : 'board')
      : undefined;
  const cat = single ?? fallback;
  switch (cat) {
    case 'walk':  return `${provider} is walking ${pet} now.`;
    case 'groom': return `${provider} has started ${pet}'s grooming.`;
    case 'vet':   return `${pet}'s visit with ${provider} has begun.`;
    case 'board': return `${pet} has checked in with ${provider}.`;
    default:      return `${provider} has started ${pet}'s booking.`;
  }
}

// =============================================================================
// Owner-side: realtime banners when a provider flips a booking status.
// =============================================================================

export function bookingStatusNotifForOwner(
  ctx: BookingNotifContext,
  status: 'confirmed' | 'in_progress' | 'completed' | 'declined' | 'cancelled',
): Notif | null {
  const label    = safeService(ctx);
  const lower    = safeServiceLower(ctx);
  const provider = ctx.providerName || 'The provider';
  const pet      = ctx.petName || 'your pet';

  switch (status) {
    case 'confirmed':
      return {
        title: `${label} confirmed`,
        body:  `${provider} accepted ${pet}'s booking.`,
        icon:  'check-circle',
      };
    case 'in_progress':
      return {
        title: `${label} in progress`,
        body:  inProgressBody(ctx, provider, pet),
        icon:  'send',
      };
    case 'completed':
      return {
        title: `${label} complete`,
        body:  `${provider} marked ${pet}'s ${lower} as done.`,
        icon:  'check-circle',
      };
    case 'declined':
      return {
        title: 'Booking declined',
        body:  `${provider} couldn't take ${pet}'s booking.`,
        icon:  'x',
      };
    case 'cancelled':
      return {
        title: 'Booking cancelled',
        body:  `${pet}'s booking with ${provider} was cancelled.`,
        icon:  'x',
      };
    default:
      return null;
  }
}

// =============================================================================
// Provider-side: confirmation banner when *they* take the action.
// =============================================================================

export function bookingStatusNotifForProvider(
  ctx: BookingNotifContext,
  status: 'confirmed' | 'in_progress' | 'completed',
): Notif {
  const label = safeService(ctx);
  const lower = safeServiceLower(ctx);
  const pet   = ctx.petName || 'the pet';

  switch (status) {
    case 'confirmed':
      return {
        title: 'Booking accepted',
        body:  `${pet}'s ${lower} is on your schedule.`,
        icon:  'check-circle',
      };
    case 'in_progress':
      return {
        title: `${label} started`,
        body:  `The owner has been notified that ${pet}'s ${lower} is in progress.`,
        icon:  'send',
      };
    case 'completed':
      return {
        title: `${label} complete`,
        body:  'Great work — payment will be released soon.',
        icon:  'check-circle',
      };
  }
}

// =============================================================================
// Provider-side: realtime banner when a new request lands in their inbox.
// =============================================================================

export function newBookingRequestNotif(ctx: BookingNotifContext): Notif {
  const label = safeService(ctx);
  const owner = ctx.ownerName || 'Someone';
  const pet   = ctx.petName || 'their pet';
  return {
    title: `New ${label.toLowerCase()} request`,
    body:  `${owner} · ${pet}`,
    icon:  'bell',
  };
}

// =============================================================================
// Owner-side: confirmation banner when *they* submit a booking request.
// =============================================================================

export function bookingSentNotif(ctx: BookingNotifContext): Notif {
  const provider = ctx.providerName || 'The provider';
  return {
    title: `${safeService(ctx)} requested`,
    body:  `${provider} usually responds within minutes. We'll ping you the moment they accept.`,
    icon:  'send',
  };
}
