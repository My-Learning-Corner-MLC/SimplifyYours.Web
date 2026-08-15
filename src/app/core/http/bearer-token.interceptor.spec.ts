import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { TokenBundle } from '../auth/token-bundle.model';
import { TokenRefreshService } from '../auth/token-refresh.service';
import { TokenStorageService } from '../auth/token-storage.service';
import { bearerTokenInterceptor } from './bearer-token.interceptor';

class FakeTokenRefreshService {
  ensureFreshToken = vi.fn();
}

describe('bearerTokenInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let tokenStorage: TokenStorageService;
  let tokenRefresh: FakeTokenRefreshService;

  const bundle: TokenBundle = {
    accessToken: 'access-123',
    refreshToken: 'refresh-123',
    idToken: 'id-123',
    expiresAt: Date.now() + 60_000,
  };

  beforeEach(() => {
    tokenRefresh = new FakeTokenRefreshService();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([bearerTokenInterceptor])),
        provideHttpClientTesting(),
        { provide: TokenRefreshService, useValue: tokenRefresh },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorageService);
    tokenStorage.clear();
  });

  afterEach(() => {
    tokenStorage.clear();
    httpMock.verify();
  });

  it('attaches the bearer token to event-service requests', () => {
    tokenStorage.write(bundle);

    http.post(`${environment.apiBaseUrl}/api/v1/events`, {}).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/v1/events`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer access-123');
    req.flush({});
  });

  it('attaches the bearer token to guest-service requests', () => {
    tokenStorage.write(bundle);

    http.get(`${environment.apiBaseUrl}/api/v1/guests?eventId=e1`).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/v1/guests?eventId=e1`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer access-123');
    req.flush({});
  });

  it('leaves the public invitation endpoints untouched even with a token in storage', () => {
    // These live under /api/v1/invitations but are deliberately anonymous. An organiser previewing
    // a guest's link should not ship their access token to an endpoint that has no use for it.
    tokenStorage.write(bundle);

    http.get(`${environment.apiBaseUrl}/api/v1/invitations/tok-abc123`).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/v1/invitations/tok-abc123`);
    expect(req.request.headers.get('Authorization')).toBeNull();
    req.flush({});
  });

  it('leaves the invitation render and rsvp endpoints untouched', () => {
    tokenStorage.write(bundle);

    http.get(`${environment.apiBaseUrl}/api/v1/invitations/tok-abc123/render`).subscribe();
    httpMock
      .expectOne(`${environment.apiBaseUrl}/api/v1/invitations/tok-abc123/render`)
      .flush('<html></html>');

    http.post(`${environment.apiBaseUrl}/api/v1/invitations/tok-abc123/rsvp`, {}).subscribe();
    const rsvp = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/v1/invitations/tok-abc123/rsvp`,
    );
    expect(rsvp.request.headers.get('Authorization')).toBeNull();
    rsvp.flush({});
  });

  it('does not redirect a guest to sign-in when a public invitation request fails', async () => {
    // A guest has no session at all. Running the 401 refresh path here would swallow the response
    // and bounce them to a login page -- on the one page whose premise is that they never log in.
    const error = new Promise<unknown>((resolve) => {
      http
        .get(`${environment.apiBaseUrl}/api/v1/invitations/tok-abc123`)
        .subscribe({ error: resolve });
    });

    httpMock
      .expectOne(`${environment.apiBaseUrl}/api/v1/invitations/tok-abc123`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(await error).toBeInstanceOf(HttpErrorResponse);
    expect(tokenRefresh.ensureFreshToken).not.toHaveBeenCalled();
  });

  it('attaches the bearer token to invitation-settings requests, a reserved segment under /invitations', () => {
    // "events" and "guests" are reserved first-path-segment literals under /api/v1/invitations —
    // they can never collide with a real (opaque, high-entropy) invitation token, and the
    // organiser-authenticated settings/link routes rely on that to still get their bearer token.
    tokenStorage.write(bundle);

    http.get(`${environment.apiBaseUrl}/api/v1/invitations/events/event-1`).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/v1/invitations/events/event-1`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer access-123');
    req.flush({});
  });

  it('attaches the bearer token to the guest-invitation-link lookup, the other reserved segment', () => {
    tokenStorage.write(bundle);

    http.get(`${environment.apiBaseUrl}/api/v1/invitations/guests/guest-1/link`).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/v1/invitations/guests/guest-1/link`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer access-123');
    req.flush({});
  });

  it('leaves identity-service requests untouched', () => {
    tokenStorage.write(bundle);

    http.post(`${environment.apiBaseUrl}/api/v1/identities/sign-up`, {}).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/v1/identities/sign-up`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('leaves the token-exchange request untouched even with a token in storage', () => {
    // This is the actual call oidc-token-client.ts makes. Explicit coverage
    // because it's the one class of request the interceptor must never touch.
    tokenStorage.write(bundle);

    http.post(`${environment.apiBaseUrl}/api/v1/identities/token`, {}).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/v1/identities/token`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('does not attach a token to a path that merely starts with the same characters as a protected prefix', () => {
    // Guards the boundary check: startsWith alone would wrongly treat this
    // as a protected /api/v1/events request.
    tokenStorage.write(bundle);

    http.get(`${environment.apiBaseUrl}/api/v1/eventsAdmin`).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/v1/eventsAdmin`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('does not attach a token to a same-path request against a different origin', () => {
    tokenStorage.write(bundle);

    http.get('https://not-the-gateway.example/api/v1/events').subscribe();

    const req = httpMock.expectOne('https://not-the-gateway.example/api/v1/events');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('leaves event-service requests untouched when no token is stored', () => {
    http.post(`${environment.apiBaseUrl}/api/v1/events`, {}).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/v1/events`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('refreshes the token and retries the request after a 401', async () => {
    tokenStorage.write(bundle);
    const refreshedBundle: TokenBundle = { ...bundle, accessToken: 'access-456' };
    tokenRefresh.ensureFreshToken.mockResolvedValue(refreshedBundle);

    let result: unknown;
    http.post(`${environment.apiBaseUrl}/api/v1/events`, {}).subscribe((response) => {
      result = response;
    });

    const first = httpMock.expectOne(`${environment.apiBaseUrl}/api/v1/events`);
    expect(first.request.headers.get('Authorization')).toBe('Bearer access-123');
    first.flush({}, { status: 401, statusText: 'Unauthorized' });

    await Promise.resolve();
    await Promise.resolve();

    const retried = httpMock.expectOne(`${environment.apiBaseUrl}/api/v1/events`);
    expect(retried.request.headers.get('Authorization')).toBe('Bearer access-456');
    retried.flush({ ok: true });

    expect(tokenRefresh.ensureFreshToken).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true });
  });

  it('swallows the request when the refresh fails, leaving the global session-expired handler to react', async () => {
    tokenStorage.write(bundle);
    tokenRefresh.ensureFreshToken.mockResolvedValue(null);

    let error: unknown;
    let completed = false;
    http.post(`${environment.apiBaseUrl}/api/v1/events`, {}).subscribe({
      error: (err: unknown) => {
        error = err;
      },
      complete: () => {
        completed = true;
      },
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/v1/events`);
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    await Promise.resolve();
    await Promise.resolve();

    expect(error).toBeUndefined();
    expect(completed).toBe(true);
    expect(tokenRefresh.ensureFreshToken).toHaveBeenCalledTimes(1);
  });

  it('does not attempt a refresh for non-401 errors', async () => {
    tokenStorage.write(bundle);

    let error: HttpErrorResponse | undefined;
    http.post(`${environment.apiBaseUrl}/api/v1/events`, {}).subscribe({
      error: (err: HttpErrorResponse) => {
        error = err;
      },
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/v1/events`);
    req.flush({}, { status: 403, statusText: 'Forbidden' });

    await Promise.resolve();

    expect(error?.status).toBe(403);
    expect(tokenRefresh.ensureFreshToken).not.toHaveBeenCalled();
  });
});
