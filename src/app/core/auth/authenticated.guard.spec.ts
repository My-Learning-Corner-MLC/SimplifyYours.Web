import { Signal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, UrlTree } from '@angular/router';
import { authenticatedGuard } from './authenticated.guard';
import { AuthSessionService } from './auth-session.service';
import { UserSession } from './user-session.model';

function setup(session: UserSession | null) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthSessionService, useValue: { session: signal(session) as Signal<UserSession | null> } },
    ],
  });
}

const makeSession = (): UserSession => ({
  userId: 'user-1',
  fullName: 'Eleanor Rigby',
  email: 'eleanor@example.com',
  hasUnreadNotifications: false,
});

describe('authenticatedGuard', () => {
  it('allows navigation when a session is present', () => {
    setup(makeSession());
    const result = TestBed.runInInjectionContext(() =>
      authenticatedGuard({} as never, { url: '/dashboard' } as never),
    );
    expect(result).toBe(true);
  });

  it('redirects to /home when there is no session', () => {
    setup(null);
    const result = TestBed.runInInjectionContext(() =>
      authenticatedGuard({} as never, { url: '/dashboard' } as never),
    );
    const router = TestBed.inject(Router);
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/home');
  });
});
