import { Signal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { UserSession } from '../../core/auth/user-session.model';
import { SiteHeader } from './site-header';

class FakeAuthSessionService {
  readonly session: Signal<UserSession | null>;
  constructor(initial: UserSession | null) {
    this.session = signal(initial);
  }
}

async function setup(session: UserSession | null = null) {
  await TestBed.configureTestingModule({
    imports: [SiteHeader],
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      { provide: AuthSessionService, useValue: new FakeAuthSessionService(session) },
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

    it('should render the four primary nav links', async () => {
      const fixture = await setup();
      const links = fixture.nativeElement.querySelectorAll('.site-header__nav-link');
      expect(links.length).toBe(4);
      const labels = Array.from(links).map((el) => (el as HTMLElement).textContent?.trim());
      expect(labels).toEqual(['How it works', 'Themes', 'Pricing', 'Stories']);
    });

    it('should link sign-in to the external identity server and sign-up to /signup', async () => {
      const fixture = await setup();
      const signIn = fixture.nativeElement.querySelector('.site-header__sign-in') as HTMLAnchorElement | null;
      const signUp = fixture.nativeElement.querySelector('.site-header__sign-up') as HTMLAnchorElement | null;
      expect(signIn?.getAttribute('href')).toBe('https://identity.simplifyyours.com');
      expect(signUp?.getAttribute('href')).toBe('/signup');
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

    it('should render menu sign-in as an external link and menu CTA as routerLink to /signup', async () => {
      const fixture = await setup();
      const menuSignIn = fixture.nativeElement.querySelector('.site-header__menu-sign-in') as HTMLAnchorElement | null;
      const menuCta = fixture.nativeElement.querySelector('.site-header__menu-cta') as HTMLAnchorElement | null;
      expect(menuSignIn?.getAttribute('href')).toBe('https://identity.simplifyyours.com');
      expect(menuSignIn?.getAttribute('rel')).toBe('noopener');
      expect(menuCta?.getAttribute('href')).toBe('/signup');
    });

    it('should render four mobile menu nav links in the design order', async () => {
      const fixture = await setup();
      const links = fixture.nativeElement.querySelectorAll('.site-header__menu-link');
      expect(links.length).toBe(4);
      const labels = Array.from(links).map((el) => (el as HTMLElement).textContent?.trim());
      expect(labels).toEqual(['How it works', 'Themes', 'Pricing', 'Stories']);
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

    it('should close the menu when the menu sign-in link is clicked', async () => {
      const fixture = await setup();
      fixture.componentInstance.toggleMenu();
      fixture.detectChanges();

      const menuSignIn = fixture.nativeElement.querySelector('.site-header__menu-sign-in') as HTMLAnchorElement;
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
  });

  describe('signed-in', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
    });

    it('should render the four signed-in nav links in design order with My occasions active', async () => {
      const fixture = await setup({ fullName: 'Eleanor Rigby', hasUnreadNotifications: true });
      const links = fixture.nativeElement.querySelectorAll('.site-header__nav-link');
      expect(links.length).toBe(4);
      const labels = Array.from(links).map((el) => (el as HTMLElement).textContent?.trim());
      expect(labels).toEqual(['My occasions', 'Guests', 'Themes', 'Vendors']);
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

    it('should render the unread notification dot when hasUnreadNotifications is true', async () => {
      const fixture = await setup({ fullName: 'Eleanor Rigby', hasUnreadNotifications: true });
      const dot = fixture.nativeElement.querySelector('.site-header__notif-dot');
      expect(dot).not.toBeNull();
    });

    it('should not render the unread notification dot when hasUnreadNotifications is false', async () => {
      const fixture = await setup({ fullName: 'Eleanor Rigby', hasUnreadNotifications: false });
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
      expect(labels).toEqual(['My occasions', 'Guests', 'Themes', 'Vendors']);

      expect(fixture.nativeElement.querySelector('.site-header__menu-sign-in')).toBeNull();
      expect(fixture.nativeElement.querySelector('.site-header__menu-cta')).toBeNull();
    });
  });
});
