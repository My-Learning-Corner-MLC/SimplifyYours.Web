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
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MenuItem, MessageService, PrimeTemplate } from 'primeng/api';
import { Menu } from 'primeng/menu';
import { Popover } from 'primeng/popover';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { OidcRedirectService } from '../../core/auth/oidc-redirect.service';
import { MOCK_NOTIFICATIONS } from '../../core/notifications/mock-notifications';
import { NotificationItem } from '../../core/notifications/notification-item.model';
import { notificationTint } from '../../core/notifications/notification-display';

interface NavLink {
  label: string;
  path: string;
}

@Component({
  standalone: true,
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive, Menu, Popover, PrimeTemplate],
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteHeader {
  private readonly auth = inject(AuthSessionService);
  private readonly oidcRedirect = inject(OidcRedirectService);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly hamburgerRef = viewChild<ElementRef<HTMLButtonElement>>('hamburger');

  readonly navLinks: NavLink[] = [
    { label: 'Home', path: '/home' },
    { label: 'Blogs', path: '/blogs' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'How it works', path: '/how-it-works' },
    { label: 'About Us', path: '/about-us' },
  ];

  readonly signedInNavLinks: NavLink[] = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Events', path: '/events' },
    { label: 'Tasks', path: '/tasks' },
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

  readonly fullName = computed(() => this.auth.session()?.fullName ?? '');
  readonly email = computed(() => this.auth.session()?.email ?? '');

  readonly hasUnreadNotifications = computed(() => this.auth.session()?.hasUnreadNotifications ?? false);

  readonly notificationsOpen = signal(false);
  // The bell's badge dot clears the moment the popover is opened, not when
  // individual items are read — matches the "BADGE → clears on open, not on
  // read" note in the design.
  private readonly notificationsBadgeDismissed = signal(false);
  readonly showNotificationsBadge = computed(
    () => this.hasUnreadNotifications() && !this.notificationsBadgeDismissed(),
  );

  private readonly notificationItems = signal<readonly NotificationItem[]>(MOCK_NOTIFICATIONS);
  readonly newNotifications = computed(() => this.notificationItems().filter((item) => item.unread));
  readonly earlierNotifications = computed(() => this.notificationItems().filter((item) => !item.unread));

  readonly profileMenuOpen = signal(false);

  readonly profileMenuItems: MenuItem[] = [
    {
      label: 'My Account',
      items: [
        { label: 'Profile', icon: 'pi pi-user', command: () => this.onProfileAction('Profile') },
        { label: 'Billing', icon: 'pi pi-wallet', command: () => this.onProfileAction('Billing') },
        { label: 'Settings', icon: 'pi pi-cog', command: () => this.onProfileAction('Settings') },
      ],
    },
    {
      label: 'Security',
      items: [
        {
          label: 'Change Password',
          icon: 'pi pi-lock',
          command: () => this.onProfileAction('Change Password'),
        },
        {
          label: 'Two-Factor Auth',
          icon: 'pi pi-shield',
          command: () => this.onProfileAction('Two-Factor Auth'),
        },
      ],
    },
    {
      label: 'Tenant',
      items: [
        {
          label: 'Add Members',
          icon: 'pi pi-user-plus',
          command: () => this.onProfileAction('Add Members'),
        },
      ],
    },
    {
      label: 'SimplifyYours',
      items: [
        {
          label: 'Contact Support',
          icon: 'pi pi-question-circle',
          command: () => this.onProfileAction('Contact Support'),
        },
      ],
    },
  ];

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

  onSignInClick(): void {
    this.closeMenu();
    void this.oidcRedirect.startAuthorization();
  }

  onProfileMenuShow(): void {
    this.profileMenuOpen.set(true);
  }

  onProfileMenuHide(): void {
    this.profileMenuOpen.set(false);
  }

  onNotificationsShow(): void {
    this.notificationsOpen.set(true);
    this.notificationsBadgeDismissed.set(true);
  }

  onNotificationsHide(): void {
    this.notificationsOpen.set(false);
  }

  markAllNotificationsRead(): void {
    this.notificationItems.update((items) => items.map((item) => ({ ...item, unread: false })));
  }

  tintFor(item: NotificationItem) {
    return notificationTint(item.category, item.unread);
  }

  private onProfileAction(label: string): void {
    this.messages.add({ severity: 'info', summary: label, detail: 'Coming soon.' });
  }

  onSignOut(): void {
    this.auth.clearSession();
    void this.router.navigateByUrl('/home');
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
