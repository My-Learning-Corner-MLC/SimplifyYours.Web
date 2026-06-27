export interface SignUpError {
  fieldErrors: Record<string, string[]>;
  pageError?: string;
}
