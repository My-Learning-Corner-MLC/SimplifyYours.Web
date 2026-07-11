import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Guest } from './guest.model';
import { GuestListError } from './guest-list-error.model';

interface ListGuestsResponse {
  eventId: string;
  guests: Guest[];
}

const GUEST_LIST_NOT_FOUND_ERROR =
  "We couldn't find this event's guest list. It may have been removed.";
const GUEST_LIST_SERVER_ERROR = "We couldn't load the guest list just now. Please try again in a moment.";
const GUEST_LIST_AUTH_ERROR = 'Your session has expired. Please sign in again to see your guests.';

@Injectable({ providedIn: 'root' })
export class GuestApiClient {
  private readonly http = inject(HttpClient);

  listGuests(eventId: string): Observable<Guest[]> {
    const url = `${environment.guestManagementBaseUrl}/guests?eventId=${encodeURIComponent(eventId)}`;
    return this.http.get<ListGuestsResponse>(url, { withCredentials: false }).pipe(
      map((response) => response.guests),
      catchError((response: HttpErrorResponse) => throwError(() => this.toError(response))),
    );
  }

  private toError(response: HttpErrorResponse): GuestListError {
    if (response.status === 404) {
      return { kind: 'notFound', message: GUEST_LIST_NOT_FOUND_ERROR };
    }
    if (response.status === 401 || response.status === 403) {
      return { kind: 'unauthorized', message: GUEST_LIST_AUTH_ERROR };
    }
    return { kind: 'server', message: GUEST_LIST_SERVER_ERROR };
  }
}
