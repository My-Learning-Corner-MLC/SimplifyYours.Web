// Typed failure surfaced to the dashboard when the event list cannot be loaded.
// Unauthorized (401/403) responses never reach here: the bearer-token
// interceptor handles silent refresh and session expiry globally.
export interface QueryEventsError {
  kind: 'server';
  message: string;
}
