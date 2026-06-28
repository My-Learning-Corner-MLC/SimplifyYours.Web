import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RefreshOutcome, TokenRefreshService } from './token-refresh.service';
import { TokenStorageService } from './token-storage.service';
import { TokenBundle } from './token-bundle.model';

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

describe('TokenRefreshService', () => {
  let service: TokenRefreshService;
  let storage: TokenStorageService;
  let success: ReturnType<typeof vi.fn>;
  let failure: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenRefreshService);
    storage = TestBed.inject(TokenStorageService);
    success = vi.fn();
    failure = vi.fn();
    service.bind({
      onSuccess: success as unknown as RefreshOutcome['onSuccess'],
      onFailure: failure as unknown as RefreshOutcome['onFailure'],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it('schedules a refresh expiresAt-now-60s ahead, fires it, and reschedules from the new bundle', async () => {
    const bundle: TokenBundle = {
      accessToken: 'a',
      refreshToken: 'r',
      idToken: makeIdToken({ sub: 'u', name: 'n', email: 'e@x', exp: 1 }),
      expiresAt: Date.now() + 120_000,
    };
    const fetchImpl = vi.fn().mockResolvedValue(
      tokenResponse({
        access_token: 'a2',
        refresh_token: 'r2',
        id_token: makeIdToken({ sub: 'u', name: 'n', email: 'e@x', exp: 2 }),
        expires_in: 60,
      }),
    );
    vi.stubGlobal('fetch', fetchImpl);

    service.schedule(bundle);
    expect(fetchImpl).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(60_000);
    await Promise.resolve();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const stored = storage.read();
    expect(stored?.accessToken).toBe('a2');
    expect(success).toHaveBeenCalledTimes(1);
    expect(failure).not.toHaveBeenCalled();
  });

  it('fires immediately when the bundle is within the 60s lead window', async () => {
    const bundle: TokenBundle = {
      accessToken: 'a',
      refreshToken: 'r',
      idToken: makeIdToken({ sub: 'u', name: 'n', email: 'e@x', exp: 1 }),
      expiresAt: Date.now() + 10_000,
    };
    const fetchImpl = vi.fn().mockResolvedValue(
      tokenResponse({
        access_token: 'a2',
        refresh_token: 'r2',
        id_token: makeIdToken({ sub: 'u', name: 'n', email: 'e@x', exp: 2 }),
        expires_in: 60,
      }),
    );
    vi.stubGlobal('fetch', fetchImpl);

    service.schedule(bundle);
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('calls onFailure and clears storage when the token endpoint rejects', async () => {
    sessionStorage.setItem(
      TOKEN_STORAGE_KEY,
      JSON.stringify({ accessToken: 'a', refreshToken: 'r', idToken: 'i', expiresAt: 1 }),
    );
    const fetchImpl = vi.fn().mockResolvedValue(tokenResponse({}, false, 400));
    vi.stubGlobal('fetch', fetchImpl);

    service.schedule({
      accessToken: 'a',
      refreshToken: 'r',
      idToken: 'i',
      expiresAt: Date.now() + 120_000,
    });
    await vi.advanceTimersByTimeAsync(60_000);
    await Promise.resolve();
    await Promise.resolve();

    expect(failure).toHaveBeenCalledTimes(1);
    expect(success).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('calls onFailure when fetch rejects', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchImpl);

    service.schedule({
      accessToken: 'a',
      refreshToken: 'r',
      idToken: 'i',
      expiresAt: Date.now() + 120_000,
    });
    await vi.advanceTimersByTimeAsync(60_000);
    await Promise.resolve();
    await Promise.resolve();

    expect(failure).toHaveBeenCalledTimes(1);
  });

  it('cancel clears any pending timer so refresh does not fire', async () => {
    const fetchImpl = vi.fn();
    vi.stubGlobal('fetch', fetchImpl);

    service.schedule({
      accessToken: 'a',
      refreshToken: 'r',
      idToken: 'i',
      expiresAt: Date.now() + 120_000,
    });
    service.cancel();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('calling schedule again replaces the prior timer (no double-firing)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      tokenResponse({
        access_token: 'a',
        refresh_token: 'r',
        id_token: makeIdToken({ sub: 'u', name: 'n', email: 'e@x', exp: 1 }),
        expires_in: 60,
      }),
    );
    vi.stubGlobal('fetch', fetchImpl);

    service.schedule({ accessToken: 'a', refreshToken: 'r', idToken: 'i', expiresAt: Date.now() + 120_000 });
    service.schedule({ accessToken: 'a', refreshToken: 'r', idToken: 'i', expiresAt: Date.now() + 200_000 });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchImpl).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(80_000);
    await Promise.resolve();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
