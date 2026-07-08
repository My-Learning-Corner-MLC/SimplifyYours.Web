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

export interface EventTypeTint {
  readonly badgeBg: string;
  readonly badgeFg: string;
  readonly accent: string;
  readonly glow: string;
}

// Per-type badge/accent palette, matched to the design's Occasion theme
// (badge + gradient-bar colors observed on the birthday/wedding/anniversary cards).
const EVENT_TYPE_TINTS: Record<EventType, EventTypeTint> = {
  birthday: { badgeBg: '#F0EFE2', badgeFg: '#5a6b3a', accent: '#E07B5A', glow: 'rgba(224,123,90,0.14)' },
  anniversary: { badgeBg: '#F0EFE2', badgeFg: '#5a6b3a', accent: '#C28840', glow: 'rgba(200,168,118,0.16)' },
  dinner: { badgeBg: '#F0EFE2', badgeFg: '#5a6b3a', accent: '#C28840', glow: 'rgba(200,168,118,0.16)' },
  wedding: { badgeBg: '#F4E2DD', badgeFg: '#8a3a25', accent: '#B05540', glow: 'rgba(176,85,64,0.12)' },
  launch: { badgeBg: '#F4E2DD', badgeFg: '#8a3a25', accent: '#E07B5A', glow: 'rgba(224,123,90,0.14)' },
  event: { badgeBg: '#F6EFE0', badgeFg: '#8a6b2f', accent: '#7A8F5A', glow: 'rgba(122,143,90,0.14)' },
  other: { badgeBg: '#F6EFE0', badgeFg: '#8a6b2f', accent: '#7A8F5A', glow: 'rgba(122,143,90,0.14)' },
};

const UNKNOWN_TINT: EventTypeTint = EVENT_TYPE_TINTS.other;

/** Badge/accent colors for any event-type string, falling back to a neutral tint. */
export function eventTypeTint(rawType: string): EventTypeTint {
  const key = rawType.trim().toLowerCase();
  return isKnownEventType(key) ? EVENT_TYPE_TINTS[key] : UNKNOWN_TINT;
}
