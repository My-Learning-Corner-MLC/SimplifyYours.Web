import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { environment } from '../../../environments/environment';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { parseIdToken } from '../../core/auth/id-token-parser';
import { exchangeAuthorizationCode } from '../../core/auth/oidc-token-client';
import {
  PENDING_AUTHORIZATION_STORAGE_KEY,
  WINDOW,
} from '../../core/auth/oidc-redirect.service';
import { PendingAuthorization } from '../../core/auth/pending-authorization.model';
import { TokenStorageService } from '../../core/auth/token-storage.service';

@Component({
  standalone: true,
  selector: 'app-auth-callback-page',
  templateUrl: './auth-callback-page.html',
  styleUrl: './auth-callback-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthCallbackPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authSession = inject(AuthSessionService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly messages = inject(MessageService);
  private readonly window = inject(WINDOW);

  async ngOnInit(): Promise<void> {
    try {
      const params = this.route.snapshot.queryParamMap;
      const code = params.get('code');
      const state = params.get('state');
      const pending = this.readPending();

      if (!code || !state || !pending || pending.state !== state) {
        return await this.fail();
      }

      const tokens = await exchangeAuthorizationCode({
        identityServerOrigin: environment.identityServerOrigin,
        clientId: environment.oidcClientId,
        redirectUri: environment.oidcRedirectUri,
        code,
        codeVerifier: pending.codeVerifier,
      });

      const claims = parseIdToken(tokens.id_token);
      if (!claims) {
        return await this.fail();
      }

      const bundle = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        idToken: tokens.id_token,
        expiresAt: Date.now() + tokens.expires_in * 1_000,
      };
      this.tokenStorage.write(bundle);
      this.authSession.setSession(
        {
          userId: claims.sub,
          fullName: claims.name,
          email: claims.email,
          hasUnreadNotifications: false,
        },
        bundle,
      );
      this.clearPending();
      await this.router.navigateByUrl(pending.returnTo ?? '/dashboard', { replaceUrl: true });
    } catch {
      await this.fail();
    }
  }

  private readPending(): PendingAuthorization | null {
    const raw = this.window.sessionStorage.getItem(PENDING_AUTHORIZATION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<PendingAuthorization>;
      if (
        typeof parsed.codeVerifier === 'string' &&
        typeof parsed.state === 'string' &&
        typeof parsed.nonce === 'string'
      ) {
        return parsed as PendingAuthorization;
      }
      return null;
    } catch {
      return null;
    }
  }

  private clearPending(): void {
    this.window.sessionStorage.removeItem(PENDING_AUTHORIZATION_STORAGE_KEY);
  }

  private async fail(): Promise<void> {
    this.clearPending();
    this.tokenStorage.clear();
    this.messages.add({
      severity: 'error',
      summary: "Sign-in didn't complete",
      detail: 'Please try again.',
    });
    await this.router.navigateByUrl('/dashboard', { replaceUrl: true });
  }
}
