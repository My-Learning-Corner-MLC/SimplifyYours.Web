import { EventType } from './event-type.model';

// Presentation maps for known event types. Shared by the create-event wizard
// and the dashboard so labels/emoji stay consistent across the app.
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  birthday: 'Birthday',
  wedding: 'Wedding',
  event: 'Event',
  anniversary: 'Anniversary',
  launch: 'Launch',
  dinner: 'Dinner',
  other: 'Other',
};

export const EVENT_TYPE_EMOJI: Record<EventType, string> = {
  birthday: '🎂',
  wedding: '💍',
  event: '🎉',
  anniversary: '🥂',
  launch: '🚀',
  dinner: '🍽️',
  other: '＋',
};

// Fallback used when the API returns a type the UI does not know about.
const UNKNOWN_EMOJI = '✨';

function isKnownEventType(value: string): value is EventType {
  return Object.prototype.hasOwnProperty.call(EVENT_TYPE_LABELS, value);
}

/** Human label for any event-type string, tolerant of unknown/legacy values. */
export function eventTypeLabel(rawType: string): string {
  const key = rawType.trim().toLowerCase();
  if (isKnownEventType(key)) {
    return EVENT_TYPE_LABELS[key];
  }
  const cleaned = key.replace(/[_-]+/g, ' ').trim();
  if (!cleaned) {
    return 'Occasion';
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/** Emoji for any event-type string, falling back to a neutral sparkle. */
export function eventTypeEmoji(rawType: string): string {
  const key = rawType.trim().toLowerCase();
  return isKnownEventType(key) ? EVENT_TYPE_EMOJI[key] : UNKNOWN_EMOJI;
}
