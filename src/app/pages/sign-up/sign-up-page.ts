import {
  AfterViewChecked,
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MessageService } from 'primeng/api';
import { environment } from '../../../environments/environment';
import { AuthApiClient } from '../../core/auth/auth-api-client';
import { SignUpError } from '../../core/auth/sign-up-error.model';
import { SignUpResponse } from '../../core/auth/sign-up-response.model';
import { evaluatePasswordStrength, PasswordStrength } from './password-strength';
import { OidcRedirectService } from '../../core/auth/oidc-redirect.service';

const EMAIL_TAKEN_PATTERN = /already\s+(in\s+use|exists)/i;
const PAGE_ERROR_TOAST_SUMMARY = 'Sign-up failed';
const PAGE_ERROR_TOAST_DETAIL = 'Something went wrong on our end. Please try again in a moment.';
const CONTROL_ORDER = [
  'fullName',
  'email',
  'password',
  'confirmPassword',
  'acceptTermsAndPrivacy',
] as const;

function trimmedMinLength(min: number) {
  return (ctl: AbstractControl): ValidationErrors | null => {
    const v = (ctl.value ?? '').toString().trim();
    if (v.length === 0) {
      return null;
    }
    return v.length >= min ? null : { trimmedMinLength: { requiredLength: min } };
  };
}

function matchPasswordsValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value ?? '';
  const confirm = group.get('confirmPassword')?.value ?? '';
  if (!confirm) {
    return null;
  }
  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  selector: 'app-sign-up-page',
  templateUrl: './sign-up-page.html',
  styleUrl: './sign-up-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignUpPage implements AfterViewInit, AfterViewChecked {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messages = inject(MessageService);
  private readonly oidcRedirect = inject(OidcRedirectService);

  readonly identityBaseUrl = environment.identityBaseUrl;

  readonly form: FormGroup = this.fb.group(
    {
      fullName: ['', [Validators.required, trimmedMinLength(2), Validators.maxLength(200)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(320)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(200)]],
      confirmPassword: ['', [Validators.required]],
      acceptTermsAndPrivacy: [false, [Validators.requiredTrue]],
    },
    { validators: matchPasswordsValidator },
  );

  readonly submitted = signal(false);
  readonly submitting = signal(false);
  readonly succeeded = signal(false);
  readonly successFirstName = signal('');
  readonly showPassword = signal(false);
  readonly passwordValue = signal('');
  readonly lockedPaneHeight = signal<number | null>(null);
  readonly passwordStrength = computed<PasswordStrength>(() =>
    evaluatePasswordStrength(this.passwordValue()),
  );
  readonly backendErrors = signal<Record<string, string[]>>({});
  readonly backendErrorCount = computed(() => Object.keys(this.backendErrors()).length);

  @ViewChild('fullNameInput', { static: false })
  private fullNameInput?: ElementRef<HTMLInputElement>;

  @ViewChild('multiErrorBanner', { static: false })
  private multiErrorBanner?: ElementRef<HTMLElement>;

  @ViewChild('formPane', { static: false })
  private formPane?: ElementRef<HTMLElement>;

  private pendingMultiBannerFocus = false;

  constructor() {
    this.form
      .get('password')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value: string) => {
        this.passwordValue.set(value ?? '');
      });
    for (const name of CONTROL_ORDER) {
      this.form
        .get(name)
        ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.clearBackendErrorFor(name));
    }
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.fullNameInput?.nativeElement?.focus());
  }

  ngAfterViewChecked(): void {
    if (!this.pendingMultiBannerFocus) {
      return;
    }
    const target = this.multiErrorBanner?.nativeElement;
    if (target) {
      this.pendingMultiBannerFocus = false;
      target.focus();
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  onSignInClick(): void {
    void this.oidcRedirect.startAuthorization();
  }

  shouldShowError(controlName: string): boolean {
    const ctl = this.form.get(controlName);
    if (!ctl) {
      return false;
    }
    return ctl.invalid && (ctl.touched || this.submitted());
  }

  shouldShowMismatchError(): boolean {
    const confirm = this.form.get('confirmPassword');
    if (!confirm) {
      return false;
    }
    const mismatch = this.form.hasError('passwordMismatch');
    return mismatch && (confirm.touched || this.submitted()) && !!confirm.value;
  }

  onSubmit(): void {
    if (this.submitting() || this.succeeded()) {
      return;
    }
    this.submitted.set(true);
    if (this.form.invalid) {
      this.focusFirstInvalid();
      return;
    }

    this.backendErrors.set({});
    this.submitting.set(true);
    this.form.disable({ emitEvent: false });
    const value = this.form.getRawValue() as {
      fullName: string;
      email: string;
      password: string;
      confirmPassword: string;
      acceptTermsAndPrivacy: boolean;
    };

    this.authApi.signUp(value).subscribe({
      next: (response: SignUpResponse) => {
        this.submitting.set(false);
        const measured = this.formPane?.nativeElement?.offsetHeight ?? 0;
        if (measured > 0) {
          this.lockedPaneHeight.set(measured);
        }
        this.successFirstName.set(this.firstNameFrom(value.fullName, response.fullName));
        this.succeeded.set(true);
      },
      error: (error: SignUpError) => {
        this.submitting.set(false);
        this.form.enable({ emitEvent: false });
        this.applyBackendError(error);
      },
    });
  }

  hasBackendError(controlName: string): boolean {
    return !this.shouldShowError(controlName) && !!this.backendErrors()[controlName]?.length;
  }

  backendErrorMessage(controlName: string): string {
    return this.backendErrors()[controlName]?.[0] ?? '';
  }

  isEmailTakenError(): boolean {
    const msg = this.backendErrors()['email']?.[0];
    return !!msg && EMAIL_TAKEN_PATTERN.test(msg);
  }

  private applyBackendError(error: SignUpError): void {
    if (error.pageError) {
      this.messages.add({
        severity: 'error',
        summary: PAGE_ERROR_TOAST_SUMMARY,
        detail: PAGE_ERROR_TOAST_DETAIL,
      });
      return;
    }
    const fields = error.fieldErrors ?? {};
    this.backendErrors.set({ ...fields });
    if (Object.keys(fields).length >= 2) {
      this.pendingMultiBannerFocus = true;
    } else if (Object.keys(fields).length === 1) {
      this.focusFirstBackendOffender();
    }
  }

  private focusFirstBackendOffender(): void {
    const errors = this.backendErrors();
    for (const name of CONTROL_ORDER) {
      if (errors[name]?.length) {
        queueMicrotask(() => document.getElementById(this.idFor(name))?.focus());
        return;
      }
    }
  }

  private clearBackendErrorFor(controlName: string): void {
    const current = this.backendErrors();
    if (!current[controlName]) {
      return;
    }
    const next = { ...current };
    delete next[controlName];
    this.backendErrors.set(next);
  }

  private firstNameFrom(submittedFullName: string, responseFullName?: string): string {
    const source = (responseFullName ?? submittedFullName ?? '').trim();
    if (!source) {
      return '';
    }
    return source.split(/\s+/)[0];
  }

  private focusFirstInvalid(): void {
    const order = ['fullName', 'email', 'password', 'confirmPassword', 'acceptTermsAndPrivacy'];
    for (const name of order) {
      const ctl = this.form.get(name);
      if (ctl && ctl.invalid) {
        document.getElementById(this.idFor(name))?.focus();
        return;
      }
    }
    if (this.form.hasError('passwordMismatch')) {
      document.getElementById('sy-confirm-password')?.focus();
    }
  }

  private idFor(controlName: string): string {
    const map: Record<string, string> = {
      fullName: 'sy-full-name',
      email: 'sy-email',
      password: 'sy-password',
      confirmPassword: 'sy-confirm-password',
      acceptTermsAndPrivacy: 'sy-terms',
    };
    return map[controlName] ?? '';
  }
}
