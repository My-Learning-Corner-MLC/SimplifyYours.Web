import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TokenStorageService } from './token-storage.service';
import { TokenBundle } from './token-bundle.model';

const STORAGE_KEY = 'simplifyyours.tokens.v1';

describe('TokenStorageService', () => {
  let service: TokenStorageService;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenStorageService);
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('read returns null when key is missing', () => {
    expect(service.read()).toBeNull();
  });

  it('read returns null when stored JSON is malformed', () => {
    sessionStorage.setItem(STORAGE_KEY, '{not json');
    expect(service.read()).toBeNull();
  });

  it('read returns null when stored JSON has the wrong shape', () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken: 'a' }));
    expect(service.read()).toBeNull();
  });

  it('write then read round-trips the bundle', () => {
    const bundle: TokenBundle = {
      accessToken: 'access',
      refreshToken: 'refresh',
      idToken: 'id',
      expiresAt: 12345,
    };
    service.write(bundle);
    expect(service.read()).toEqual(bundle);
  });

  it('clear removes the storage key', () => {
    service.write({ accessToken: 'a', refreshToken: 'r', idToken: 'i', expiresAt: 1 });
    service.clear();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('isExpired returns true when expiresAt is in the past or now', () => {
    const now = Date.now();
    expect(service.isExpired({ accessToken: '', refreshToken: '', idToken: '', expiresAt: now - 1 })).toBe(true);
    expect(service.isExpired({ accessToken: '', refreshToken: '', idToken: '', expiresAt: now })).toBe(true);
  });

  it('isExpired returns false when expiresAt is in the future', () => {
    expect(
      service.isExpired({ accessToken: '', refreshToken: '', idToken: '', expiresAt: Date.now() + 60_000 })
    ).toBe(false);
  });

  it('never touches localStorage on any operation', () => {
    const setSpy = vi.spyOn(Storage.prototype, 'setItem');
    const getSpy = vi.spyOn(Storage.prototype, 'getItem');
    const removeSpy = vi.spyOn(Storage.prototype, 'removeItem');

    service.write({ accessToken: 'a', refreshToken: 'r', idToken: 'i', expiresAt: 1 });
    service.read();
    service.clear();

    const allCalls = [...setSpy.mock.instances, ...getSpy.mock.instances, ...removeSpy.mock.instances];
    for (const target of allCalls) {
      expect(target).not.toBe(localStorage);
      expect(target).toBe(sessionStorage);
    }
  });
});
