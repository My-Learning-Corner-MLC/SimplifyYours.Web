import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SiteHeader } from './site-header';

describe('SiteHeader', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteHeader],
      providers: [provideRouter([])],
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
});
