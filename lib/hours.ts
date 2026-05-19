import type { DayKey, WeeklyHours } from '../types';

// JS Date.getDay() returns 0=Sun..6=Sat. Map to our DayKey.
const DAY_BY_INDEX: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const DAY_LABEL: Record<DayKey, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
};
export const DAY_LONG: Record<DayKey, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

// Common starting point — same as a typical small shop. Editable in the form.
export function defaultWeeklyHours(): WeeklyHours {
  return {
    mon: { open: true,  from: '09:00', to: '18:00' },
    tue: { open: true,  from: '09:00', to: '18:00' },
    wed: { open: true,  from: '09:00', to: '18:00' },
    thu: { open: true,  from: '09:00', to: '18:00' },
    fri: { open: true,  from: '09:00', to: '18:00' },
    sat: { open: true,  from: '10:00', to: '17:00' },
    sun: { open: false, from: '10:00', to: '17:00' },
  };
}

function parseHHMM(s: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const h = parseInt(m[1], 10), mm = parseInt(m[2], 10);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return { h, m: mm };
}

export function dayKeyForDate(d: Date): DayKey {
  return DAY_BY_INDEX[d.getDay()];
}

/** True if `now` falls inside that day's open window. */
export function isOpenAt(hours: WeeklyHours | null | undefined, now: Date): boolean {
  if (!hours) return true; // unknown hours → treat as open (legacy providers).
  const day = hours[dayKeyForDate(now)];
  if (!day || !day.open) return false;
  const from = parseHHMM(day.from);
  const to = parseHHMM(day.to);
  if (!from || !to) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  const fromMins = from.h * 60 + from.m;
  const toMins = to.h * 60 + to.m;
  return mins >= fromMins && mins < toMins;
}

/**
 * Next time the shop is open from `from`. Returns the Date of the opening
 * (start of an open day) and a friendly label.
 *
 * - If currently open: returns null (caller can use "Open now").
 * - Walks forward up to 14 days; if nothing is open, returns null (provider
 *   probably has every day toggled off — caller should treat as "closed").
 */
export function nextOpening(
  hours: WeeklyHours | null | undefined,
  from: Date = new Date(),
): { date: Date; dayKey: DayKey; label: string; timeLabel: string } | null {
  if (!hours) return null;
  if (isOpenAt(hours, from)) return null;

  for (let offset = 0; offset < 14; offset++) {
    const candidate = new Date(from);
    candidate.setDate(from.getDate() + offset);
    const key = dayKeyForDate(candidate);
    const day = hours[key];
    if (!day?.open) continue;
    const f = parseHHMM(day.from);
    if (!f) continue;
    const opening = new Date(candidate);
    opening.setHours(f.h, f.m, 0, 0);
    if (opening <= from) continue;
    return {
      date: opening,
      dayKey: key,
      label: friendlyDayLabel(opening, from),
      timeLabel: day.from,
    };
  }
  return null;
}

/** "Today", "Tomorrow", or "Mon 4 May". */
function friendlyDayLabel(d: Date, ref: Date): string {
  const same = d.getFullYear() === ref.getFullYear()
    && d.getMonth() === ref.getMonth()
    && d.getDate() === ref.getDate();
  const tmrw = new Date(ref); tmrw.setDate(ref.getDate() + 1);
  const sameTmrw = d.getFullYear() === tmrw.getFullYear()
    && d.getMonth() === tmrw.getMonth()
    && d.getDate() === tmrw.getDate();
  if (same) return 'Today';
  if (sameTmrw) return 'Tomorrow';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Open status snapshot for a provider, used by cards/sheets. */
export type OpenStatus =
  | { open: true; until: string | null }                                     // open window end (HH:MM) for today
  | { open: false; reason: 'closed_now' | 'no_hours_set'; nextOpening: { date: Date; label: string; timeLabel: string } | null };

export function openStatus(hours: WeeklyHours | null | undefined, now: Date = new Date()): OpenStatus {
  if (!hours) return { open: true, until: null };
  if (isOpenAt(hours, now)) {
    const day = hours[dayKeyForDate(now)];
    return { open: true, until: day?.to ?? null };
  }
  const next = nextOpening(hours, now);
  return {
    open: false,
    reason: next ? 'closed_now' : 'no_hours_set',
    nextOpening: next ? { date: next.date, label: next.label, timeLabel: next.timeLabel } : null,
  };
}

/**
 * Given a list of HH:MM slots, return only those that are valid for the given
 * date — i.e. inside that day's open window AND in the future.
 *
 * Used by the booking sheet: when the user picks a date, the time grid greys
 * out anything before the shop opens or after it closes.
 */
export function slotsForDate(
  hours: WeeklyHours | null | undefined,
  date: Date,
  slots: string[],
  now: Date = new Date(),
): { time: string; available: boolean }[] {
  return slots.map(time => {
    const parsed = parseHHMM(time);
    if (!parsed) return { time, available: false };
    const slotDate = new Date(date);
    slotDate.setHours(parsed.h, parsed.m, 0, 0);
    if (slotDate <= now) return { time, available: false };
    if (!hours) return { time, available: true };
    const day = hours[dayKeyForDate(slotDate)];
    if (!day?.open) return { time, available: false };
    const from = parseHHMM(day.from);
    const to = parseHHMM(day.to);
    if (!from || !to) return { time, available: false };
    const mins = parsed.h * 60 + parsed.m;
    const fromMins = from.h * 60 + from.m;
    const toMins = to.h * 60 + to.m;
    return { time, available: mins >= fromMins && mins < toMins };
  });
}

/**
 * For a 14-day day picker, find the index of the first day whose at least
 * one slot is bookable — used as the default-selected day when the shop is
 * closed today.
 */
export function firstBookableDayIndex(
  hours: WeeklyHours | null | undefined,
  startDate: Date,
  daysCount: number,
  slots: string[],
  now: Date = new Date(),
): number {
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    if (slotsForDate(hours, d, slots, now).some(s => s.available)) return i;
  }
  return 0;
}
