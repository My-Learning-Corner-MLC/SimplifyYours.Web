import { describe, it, expect } from 'vitest';
import { parseIdToken } from './id-token-parser';

function makeIdToken(claims: Record<string, unknown>): string {
  const header = base64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify(claims));
  return `${header}.${payload}.signature`;
}

function base64Url(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

describe('parseIdToken', () => {
  it('returns the claims object for a well-formed token with all required claims', () => {
    const token = makeIdToken({
      sub: 'user-1',
      name: 'Jane Test',
      email: 'jane@example.com',
      exp: 1_700_000_000,
    });
    expect(parseIdToken(token)).toEqual({
      sub: 'user-1',
      name: 'Jane Test',
      email: 'jane@example.com',
      exp: 1_700_000_000,
    });
  });

  it('returns null when the token has fewer than three dot-separated parts', () => {
    expect(parseIdToken('header.payload')).toBeNull();
    expect(parseIdToken('justastring')).toBeNull();
  });

  it('returns null when the payload is not valid base64', () => {
    expect(parseIdToken('header.@@@@.signature')).toBeNull();
  });

  it('returns null when the payload is not valid JSON', () => {
    const broken = `${base64Url('{"alg":"none"}')}.${base64Url('{not json')}.signature`;
    expect(parseIdToken(broken)).toBeNull();
  });

  it('returns null when any required claim is missing or wrong type', () => {
    expect(parseIdToken(makeIdToken({ sub: 'u', name: 'n', email: 'e@x' }))).toBeNull();
    expect(parseIdToken(makeIdToken({ sub: 'u', name: 'n', email: 'e@x', exp: 'soon' }))).toBeNull();
  });
});
