import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  OidcRedirectService,
  PENDING_AUTHORIZATION_STORAGE_KEY,
  WINDOW,
} from './oidc-redirect.service';
import { PendingAuthorization } from './pending-authorization.model';
import { environment } from '../../../environments/environment';

describe('OidcRedirectService', () => {
  let assignSpy: ReturnType<typeof vi.fn>;
  let fakeWindow: Window;
  let service: OidcRedirectService;

  beforeEach(() => {
    sessionStorage.clear();
    assignSpy = vi.fn();
    fakeWindow = {
      location: { assign: assignSpy } as unknown as Location,
      sessionStorage: window.sessionStorage,
    } as Window;

    TestBed.configureTestingModule({
      providers: [{ provide: WINDOW, useValue: fakeWindow }],
    });
    service = TestBed.inject(OidcRedirectService);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('writes pending {codeVerifier, state, nonce} to sessionStorage before navigating', async () => {
    await service.startAuthorization();

    const raw = sessionStorage.getItem(PENDING_AUTHORIZATION_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const pending = JSON.parse(raw!) as PendingAuthorization;
    expect(typeof pending.codeVerifier).toBe('string');
    expect(pending.codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(typeof pending.state).toBe('string');
    expect(pending.state.length).toBeGreaterThanOrEqual(22);
    expect(typeof pending.nonce).toBe('string');
    expect(pending.nonce.length).toBeGreaterThanOrEqual(22);

    expect(assignSpy).toHaveBeenCalledTimes(1);
  });

  it('navigates to identity-server /auth/sign-in with every OIDC param URL-encoded', async () => {
    await service.startAuthorization();

    expect(assignSpy).toHaveBeenCalledTimes(1);
    const target = assignSpy.mock.calls[0][0] as string;
    expect(target.startsWith(`${environment.identityBaseUrl}/auth/sign-in?`)).toBe(true);

    const url = new URL(target);
    expect(url.searchParams.get('client_id')).toBe('simplify-yours-web');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:4200/auth/callback');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('openid profile email offline_access');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');

    const pending = JSON.parse(sessionStorage.getItem(PENDING_AUTHORIZATION_STORAGE_KEY)!) as PendingAuthorization;
    expect(url.searchParams.get('state')).toBe(pending.state);
    expect(url.searchParams.get('nonce')).toBe(pending.nonce);
    expect(url.searchParams.get('code_challenge')?.length).toBeGreaterThanOrEqual(43);
  });

  it('persists pending state before invoking window.location.assign', async () => {
    let storedAtAssignTime: string | null = null;
    assignSpy.mockImplementation(() => {
      storedAtAssignTime = sessionStorage.getItem(PENDING_AUTHORIZATION_STORAGE_KEY);
    });

    await service.startAuthorization();

    expect(storedAtAssignTime).not.toBeNull();
  });

  it('records returnTo on the pending state when supplied', async () => {
    await service.startAuthorization('/my-occasions');
    const pending = JSON.parse(sessionStorage.getItem(PENDING_AUTHORIZATION_STORAGE_KEY)!) as PendingAuthorization;
    expect(pending.returnTo).toBe('/my-occasions');
  });
});
