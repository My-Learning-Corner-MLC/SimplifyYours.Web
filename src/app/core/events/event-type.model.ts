export type EventType =
  | 'birthday'
  | 'wedding'
  | 'event'
  | 'anniversary'
  | 'launch'
  | 'dinner'
  | 'other';

// The legacy `event` type stays accepted by the API but is not surfaced in the UI.
export const CREATABLE_EVENT_TYPES: readonly EventType[] = [
  'birthday',
  'wedding',
  'anniversary',
  'launch',
  'dinner',
  'other',
];

// guest-management-service only has a guest-metadata mapper for these types today (see
// GuestMetadataMapperFactory) — adding a guest to any other event type is rejected server-side.
// Grey these out at creation time until they get a mapper too.
export const GUEST_METADATA_SUPPORTED_EVENT_TYPES: ReadonlySet<EventType> = new Set([
  'wedding',
  'birthday',
]);
