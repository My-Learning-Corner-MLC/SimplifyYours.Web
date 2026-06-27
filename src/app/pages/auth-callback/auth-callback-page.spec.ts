import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { MessageService } from 'primeng/api';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import {
  PENDING_AUTHORIZATION_STORAGE_KEY,
  WINDOW,
} from '../../core/auth/oidc-redirect.service';
import { TokenStorageService } from '../../core/auth/token-storage.service';
import { AuthCallbackPage } from './auth-callback-page';

const TOKEN_STORAGE_KEY = 'simplifyyours.tokens.v1';

function base64Url(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function makeIdToken(claims: Record<string, unknown>): string {
  return `${base64Url(JSON.stringify({ alg: 'none' }))}.${base64Url(JSON.stringify(claims))}.sig`;
}

function tokenResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body) } as unknown as Response;
}

interface SetupOptions {
  query?: Record<string, string>;
  pending?: { codeVerifier: string; state: string; nonce: string; returnTo?: string } | null;
  fetchImpl?: typeof fetch;
}

class FakeRouter {
  navigateByUrl = vi.fn().mockResolvedValue(true);
}

class FakeMessageService {
  add = vi.fn();
}

function makeRoute(query: Record<string, string>): Partial<ActivatedRoute> {
  return {
    snapshot: {
      queryParamMap: convertToParamMap(query),
    } as unknown as ActivatedRoute['snapshot'],
  };
}

function setup(options: SetupOptions = {}) {
  sessionStorage.clear();
  if (options.pending) {
    sessionStorage.setItem(PENDING_AUTHORIZATION_STORAGE_KEY, JSON.stringify(options.pending));
  }
  const fetchImpl = options.fetchImpl ?? vi.fn();
  vi.stubGlobal('fetch', fetchImpl);

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      AuthCallbackPage,
      { provide: ActivatedRoute, useValue: makeRoute(options.query ?? {}) },
      { provide: Router, useClass: FakeRouter },
      { provide: MessageService, useClass: FakeMessageService },
      { provide: WINDOW, useValue: { sessionStorage } as unknown as Window },
    ],
  });

  return {
    page: TestBed.inject(AuthCallbackPage),
    router: TestBed.inject(Router) as unknown as FakeRouter,
    messages: TestBed.inject(MessageService) as unknown as FakeMessageService,
    tokenStorage: TestBed.inject(TokenStorageService),
    authSession: TestBed.inject(AuthSessionService),
    fetchImpl,
  };
}

describe('AuthCallbackPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it('exchanges the code, writes the bundle, sets the session, navigates to /dashboard', async () => {
    const idToken = makeIdToken({
      sub: 'user-9',
      name: 'Jane Test',
      email: 'jane@example.com',
      exp: 2_000_000_000,
    });
    const fetchImpl = vi.fn().mockResolvedValue(
      tokenResponse({
        access_token: 'at',
        refresh_token: 'rt',
        id_token: idToken,
        expires_in: 3600,
      }),
    );
    const { page, router, messages, tokenStorage, authSession } = setup({
      query: { code: 'ABC', state: 'XYZ' },
      pending: { codeVerifier: 'v', state: 'XYZ', nonce: 'n' },
      fetchImpl,
    });

    await page.ngOnInit();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard', { replaceUrl: true });
    expect(messages.add).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(PENDING_AUTHORIZATION_STORAGE_KEY)).toBeNull();
    expect(tokenStorage.read()).toMatchObject({ accessToken: 'at', refreshToken: 'rt', idToken });
    expect(authSession.session()).toEqual({
      userId: 'user-9',
      fullName: 'Jane Test',
      email: 'jane@example.com',
      hasUnreadNotifications: false,
    });
  });

  it('honours pending.returnTo when present', async () => {
    const idToken = makeIdToken({
      sub: 'u',
      name: 'Jane Test',
      email: 'jane@example.com',
      exp: 2_000_000_000,
    });
    const fetchImpl = vi.fn().mockResolvedValue(
      tokenResponse({ access_token: 'a', refresh_token: 'r', id_token: idToken, expires_in: 60 }),
    );
    const { page, router } = setup({
      query: { code: 'ABC', state: 'XYZ' },
      pending: { codeVerifier: 'v', state: 'XYZ', nonce: 'n', returnTo: '/my-occasions' },
      fetchImpl,
    });

    await page.ngOnInit();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/my-occasions', { replaceUrl: true });
  });

  it('shows the generic toast and navigates home when state is missing from the URL', async () => {
    const { page, router, messages } = setup({
      query: { code: 'ABC' },
      pending: { codeVerifier: 'v', state: 'XYZ', nonce: 'n' },
    });
    await page.ngOnInit();

    expect(messages.add).toHaveBeenCalledWith({
      severity: 'error',
      summary: "Sign-in didn't complete",
      detail: 'Please try again.',
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard', { replaceUrl: true });
    expect(sessionStorage.getItem(PENDING_AUTHORIZATION_STORAGE_KEY)).toBeNull();
  });

  it('shows the generic toast when state does not match the stored pending state', async () => {
    const { page, messages } = setup({
      query: { code: 'ABC', state: 'tampered' },
      pending: { codeVerifier: 'v', state: 'XYZ', nonce: 'n' },
    });
    await page.ngOnInit();
    expect(messages.add).toHaveBeenCalledTimes(1);
  });

  it('shows the generic toast when the token endpoint returns non-2xx', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(tokenResponse({}, false, 400));
    const { page, messages, router } = setup({
      query: { code: 'ABC', state: 'XYZ' },
      pending: { codeVerifier: 'v', state: 'XYZ', nonce: 'n' },
      fetchImpl,
    });
    await page.ngOnInit();
    expect(messages.add).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard', { replaceUrl: true });
  });

  it('shows the generic toast when the network fetch rejects', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));
    const { page, messages } = setup({
      query: { code: 'ABC', state: 'XYZ' },
      pending: { codeVerifier: 'v', state: 'XYZ', nonce: 'n' },
      fetchImpl,
    });
    await page.ngOnInit();
    expect(messages.add).toHaveBeenCalledTimes(1);
  });

  it('shows the generic toast when the id_token is unparseable', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      tokenResponse({
        access_token: 'a',
        refresh_token: 'r',
        id_token: 'garbage',
        expires_in: 60,
      }),
    );
    const { page, messages } = setup({
      query: { code: 'ABC', state: 'XYZ' },
      pending: { codeVerifier: 'v', state: 'XYZ', nonce: 'n' },
      fetchImpl,
    });
    await page.ngOnInit();
    expect(messages.add).toHaveBeenCalledTimes(1);
  });
});
