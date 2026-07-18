import { Signal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Location } from '@angular/common';
import { routes } from './app.routes';
import { AuthSessionService } from './core/auth/auth-session.service';
import { UserSession } from './core/auth/user-session.model';

const makeSession = (): UserSession => ({
  userId: 'user-1',
  fullName: 'Eleanor Rigby',
  email: 'eleanor@example.com',
  hasUnreadNotifications: false,
});

function setup(session: UserSession | null) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      {
        provide: AuthSessionService,
        useValue: { session: signal(session) as Signal<UserSession | null> },
      },
    ],
  });
}

describe('app routes', () => {
  describe('signed out', () => {
    beforeEach(() => setup(null));

    it('redirects "/" to "/home"', async () => {
      const router = TestBed.inject(Router);
      const location = TestBed.inject(Location);
      await router.navigate(['/']);
      expect(location.path()).toBe('/home');
    });

    it('redirects unknown paths to "/home"', async () => {
      const router = TestBed.inject(Router);
      const location = TestBed.inject(Location);
      await router.navigate(['/unknown-route']);
      expect(location.path()).toBe('/home');
    });

    it('redirects the authenticated-only "/dashboard" route to "/home"', async () => {
      const router = TestBed.inject(Router);
      const location = TestBed.inject(Location);
      await router.navigate(['/dashboard']);
      expect(location.path()).toBe('/home');
    });

    it('redirects the authenticated-only "/create-event" route to "/home"', async () => {
      const router = TestBed.inject(Router);
      const location = TestBed.inject(Location);
      await router.navigate(['/create-event']);
      expect(location.path()).toBe('/home');
    });

    // Regression: events/:id had no guard, so an unauthenticated user reached
    // the component, the detail request 401'd, and the page was stuck on its
    // loading skeleton forever instead of being redirected.
    it('redirects the authenticated-only "/events/:id" route to "/home"', async () => {
      const router = TestBed.inject(Router);
      const location = TestBed.inject(Location);
      await router.navigate(['/events/0dbfdfc7-ac69-430b-9d76-2f0002e3bfd9']);
      expect(location.path()).toBe('/home');
    });
  });

  describe('signed in', () => {
    beforeEach(() => setup(makeSession()));

    it('redirects "/" to "/dashboard"', async () => {
      const router = TestBed.inject(Router);
      const location = TestBed.inject(Location);
      await router.navigate(['/']);
      expect(location.path()).toBe('/dashboard');
    });

    it('redirects unknown paths to "/dashboard"', async () => {
      const router = TestBed.inject(Router);
      const location = TestBed.inject(Location);
      await router.navigate(['/unknown-route']);
      expect(location.path()).toBe('/dashboard');
    });

    it('redirects the guest-only "/home" route to "/dashboard"', async () => {
      const router = TestBed.inject(Router);
      const location = TestBed.inject(Location);
      await router.navigate(['/home']);
      expect(location.path()).toBe('/dashboard');
    });

    it('resolves /create-event to the create-event page', async () => {
      const router = TestBed.inject(Router);
      const location = TestBed.inject(Location);
      await router.navigate(['/create-event']);
      expect(location.path()).toBe('/create-event');
    });

    it('resolves /events/:id to the event-detail page', async () => {
      const router = TestBed.inject(Router);
      const location = TestBed.inject(Location);
      await router.navigate(['/events/0dbfdfc7-ac69-430b-9d76-2f0002e3bfd9']);
      expect(location.path()).toBe('/events/0dbfdfc7-ac69-430b-9d76-2f0002e3bfd9');
    });
  });

  describe('route configuration', () => {
    beforeEach(() => setup(null));

    it('guards /create-event with a canDeactivate guard', () => {
      const route = routes.find((r) => r.path === 'create-event');
      expect(route?.canDeactivate?.length).toBe(1);
    });

    it('declares an /auth/callback route before the wildcard', () => {
      const callbackIndex = routes.findIndex((r) => r.path === 'auth/callback');
      const wildcardIndex = routes.findIndex((r) => r.path === '**');
      expect(callbackIndex).toBeGreaterThanOrEqual(0);
      expect(wildcardIndex).toBeGreaterThan(callbackIndex);
    });
  });
});
