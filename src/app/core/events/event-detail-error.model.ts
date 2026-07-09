// Typed failure surfaced to the event-detail page when a single event cannot be
// loaded. `notFound` (404) is distinguished from `unauthorized` (401/403) and a
// generic `server` error so the page can show the right message and affordance.
export interface EventDetailError {
  kind: 'notFound' | 'unauthorized' | 'server';
  message: string;
}
