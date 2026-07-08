export interface CreateEventError {
  fieldErrors: Record<string, string[]>;
  pageError?: string;
}
