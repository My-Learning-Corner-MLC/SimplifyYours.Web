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
  private inFlightRefresh: Promise<TokenBundle | null> | null = null;

  bind(outcome: RefreshOutcome): void {
    this.outcome = outcome;
  }

  schedule(bundle: TokenBundle): void {
    this.cancel();
    const delay = Math.max(0, bundle.expiresAt - Date.now() - REFRESH_LEAD_TIME_MS);
    this.timer = setTimeout(() => {
      void this.refresh(bundle.refreshToken);
    }, delay);
  }

  cancel(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Refreshes the access token on demand (e.g. after a 401), sharing a single
   * in-flight request so concurrent callers don't trigger duplicate refreshes.
   */
  ensureFreshToken(): Promise<TokenBundle | null> {
    if (this.inFlightRefresh) {
      return this.inFlightRefresh;
    }
    const bundle = this.tokenStorage.read();
    if (!bundle) {
      return Promise.resolve(null);
    }
    return this.refresh(bundle.refreshToken);
  }

  private refresh(refreshToken: string): Promise<TokenBundle | null> {
    if (this.inFlightRefresh) {
      return this.inFlightRefresh;
    }
    this.cancel();
    const promise = this.performRefresh(refreshToken).finally(() => {
      this.inFlightRefresh = null;
    });
    this.inFlightRefresh = promise;
    return promise;
  }

  private async performRefresh(refreshToken: string): Promise<TokenBundle | null> {
    try {
      const tokens = await exchangeRefreshToken({
        identityBaseUrl: environment.identityBaseUrl,
        clientId: environment.oidcClientId,
        refreshToken,
      });
      const claims = parseIdToken(tokens.id_token);
      if (!claims) {
        this.fail();
        return null;
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
      return next;
    } catch {
      this.fail();
      return null;
    }
  }

  private fail(): void {
    this.tokenStorage.clear();
    this.outcome?.onFailure();
  }
}
