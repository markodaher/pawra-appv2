import { SERVICE_TYPES } from '../constants/data';
import type { Booking, BookingLineItem, ProviderType, ServiceCategoryId } from '../types';

const PROVIDER_TYPE_FALLBACK: Record<ProviderType, string> = {
  walker: 'Walking', groomer: 'Grooming', vet: 'Vet visit', boarder: 'Boarding',
  taxi: 'Pet Taxi', funeral: 'Funeral',
};

const PROVIDER_TYPE_LOWER: Record<ProviderType, string> = {
  walker: 'walk', groomer: 'grooming', vet: 'vet visit', boarder: 'boarding',
  taxi: 'pet taxi', funeral: 'funeral service',
};
const CATEGORY_LOWER: Record<ServiceCategoryId, string> = {
  walk: 'walk', groom: 'grooming', vet: 'vet visit', board: 'boarding',
  taxi: 'pet taxi', funeral: 'funeral service',
};

const CATEGORY_TO_PROVIDER_TYPE_LOCAL: Record<ServiceCategoryId, ProviderType> = {
  walk: 'walker', groom: 'groomer', vet: 'vet', board: 'boarder',
  taxi: 'taxi', funeral: 'funeral',
};

const labelForCategory = (id: ServiceCategoryId): string =>
  SERVICE_TYPES.find(s => s.id === id)?.label
    ?? PROVIDER_TYPE_FALLBACK[CATEGORY_TO_PROVIDER_TYPE_LOCAL[id]];

function uniqueCategories(services: BookingLineItem[] | undefined): ServiceCategoryId[] {
  return Array.from(new Set(
    (services ?? [])
      .map(s => s.categoryId)
      .filter((c): c is ServiceCategoryId => !!c),
  ));
}

/**
 * Human label for what was actually booked. Derives from the line items'
 * categories rather than the provider's primary type, so a grooming-only
 * booking from a multi-category provider reads "Grooming", not "Boarding".
 *
 * Falls back to the provider's primary-type label for legacy rows that don't
 * have categoryId on each line.
 */
export function bookingCategoryLabel(b: Booking): string {
  return categoryLabelFromParts(b.services, b.providerType);
}

/**
 * Title-case label from raw parts — used by notification text builders that
 * have a services array + providerType but not a full Booking object.
 */
export function categoryLabelFromParts(
  services: BookingLineItem[] | undefined,
  providerType: ProviderType | undefined,
): string {
  const cats = uniqueCategories(services);
  if (cats.length === 1) return labelForCategory(cats[0]);
  if (cats.length > 1) return 'Mixed services';
  return providerType ? PROVIDER_TYPE_FALLBACK[providerType] : 'Service';
}

/** Lower-case form for sentence bodies, e.g. "the grooming has started". */
export function categoryLabelLowerFromParts(
  services: BookingLineItem[] | undefined,
  providerType: ProviderType | undefined,
): string {
  const cats = uniqueCategories(services);
  if (cats.length === 1) return CATEGORY_LOWER[cats[0]];
  if (cats.length > 1) return 'booking';
  return providerType ? PROVIDER_TYPE_LOWER[providerType] : 'booking';
}
