import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthSessionService } from '../../core/auth/auth-session.service';

@Component({
  standalone: true,
  selector: 'app-site-header',
  imports: [RouterLink],
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
})
export class SiteHeader {
  private readonly auth = inject(AuthSessionService);

  readonly signInUrl = 'https://identity.simplifyyours.com';
  readonly navLinks = [
    { label: 'How it works', path: '/how-it-works' },
    { label: 'Themes', path: '/themes' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'Stories', path: '/stories' },
  ];

  readonly isSignedIn = computed(() => this.auth.session() !== null);
}
