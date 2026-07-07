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

/** Whole calendar days between two instants, event-day minus now-day. */
export function dayOffset(eventTimeIso: string, now: Date): number {
  const eventDay = startOfDay(new Date(eventTimeIso));
  const today = startOfDay(now);
  return Math.round((eventDay - today) / MS_PER_DAY);
}

/**
 * Describes how far away an event is, in the design's chip language:
 * `TODAY`, `T − N DAYS`/`T − N WEEKS` (future), `N DAYS/WEEKS AGO` (past).
 */
export function describeCountdown(eventTimeIso: string, now: Date): Countdown {
  const offset = dayOffset(eventTimeIso, now);

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

function parse(iso: string | null | undefined): Date | null {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Human date/time line for an event card, e.g. "Sat, 5 Jul 2026, 14:00 – 18:00".
 * Falls back to the single `eventTime` when start/end are absent.
 */
export function formatEventWhen(
  eventTimeIso: string,
  startIso: string | null = null,
  endIso: string | null = null,
): string {
  const dateSource = parse(startIso) ?? parse(eventTimeIso);
  if (!dateSource) {
    return '';
  }

  const datePart = DATE_FORMAT.format(dateSource);
  const start = parse(startIso) ?? parse(eventTimeIso);
  const end = parse(endIso);

  if (!start) {
    return datePart;
  }

  const timePart = end
    ? `${TIME_FORMAT.format(start)} – ${TIME_FORMAT.format(end)}`
    : TIME_FORMAT.format(start);

  return `${datePart}, ${timePart}`;
}
