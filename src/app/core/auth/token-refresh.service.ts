import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { parseIdToken } from './id-token-parser';
import { exchangeRefreshToken } from './oidc-token-client';
import { TokenBundle } from './token-bundle.model';
import { TokenStorageService } from './token-storage.service';

const REFRESH_LEAD_TIME_MS = 60_000;

export interface RefreshOutcome {
  onSuccess(bundle: TokenBundle, claims: ReturnType<typeof parseIdToken>): void;
  onFailure(): void;
}

@Injectable({ providedIn: 'root' })
export class TokenRefreshService {
  private readonly tokenStorage = inject(TokenStorageService);
  private timer: ReturnType<typeof setTimeout> | null = null;
  private outcome: RefreshOutcome | null = null;

  bind(outcome: RefreshOutcome): void {
    this.outcome = outcome;
  }

  schedule(bundle: TokenBundle): void {
    this.cancel();
    const delay = Math.max(0, bundle.expiresAt - Date.now() - REFRESH_LEAD_TIME_MS);
    this.timer = setTimeout(() => {
      void this.fire(bundle.refreshToken);
    }, delay);
  }

  cancel(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async fire(refreshToken: string): Promise<void> {
    this.timer = null;
    try {
      const tokens = await exchangeRefreshToken({
        identityServerOrigin: environment.identityServerOrigin,
        clientId: environment.oidcClientId,
        refreshToken,
      });
      const claims = parseIdToken(tokens.id_token);
      if (!claims) {
        return this.fail();
      }
      const next: TokenBundle = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        idToken: tokens.id_token,
        expiresAt: Date.now() + tokens.expires_in * 1_000,
      };
      this.tokenStorage.write(next);
      this.outcome?.onSuccess(next, claims);
      this.schedule(next);
    } catch {
      this.fail();
    }
  }

  private fail(): void {
    this.tokenStorage.clear();
    this.outcome?.onFailure();
  }
}
