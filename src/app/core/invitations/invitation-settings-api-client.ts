import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { InvitationError } from './invitation.model';
import {
  InvitationSettings,
  PreviewToken,
  PublicLinkStatus,
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

  saveSettings(eventId: string, request: SaveInvitationSettingsRequest): Observable<InvitationSettings> {
    return this.http
      .put<InvitationSettings>(this.url(eventId), request)
      .pipe(catchError((error: unknown) => throwError(() => toError(error))));
  }

  /**
   * Enables or disables the event's public invitation link.
   *
   * There is deliberately no `GET` for public-link status — `invitation-gallery-b7` only exposes
   * this `PUT` and a `POST .../public-link/revoke`. A caller that only wants to know the current
   * state (not change it) cannot do so without either mutating it or holding onto the value from
   * the last time it was set in this session — see `InvitationSelectionService`.
   */
  setPublicLink(eventId: string, enabled: boolean): Observable<PublicLinkStatus> {
    return this.http
      .put<PublicLinkStatus>(`${this.url(eventId)}/public-link`, { enabled })
      .pipe(catchError((error: unknown) => throwError(() => toError(error))));
  }

  revokePublicLink(eventId: string): Observable<PublicLinkStatus> {
    return this.http
      .post<PublicLinkStatus>(`${this.url(eventId)}/public-link/revoke`, {})
      .pipe(catchError((error: unknown) => throwError(() => toError(error))));
  }

  /** Issues a short-lived organiser preview token for the live-preview iframe. */
  issuePreviewToken(eventId: string): Observable<PreviewToken> {
    return this.http
      .post<PreviewToken>(`${this.url(eventId)}/preview-token`, {})
      .pipe(catchError((error: unknown) => throwError(() => toError(error))));
  }

  private url(eventId: string): string {
    return `${environment.apiBaseUrl}/api/v1/invitations/events/${encodeURIComponent(eventId)}`;
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
