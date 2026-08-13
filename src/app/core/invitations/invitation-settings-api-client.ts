import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { InvitationError } from './invitation.model';
import { InvitationSettings, SaveInvitationSettingsRequest } from './invitation-settings.model';

/**
 * The organiser's side of the invitation: which template, and the content that fills it.
 * Authenticated — unlike the guest-facing endpoints, these carry the bearer token.
 */
@Injectable({ providedIn: 'root' })
export class InvitationSettingsApiClient {
  private readonly http = inject(HttpClient);

  getSettings(eventId: string): Observable<InvitationSettings> {
    return this.http
      .get<InvitationSettings>(this.url(eventId))
      .pipe(catchError((error: unknown) => throwError(() => toError(error))));
  }

  saveSettings(eventId: string, request: SaveInvitationSettingsRequest): Observable<InvitationSettings> {
    return this.http
      .put<InvitationSettings>(this.url(eventId), request)
      .pipe(catchError((error: unknown) => throwError(() => toError(error))));
  }

  private url(eventId: string): string {
    return `${environment.apiBaseUrl}/api/v1/events/${encodeURIComponent(eventId)}/invitation-settings`;
  }
}

function toError(error: unknown): InvitationError {
  if (!(error instanceof HttpErrorResponse)) {
    return { reason: 'network', fieldErrors: {} };
  }

  if (error.status === 404) {
    return { reason: 'not-found', fieldErrors: {} };
  }

  if (error.status === 400) {
    return { reason: 'validation', fieldErrors: readFieldErrors(error) };
  }

  return { reason: 'network', fieldErrors: {} };
}

/** Reads the RFC 7807 `errors` map so the form can show messages against the right inputs. */
function readFieldErrors(error: HttpErrorResponse): Record<string, readonly string[]> {
  const errors = (error.error as { errors?: unknown } | null)?.errors;

  if (!errors || typeof errors !== 'object') {
    return {};
  }

  const result: Record<string, readonly string[]> = {};

  for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      // FluentValidation reports PascalCase property names for command-level failures; field-level
      // ones already arrive as the camelCase merge-token key. Lowercasing the first character
      // normalises both onto the keys the form uses.
      result[key.charAt(0).toLowerCase() + key.slice(1)] = value.map(String);
    }
  }

  return result;
}
