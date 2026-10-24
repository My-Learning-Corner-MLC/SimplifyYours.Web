import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CreateEventError } from './create-event-error.model';
import { CreateEventRequest } from './create-event-request.model';
import { CreateEventResponse } from './create-event-response.model';
import { EventDetail } from './event-detail.model';
import { EventDetailError } from './event-detail-error.model';
import { QueryEventsError } from './query-events-error.model';
import { QueryEventsRequest } from './query-events-request.model';
import { QueryEventsResponse } from './query-events-response.model';

const GENERIC_PAGE_ERROR = 'Something went wrong on our end. Please try again in a moment.';

const EVENT_DETAIL_NOT_FOUND_ERROR =
  "We couldn't find that event. It may have been removed, or the link may be out of date.";

const ALLOWED_FIELD_KEYS = new Set([
  'eventName',
  'eventDate',
  'eventStartTime',
  'eventEndTime',
  'eventType',
  'eventDescription',
  'timeZoneId',
  'location.venueName',
  'location.address',
  'location.notes',
]);

@Injectable({ providedIn: 'root' })
export class EventApiClient {
  private readonly http = inject(HttpClient);

  createEvent(request: CreateEventRequest): Observable<CreateEventResponse> {
    const url = `${environment.apiBaseUrl}/api/v1/events`;
    return this.http
      .post<CreateEventResponse>(url, request, { withCredentials: false })
      .pipe(
        catchError((response: HttpErrorResponse) =>
          throwError(() => this.toCreateEventError(response)),
        ),
      );
  }

  queryEvents(request: QueryEventsRequest): Observable<QueryEventsResponse> {
    const url = `${environment.apiBaseUrl}/api/v1/events/query`;
    return this.http
      .post<QueryEventsResponse>(url, request, { withCredentials: false })
      .pipe(
        catchError(() =>
          throwError((): QueryEventsError => ({ kind: 'server', message: GENERIC_PAGE_ERROR })),
        ),
      );
  }

  getEventDetails(eventId: string): Observable<EventDetail> {
    const url = `${environment.apiBaseUrl}/api/v1/events/${encodeURIComponent(eventId)}`;
    return this.http
      .get<EventDetail>(url, { withCredentials: false })
      .pipe(
        catchError((response: HttpErrorResponse) =>
          throwError(() => this.toEventDetailError(response)),
        ),
      );
  }

  private toEventDetailError(response: HttpErrorResponse): EventDetailError {
    if (response.status === 404) {
      return { kind: 'notFound', message: EVENT_DETAIL_NOT_FOUND_ERROR };
    }
    return { kind: 'server', message: GENERIC_PAGE_ERROR };
  }

  private toCreateEventError(response: HttpErrorResponse): CreateEventError {
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
      const fieldKey = key
        .split('.')
        .map((segment) => segment.charAt(0).toLowerCase() + segment.slice(1))
        .join('.');
      if (!ALLOWED_FIELD_KEYS.has(fieldKey)) {
        continue;
      }
      result[fieldKey] = messages;
    }
    return result;
  }
}
