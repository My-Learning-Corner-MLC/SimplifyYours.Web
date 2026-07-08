// Typed failure surfaced to the dashboard when the event list cannot be loaded.
// `kind` lets the UI distinguish an auth problem from a generic server error.
export interface QueryEventsError {
  kind: 'unauthorized' | 'server';
  message: string;
}
