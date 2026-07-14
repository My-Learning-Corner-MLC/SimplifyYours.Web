// Typed failure surfaced to the event-detail page when a single event cannot be
// loaded. `notFound` (404) is distinguished from a generic `server` error so the
// page can show the right message and affordance. Unauthorized (401/403)
// responses never reach here: the bearer-token interceptor handles silent
// refresh and session expiry globally.
export interface EventDetailError {
  kind: 'notFound' | 'server';
  message: string;
}
