import type { DayKey, ServiceCategoryId, WeeklyHours } from '../types';

export const PRICING_PRESETS: Record<ServiceCategoryId, { name: string; unit: string }[]> = {
  walk: [
    { name: '30-min walk', unit: '/walk' },
    { name: '45-min walk', unit: '/walk' },
    { name: '1-hour walk', unit: '/walk' },
    { name: 'Group walk', unit: '/dog' },
    { name: 'Park session', unit: '/walk' },
  ],
  groom: [
    { name: 'Small breed', unit: '/groom' },
    { name: 'Medium breed', unit: '/groom' },
    { name: 'Large breed', unit: '/groom' },
    { name: 'Bath only', unit: '/visit' },
    { name: 'Full groom', unit: '/groom' },
    { name: 'Nail trim', unit: '/visit' },
    { name: 'De-shedding', unit: '/visit' },
  ],
  vet: [
    { name: 'Consultation', unit: '/visit' },
    { name: 'Vaccination', unit: '/visit' },
    { name: 'Lab work', unit: '/test' },
    { name: 'Surgery', unit: '/procedure' },
    { name: 'Dental cleaning', unit: '/visit' },
    { name: 'Emergency call-out', unit: '/visit' },
  ],
  board: [
    { name: 'Per night', unit: '/night' },
    { name: 'Weekly rate', unit: '/week' },
    { name: 'Daycare (8h)', unit: '/day' },
    { name: 'Half-day care', unit: '/day' },
  ],
  taxi: [
    { name: 'One-way trip (up to 10km)', unit: '/trip' },
    { name: 'One-way trip (10–25km)',    unit: '/trip' },
    { name: 'Round trip',                unit: '/trip' },
    { name: 'Airport transfer',          unit: '/trip' },
    { name: 'Vet appointment run',       unit: '/trip' },
  ],
  funeral: [
    { name: 'Home pick-up',             unit: '/service' },
    { name: 'Private cremation',        unit: '/service' },
    { name: 'Communal cremation',       unit: '/service' },
    { name: 'Burial with ceremony',     unit: '/service' },
    { name: 'Memorial garden placement',unit: '/service' },
    { name: 'Paw print keepsake',       unit: '/service' },
    { name: 'Ash urn',                  unit: '/service' },
  ],
};

export const DAYS_OF_WEEK: { key: DayKey; label: string; short: string }[] = [
  { key: 'mon', label: 'Monday', short: 'Mon' },
  { key: 'tue', label: 'Tuesday', short: 'Tue' },
  { key: 'wed', label: 'Wednesday', short: 'Wed' },
  { key: 'thu', label: 'Thursday', short: 'Thu' },
  { key: 'fri', label: 'Friday', short: 'Fri' },
  { key: 'sat', label: 'Saturday', short: 'Sat' },
  { key: 'sun', label: 'Sunday', short: 'Sun' },
];

export const DEFAULT_WEEKLY_HOURS: WeeklyHours = {
  mon: { open: false, from: '09:00', to: '18:00' },
  tue: { open: false, from: '09:00', to: '18:00' },
  wed: { open: false, from: '09:00', to: '18:00' },
  thu: { open: false, from: '09:00', to: '18:00' },
  fri: { open: false, from: '09:00', to: '18:00' },
  sat: { open: false, from: '09:00', to: '18:00' },
  sun: { open: false, from: '09:00', to: '18:00' },
};

export function summarizeHours(h: WeeklyHours | null | undefined): string {
  if (!h) return '';
  const openDays = DAYS_OF_WEEK.filter(d => h[d.key].open);
  if (openDays.length === 0) return 'Closed';
  if (openDays.length === 7) {
    const sample = h[openDays[0].key];
    const allSame = openDays.every(d => h[d.key].from === sample.from && h[d.key].to === sample.to);
    if (allSame) return `Daily · ${sample.from}–${sample.to}`;
  }
  // Try to express as a range like "Mon–Fri · 9:00–18:00"
  const labels = openDays.map(d => d.short);
  const sample = h[openDays[0].key];
  const allSame = openDays.every(d => h[d.key].from === sample.from && h[d.key].to === sample.to);
  if (allSame) return `${labels.join(', ')} · ${sample.from}–${sample.to}`;
  return `${labels.join(', ')} · varies`;
}
