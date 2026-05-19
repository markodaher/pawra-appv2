import type { Coords } from '../types';

/**
 * Great-circle distance between two lat/lng points in kilometers.
 * Lebanon-sized country → flat-earth approximation (haversine without
 * iteration) is plenty accurate; we don't need a routing engine.
 */
export function haversineKm(a: Coords, b: Coords): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Convert a numeric km distance into a friendly string. < 1 km → metres.
 * Empty string when distance can't be computed (no provider pin yet).
 */
export function formatDistance(km: number | null | undefined): string {
  if (km === null || km === undefined || km <= 0) return '';
  if (km < 1) return `${Math.round(km * 1000)}m`;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
}
