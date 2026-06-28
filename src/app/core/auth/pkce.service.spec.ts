import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { PkceService } from './pkce.service';

describe('PkceService', () => {
  let service: PkceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PkceService);
  });

  it('createVerifier returns a 43-128 character string using the unreserved RFC 3986 alphabet', () => {
    const verifier = service.createVerifier();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
    expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/);
  });

  it('createVerifier returns different values on consecutive calls', () => {
    const a = service.createVerifier();
    const b = service.createVerifier();
    expect(a).not.toBe(b);
  });

  it('createChallenge matches the RFC 7636 Appendix B sample', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const challenge = await service.createChallenge(verifier);
    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('randomState returns a base64url string of at least 22 chars', () => {
    const state = service.randomState();
    expect(state.length).toBeGreaterThanOrEqual(22);
    expect(state).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it('randomNonce returns a base64url string of at least 22 chars and is not equal to a second call', () => {
    const a = service.randomNonce();
    const b = service.randomNonce();
    expect(a.length).toBeGreaterThanOrEqual(22);
    expect(a).toMatch(/^[A-Za-z0-9\-_]+$/);
    expect(a).not.toBe(b);
  });
});
