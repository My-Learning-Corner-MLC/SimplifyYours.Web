import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SiteHeader } from './site-header';

describe('SiteHeader', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteHeader],
      providers: [provideRouter([{ path: '**', children: [] }])],
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(SiteHeader);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the SimplifyYours wordmark', async () => {
    const fixture = TestBed.createComponent(SiteHeader);
    fixture.detectChanges();
    await fixture.whenStable();
    const wordmark = fixture.nativeElement.querySelector('.site-header__brand-wordmark') as HTMLElement | null;
    expect(wordmark).not.toBeNull();
    expect(wordmark?.textContent).toContain('Simplify');
    expect(wordmark?.textContent).toContain('Yours');
  });

  it('should render the four primary nav links', async () => {
    const fixture = TestBed.createComponent(SiteHeader);
    fixture.detectChanges();
    await fixture.whenStable();
    const links = fixture.nativeElement.querySelectorAll('.site-header__nav-link');
    expect(links.length).toBe(4);
    const labels = Array.from(links).map((el) => (el as HTMLElement).textContent?.trim());
    expect(labels).toEqual(['How it works', 'Themes', 'Pricing', 'Stories']);
  });

  it('should link sign-in to the external identity server and sign-up to /signup', async () => {
    const fixture = TestBed.createComponent(SiteHeader);
    fixture.detectChanges();
    await fixture.whenStable();
    const signIn = fixture.nativeElement.querySelector('.site-header__sign-in') as HTMLAnchorElement | null;
    const signUp = fixture.nativeElement.querySelector('.site-header__sign-up') as HTMLAnchorElement | null;
    expect(signIn?.getAttribute('href')).toBe('https://identity.simplifyyours.com');
    expect(signUp?.getAttribute('href')).toBe('/signup');
  });

  it('should render the mobile hamburger button with correct aria attributes', async () => {
    const fixture = TestBed.createComponent(SiteHeader);
    fixture.detectChanges();
    await fixture.whenStable();
    const hamburger = fixture.nativeElement.querySelector('.site-header__hamburger') as HTMLButtonElement | null;
    expect(hamburger).not.toBeNull();
    expect(hamburger?.tagName).toBe('BUTTON');
    expect(hamburger?.getAttribute('type')).toBe('button');
    expect(hamburger?.getAttribute('aria-label')).toBe('Open menu');
    expect(hamburger?.getAttribute('aria-expanded')).toBe('false');
    expect(hamburger?.getAttribute('aria-controls')).toBe('site-header-menu');
  });

  it('should render the mobile menu region with id, role, and aria-label', async () => {
    const fixture = TestBed.createComponent(SiteHeader);
    fixture.detectChanges();
    await fixture.whenStable();
    const menu = fixture.nativeElement.querySelector('#site-header-menu') as HTMLElement | null;
    expect(menu).not.toBeNull();
    expect(menu?.getAttribute('role')).toBe('navigation');
    expect(menu?.getAttribute('aria-label')).toBe('Mobile menu');
  });

  it('should toggle menuOpen and aria-expanded when the hamburger is clicked', async () => {
    const fixture = TestBed.createComponent(SiteHeader);
    fixture.detectChanges();
    await fixture.whenStable();
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
    const fixture = TestBed.createComponent(SiteHeader);
    fixture.detectChanges();
    await fixture.whenStable();
    const menu = fixture.nativeElement.querySelector('#site-header-menu') as HTMLElement;
    expect(menu.classList).not.toContain('site-header__menu--open');

    fixture.componentInstance.toggleMenu();
    fixture.detectChanges();
    expect(menu.classList).toContain('site-header__menu--open');
  });

  it('should render menu sign-in as an external link and menu CTA as routerLink to /signup', async () => {
    const fixture = TestBed.createComponent(SiteHeader);
    fixture.detectChanges();
    await fixture.whenStable();
    const menuSignIn = fixture.nativeElement.querySelector('.site-header__menu-sign-in') as HTMLAnchorElement | null;
    const menuCta = fixture.nativeElement.querySelector('.site-header__menu-cta') as HTMLAnchorElement | null;
    expect(menuSignIn?.getAttribute('href')).toBe('https://identity.simplifyyours.com');
    expect(menuSignIn?.getAttribute('rel')).toBe('noopener');
    expect(menuCta?.getAttribute('href')).toBe('/signup');
  });

  it('should render four mobile menu nav links in the design order', async () => {
    const fixture = TestBed.createComponent(SiteHeader);
    fixture.detectChanges();
    await fixture.whenStable();
    const links = fixture.nativeElement.querySelectorAll('.site-header__menu-link');
    expect(links.length).toBe(4);
    const labels = Array.from(links).map((el) => (el as HTMLElement).textContent?.trim());
    expect(labels).toEqual(['How it works', 'Themes', 'Pricing', 'Stories']);
  });

  it('should close the menu when any menu link is clicked', async () => {
    const fixture = TestBed.createComponent(SiteHeader);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.toggleMenu();
    fixture.detectChanges();
    expect(fixture.componentInstance.menuOpen()).toBe(true);

    const firstLink = fixture.nativeElement.querySelector('.site-header__menu-link') as HTMLAnchorElement;
    firstLink.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.menuOpen()).toBe(false);
  });

  it('should close the menu when the menu sign-in link is clicked', async () => {
    const fixture = TestBed.createComponent(SiteHeader);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.toggleMenu();
    fixture.detectChanges();

    const menuSignIn = fixture.nativeElement.querySelector('.site-header__menu-sign-in') as HTMLAnchorElement;
    menuSignIn.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.menuOpen()).toBe(false);
  });

  it('should close the menu when the menu create-an-account CTA is clicked', async () => {
    const fixture = TestBed.createComponent(SiteHeader);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.toggleMenu();
    fixture.detectChanges();

    const menuCta = fixture.nativeElement.querySelector('.site-header__menu-cta') as HTMLAnchorElement;
    menuCta.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.menuOpen()).toBe(false);
  });

  it('should close the menu when a click lands outside the header element', async () => {
    const fixture = TestBed.createComponent(SiteHeader);
    fixture.detectChanges();
    await fixture.whenStable();
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
    const fixture = TestBed.createComponent(SiteHeader);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.toggleMenu();
    fixture.detectChanges();
    expect(fixture.componentInstance.menuOpen()).toBe(true);

    const bar = fixture.nativeElement.querySelector('.site-header__bar') as HTMLElement;
    bar.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.menuOpen()).toBe(true);
  });

  it('should close the menu and refocus the hamburger when Escape is pressed', async () => {
    const fixture = TestBed.createComponent(SiteHeader);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.toggleMenu();
    fixture.detectChanges();
    const hamburger = fixture.nativeElement.querySelector('.site-header__hamburger') as HTMLButtonElement;

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.menuOpen()).toBe(false);
    expect(document.activeElement).toBe(hamburger);
  });

  it('should ignore Escape when the menu is closed', async () => {
    const fixture = TestBed.createComponent(SiteHeader);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.menuOpen()).toBe(false);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.menuOpen()).toBe(false);
  });
});
