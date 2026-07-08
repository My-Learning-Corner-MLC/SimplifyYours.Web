export type CountdownTone = 'today' | 'future' | 'past';

export interface Countdown {
  label: string;
  tone: CountdownTone;
  /** Whole-day offset from `now` to the event day (negative = in the past). */
  dayOffset: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_THRESHOLD = 21;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Parses a "yyyy-MM-dd" date-only string as a local calendar date.
 * `new Date(dateOnlyIso)` would parse it as UTC midnight, which can shift the
 * displayed day backward for users behind UTC — this reads the components
 * directly instead.
 */
function parseDateOnly(dateOnlyIso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOnlyIso);
  if (!match) {
    return null;
  }
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Whole calendar days between two instants, event-day minus now-day. */
export function dayOffset(eventDateIso: string, now: Date): number {
  const eventDay = parseDateOnly(eventDateIso);
  if (!eventDay) {
    return 0;
  }
  const today = startOfDay(now);
  return Math.round((eventDay.getTime() - today) / MS_PER_DAY);
}

/**
 * Describes how far away an event is, in the design's chip language:
 * `TODAY`, `T − N DAYS`/`T − N WEEKS` (future), `N DAYS/WEEKS AGO` (past).
 */
export function describeCountdown(eventDateIso: string, now: Date): Countdown {
  const offset = dayOffset(eventDateIso, now);

  if (offset === 0) {
    return { label: 'TODAY', tone: 'today', dayOffset: 0 };
  }

  if (offset > 0) {
    return { label: `T − ${forwardLabel(offset)}`, tone: 'future', dayOffset: offset };
  }

  const ago = Math.abs(offset);
  return { label: `${forwardLabel(ago)} AGO`, tone: 'past', dayOffset: offset };
}

function forwardLabel(days: number): string {
  if (days <= DAYS_THRESHOLD) {
    return `${days} ${days === 1 ? 'DAY' : 'DAYS'}`;
  }
  const weeks = Math.round(days / 7);
  return `${weeks} ${weeks === 1 ? 'WEEK' : 'WEEKS'}`;
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** Parses a "HH:mm" or "HH:mm:ss" time-of-day-only string (no date component). */
function parseTimeOfDay(value: string | null | undefined): { hour: number; minute: number } | null {
  if (!value) {
    return null;
  }
  const match = /^(\d{2}):(\d{2})/.exec(value);
  if (!match) {
    return null;
  }
  const [, hour, minute] = match;
  return { hour: Number(hour), minute: Number(minute) };
}

function formatTimeOfDay(time: { hour: number; minute: number }): string {
  return TIME_FORMAT.format(new Date(2000, 0, 1, time.hour, time.minute));
}

/**
 * Human date/time line for an event card, e.g. "Sat, 5 Jul 2026, 14:00 – 18:00".
 * Falls back to the date alone when start/end are absent.
 */
export function formatEventWhen(
  eventDateIso: string,
  startTimeOfDay: string | null = null,
  endTimeOfDay: string | null = null,
): string {
  const eventDay = parseDateOnly(eventDateIso);
  if (!eventDay) {
    return '';
  }

  const datePart = DATE_FORMAT.format(eventDay);
  const start = parseTimeOfDay(startTimeOfDay);
  const end = parseTimeOfDay(endTimeOfDay);

  if (!start) {
    return datePart;
  }

  const timePart = end
    ? `${formatTimeOfDay(start)} – ${formatTimeOfDay(end)}`
    : formatTimeOfDay(start);

  return `${datePart}, ${timePart}`;
}
