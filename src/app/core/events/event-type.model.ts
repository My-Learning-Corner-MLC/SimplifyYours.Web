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
