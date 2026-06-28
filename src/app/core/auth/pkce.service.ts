import { Injectable } from '@angular/core';

const VERIFIER_BYTE_LENGTH = 32;
const RANDOM_BYTE_LENGTH = 16;

@Injectable({ providedIn: 'root' })
export class PkceService {
  createVerifier(): string {
    const bytes = new Uint8Array(VERIFIER_BYTE_LENGTH);
    crypto.getRandomValues(bytes);
    return base64UrlEncode(bytes);
  }

  async createChallenge(verifier: string): Promise<string> {
    const encoded = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return base64UrlEncode(new Uint8Array(digest));
  }

  randomState(): string {
    return this.randomToken();
  }

  randomNonce(): string {
    return this.randomToken();
  }

  private randomToken(): string {
    const bytes = new Uint8Array(RANDOM_BYTE_LENGTH);
    crypto.getRandomValues(bytes);
    return base64UrlEncode(bytes);
  }
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
