// Typed failure surfaced to the dashboard when the event list cannot be loaded.
// `kind` lets the caller distinguish an expired/invalid session (redirect to
// sign-in) from a generic server error (retry in place, hence the message).
export type QueryEventsError = { kind: 'unauthorized' } | { kind: 'server'; message: string };
