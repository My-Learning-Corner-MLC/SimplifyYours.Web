import { Injectable, Signal, inject, signal } from '@angular/core';
import { parseIdToken } from './id-token-parser';
import { TokenBundle } from './token-bundle.model';
import { TokenRefreshService } from './token-refresh.service';
import { TokenStorageService } from './token-storage.service';
import { UserSession } from './user-session.model';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly tokenRefresh = inject(TokenRefreshService);
  private readonly sessionSignal = signal<UserSession | null>(null);

  readonly session: Signal<UserSession | null> = this.sessionSignal.asReadonly();

  constructor() {
    this.tokenRefresh.bind({
      onSuccess: (_bundle, claims) => {
        if (!claims) {
          return;
        }
        this.sessionSignal.set({
          userId: claims.sub,
          fullName: claims.name,
          email: claims.email,
          hasUnreadNotifications: this.sessionSignal()?.hasUnreadNotifications ?? false,
        });
      },
      onFailure: () => {
        this.sessionSignal.set(null);
      },
    });

    const bundle = this.tokenStorage.read();
    if (!bundle) {
      return;
    }
    if (this.tokenStorage.isExpired(bundle)) {
      this.tokenStorage.clear();
      return;
    }
    const claims = parseIdToken(bundle.idToken);
    if (!claims) {
      this.tokenStorage.clear();
      return;
    }
    this.sessionSignal.set({
      userId: claims.sub,
      fullName: claims.name,
      email: claims.email,
      hasUnreadNotifications: false,
    });
    this.tokenRefresh.schedule(bundle);
  }

  setSession(session: UserSession, bundle?: TokenBundle): void {
    this.sessionSignal.set(session);
    if (bundle) {
      this.tokenRefresh.schedule(bundle);
    }
  }

  clearSession(): void {
    this.tokenRefresh.cancel();
    this.sessionSignal.set(null);
    this.tokenStorage.clear();
  }
}
