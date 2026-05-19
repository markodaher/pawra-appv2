/**
 * Shared date/time formatting for Pawra.
 * Single source of truth — import from here, never roll your own format.
 */

export const MONTHS    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── Parsing ───────────────────────────────────────────────────────────────────

/**
 * Parse a stored whenLabel string like "Tue 5 May" → midnight Date.
 * Returns null if the string can't be parsed.
 */
export function parseWhenLabel(label: string): Date | null {
  if (!label) return null;
  const parts = label.trim().split(' ');
  if (parts.length < 3) return null;
  const day      = parseInt(parts[1], 10);
  const monthIdx = MONTHS.indexOf(parts[2]);
  if (isNaN(day) || monthIdx === -1) return null;
  const now = new Date();
  // Assume current year; if the resulting date is more than 6 months in the
  // past, assume next year (handles Dec→Jan boundary for future bookings).
  let year = now.getFullYear();
  const candidate = new Date(year, monthIdx, day, 0, 0, 0, 0);
  if (candidate.getTime() < now.getTime() - 180 * 86_400_000) year += 1;
  return new Date(year, monthIdx, day, 0, 0, 0, 0);
}

// ── Display formatters ────────────────────────────────────────────────────────

function midnight(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * "Tue 5 May" + "17:30" → "Today, 17:30" | "Tomorrow, 17:30" | "Tue 5 May, 17:30"
 *
 * Used everywhere a booking's scheduled date is displayed.
 * The formatted string is derived at render time so it stays accurate
 * (a booking for "today" shows "Today" today, then "Tue 5 May" tomorrow).
 */
export function formatBookingDate(whenLabel: string, time: string): string {
  const date = parseWhenLabel(whenLabel);
  const now  = new Date();
  const todayMs    = midnight(now);
  const tomorrowMs = todayMs + 86_400_000;

  let prefix: string;
  if (!date) {
    prefix = whenLabel;
  } else if (midnight(date) === todayMs) {
    prefix = 'Today';
  } else if (midnight(date) === tomorrowMs) {
    prefix = 'Tomorrow';
  } else {
    prefix = whenLabel; // e.g. "Tue 5 May"
  }

  return time ? `${prefix}, ${time}` : prefix;
}

/**
 * Convert a createdAt millisecond timestamp to a human label.
 * "Today, 14:30" | "Yesterday, 09:00" | "Tue 5 May, 14:30"
 *
 * Used for orders (which don't have a scheduled date — only a placed-at time).
 */
export function formatTimestamp(ts: number): string {
  const d      = new Date(ts);
  const now    = new Date();
  const todayMs     = midnight(now);
  const yesterdayMs = todayMs - 86_400_000;
  const dMs         = midnight(d);

  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const time = `${hh}:${mm}`;

  if (dMs === todayMs)     return `Today, ${time}`;
  if (dMs === yesterdayMs) return `Yesterday, ${time}`;
  return `${DAY_LABELS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}, ${time}`;
}

/**
 * Build a fresh "placed now" string for new orders — same format as
 * formatTimestamp so they're consistent when loaded back from the DB.
 */
export function nowWhen(): string {
  return formatTimestamp(Date.now());
}
