import { Injectable, Signal, inject, signal } from '@angular/core';
import { parseIdToken } from './id-token-parser';
import { TokenStorageService } from './token-storage.service';
import { UserSession } from './user-session.model';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly sessionSignal = signal<UserSession | null>(null);

  readonly session: Signal<UserSession | null> = this.sessionSignal.asReadonly();

  constructor() {
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
  }

  setSession(session: UserSession): void {
    this.sessionSignal.set(session);
  }

  clearSession(): void {
    this.sessionSignal.set(null);
    this.tokenStorage.clear();
  }
}
