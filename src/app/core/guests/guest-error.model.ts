// Typed failure surfaced when an event's guest list cannot be loaded.
export interface ListGuestsError {
  kind: 'notFound' | 'unauthorized' | 'server';
  message: string;
}

// Typed failure surfaced when adding a guest fails. `duplicate` maps to 409 and
// `validation` carries per-field messages (400); everything else is `server`.
export interface AddGuestError {
  kind: 'validation' | 'duplicate' | 'notFound' | 'unauthorized' | 'server';
  message: string;
  fieldErrors?: Record<string, string[]>;
}
