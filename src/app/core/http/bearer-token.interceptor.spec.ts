import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { TokenBundle } from '../auth/token-bundle.model';
import { TokenStorageService } from '../auth/token-storage.service';
import { bearerTokenInterceptor } from './bearer-token.interceptor';

describe('bearerTokenInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let tokenStorage: TokenStorageService;

  const bundle: TokenBundle = {
    accessToken: 'access-123',
    refreshToken: 'refresh-123',
    idToken: 'id-123',
    expiresAt: Date.now() + 60_000,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([bearerTokenInterceptor])),
        provideHttpClientTesting(),
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

    http.get(`${environment.guestBaseUrl}/guests?eventId=e1`).subscribe();

    const req = httpMock.expectOne(`${environment.guestBaseUrl}/guests?eventId=e1`);
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
});
