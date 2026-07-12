import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PrimeTemplate } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { OidcRedirectService } from '../core/auth/oidc-redirect.service';
import { SiteHeader } from './site-header/site-header';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, SiteHeader, Toast, PrimeTemplate],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  private readonly oidcRedirect = inject(OidcRedirectService);

  onSignInClick(): void {
    void this.oidcRedirect.startAuthorization();
  }
}
