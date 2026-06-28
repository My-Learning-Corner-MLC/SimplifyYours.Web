import { isSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthSessionService } from './auth-session.service';
import { TokenRefreshService, RefreshOutcome } from './token-refresh.service';
import { TokenStorageService } from './token-storage.service';
import { TokenBundle } from './token-bundle.model';

class FakeTokenRefreshService {
  outcome: RefreshOutcome | null = null;
  schedule = vi.fn();
  cancel = vi.fn();
  bind = vi.fn((outcome: RefreshOutcome) => {
    this.outcome = outcome;
  });
}

const TOKEN_STORAGE_KEY = 'simplifyyours.tokens.v1';

function base64Url(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function makeIdToken(claims: Record<string, unknown>): string {
  const header = base64Url(JSON.stringify({ alg: 'none' }));
  const payload = base64Url(JSON.stringify(claims));
  return `${header}.${payload}.signature`;
}

function seedBundle(bundle: TokenBundle): void {
  sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(bundle));
}

describe('AuthSessionService', () => {
  let refresh: FakeTokenRefreshService;

  beforeEach(() => {
    sessionStorage.clear();
    refresh = new FakeTokenRefreshService();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: TokenRefreshService, useValue: refresh }],
    });
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('is provided in root', () => {
    const prov = (AuthSessionService as unknown as { ɵprov: { providedIn: string } }).ɵprov;
    expect(prov.providedIn).toBe('root');
  });

  it('exposes a session signal that is null when storage is empty', () => {
    const service = TestBed.inject(AuthSessionService);
    expect(isSignal(service.session)).toBe(true);
    expect(service.session()).toBeNull();
  });

  it('hydrates from a non-expired bundle at construction', () => {
    const idToken = makeIdToken({
      sub: 'user-42',
      name: 'Jane Test',
      email: 'jane@example.com',
      exp: 1_900_000_000,
    });
    seedBundle({
      accessToken: 'a',
      refreshToken: 'r',
      idToken,
      expiresAt: Date.now() + 60_000,
    });

    const service = TestBed.inject(AuthSessionService);
    expect(service.session()).toEqual({
      userId: 'user-42',
      fullName: 'Jane Test',
      email: 'jane@example.com',
      hasUnreadNotifications: false,
    });
  });

  it('returns null and clears storage when the bundle is expired', () => {
    seedBundle({
      accessToken: 'a',
      refreshToken: 'r',
      idToken: makeIdToken({ sub: 'u', name: 'n', email: 'e@x', exp: 1 }),
      expiresAt: Date.now() - 1_000,
    });

    const service = TestBed.inject(AuthSessionService);
    expect(service.session()).toBeNull();
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('returns null and clears storage when the id_token is unparseable', () => {
    seedBundle({
      accessToken: 'a',
      refreshToken: 'r',
      idToken: 'not.a.jwt-payload',
      expiresAt: Date.now() + 60_000,
    });

    const service = TestBed.inject(AuthSessionService);
    expect(service.session()).toBeNull();
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('setSession updates the signal synchronously', () => {
    const service = TestBed.inject(AuthSessionService);
    service.setSession({
      userId: 'u',
      fullName: 'Jane Test',
      email: 'jane@example.com',
      hasUnreadNotifications: true,
    });
    expect(service.session()?.fullName).toBe('Jane Test');
  });

  it('clearSession resets the signal and removes the bundle from storage', () => {
    seedBundle({
      accessToken: 'a',
      refreshToken: 'r',
      idToken: makeIdToken({ sub: 'u', name: 'Jane Test', email: 'jane@example.com', exp: 1 }),
      expiresAt: Date.now() + 60_000,
    });
    const service = TestBed.inject(AuthSessionService);
    expect(service.session()).not.toBeNull();

    service.clearSession();
    expect(service.session()).toBeNull();
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('does not call localStorage during hydration', () => {
    // Trigger construction; assertion is that no localStorage entry appears (also belt-and-braces).
    TestBed.inject(TokenStorageService); // ensure DI graph wired up
    TestBed.inject(AuthSessionService);
    expect(localStorage.length).toBe(0);
  });

  it('schedules a refresh on hydration when the bundle is non-expired', () => {
    const idToken = makeIdToken({
      sub: 'u',
      name: 'Jane Test',
      email: 'jane@example.com',
      exp: 2_000_000_000,
    });
    const bundle: TokenBundle = {
      accessToken: 'a',
      refreshToken: 'r',
      idToken,
      expiresAt: Date.now() + 60_000,
    };
    seedBundle(bundle);
    TestBed.inject(AuthSessionService);
    expect(refresh.schedule).toHaveBeenCalledWith(bundle);
  });

  it('schedules a refresh on setSession when a bundle is provided', () => {
    const service = TestBed.inject(AuthSessionService);
    const bundle: TokenBundle = { accessToken: 'a', refreshToken: 'r', idToken: 'i', expiresAt: 99 };
    service.setSession(
      { userId: 'u', fullName: 'Jane Test', email: 'jane@example.com', hasUnreadNotifications: false },
      bundle,
    );
    expect(refresh.schedule).toHaveBeenLastCalledWith(bundle);
  });

  it('cancels the refresh timer on clearSession', () => {
    const service = TestBed.inject(AuthSessionService);
    service.clearSession();
    expect(refresh.cancel).toHaveBeenCalledTimes(1);
  });

  it('reflects a successful refresh outcome on the session signal without nulling it', () => {
    const idToken = makeIdToken({
      sub: 'u',
      name: 'Jane Test',
      email: 'jane@example.com',
      exp: 2_000_000_000,
    });
    seedBundle({
      accessToken: 'a',
      refreshToken: 'r',
      idToken,
      expiresAt: Date.now() + 60_000,
    });
    const service = TestBed.inject(AuthSessionService);
    expect(service.session()?.fullName).toBe('Jane Test');

    const refreshedIdToken = makeIdToken({
      sub: 'u',
      name: 'Jane Refreshed',
      email: 'jane@example.com',
      exp: 2_100_000_000,
    });
    const refreshedBundle: TokenBundle = {
      accessToken: 'a2',
      refreshToken: 'r2',
      idToken: refreshedIdToken,
      expiresAt: Date.now() + 120_000,
    };
    const claims = { sub: 'u', name: 'Jane Refreshed', email: 'jane@example.com', exp: 2_100_000_000 };
    refresh.outcome!.onSuccess(refreshedBundle, claims);
    expect(service.session()?.fullName).toBe('Jane Refreshed');
  });

  it('clears the session signal silently on a refresh failure outcome', () => {
    const idToken = makeIdToken({
      sub: 'u',
      name: 'Jane Test',
      email: 'jane@example.com',
      exp: 2_000_000_000,
    });
    seedBundle({
      accessToken: 'a',
      refreshToken: 'r',
      idToken,
      expiresAt: Date.now() + 60_000,
    });
    const service = TestBed.inject(AuthSessionService);
    expect(service.session()).not.toBeNull();

    refresh.outcome!.onFailure();
    expect(service.session()).toBeNull();
  });
});
