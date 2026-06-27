import { describe, it, expect, vi } from 'vitest';
import { exchangeAuthorizationCode, exchangeRefreshToken } from './oidc-token-client';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('oidc-token-client', () => {
  describe('exchangeAuthorizationCode', () => {
    it('POSTs the urlencoded auth-code body to /auth/token and returns the parsed response', async () => {
      const fetchImpl = vi.fn().mockResolvedValue(
        jsonResponse({
          access_token: 'at',
          refresh_token: 'rt',
          id_token: 'it',
          expires_in: 3600,
        }),
      );

      const result = await exchangeAuthorizationCode(
        {
          identityServerOrigin: 'http://localhost:15201',
          clientId: 'simplify-yours-web',
          redirectUri: 'http://localhost:4200/auth/callback',
          code: 'ABC',
          codeVerifier: 'v123',
        },
        fetchImpl,
      );

      expect(result).toEqual({ access_token: 'at', refresh_token: 'rt', id_token: 'it', expires_in: 3600 });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      const [url, init] = fetchImpl.mock.calls[0];
      expect(url).toBe('http://localhost:15201/auth/token');
      expect(init.method).toBe('POST');
      expect(init.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
      const body = new URLSearchParams(init.body as string);
      expect(body.get('grant_type')).toBe('authorization_code');
      expect(body.get('code')).toBe('ABC');
      expect(body.get('redirect_uri')).toBe('http://localhost:4200/auth/callback');
      expect(body.get('client_id')).toBe('simplify-yours-web');
      expect(body.get('code_verifier')).toBe('v123');
    });

    it('throws when the HTTP response is not ok', async () => {
      const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, false, 400));
      await expect(
        exchangeAuthorizationCode(
          {
            identityServerOrigin: 'http://localhost:15201',
            clientId: 'c',
            redirectUri: 'r',
            code: 'x',
            codeVerifier: 'v',
          },
          fetchImpl,
        ),
      ).rejects.toThrow(/400/);
    });

    it('throws when the body shape is unexpected', async () => {
      const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ access_token: 'a' }));
      await expect(
        exchangeAuthorizationCode(
          {
            identityServerOrigin: 'http://localhost:15201',
            clientId: 'c',
            redirectUri: 'r',
            code: 'x',
            codeVerifier: 'v',
          },
          fetchImpl,
        ),
      ).rejects.toThrow(/unexpected payload shape/);
    });
  });

  describe('exchangeRefreshToken', () => {
    it('POSTs the urlencoded refresh-token body to /auth/token', async () => {
      const fetchImpl = vi.fn().mockResolvedValue(
        jsonResponse({ access_token: 'a', refresh_token: 'r', id_token: 'i', expires_in: 1 }),
      );

      await exchangeRefreshToken(
        {
          identityServerOrigin: 'http://localhost:15201',
          clientId: 'simplify-yours-web',
          refreshToken: 'r-old',
        },
        fetchImpl,
      );

      const [, init] = fetchImpl.mock.calls[0];
      const body = new URLSearchParams(init.body as string);
      expect(body.get('grant_type')).toBe('refresh_token');
      expect(body.get('refresh_token')).toBe('r-old');
      expect(body.get('client_id')).toBe('simplify-yours-web');
    });
  });
});
