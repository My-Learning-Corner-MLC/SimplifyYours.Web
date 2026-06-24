import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SignUpPage } from './sign-up-page';

describe('SignUpPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignUpPage],
    }).compileComponents();
  });

  function create(): ComponentFixture<SignUpPage> {
    const fixture = TestBed.createComponent(SignUpPage);
    fixture.detectChanges();
    return fixture;
  }

  function el<T extends HTMLElement>(fixture: ComponentFixture<SignUpPage>, sel: string): T | null {
    return fixture.nativeElement.querySelector(sel) as T | null;
  }

  function setValue(
    fixture: ComponentFixture<SignUpPage>,
    controlName: string,
    value: string | boolean,
  ): void {
    fixture.componentInstance.form.get(controlName)?.setValue(value);
    fixture.detectChanges();
  }

  function blur(fixture: ComponentFixture<SignUpPage>, controlName: string): void {
    fixture.componentInstance.form.get(controlName)?.markAsTouched();
    fixture.detectChanges();
  }

  describe('scaffold', () => {
    it('creates the component', () => {
      const fixture = TestBed.createComponent(SignUpPage);
      expect(fixture.componentInstance).toBeTruthy();
    });

    it('renders the brand panel and form pane', () => {
      const fixture = create();
      expect(el(fixture, '[data-testid="brand-panel"]')).not.toBeNull();
      expect(el(fixture, '[data-testid="form-pane"]')).not.toBeNull();
    });

    it('shows the CREATE ACCOUNT eyebrow and the form title', () => {
      const fixture = create();
      const eyebrow = el<HTMLElement>(fixture, '.sign-up-page__eyebrow');
      const title = el<HTMLElement>(fixture, '.sign-up-page__title');
      expect(eyebrow?.textContent).toContain('CREATE ACCOUNT');
      expect(title?.textContent).toContain('Create your');
      expect(title?.textContent).toContain('account.');
    });

    it('renders an external sign-in link to identity.simplifyyours.com', () => {
      const fixture = create();
      const link = el<HTMLAnchorElement>(fixture, '[data-testid="sign-in-link"]');
      expect(link?.getAttribute('href')).toBe('https://identity.simplifyyours.com');
    });

    it('renders all five form rows', () => {
      const fixture = create();
      expect(el(fixture, '[data-testid="field-full-name"]')).not.toBeNull();
      expect(el(fixture, '[data-testid="field-email"]')).not.toBeNull();
      expect(el(fixture, '[data-testid="field-password"]')).not.toBeNull();
      expect(el(fixture, '[data-testid="field-confirm-password"]')).not.toBeNull();
      expect(el(fixture, '[data-testid="terms-row"]')).not.toBeNull();
    });

    it('renders the fine print footer', () => {
      const fixture = create();
      const fine = el<HTMLElement>(fixture, '[data-testid="fine-print"]');
      expect(fine?.textContent).toContain('By signing in you agree to our terms and privacy policy.');
    });

    it('does not render social sign-up buttons or a marketing-tips checkbox', () => {
      const fixture = create();
      const text = fixture.nativeElement.textContent ?? '';
      expect(text).not.toContain('Sign up with Google');
      expect(text).not.toContain('Sign up with Apple');
      expect(text).not.toContain('occasional tips');
    });
  });

  describe('form validity', () => {
    it('starts invalid (required fields empty)', () => {
      const fixture = create();
      expect(fixture.componentInstance.form.valid).toBe(false);
    });

    it('becomes valid with all fields completed', () => {
      const fixture = create();
      setValue(fixture, 'fullName', 'Eleanor Whitmore');
      setValue(fixture, 'email', 'eleanor@whitmore.studio');
      setValue(fixture, 'password', 'Abcdef12$');
      setValue(fixture, 'confirmPassword', 'Abcdef12$');
      setValue(fixture, 'acceptTermsAndPrivacy', true);
      expect(fixture.componentInstance.form.valid).toBe(true);
    });

    it('rejects fullName shorter than 2 chars after trim', () => {
      const fixture = create();
      setValue(fixture, 'fullName', '  a  ');
      expect(fixture.componentInstance.form.get('fullName')?.hasError('trimmedMinLength')).toBe(true);
    });

    it('rejects invalid email format', () => {
      const fixture = create();
      setValue(fixture, 'email', 'not-an-email');
      expect(fixture.componentInstance.form.get('email')?.hasError('email')).toBe(true);
    });

    it('rejects password shorter than 8 chars', () => {
      const fixture = create();
      setValue(fixture, 'password', 'short');
      expect(fixture.componentInstance.form.get('password')?.hasError('minlength')).toBe(true);
    });

    it('flags passwordMismatch on the group when confirm differs from password', () => {
      const fixture = create();
      setValue(fixture, 'password', 'Abcdef12$');
      setValue(fixture, 'confirmPassword', 'different');
      expect(fixture.componentInstance.form.hasError('passwordMismatch')).toBe(true);
    });

    it('clears passwordMismatch once confirm matches password', () => {
      const fixture = create();
      setValue(fixture, 'password', 'Abcdef12$');
      setValue(fixture, 'confirmPassword', 'different');
      setValue(fixture, 'confirmPassword', 'Abcdef12$');
      expect(fixture.componentInstance.form.hasError('passwordMismatch')).toBe(false);
    });

    it('re-evaluates mismatch when password changes after confirm is set', () => {
      const fixture = create();
      setValue(fixture, 'password', 'Abcdef12$');
      setValue(fixture, 'confirmPassword', 'Abcdef12$');
      expect(fixture.componentInstance.form.hasError('passwordMismatch')).toBe(false);
      setValue(fixture, 'password', 'Different99!');
      expect(fixture.componentInstance.form.hasError('passwordMismatch')).toBe(true);
    });

    it('requires acceptTermsAndPrivacy to be true', () => {
      const fixture = create();
      setValue(fixture, 'acceptTermsAndPrivacy', false);
      expect(fixture.componentInstance.form.get('acceptTermsAndPrivacy')?.hasError('required')).toBe(true);
    });
  });

  describe('blur-then-show errors', () => {
    it('does not show error before the field is blurred', () => {
      const fixture = create();
      setValue(fixture, 'email', 'not-an-email');
      expect(el(fixture, '[data-testid="error-email"]')).toBeNull();
    });

    it('shows error after the field is touched', () => {
      const fixture = create();
      setValue(fixture, 'email', 'not-an-email');
      blur(fixture, 'email');
      expect(el(fixture, '[data-testid="error-email"]')).not.toBeNull();
    });

    it('clears error live as the user fixes the value', () => {
      const fixture = create();
      setValue(fixture, 'email', 'not-an-email');
      blur(fixture, 'email');
      expect(el(fixture, '[data-testid="error-email"]')).not.toBeNull();
      setValue(fixture, 'email', 'eleanor@whitmore.studio');
      expect(el(fixture, '[data-testid="error-email"]')).toBeNull();
    });
  });

  describe('password show/hide', () => {
    it('starts with password input type "password"', () => {
      const fixture = create();
      const input = el<HTMLInputElement>(fixture, '#sy-password');
      expect(input?.type).toBe('password');
    });

    it('swaps type to text when toggle is clicked', () => {
      const fixture = create();
      const toggle = el<HTMLButtonElement>(fixture, '[data-testid="toggle-password"]')!;
      toggle.click();
      fixture.detectChanges();
      const input = el<HTMLInputElement>(fixture, '#sy-password');
      expect(input?.type).toBe('text');
    });

    it('swaps the confirm-password input type in sync', () => {
      const fixture = create();
      const toggle = el<HTMLButtonElement>(fixture, '[data-testid="toggle-password"]')!;
      toggle.click();
      fixture.detectChanges();
      const input = el<HTMLInputElement>(fixture, '#sy-confirm-password');
      expect(input?.type).toBe('text');
    });
  });

  describe('strength meter', () => {
    it('renders empty caption when password is empty', () => {
      const fixture = create();
      const label = el<HTMLElement>(fixture, '[data-testid="strength-label"]');
      expect(label?.textContent?.trim()).toBe('Weak \u00b7 Okay \u00b7 Strong');
    });

    it('shows "Strong" caption for a strong password', () => {
      const fixture = create();
      setValue(fixture, 'password', 'Abcdefg12$');
      const label = el<HTMLElement>(fixture, '[data-testid="strength-label"]');
      expect(label?.textContent?.trim()).toBe('Strong');
    });

    it('shows "Okay" caption for an okay password', () => {
      const fixture = create();
      setValue(fixture, 'password', 'abcdefG1');
      const label = el<HTMLElement>(fixture, '[data-testid="strength-label"]');
      expect(label?.textContent?.trim()).toBe('Okay');
    });
  });

  describe('submit behavior', () => {
    it('submit button is never disabled', () => {
      const fixture = create();
      const btn = el<HTMLButtonElement>(fixture, '[data-testid="submit-button"]')!;
      expect(btn.hasAttribute('disabled')).toBe(false);
    });

    it('on invalid submit, marks submitted and shows errors for empty required fields', () => {
      const fixture = create();
      const form = el<HTMLFormElement>(fixture, '[data-testid="sign-up-form"]')!;
      form.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
      expect(fixture.componentInstance.submitted()).toBe(true);
      expect(el(fixture, '[data-testid="error-full-name"]')).not.toBeNull();
      expect(el(fixture, '[data-testid="error-email"]')).not.toBeNull();
      expect(el(fixture, '[data-testid="error-password"]')).not.toBeNull();
    });

    it('on invalid submit, moves focus to the first invalid control (fullName)', () => {
      const fixture = create();
      const form = el<HTMLFormElement>(fixture, '[data-testid="sign-up-form"]')!;
      form.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
      expect(document.activeElement?.id).toBe('sy-full-name');
    });
  });
});
