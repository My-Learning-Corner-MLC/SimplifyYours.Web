// Typed failure surfaced by SeatingApiClient calls — mirrors the shape of
// EventDetailError so the tables tab can reuse the same loading/error/retry pattern.
export interface SeatingError {
  kind: 'notFound' | 'unauthorized' | 'conflict' | 'validation' | 'server';
  message: string;
}
