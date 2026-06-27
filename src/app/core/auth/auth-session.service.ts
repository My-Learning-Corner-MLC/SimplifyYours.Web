import { Injectable, Signal, signal } from '@angular/core';
import { UserSession } from './user-session.model';

// Stub implementation: returns null until real OpenIddict-backed auth lands.
// Swap this file when identity-service integration is built; the consumer contract stays.
@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  readonly session: Signal<UserSession | null> = signal(null);
}
