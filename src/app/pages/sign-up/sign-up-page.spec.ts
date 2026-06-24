import { TestBed } from '@angular/core/testing';
import { SignUpPage } from './sign-up-page';

describe('SignUpPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignUpPage],
    }).compileComponents();
  });

  function render(): HTMLElement {
    const fixture = TestBed.createComponent(SignUpPage);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('creates the component', () => {
    const fixture = TestBed.createComponent(SignUpPage);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the brand panel and form pane', () => {
    const root = render();
    expect(root.querySelector('[data-testid="brand-panel"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="form-pane"]')).not.toBeNull();
  });

  it('shows the CREATE ACCOUNT eyebrow and the form title', () => {
    const root = render();
    const eyebrow = root.querySelector('.sign-up-page__eyebrow') as HTMLElement | null;
    const title = root.querySelector('.sign-up-page__title') as HTMLElement | null;
    expect(eyebrow?.textContent).toContain('CREATE ACCOUNT');
    expect(title?.textContent).toContain('Create your');
    expect(title?.textContent).toContain('account.');
  });

  it('renders an external sign-in link to identity.simplifyyours.com', () => {
    const root = render();
    const link = root.querySelector('[data-testid="sign-in-link"]') as HTMLAnchorElement | null;
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('https://identity.simplifyyours.com');
  });

  it('renders all five form rows (full name, email, password, confirm, terms)', () => {
    const root = render();
    expect(root.querySelector('[data-testid="field-full-name"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="field-email"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="field-password"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="field-confirm-password"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="terms-row"]')).not.toBeNull();
  });

  it('renders the strength meter scaffold and the footer fine print', () => {
    const root = render();
    expect(root.querySelector('[data-testid="strength-meter"]')).not.toBeNull();
    const fine = root.querySelector('[data-testid="fine-print"]') as HTMLElement | null;
    expect(fine?.textContent).toContain('By signing in you agree to our terms and privacy policy.');
  });

  it('renders the reassurance row with three items', () => {
    const root = render();
    const items = root.querySelectorAll('[data-testid="reassurance-row"] li');
    expect(items.length).toBe(3);
  });

  it('does not render social sign-up buttons or a marketing-tips checkbox', () => {
    const root = render();
    const text = root.textContent ?? '';
    expect(text).not.toContain('Sign up with Google');
    expect(text).not.toContain('Sign up with Apple');
    expect(text).not.toContain('occasional tips');
  });
});
