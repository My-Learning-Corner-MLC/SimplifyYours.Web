import { Signal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => queueMicrotask(resolve));
}
import { vi } from 'vitest';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { OidcRedirectService } from '../../core/auth/oidc-redirect.service';
import { UserSession } from '../../core/auth/user-session.model';
import { SiteHeader } from './site-header';

class FakeAuthSessionService {
  readonly session: Signal<UserSession | null>;
  readonly clearSession = vi.fn();
  constructor(initial: UserSession | null) {
    this.session = signal(initial);
  }
}

class FakeOidcRedirectService {
  readonly startAuthorization = vi.fn().mockResolvedValue(undefined);
}

let fakeOidc: FakeOidcRedirectService;

async function setup(partial: Partial<UserSession> | null = null) {
  const session: UserSession | null = partial
    ? {
        userId: partial.userId ?? 'user-1',
        fullName: partial.fullName ?? '',
        email: partial.email ?? 'visitor@example.com',
        hasUnreadNotifications: partial.hasUnreadNotifications ?? false,
      }
    : null;
  fakeOidc = new FakeOidcRedirectService();
  await TestBed.configureTestingModule({
    imports: [SiteHeader],
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      { provide: AuthSessionService, useValue: new FakeAuthSessionService(session) },
      { provide: OidcRedirectService, useValue: fakeOidc },
      MessageService,
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(SiteHeader);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe('SiteHeader', () => {
  describe('visitor (unauthenticated)', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
    });

    it('should create the component', async () => {
      const fixture = await setup();
      expect(fixture.componentInstance).toBeTruthy();
    });

    it('should render the SimplifyYours wordmark', async () => {
      const fixture = await setup();
      const wordmark = fixture.nativeElement.querySelector('.site-header__brand-wordmark') as HTMLElement | null;
      expect(wordmark).not.toBeNull();
      expect(wordmark?.textContent).toContain('Simplify');
      expect(wordmark?.textContent).toContain('Yours');
    });

    it('should render the five primary nav links', async () => {
      const fixture = await setup();
      const links = fixture.nativeElement.querySelectorAll('.site-header__nav-link');
      expect(links.length).toBe(5);
      const labels = Array.from(links).map((el) => (el as HTMLElement).textContent?.trim());
      expect(labels).toEqual(['Home', 'Blogs', 'Pricing', 'How it works', 'About Us']);
    });

    it('should render sign-in as a button that calls OidcRedirectService.startAuthorization, and sign-up as a routerLink to /signup', async () => {
      const fixture = await setup();
      const signIn = fixture.nativeElement.querySelector('.site-header__sign-in') as HTMLButtonElement | null;
      const signUp = fixture.nativeElement.querySelector('.site-header__sign-up') as HTMLAnchorElement | null;
      expect(signIn?.tagName).toBe('BUTTON');
      expect(signIn?.getAttribute('type')).toBe('button');
      expect(signUp?.tagName).toBe('A');
      expect(signUp?.getAttribute('href')).toBe('/signup');

      signIn!.click();
      expect(fakeOidc.startAuthorization).toHaveBeenCalledTimes(1);
    });

    it('should render the mobile hamburger button with correct aria attributes', async () => {
      const fixture = await setup();
      const hamburger = fixture.nativeElement.querySelector('.site-header__hamburger') as HTMLButtonElement | null;
      expect(hamburger).not.toBeNull();
      expect(hamburger?.tagName).toBe('BUTTON');
      expect(hamburger?.getAttribute('type')).toBe('button');
      expect(hamburger?.getAttribute('aria-label')).toBe('Open menu');
      expect(hamburger?.getAttribute('aria-expanded')).toBe('false');
      expect(hamburger?.getAttribute('aria-controls')).toBe('site-header-menu');
    });

    it('should render the mobile menu region with id, role, and aria-label', async () => {
      const fixture = await setup();
      const menu = fixture.nativeElement.querySelector('#site-header-menu') as HTMLElement | null;
      expect(menu).not.toBeNull();
      expect(menu?.getAttribute('role')).toBe('navigation');
      expect(menu?.getAttribute('aria-label')).toBe('Mobile menu');
    });

    it('should toggle menuOpen and aria-expanded when the hamburger is clicked', async () => {
      const fixture = await setup();
      const hamburger = fixture.nativeElement.querySelector('.site-header__hamburger') as HTMLButtonElement;
      expect(fixture.componentInstance.menuOpen()).toBe(false);

      hamburger.click();
      fixture.detectChanges();
      expect(fixture.componentInstance.menuOpen()).toBe(true);
      expect(hamburger.getAttribute('aria-expanded')).toBe('true');
      expect(hamburger.getAttribute('aria-label')).toBe('Close menu');
      expect(hamburger.classList).toContain('site-header__hamburger--open');

      hamburger.click();
      fixture.detectChanges();
      expect(fixture.componentInstance.menuOpen()).toBe(false);
      expect(hamburger.getAttribute('aria-expanded')).toBe('false');
      expect(hamburger.getAttribute('aria-label')).toBe('Open menu');
    });

    it('should add the open class to the menu when menuOpen is true', async () => {
      const fixture = await setup();
      const menu = fixture.nativeElement.querySelector('#site-header-menu') as HTMLElement;
      expect(menu.classList).not.toContain('site-header__menu--open');

      fixture.componentInstance.toggleMenu();
      fixture.detectChanges();
      expect(menu.classList).toContain('site-header__menu--open');
    });

    it('should render menu sign-in as a button that calls OidcRedirectService.startAuthorization, and menu CTA as routerLink to /signup', async () => {
      const fixture = await setup();
      const menuSignIn = fixture.nativeElement.querySelector('.site-header__menu-sign-in') as HTMLButtonElement | null;
      const menuCta = fixture.nativeElement.querySelector('.site-header__menu-cta') as HTMLAnchorElement | null;
      expect(menuSignIn?.tagName).toBe('BUTTON');
      expect(menuSignIn?.getAttribute('type')).toBe('button');
      expect(menuCta?.getAttribute('href')).toBe('/signup');

      menuSignIn!.click();
      expect(fakeOidc.startAuthorization).toHaveBeenCalledTimes(1);
    });

    it('should render five mobile menu nav links in the design order', async () => {
      const fixture = await setup();
      const links = fixture.nativeElement.querySelectorAll('.site-header__menu-link');
      expect(links.length).toBe(5);
      const labels = Array.from(links).map((el) => (el as HTMLElement).textContent?.trim());
      expect(labels).toEqual(['Home', 'Blogs', 'Pricing', 'How it works', 'About Us']);
    });

    it('should close the menu when any menu link is clicked', async () => {
      const fixture = await setup();
      fixture.componentInstance.toggleMenu();
      fixture.detectChanges();
      expect(fixture.componentInstance.menuOpen()).toBe(true);

      const firstLink = fixture.nativeElement.querySelector('.site-header__menu-link') as HTMLAnchorElement;
      firstLink.click();
      fixture.detectChanges();
      expect(fixture.componentInstance.menuOpen()).toBe(false);
    });

    it('should close the menu when the menu sign-in button is clicked', async () => {
      const fixture = await setup();
      fixture.componentInstance.toggleMenu();
      fixture.detectChanges();

      const menuSignIn = fixture.nativeElement.querySelector('.site-header__menu-sign-in') as HTMLButtonElement;
      menuSignIn.click();
      fixture.detectChanges();
      expect(fixture.componentInstance.menuOpen()).toBe(false);
    });

    it('should close the menu when the menu create-an-account CTA is clicked', async () => {
      const fixture = await setup();
      fixture.componentInstance.toggleMenu();
      fixture.detectChanges();

      const menuCta = fixture.nativeElement.querySelector('.site-header__menu-cta') as HTMLAnchorElement;
      menuCta.click();
      fixture.detectChanges();
      expect(fixture.componentInstance.menuOpen()).toBe(false);
    });

    it('should close the menu when a click lands outside the header element', async () => {
      const fixture = await setup();
      fixture.componentInstance.toggleMenu();
      fixture.detectChanges();
      expect(fixture.componentInstance.menuOpen()).toBe(true);

      const outside = document.createElement('div');
      document.body.appendChild(outside);
      outside.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      fixture.detectChanges();
      expect(fixture.componentInstance.menuOpen()).toBe(false);
      outside.remove();
    });

    it('should not close the menu when a click lands inside the header but not on a link', async () => {
      const fixture = await setup();
      fixture.componentInstance.toggleMenu();
      fixture.detectChanges();
      expect(fixture.componentInstance.menuOpen()).toBe(true);

      const bar = fixture.nativeElement.querySelector('.site-header__bar') as HTMLElement;
      bar.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      fixture.detectChanges();
      expect(fixture.componentInstance.menuOpen()).toBe(true);
    });

    it('should close the menu and refocus the hamburger when Escape is pressed', async () => {
      const fixture = await setup();
      fixture.componentInstance.toggleMenu();
      fixture.detectChanges();
      const hamburger = fixture.nativeElement.querySelector('.site-header__hamburger') as HTMLButtonElement;

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();
      expect(fixture.componentInstance.menuOpen()).toBe(false);
      expect(document.activeElement).toBe(hamburger);
    });

    it('should ignore Escape when the menu is closed', async () => {
      const fixture = await setup();
      expect(fixture.componentInstance.menuOpen()).toBe(false);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();
      expect(fixture.componentInstance.menuOpen()).toBe(false);
    });

    it('should move focus to the first menu link when the menu opens', async () => {
      const fixture = await setup();
      const hamburger = fixture.nativeElement.querySelector('.site-header__hamburger') as HTMLButtonElement;
      hamburger.click();
      fixture.detectChanges();
      await flushMicrotasks();
      const firstLink = fixture.nativeElement.querySelector('.site-header__menu-link') as HTMLAnchorElement;
      expect(document.activeElement).toBe(firstLink);
    });

    it('should mark the brand mark, hamburger icon, and sign-up arrow as aria-hidden', async () => {
      const fixture = await setup();
      const brandMark = fixture.nativeElement.querySelector('.site-header__brand-mark') as HTMLElement;
      const hamburgerIcon = fixture.nativeElement.querySelector('.site-header__hamburger-icon') as SVGElement;
      const signUpArrow = fixture.nativeElement.querySelector('.site-header__sign-up-arrow') as HTMLElement;
      expect(brandMark.getAttribute('aria-hidden')).toBe('true');
      expect(hamburgerIcon.getAttribute('aria-hidden')).toBe('true');
      expect(signUpArrow.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('signed-in', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
    });

    it('should render the four signed-in nav links in design order with Dashboard active', async () => {
      const fixture = await setup({ fullName: 'Eleanor Rigby', hasUnreadNotifications: true });
      const router = TestBed.inject(Router);
      await router.navigateByUrl('/dashboard');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const links = fixture.nativeElement.querySelectorAll('.site-header__nav-link');
      expect(links.length).toBe(4);
      const labels = Array.from(links).map((el) => (el as HTMLElement).textContent?.trim());
      expect(labels).toEqual(['Dashboard', 'Events', 'Tasks', 'Vendors']);
      expect((links[0] as HTMLElement).classList).toContain('site-header__nav-link--active');
    });

    it('should replace the visitor CTAs with notification button and avatar pill', async () => {
      const fixture = await setup({ fullName: 'Eleanor Rigby', hasUnreadNotifications: true });
      expect(fixture.nativeElement.querySelector('.site-header__sign-in')).toBeNull();
      expect(fixture.nativeElement.querySelector('.site-header__sign-up')).toBeNull();

      const notif = fixture.nativeElement.querySelector('.site-header__notif') as HTMLButtonElement | null;
      expect(notif).not.toBeNull();
      expect(notif?.getAttribute('aria-label')).toBe('Notifications');
      expect(notif?.tagName).toBe('BUTTON');

      const pill = fixture.nativeElement.querySelector('.site-header__avatar-pill') as HTMLElement | null;
      expect(pill).not.toBeNull();
      const initial = pill?.querySelector('.site-header__avatar-initial') as HTMLElement | null;
      const name = pill?.querySelector('.site-header__avatar-name') as HTMLElement | null;
      expect(initial?.textContent?.trim()).toBe('E');
      expect(name?.textContent?.trim()).toBe('Eleanor');
    });

    it('should render the unread notification dot while there are unread mock notifications', async () => {
      const fixture = await setup({ fullName: 'Eleanor Rigby' });
      const dot = fixture.nativeElement.querySelector('.site-header__notif-dot');
      expect(dot).not.toBeNull();
    });

    it('should not render the unread notification dot once every notification has been read', async () => {
      const fixture = await setup({ fullName: 'Eleanor Rigby' });
      fixture.componentInstance.markAllNotificationsRead();
      fixture.detectChanges();
      const dot = fixture.nativeElement.querySelector('.site-header__notif-dot');
      expect(dot).toBeNull();
    });

    it('should derive the first name from the leading whitespace-split token of fullName', async () => {
      const fixture = await setup({ fullName: '  Mary-Ann Smith  ', hasUnreadNotifications: false });
      const name = fixture.nativeElement.querySelector('.site-header__avatar-name') as HTMLElement;
      const initial = fixture.nativeElement.querySelector('.site-header__avatar-initial') as HTMLElement;
      expect(name.textContent?.trim()).toBe('Mary-Ann');
      expect(initial.textContent?.trim()).toBe('M');
    });

    it('should render only the four signed-in nav links in the mobile menu (no Sign in / Create CTA)', async () => {
      const fixture = await setup({ fullName: 'Eleanor Rigby', hasUnreadNotifications: false });
      fixture.componentInstance.toggleMenu();
      fixture.detectChanges();

      const menuLinks = fixture.nativeElement.querySelectorAll('.site-header__menu-link');
      const labels = Array.from(menuLinks).map((el) => (el as HTMLElement).textContent?.trim());
      expect(labels).toEqual(['Dashboard', 'Events', 'Tasks', 'Vendors']);

      expect(fixture.nativeElement.querySelector('.site-header__menu-sign-in')).toBeNull();
      expect(fixture.nativeElement.querySelector('.site-header__menu-cta')).toBeNull();
    });

    it('should mark the avatar initial, chevron, and notification dot as aria-hidden', async () => {
      const fixture = await setup({ fullName: 'Eleanor Rigby', hasUnreadNotifications: true });
      const initial = fixture.nativeElement.querySelector('.site-header__avatar-initial') as HTMLElement;
      const chevron = fixture.nativeElement.querySelector('.site-header__avatar-chevron') as SVGElement;
      const dot = fixture.nativeElement.querySelector('.site-header__notif-dot') as HTMLElement;
      expect(initial.getAttribute('aria-hidden')).toBe('true');
      expect(chevron.getAttribute('aria-hidden')).toBe('true');
      expect(dot.getAttribute('aria-hidden')).toBe('true');
    });

    it('should render an empty avatar name and initial when fullName is empty', async () => {
      const fixture = await setup({ fullName: '', hasUnreadNotifications: false });
      const name = fixture.nativeElement.querySelector('.site-header__avatar-name') as HTMLElement;
      const initial = fixture.nativeElement.querySelector('.site-header__avatar-initial') as HTMLElement;
      expect(name.textContent?.trim()).toBe('');
      expect(initial.textContent?.trim()).toBe('');
    });

    it('should handle a single-token fullName without crashing', async () => {
      const fixture = await setup({ fullName: 'Madonna', hasUnreadNotifications: false });
      const name = fixture.nativeElement.querySelector('.site-header__avatar-name') as HTMLElement;
      const initial = fixture.nativeElement.querySelector('.site-header__avatar-initial') as HTMLElement;
      expect(name.textContent?.trim()).toBe('Madonna');
      expect(initial.textContent?.trim()).toBe('M');
    });

    describe('profile menu', () => {
      afterEach(() => {
        document.body.querySelectorAll('.p-menu').forEach((el) => el.remove());
      });

      it('should expose aria-haspopup and start with aria-expanded false', async () => {
        const fixture = await setup({ fullName: 'Eleanor Rigby', hasUnreadNotifications: false });
        const pill = fixture.nativeElement.querySelector('.site-header__avatar-pill') as HTMLButtonElement;
        expect(pill.getAttribute('aria-haspopup')).toBe('menu');
        expect(pill.getAttribute('aria-expanded')).toBe('false');
      });

      it('should open the grouped menu with the requested sections and items when the avatar pill is clicked', async () => {
        const fixture = await setup({ fullName: 'Eleanor Rigby', hasUnreadNotifications: false });
        const pill = fixture.nativeElement.querySelector('.site-header__avatar-pill') as HTMLButtonElement;

        pill.click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(pill.getAttribute('aria-expanded')).toBe('true');
        expect(pill.classList).toContain('site-header__avatar-pill--active');

        const groups = Array.from(document.body.querySelectorAll('.p-menu-submenu-label')).map((el) =>
          el.textContent?.trim(),
        );
        expect(groups).toEqual(['My Account', 'Security', 'Tenant', 'SimplifyYours']);

        const items = Array.from(document.body.querySelectorAll('.p-menu-item-label')).map((el) =>
          el.textContent?.trim(),
        );
        expect(items).toEqual([
          'Profile',
          'Billing',
          'Settings',
          'Change Password',
          'Two-Factor Auth',
          'Add Members',
          'Contact Support',
        ]);
      });

      it('should show the full name and email in the identity header', async () => {
        const fixture = await setup({ fullName: 'Eleanor Rigby', email: 'eleanor@example.com' });
        const pill = fixture.nativeElement.querySelector('.site-header__avatar-pill') as HTMLButtonElement;

        pill.click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const name = document.body.querySelector('.site-header__profile-menu-name');
        const email = document.body.querySelector('.site-header__profile-menu-email');
        expect(name?.textContent?.trim()).toBe('Eleanor Rigby');
        expect(email?.textContent?.trim()).toBe('eleanor@example.com');
      });

      it('should clear the active state and aria-expanded when the menu closes', async () => {
        const fixture = await setup({ fullName: 'Eleanor Rigby', hasUnreadNotifications: false });
        const pill = fixture.nativeElement.querySelector('.site-header__avatar-pill') as HTMLButtonElement;

        pill.click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        expect(pill.classList).toContain('site-header__avatar-pill--active');

        pill.click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(pill.getAttribute('aria-expanded')).toBe('false');
        expect(pill.classList).not.toContain('site-header__avatar-pill--active');
      });

      it('should clear the session and redirect to /home when Sign Out is clicked', async () => {
        const fixture = await setup({ fullName: 'Eleanor Rigby', hasUnreadNotifications: false });
        const auth = TestBed.inject(AuthSessionService) as unknown as FakeAuthSessionService;
        const router = TestBed.inject(Router);
        const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
        const pill = fixture.nativeElement.querySelector('.site-header__avatar-pill') as HTMLButtonElement;

        pill.click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const signOut = document.body.querySelector(
          '.site-header__profile-menu-signout-btn',
        ) as HTMLButtonElement;
        signOut.click();

        expect(auth.clearSession).toHaveBeenCalledTimes(1);
        expect(navigateSpy).toHaveBeenCalledWith('/home');
      });

      it('should show a "coming soon" toast when a not-yet-built item like Profile is clicked', async () => {
        const fixture = await setup({ fullName: 'Eleanor Rigby', hasUnreadNotifications: false });
        const messages = TestBed.inject(MessageService);
        const addSpy = vi.spyOn(messages, 'add');
        const pill = fixture.nativeElement.querySelector('.site-header__avatar-pill') as HTMLButtonElement;

        pill.click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const profile = Array.from(document.body.querySelectorAll('.p-menu-item-link')).find((el) =>
          el.textContent?.includes('Profile'),
        ) as HTMLElement;
        profile.click();

        expect(addSpy).toHaveBeenCalledWith({ severity: 'info', summary: 'Profile', detail: 'Coming soon.' });
      });
    });

    describe('notifications', () => {
      afterEach(() => {
        document.body.querySelectorAll('.p-popover').forEach((el) => el.remove());
      });

      it('opens the popover with New/Earlier grouping and clears the badge dot', async () => {
        const fixture = await setup({ fullName: 'Eleanor Rigby', hasUnreadNotifications: true });
        const bell = fixture.nativeElement.querySelector('.site-header__notif') as HTMLButtonElement;
        expect(fixture.nativeElement.querySelector('.site-header__notif-dot')).not.toBeNull();

        bell.click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(bell.getAttribute('aria-expanded')).toBe('true');
        expect(bell.classList).toContain('site-header__notif--active');
        // The badge clears the moment the popover opens, per the design.
        expect(fixture.nativeElement.querySelector('.site-header__notif-dot')).toBeNull();

        const groups = Array.from(document.body.querySelectorAll('.site-header__notification-group-label')).map(
          (el) => el.textContent?.trim(),
        );
        expect(groups).toEqual(['New', 'Earlier']);

        const items = document.body.querySelectorAll('.site-header__notification-item');
        expect(items.length).toBe(4);
        expect(document.body.querySelectorAll('.site-header__notification-unread-dot').length).toBe(2);
        expect(document.body.textContent).toContain('Marcus Cole');
        expect(document.body.textContent).toContain('Priya Nair');
      });

      it('moves every item to Earlier and clears their unread dots when Mark all read is clicked', async () => {
        const fixture = await setup({ fullName: 'Eleanor Rigby', hasUnreadNotifications: false });
        const bell = fixture.nativeElement.querySelector('.site-header__notif') as HTMLButtonElement;

        bell.click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const markAll = document.body.querySelector(
          '.site-header__notification-mark-all',
        ) as HTMLButtonElement;
        markAll.click();
        fixture.detectChanges();

        expect(document.body.querySelector('.site-header__notification-unread-dot')).toBeNull();
        const groups = Array.from(document.body.querySelectorAll('.site-header__notification-group-label')).map(
          (el) => el.textContent?.trim(),
        );
        expect(groups).toEqual(['Earlier']);
        expect(document.body.querySelectorAll('.site-header__notification-item').length).toBe(4);
        // Nothing left to mark, so the action disappears rather than sitting
        // there disabled.
        expect(document.body.querySelector('.site-header__notification-mark-all')).toBeNull();
      });

      it('shows a toast and closes the popover when View all notifications is clicked', async () => {
        const fixture = await setup({ fullName: 'Eleanor Rigby' });
        const messages = TestBed.inject(MessageService);
        const addSpy = vi.spyOn(messages, 'add');
        const bell = fixture.nativeElement.querySelector('.site-header__notif') as HTMLButtonElement;

        bell.click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const viewAll = document.body.querySelector(
          '.site-header__notification-view-all',
        ) as HTMLButtonElement;
        viewAll.click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(addSpy).toHaveBeenCalledWith({
          severity: 'info',
          summary: 'All notifications',
          detail: 'Coming soon.',
        });
        expect(bell.getAttribute('aria-expanded')).toBe('false');
      });

      it('closes when the mobile close button is clicked', async () => {
        const fixture = await setup({ fullName: 'Eleanor Rigby', hasUnreadNotifications: false });
        const bell = fixture.nativeElement.querySelector('.site-header__notif') as HTMLButtonElement;

        bell.click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        expect(bell.getAttribute('aria-expanded')).toBe('true');

        const close = document.body.querySelector(
          '.site-header__notification-close',
        ) as HTMLButtonElement;
        close.click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(bell.getAttribute('aria-expanded')).toBe('false');
      });
    });
  });
});
