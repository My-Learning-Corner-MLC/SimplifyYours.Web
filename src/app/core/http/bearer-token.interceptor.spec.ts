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

    http.post(`${environment.eventBaseUrl}/events`, {}).subscribe();

    const req = httpMock.expectOne(`${environment.eventBaseUrl}/events`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer access-123');
    req.flush({});
  });

  it('attaches the bearer token to guest-service requests', () => {
    tokenStorage.write(bundle);

    http.get(`${environment.guestManagementBaseUrl}/guests?eventId=e1`).subscribe();

    const req = httpMock.expectOne(`${environment.guestManagementBaseUrl}/guests?eventId=e1`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer access-123');
    req.flush({});
  });

  it('leaves identity-service requests untouched', () => {
    tokenStorage.write(bundle);

    http.post(`${environment.identityBaseUrl}/auth/sign-up`, {}).subscribe();

    const req = httpMock.expectOne(`${environment.identityBaseUrl}/auth/sign-up`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('leaves event-service requests untouched when no token is stored', () => {
    http.post(`${environment.eventBaseUrl}/events`, {}).subscribe();

    const req = httpMock.expectOne(`${environment.eventBaseUrl}/events`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('refreshes the token and retries the request after a 401', async () => {
    tokenStorage.write(bundle);
    const refreshedBundle: TokenBundle = { ...bundle, accessToken: 'access-456' };
    tokenRefresh.ensureFreshToken.mockResolvedValue(refreshedBundle);

    let result: unknown;
    http.post(`${environment.eventBaseUrl}/events`, {}).subscribe((response) => {
      result = response;
    });

    const first = httpMock.expectOne(`${environment.eventBaseUrl}/events`);
    expect(first.request.headers.get('Authorization')).toBe('Bearer access-123');
    first.flush({}, { status: 401, statusText: 'Unauthorized' });

    await Promise.resolve();
    await Promise.resolve();

    const retried = httpMock.expectOne(`${environment.eventBaseUrl}/events`);
    expect(retried.request.headers.get('Authorization')).toBe('Bearer access-456');
    retried.flush({ ok: true });

    expect(tokenRefresh.ensureFreshToken).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true });
  });

  it('propagates the original error when the refresh fails', async () => {
    tokenStorage.write(bundle);
    tokenRefresh.ensureFreshToken.mockResolvedValue(null);

    let error: HttpErrorResponse | undefined;
    http.post(`${environment.eventBaseUrl}/events`, {}).subscribe({
      error: (err: HttpErrorResponse) => {
        error = err;
      },
    });

    const req = httpMock.expectOne(`${environment.eventBaseUrl}/events`);
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    await Promise.resolve();
    await Promise.resolve();

    expect(error?.status).toBe(401);
    expect(tokenRefresh.ensureFreshToken).toHaveBeenCalledTimes(1);
  });

  it('does not attempt a refresh for non-401 errors', async () => {
    tokenStorage.write(bundle);

    let error: HttpErrorResponse | undefined;
    http.post(`${environment.eventBaseUrl}/events`, {}).subscribe({
      error: (err: HttpErrorResponse) => {
        error = err;
      },
    });

    const req = httpMock.expectOne(`${environment.eventBaseUrl}/events`);
    req.flush({}, { status: 403, statusText: 'Forbidden' });

    await Promise.resolve();

    expect(error?.status).toBe(403);
    expect(tokenRefresh.ensureFreshToken).not.toHaveBeenCalled();
  });
});
