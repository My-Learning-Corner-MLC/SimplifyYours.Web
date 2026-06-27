export interface IdTokenClaims {
  sub: string;
  name: string;
  email: string;
  exp: number;
}

export function parseIdToken(idToken: string): IdTokenClaims | null {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    const payload = base64UrlDecode(parts[1]);
    const claims = JSON.parse(payload) as Partial<IdTokenClaims>;
    if (
      typeof claims.sub === 'string' &&
      typeof claims.name === 'string' &&
      typeof claims.email === 'string' &&
      typeof claims.exp === 'number'
    ) {
      return claims as IdTokenClaims;
    }
    return null;
  } catch {
    return null;
  }
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const base64 = padded + '='.repeat(padLen);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}
