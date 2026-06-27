import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthSessionService } from '../../core/auth/auth-session.service';

interface NavLink {
  label: string;
  path: string;
}

@Component({
  standalone: true,
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteHeader {
  private readonly auth = inject(AuthSessionService);
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly hamburgerRef = viewChild<ElementRef<HTMLButtonElement>>('hamburger');

  readonly signInUrl = 'https://identity.simplifyyours.com';

  readonly navLinks: NavLink[] = [
    { label: 'How it works', path: '/how-it-works' },
    { label: 'Themes', path: '/themes' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'Stories', path: '/stories' },
  ];

  readonly signedInNavLinks: NavLink[] = [
    { label: 'My occasions', path: '/my-occasions' },
    { label: 'Guests', path: '/guests' },
    { label: 'Themes', path: '/themes' },
    { label: 'Vendors', path: '/vendors' },
  ];

  readonly isSignedIn = computed(() => this.auth.session() !== null);
  readonly menuOpen = signal(false);

  readonly currentNavLinks = computed<NavLink[]>(() =>
    this.isSignedIn() ? this.signedInNavLinks : this.navLinks,
  );

  readonly firstName = computed(() => {
    const session = this.auth.session();
    if (!session) {
      return '';
    }
    const [first] = session.fullName.trim().split(/\s+/);
    return first ?? '';
  });

  readonly initial = computed(() => {
    const first = this.firstName();
    return first ? first.charAt(0).toUpperCase() : '';
  });

  readonly hasUnreadNotifications = computed(() => this.auth.session()?.hasUnreadNotifications ?? false);

  constructor() {
    effect((onCleanup) => {
      if (!this.menuOpen()) {
        return;
      }
      const onDocClick = (event: MouseEvent) => this.handleDocumentClick(event);
      const onDocKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          this.handleEscape();
        }
      };
      document.addEventListener('click', onDocClick);
      document.addEventListener('keydown', onDocKey);
      onCleanup(() => {
        document.removeEventListener('click', onDocClick);
        document.removeEventListener('keydown', onDocKey);
      });
    });
  }

  toggleMenu(): void {
    const next = !this.menuOpen();
    this.menuOpen.set(next);
    if (next) {
      this.focusFirstMenuLink();
    }
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  private focusFirstMenuLink(): void {
    queueMicrotask(() => {
      const firstLink = this.hostRef.nativeElement.querySelector<HTMLElement>('.site-header__menu-link');
      firstLink?.focus();
    });
  }

  handleDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (target && !this.hostRef.nativeElement.contains(target)) {
      this.closeMenu();
    }
  }

  handleEscape(): void {
    this.closeMenu();
    this.hamburgerRef()?.nativeElement.focus();
  }
}
