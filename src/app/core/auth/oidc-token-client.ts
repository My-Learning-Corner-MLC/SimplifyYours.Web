export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: number;
}

export interface AuthorizationCodeRequest {
  identityBaseUrl: string;
  clientId: string;
  redirectUri: string;
  code: string;
  codeVerifier: string;
}

export interface RefreshTokenRequest {
  identityBaseUrl: string;
  clientId: string;
  refreshToken: string;
}

export async function exchangeAuthorizationCode(
  request: AuthorizationCodeRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: request.code,
    redirect_uri: request.redirectUri,
    client_id: request.clientId,
    code_verifier: request.codeVerifier,
  });
  return postToken(request.identityBaseUrl, body, fetchImpl);
}

export async function exchangeRefreshToken(
  request: RefreshTokenRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: request.refreshToken,
    client_id: request.clientId,
  });
  return postToken(request.identityBaseUrl, body, fetchImpl);
}

async function postToken(
  origin: string,
  body: URLSearchParams,
  fetchImpl: typeof fetch,
): Promise<TokenResponse> {
  const response = await fetchImpl(`${origin}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!response.ok) {
    throw new Error(`token endpoint returned ${response.status}`);
  }
  const json = (await response.json()) as Partial<TokenResponse>;
  if (
    typeof json.access_token !== 'string' ||
    typeof json.refresh_token !== 'string' ||
    typeof json.id_token !== 'string' ||
    typeof json.expires_in !== 'number'
  ) {
    throw new Error('token endpoint returned an unexpected payload shape');
  }
  return json as TokenResponse;
}
