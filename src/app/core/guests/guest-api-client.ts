import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AddGuestRequest } from './add-guest-request.model';
import { AddGuestError, ListGuestsError } from './guest-error.model';
import { Guest } from './guest.model';

const LIST_GUESTS_NOT_FOUND_ERROR =
  "We couldn't find that event. It may have been removed, or the link may be out of date.";
const LIST_GUESTS_SERVER_ERROR =
  "We couldn't load the guest list just now. Please try again in a moment.";

const ADD_GUEST_DUPLICATE_ERROR =
  'is already on this list.';
const ADD_GUEST_NOT_FOUND_ERROR =
  "We couldn't find that event. It may have been removed, or the link may be out of date.";
const ADD_GUEST_SERVER_ERROR =
  "Something went wrong on our end. Please try again in a moment.";

interface QueryGuestsResponseBody {
  readonly eventId: string;
  readonly items: readonly Guest[];
}

interface AddGuestResponseBody {
  readonly id: string;
  readonly eventId: string;
  readonly guestInfo: {
    readonly firstName: string;
    readonly lastName: string;
    readonly phoneNumber: string;
    readonly emailAddress: string | null;
    readonly eventMetadata: unknown;
  };
  readonly createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class GuestApiClient {
  private readonly http = inject(HttpClient);

  listGuests(eventId: string): Observable<Guest[]> {
    const url = `${environment.apiBaseUrl}/api/v1/guests/guests/query`;
    return this.http
      .post<QueryGuestsResponseBody>(url, { eventId }, { withCredentials: false })
      .pipe(
        map((body) => [...body.items]),
        catchError((response: HttpErrorResponse) =>
          throwError(() => this.toListGuestsError(response)),
        ),
      );
  }

  addGuest(request: AddGuestRequest): Observable<Guest> {
    const url = `${environment.apiBaseUrl}/api/v1/guests/guest`;
    return this.http
      .post<AddGuestResponseBody>(url, request, { withCredentials: false })
      .pipe(
        map((body) => this.toGuest(body)),
        catchError((response: HttpErrorResponse) =>
          throwError(() => this.toAddGuestError(response)),
        ),
      );
  }

  private toGuest(body: AddGuestResponseBody): Guest {
    return {
      id: body.id,
      firstName: body.guestInfo.firstName,
      lastName: body.guestInfo.lastName,
      emailAddress: body.guestInfo.emailAddress,
      phoneNumber: body.guestInfo.phoneNumber,
      eventMetadata: body.guestInfo.eventMetadata,
      createdAt: body.createdAt,
    };
  }

  private toListGuestsError(response: HttpErrorResponse): ListGuestsError {
    if (response.status === 404) {
      return { kind: 'notFound', message: LIST_GUESTS_NOT_FOUND_ERROR };
    }
    return { kind: 'server', message: LIST_GUESTS_SERVER_ERROR };
  }

  private toAddGuestError(response: HttpErrorResponse): AddGuestError {
    if (response.status === 409) {
      return { kind: 'duplicate', message: ADD_GUEST_DUPLICATE_ERROR };
    }
    if (response.status === 404) {
      return { kind: 'notFound', message: ADD_GUEST_NOT_FOUND_ERROR };
    }
    if (response.status === 400 && response.error && typeof response.error === 'object') {
      const fieldErrors = this.extractFieldErrors(response.error);
      if (Object.keys(fieldErrors).length > 0) {
        return { kind: 'validation', message: ADD_GUEST_SERVER_ERROR, fieldErrors };
      }
    }
    return { kind: 'server', message: ADD_GUEST_SERVER_ERROR };
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
      const fieldKey = key.charAt(0).toLowerCase() + key.slice(1);
      result[fieldKey] = messages;
    }
    return result;
  }
}
