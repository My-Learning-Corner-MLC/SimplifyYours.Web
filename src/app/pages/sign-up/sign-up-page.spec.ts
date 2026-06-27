import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { SignUpPage } from './sign-up-page';

describe('SignUpPage', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignUpPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function fillValid(fixture: ComponentFixture<SignUpPage>): void {
    fixture.componentInstance.form.patchValue({
      fullName: 'Eleanor Whitmore',
      email: 'eleanor@whitmore.studio',
      password: 'Abcdefg12$',
      confirmPassword: 'Abcdefg12$',
      acceptTermsAndPrivacy: true,
    });
    fixture.detectChanges();
  }

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
      expect(link?.getAttribute('href')).toBe(environment.identityWebUrl);
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

  describe('submit + loading + success', () => {
    it('on valid submit, POSTs the full request body to /auth/sign-up', () => {
      const fixture = create();
      fillValid(fixture);
      el<HTMLFormElement>(fixture, '[data-testid="sign-up-form"]')!.dispatchEvent(
        new Event('submit'),
      );

      const req = httpMock.expectOne((r) => r.url.endsWith('/auth/sign-up'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        fullName: 'Eleanor Whitmore',
        email: 'eleanor@whitmore.studio',
        password: 'Abcdefg12$',
        confirmPassword: 'Abcdefg12$',
        acceptTermsAndPrivacy: true,
      });
      req.flush({
        userId: '00000000-0000-0000-0000-000000000001',
        email: 'eleanor@whitmore.studio',
        fullName: 'Eleanor Whitmore',
        role: 'Organizer',
        status: 'Active',
      });
    });

    it('shows the loading state during the request (aria-busy + spinner copy)', () => {
      const fixture = create();
      fillValid(fixture);
      el<HTMLFormElement>(fixture, '[data-testid="sign-up-form"]')!.dispatchEvent(
        new Event('submit'),
      );
      fixture.detectChanges();

      expect(fixture.componentInstance.submitting()).toBe(true);
      const btn = el<HTMLButtonElement>(fixture, '[data-testid="submit-button"]')!;
      expect(btn.getAttribute('aria-busy')).toBe('true');
      expect(btn.textContent).toContain('Creating your account');
      expect(fixture.componentInstance.form.disabled).toBe(true);

      const req = httpMock.expectOne((r) => r.url.endsWith('/auth/sign-up'));
      req.flush({
        userId: 'x',
        email: 'eleanor@whitmore.studio',
        fullName: 'Eleanor Whitmore',
        role: 'Organizer',
        status: 'Active',
      });
    });

    it('on 201, renders the success state with the first-name interpolation', () => {
      const fixture = create();
      fillValid(fixture);
      el<HTMLFormElement>(fixture, '[data-testid="sign-up-form"]')!.dispatchEvent(
        new Event('submit'),
      );

      const req = httpMock.expectOne((r) => r.url.endsWith('/auth/sign-up'));
      req.flush({
        userId: '1',
        email: 'eleanor@whitmore.studio',
        fullName: 'Eleanor Whitmore',
        role: 'Organizer',
        status: 'Active',
      });
      fixture.detectChanges();

      const headline = el<HTMLElement>(fixture, '[data-testid="success-headline"]');
      expect(headline).not.toBeNull();
      expect(headline?.textContent).toContain('Welcome to SimplifyYours');
      expect(headline?.textContent).toContain('Eleanor');
      expect(el(fixture, '[data-testid="sign-up-form"]')).toBeNull();
    });

    it('success CTA links to the identity sign-in URL', () => {
      const fixture = create();
      fillValid(fixture);
      el<HTMLFormElement>(fixture, '[data-testid="sign-up-form"]')!.dispatchEvent(
        new Event('submit'),
      );
      const req = httpMock.expectOne((r) => r.url.endsWith('/auth/sign-up'));
      req.flush({
        userId: '1',
        email: 'eleanor@whitmore.studio',
        fullName: 'Eleanor Whitmore',
        role: 'Organizer',
        status: 'Active',
      });
      fixture.detectChanges();

      const cta = el<HTMLAnchorElement>(fixture, '[data-testid="success-cta"]');
      expect(cta?.getAttribute('href')).toBe(environment.identityWebUrl);
    });

    it('on error, returns to interactive state with field values preserved', () => {
      const fixture = create();
      fillValid(fixture);
      el<HTMLFormElement>(fixture, '[data-testid="sign-up-form"]')!.dispatchEvent(
        new Event('submit'),
      );

      const req = httpMock.expectOne((r) => r.url.endsWith('/auth/sign-up'));
      req.flush({ errors: { Email: ['already in use'] } }, { status: 400, statusText: 'Bad Request' });
      fixture.detectChanges();

      expect(fixture.componentInstance.submitting()).toBe(false);
      expect(fixture.componentInstance.succeeded()).toBe(false);
      expect(fixture.componentInstance.form.disabled).toBe(false);
      expect(fixture.componentInstance.form.get('email')?.value).toBe('eleanor@whitmore.studio');
    });

    function submitAndFlush400(
      fixture: ComponentFixture<SignUpPage>,
      body: object,
    ): void {
      fillValid(fixture);
      el<HTMLFormElement>(fixture, '[data-testid="sign-up-form"]')!.dispatchEvent(
        new Event('submit'),
      );
      const req = httpMock.expectOne((r) => r.url.endsWith('/auth/sign-up'));
      req.flush(body, { status: 400, statusText: 'Bad Request' });
      fixture.detectChanges();
    }

    it('renders state 3C: single-field 400 sets per-field error', () => {
      const fixture = create();
      submitAndFlush400(fixture, { errors: { Email: ['That email is bad.'] } });

      const err = el<HTMLElement>(fixture, '[data-testid="error-email"]');
      expect(err?.textContent?.trim()).toContain('That email is bad.');
      expect(el(fixture, '[data-testid="multi-error-banner"]')).toBeNull();
    });

    it('renders state 3D: 2+ field errors show the banner with role="alert" and per-field errors', () => {
      const fixture = create();
      submitAndFlush400(fixture, {
        errors: {
          FullName: ['Name looks suspicious.'],
          Email: ['Email looks suspicious.'],
        },
      });

      const banner = el<HTMLElement>(fixture, '[data-testid="multi-error-banner"]');
      expect(banner).not.toBeNull();
      expect(banner?.getAttribute('role')).toBe('alert');
      expect(el(fixture, '[data-testid="error-full-name"]')?.textContent).toContain('Name looks suspicious.');
      expect(el(fixture, '[data-testid="error-email"]')?.textContent).toContain('Email looks suspicious.');
    });

    it('renders the email-taken variant with an italic "Try signing in instead." link', () => {
      const fixture = create();
      submitAndFlush400(fixture, { errors: { Email: ['Email already in use.'] } });

      const err = el<HTMLElement>(fixture, '[data-testid="error-email"]');
      expect(err?.textContent).toContain('This email is already in use.');
      const link = el<HTMLAnchorElement>(fixture, '[data-testid="error-email-signin-link"]');
      expect(link).not.toBeNull();
      expect(link?.getAttribute('href')).toBe(environment.identityWebUrl);
    });

    it('clears a per-field backend error live when the user edits that field', () => {
      const fixture = create();
      submitAndFlush400(fixture, { errors: { Email: ['That email is bad.'] } });
      expect(el(fixture, '[data-testid="error-email"]')).not.toBeNull();

      fixture.componentInstance.form.get('email')?.setValue('eleanor2@whitmore.studio');
      fixture.detectChanges();
      expect(el(fixture, '[data-testid="error-email"]')).toBeNull();
    });

    it('on 500, renders the page-level banner with role="alert"', () => {
      const fixture = create();
      fillValid(fixture);
      el<HTMLFormElement>(fixture, '[data-testid="sign-up-form"]')!.dispatchEvent(
        new Event('submit'),
      );
      const req = httpMock.expectOne((r) => r.url.endsWith('/auth/sign-up'));
      req.flush({ traceId: 'abc' }, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      const banner = el<HTMLElement>(fixture, '[data-testid="page-error-banner"]');
      expect(banner).not.toBeNull();
      expect(banner?.getAttribute('role')).toBe('alert');
      expect(banner?.textContent).toContain('Something went wrong on our end');
      expect(banner?.textContent).not.toContain('traceId');
    });

    it('on network error, renders the same page-level banner', () => {
      const fixture = create();
      fillValid(fixture);
      el<HTMLFormElement>(fixture, '[data-testid="sign-up-form"]')!.dispatchEvent(
        new Event('submit'),
      );
      const req = httpMock.expectOne((r) => r.url.endsWith('/auth/sign-up'));
      req.error(new ProgressEvent('error'), { status: 0, statusText: 'Network error' });
      fixture.detectChanges();

      expect(el(fixture, '[data-testid="page-error-banner"]')).not.toBeNull();
    });

    it('preserves field values after a 5xx failure', () => {
      const fixture = create();
      fillValid(fixture);
      el<HTMLFormElement>(fixture, '[data-testid="sign-up-form"]')!.dispatchEvent(
        new Event('submit'),
      );
      const req = httpMock.expectOne((r) => r.url.endsWith('/auth/sign-up'));
      req.flush({}, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(fixture.componentInstance.form.get('email')?.value).toBe('eleanor@whitmore.studio');
      expect(fixture.componentInstance.form.get('fullName')?.value).toBe('Eleanor Whitmore');
    });

    it('clears the page-level banner on a fresh submit', () => {
      const fixture = create();
      fillValid(fixture);
      el<HTMLFormElement>(fixture, '[data-testid="sign-up-form"]')!.dispatchEvent(
        new Event('submit'),
      );
      httpMock.expectOne((r) => r.url.endsWith('/auth/sign-up')).flush(
        {},
        { status: 500, statusText: 'Server Error' },
      );
      fixture.detectChanges();
      expect(el(fixture, '[data-testid="page-error-banner"]')).not.toBeNull();

      el<HTMLFormElement>(fixture, '[data-testid="sign-up-form"]')!.dispatchEvent(
        new Event('submit'),
      );
      fixture.detectChanges();
      expect(fixture.componentInstance.pageError()).toBeNull();

      httpMock.expectOne((r) => r.url.endsWith('/auth/sign-up')).flush({
        userId: '1',
        email: 'eleanor@whitmore.studio',
        fullName: 'Eleanor Whitmore',
        role: 'Organizer',
        status: 'Active',
      });
    });

    it('clears previous backend errors on a fresh submit', () => {
      const fixture = create();
      submitAndFlush400(fixture, { errors: { Email: ['Old error.'] } });
      expect(el(fixture, '[data-testid="error-email"]')).not.toBeNull();

      el<HTMLFormElement>(fixture, '[data-testid="sign-up-form"]')!.dispatchEvent(
        new Event('submit'),
      );
      fixture.detectChanges();
      expect(fixture.componentInstance.backendErrorCount()).toBe(0);

      const req = httpMock.expectOne((r) => r.url.endsWith('/auth/sign-up'));
      req.flush({
        userId: '1',
        email: 'eleanor@whitmore.studio',
        fullName: 'Eleanor Whitmore',
        role: 'Organizer',
        status: 'Active',
      });
    });

    it('focuses the multi-error banner when 2+ field errors come back', () => {
      const fixture = create();
      fillValid(fixture);
      el<HTMLFormElement>(fixture, '[data-testid="sign-up-form"]')!.dispatchEvent(
        new Event('submit'),
      );
      const req = httpMock.expectOne((r) => r.url.endsWith('/auth/sign-up'));
      req.flush(
        {
          errors: {
            FullName: ['Name looks suspicious.'],
            Email: ['Email looks suspicious.'],
          },
        },
        { status: 400, statusText: 'Bad Request' },
      );
      fixture.detectChanges();
      fixture.detectChanges();

      expect(document.activeElement).toBe(
        el<HTMLElement>(fixture, '[data-testid="multi-error-banner"]'),
      );
    });

    it('focuses the page-error banner on a 5xx', () => {
      const fixture = create();
      fillValid(fixture);
      el<HTMLFormElement>(fixture, '[data-testid="sign-up-form"]')!.dispatchEvent(
        new Event('submit'),
      );
      httpMock
        .expectOne((r) => r.url.endsWith('/auth/sign-up'))
        .flush({}, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();
      fixture.detectChanges();

      expect(document.activeElement).toBe(
        el<HTMLElement>(fixture, '[data-testid="page-error-banner"]'),
      );
    });

    it('sets aria-describedby on the email input when a backend error is showing', () => {
      const fixture = create();
      fillValid(fixture);
      el<HTMLFormElement>(fixture, '[data-testid="sign-up-form"]')!.dispatchEvent(
        new Event('submit'),
      );
      httpMock
        .expectOne((r) => r.url.endsWith('/auth/sign-up'))
        .flush({ errors: { Email: ['Bad.'] } }, { status: 400, statusText: 'Bad Request' });
      fixture.detectChanges();

      const input = el<HTMLInputElement>(fixture, '#sy-email');
      expect(input?.getAttribute('aria-describedby')).toBe('sy-email-error');
      expect(input?.getAttribute('aria-invalid')).toBe('true');
    });

    it('marks the form region with aria-live="polite"', () => {
      const fixture = create();
      const form = el<HTMLFormElement>(fixture, '[data-testid="sign-up-form"]');
      expect(form?.getAttribute('aria-live')).toBe('polite');
    });

    it('does not log password or email to the console on submit', () => {
      const fixture = create();
      const logSpy = vi.spyOn(console, 'log');
      const errorSpy = vi.spyOn(console, 'error');
      const warnSpy = vi.spyOn(console, 'warn');
      fillValid(fixture);
      el<HTMLFormElement>(fixture, '[data-testid="sign-up-form"]')!.dispatchEvent(
        new Event('submit'),
      );
      const req = httpMock.expectOne((r) => r.url.endsWith('/auth/sign-up'));
      req.flush({
        userId: '1',
        email: 'eleanor@whitmore.studio',
        fullName: 'Eleanor Whitmore',
        role: 'Organizer',
        status: 'Active',
      });

      const allCalls = [...logSpy.mock.calls, ...errorSpy.mock.calls, ...warnSpy.mock.calls];
      const flat = allCalls.flat().map((a) => (typeof a === 'string' ? a : JSON.stringify(a)));
      expect(flat.some((m) => m.includes('Abcdefg12$'))).toBe(false);
      expect(flat.some((m) => m.includes('eleanor@whitmore.studio'))).toBe(false);
    });
  });
});
