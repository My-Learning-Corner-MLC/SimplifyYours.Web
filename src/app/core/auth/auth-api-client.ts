import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { SignUpError } from './sign-up-error.model';
import { SignUpRequest } from './sign-up-request.model';
import { SignUpResponse } from './sign-up-response.model';

const GENERIC_PAGE_ERROR =
  'Something went wrong on our end. Please try again in a moment.';

@Injectable({ providedIn: 'root' })
export class AuthApiClient {
  private readonly http = inject(HttpClient);

  signUp(request: SignUpRequest): Observable<SignUpResponse> {
    const url = `${environment.identityBaseUrl}/auth/sign-up`;
    return this.http
      .post<SignUpResponse>(url, request, { withCredentials: false })
      .pipe(
        catchError((response: HttpErrorResponse) =>
          throwError(() => this.toSignUpError(response)),
        ),
      );
  }

  private toSignUpError(response: HttpErrorResponse): SignUpError {
    if (response.status === 400 && response.error && typeof response.error === 'object') {
      const fieldErrors = this.extractFieldErrors(response.error);
      if (Object.keys(fieldErrors).length > 0) {
        return { fieldErrors };
      }
    }
    return { fieldErrors: {}, pageError: GENERIC_PAGE_ERROR };
  }

  private extractFieldErrors(body: unknown): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    const rawErrors = (body as { errors?: unknown }).errors;
    if (!rawErrors || typeof rawErrors !== 'object') {
      return result;
    }
    for (const [key, value] of Object.entries(rawErrors as Record<string, unknown>)) {
      if (!Array.isArray(value)) {
        continue;
      }
      const messages = value.filter((m): m is string => typeof m === 'string');
      if (messages.length === 0) {
        continue;
      }
      const controlName = key.charAt(0).toLowerCase() + key.slice(1);
      result[controlName] = messages;
    }
    return result;
  }
}
