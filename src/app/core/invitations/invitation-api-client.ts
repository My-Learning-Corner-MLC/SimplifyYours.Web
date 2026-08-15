import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Invitation, InvitationError, SubmitRsvpRequest } from './invitation.model';

/**
 * The public invitation endpoints. Anonymous by design — the token in the URL is the only
 * credential, and `bearerTokenInterceptor` deliberately leaves these requests alone.
 */
@Injectable({ providedIn: 'root' })
export class InvitationApiClient {
  private readonly http = inject(HttpClient);

  /** The URL the iframe loads. Not fetched here — the browser requests it directly. */
  renderUrl(token: string): string {
    return `${this.baseUrl(token)}/render`;
  }

  /**
   * The URL the organiser's template-preview iframe loads for a preview token.
   *
   * The render endpoint is anonymous throughout — resolving is by token alone — so this needs no
   * bearer token either, same as {@link renderUrl}. `type` mirrors `ResolveInvitationRenderQuery`'s
   * `type=public|private`, which the preview token requires and every other token type rejects.
   */
  previewRenderUrl(token: string, type: 'public' | 'private'): string {
    return `${this.baseUrl(token)}/render?mode=preview&type=${type}`;
  }

  getInvitation(token: string): Observable<Invitation> {
    return this.http
      .get<Invitation>(this.baseUrl(token), { withCredentials: false })
      .pipe(catchError((error: unknown) => throwError(() => toInvitationError(error))));
  }

  submitRsvp(token: string, request: SubmitRsvpRequest): Observable<Invitation> {
    return this.http
      .post<Invitation>(`${this.baseUrl(token)}/rsvp`, request, { withCredentials: false })
      .pipe(catchError((error: unknown) => throwError(() => toInvitationError(error))));
  }

  private baseUrl(token: string): string {
    // Tokens are base64url, so nothing here needs escaping — but encoding anyway means a
    // malformed token produces a clean 404 rather than a broken URL.
    return `${environment.apiBaseUrl}/api/v1/guests/invitations/${encodeURIComponent(token)}`;
  }
}

function toInvitationError(error: unknown): InvitationError {
  if (!(error instanceof HttpErrorResponse)) {
    return { reason: 'network', fieldErrors: {} };
  }

  switch (error.status) {
    case 404:
      return { reason: 'not-found', fieldErrors: {} };
    case 409:
      // Past the deadline. The page re-reads the invitation so it can show the recorded answer
      // read-only rather than leaving a form the guest can no longer submit.
      return { reason: 'closed', fieldErrors: {} };
    case 400:
      return { reason: 'validation', fieldErrors: readFieldErrors(error) };
    default:
      return { reason: 'network', fieldErrors: {} };
  }
}

/** Reads the RFC 7807 `errors` map the backend returns for validation failures. */
function readFieldErrors(error: HttpErrorResponse): Record<string, readonly string[]> {
  const errors = (error.error as { errors?: unknown } | null)?.errors;

  if (!errors || typeof errors !== 'object') {
    return {};
  }

  const result: Record<string, readonly string[]> = {};

  for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      // Property names arrive PascalCase from FluentValidation; the form keys on camelCase.
      result[key.charAt(0).toLowerCase() + key.slice(1)] = value.map(String);
    }
  }

  return result;
}
