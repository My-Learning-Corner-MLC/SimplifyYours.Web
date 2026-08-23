import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { InvitationError } from './invitation.model';
import {
  InvitationSettings,
  PublicTokenStatus,
  SaveInvitationSettingsRequest,
} from './invitation-settings.model';

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

  /**
   * Also carries the public-link enable/disable action via the request's `publicLinkEnabled`
   * field — there is deliberately no separate enable/disable endpoint. Composing content and
   * turning on the link it's shared through are one organiser action, not two.
   */
  saveSettings(eventId: string, request: SaveInvitationSettingsRequest): Observable<InvitationSettings> {
    return this.http
      .put<InvitationSettings>(this.url(eventId), request)
      .pipe(catchError((error: unknown) => throwError(() => toError(error))));
  }

  /**
   * Replaces the public token so the previously shared URL immediately stops resolving, while the
   * link stays enabled at a new URL. Narrower than enable/disable: "give me a fresh link," not
   * "turn it on/off" — the backend rejects this if the link isn't already enabled.
   */
  rotatePublicToken(eventId: string): Observable<PublicTokenStatus> {
    return this.http
      .post<PublicTokenStatus>(`${this.url(eventId)}/public-token`, { action: 'rotate' })
      .pipe(catchError((error: unknown) => throwError(() => toError(error))));
  }

  private url(eventId: string): string {
    return `${environment.apiBaseUrl}/api/v1/invitations/settings/events/${encodeURIComponent(eventId)}`;
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
