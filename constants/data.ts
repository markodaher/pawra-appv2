import type { ProviderType, ServiceType, ShopCategory } from '../types';

// Fixed taxonomies. Not user data — these are the categories the app supports.
export const SERVICE_TYPES: ServiceType[] = [
  { id: 'walk',    label: 'Walking',  icon: 'walk' },
  { id: 'groom',   label: 'Grooming', icon: 'scissors' },
  { id: 'vet',     label: 'Vet',      icon: 'stethoscope' },
  { id: 'board',   label: 'Boarding', icon: 'house' },
  { id: 'taxi',    label: 'Pet Taxi', icon: 'car' },
  { id: 'funeral', label: 'Funeral',  icon: 'flower' },
];

export const SHOP_CATEGORIES: ShopCategory[] = [
  { id: 'food',   label: 'Food',        icon: 'bone' },
  { id: 'toys',   label: 'Toys',        icon: 'paw' },
  { id: 'health', label: 'Health',      icon: 'shield' },
  { id: 'groom',  label: 'Grooming',    icon: 'scissors' },
  { id: 'leash',  label: 'Leashes',     icon: 'tag' },
  { id: 'acc',    label: 'Accessories', icon: 'sparkle' },
];

// Map a service category to the provider "type" used for filtering on Browse.
export const CATEGORY_TO_PROVIDER_TYPE: Record<string, ProviderType> = {
  walk:    'walker',
  groom:   'groomer',
  vet:     'vet',
  board:   'boarder',
  taxi:    'taxi',
  funeral: 'funeral',
};

export const PROVIDER_TYPE_TO_PRICE_LABEL: Record<string, string> = {
  walker:  '/walk',
  groomer: '/groom',
  vet:     '/visit',
  boarder: '/night',
  taxi:    '/trip',
  funeral: '/service',
};
