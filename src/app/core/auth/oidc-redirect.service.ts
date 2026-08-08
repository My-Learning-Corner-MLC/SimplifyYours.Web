import { Injectable, InjectionToken, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { PendingAuthorization } from './pending-authorization.model';
import { PkceService } from './pkce.service';

export const PENDING_AUTHORIZATION_STORAGE_KEY = 'simplifyyours.oidc.pending';

export const WINDOW = new InjectionToken<Window>('Window', {
  providedIn: 'root',
  factory: () => window,
});

@Injectable({ providedIn: 'root' })
export class OidcRedirectService {
  private readonly pkce = inject(PkceService);
  private readonly window = inject(WINDOW);

  async startAuthorization(returnTo?: string): Promise<void> {
    const codeVerifier = this.pkce.createVerifier();
    const codeChallenge = await this.pkce.createChallenge(codeVerifier);
    const state = this.pkce.randomState();
    const nonce = this.pkce.randomNonce();

    const pending: PendingAuthorization = { codeVerifier, state, nonce, returnTo };
    this.window.sessionStorage.setItem(PENDING_AUTHORIZATION_STORAGE_KEY, JSON.stringify(pending));

    const params = new URLSearchParams({
      client_id: environment.oidcClientId,
      redirect_uri: environment.oidcRedirectUri,
      response_type: 'code',
      scope: environment.oidcScopes,
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    // Full-page navigation to identity-service's own origin, not through
    // apiBaseUrl/api-gateway -- the hosted sign-in page is server-rendered
    // HTML with its own static assets, which break under a path-rewriting
    // proxy (root-relative asset/form-action paths resolve against the
    // wrong origin). Token exchange and sign-up stay same-origin JSON calls
    // through apiBaseUrl since they don't render HTML.
    const url = `${environment.identityHostedUiBaseUrl}/auth/sign-in?${params.toString()}`;
    this.window.location.assign(url);
  }
}
