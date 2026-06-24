import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { AuthApiClient } from '../../core/auth/auth-api-client';
import { SignUpResponse } from '../../core/auth/sign-up-response.model';
import { evaluatePasswordStrength, PasswordStrength } from './password-strength';

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
})
export class SignUpPage implements AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiClient);

  readonly identityWebUrl = 'https://identity.simplifyyours.com';

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
  readonly passwordStrength = computed<PasswordStrength>(() =>
    evaluatePasswordStrength(this.passwordValue()),
  );

  @ViewChild('fullNameInput', { static: false })
  private fullNameInput?: ElementRef<HTMLInputElement>;

  constructor() {
    this.form.get('password')?.valueChanges.subscribe((value: string) => {
      this.passwordValue.set(value ?? '');
    });
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.fullNameInput?.nativeElement?.focus());
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
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
        this.successFirstName.set(this.firstNameFrom(value.fullName, response.fullName));
        this.succeeded.set(true);
      },
      error: () => {
        this.submitting.set(false);
        this.form.enable({ emitEvent: false });
      },
    });
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
