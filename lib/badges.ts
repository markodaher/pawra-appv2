import type { Theme } from '../types';

export type ProviderTier = 'new' | 'rising' | 'trusted' | 'top' | 'elite';

export type TierMeta = {
  label: string;
  icon: string;
  color: (T: Theme) => string;
  show: boolean; // whether to surface this tier in UI (hide 'new')
};

export const TIER_META: Record<ProviderTier, TierMeta> = {
  new:     { label: 'New',       icon: 'star-line',    color: T => T.inkMuted,  show: false },
  rising:  { label: 'Rising',    icon: 'star',         color: T => T.brand,     show: true  },
  trusted: { label: 'Trusted',   icon: 'check-circle', color: T => T.brand,     show: true  },
  top:     { label: 'Top Rated', icon: 'star',         color: T => T.warn,      show: true  },
  elite:   { label: 'Elite',     icon: 'sparkle',      color: T => T.accent,    show: true  },
};

/**
 * Compute a provider's tier from their public review count and rating.
 * Uses reviews (not raw booking count) as a proxy for experience since
 * that's what's available on the Provider object without extra queries.
 */
export function computeTier(reviewCount: number, rating: number): ProviderTier {
  if (reviewCount >= 50 && rating >= 4.7) return 'elite';
  if (reviewCount >= 25 && rating >= 4.5) return 'top';
  if (reviewCount >= 10 && rating >= 4.2) return 'trusted';
  if (reviewCount >=  1 && rating >= 4.0) return 'rising';
  return 'new';
}
