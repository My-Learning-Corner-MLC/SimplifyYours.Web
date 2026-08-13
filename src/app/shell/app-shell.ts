import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
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
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** True for routes that render on their own, with no app header around them. */
  protected readonly chromeless = signal(false);

  constructor() {
    this.updateChrome();

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.updateChrome();
      }
    });
  }

  private updateChrome(): void {
    // Walk to the deepest activated route: the flag is declared on the leaf, not the root.
    let route = this.route;

    while (route.firstChild) {
      route = route.firstChild;
    }

    this.chromeless.set(route.snapshot.data['chromeless'] === true);
  }

  onSignInClick(): void {
    void this.oidcRedirect.startAuthorization();
  }
}
