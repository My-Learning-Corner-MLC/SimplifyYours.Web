import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-site-header',
  imports: [RouterLink],
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
})
export class SiteHeader {
  readonly signInUrl = 'https://identity.simplifyyours.com';
  readonly navLinks = [
    { label: 'How it works', path: '/how-it-works' },
    { label: 'Themes', path: '/themes' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'Stories', path: '/stories' },
  ];
}
