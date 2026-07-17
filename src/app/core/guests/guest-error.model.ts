// Typed failure surfaced when an event's guest list cannot be loaded. Unauthorized
// (401/403) responses never reach here: the bearer-token interceptor handles silent
// refresh and session expiry globally.
export interface ListGuestsError {
  kind: 'notFound' | 'server';
  message: string;
}

// Typed failure surfaced when adding a guest fails. `duplicate` maps to 409 and
// `validation` carries per-field messages (400); everything else is `server`.
// Unauthorized (401/403) responses never reach here — handled globally, see above.
export interface AddGuestError {
  kind: 'validation' | 'duplicate' | 'notFound' | 'server';
  message: string;
  fieldErrors?: Record<string, string[]>;
}
