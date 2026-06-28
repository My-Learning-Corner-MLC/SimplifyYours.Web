export interface PendingAuthorization {
  codeVerifier: string;
  state: string;
  nonce: string;
  returnTo?: string;
}
