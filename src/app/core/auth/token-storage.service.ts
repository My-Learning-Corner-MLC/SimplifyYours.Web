import { Injectable } from '@angular/core';
import { TokenBundle } from './token-bundle.model';

const STORAGE_KEY = 'simplifyyours.tokens.v1';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  read(): TokenBundle | null {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<TokenBundle>;
      if (
        typeof parsed.accessToken === 'string' &&
        typeof parsed.refreshToken === 'string' &&
        typeof parsed.idToken === 'string' &&
        typeof parsed.expiresAt === 'number'
      ) {
        return parsed as TokenBundle;
      }
      return null;
    } catch {
      return null;
    }
  }

  write(bundle: TokenBundle): void {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(bundle));
  }

  clear(): void {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  isExpired(bundle: TokenBundle): boolean {
    return bundle.expiresAt <= Date.now();
  }
}
