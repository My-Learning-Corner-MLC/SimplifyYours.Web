import { Component, ElementRef, HostListener, computed, inject, signal, viewChild } from '@angular/core';
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
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly hamburgerRef = viewChild<ElementRef<HTMLButtonElement>>('hamburger');

  readonly signInUrl = 'https://identity.simplifyyours.com';
  readonly navLinks = [
    { label: 'How it works', path: '/how-it-works' },
    { label: 'Themes', path: '/themes' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'Stories', path: '/stories' },
  ];

  readonly isSignedIn = computed(() => this.auth.session() !== null);
  readonly menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent): void {
    if (!this.menuOpen()) {
      return;
    }
    const target = event.target as Node | null;
    if (target && !this.hostRef.nativeElement.contains(target)) {
      this.closeMenu();
    }
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (!this.menuOpen()) {
      return;
    }
    this.closeMenu();
    this.hamburgerRef()?.nativeElement.focus();
  }
}
