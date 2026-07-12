import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { CreateEventError } from './create-event-error.model';
import { CreateEventRequest } from './create-event-request.model';
import { CreateEventResponse } from './create-event-response.model';
import { EventApiClient } from './event-api-client';
import { EventDetail } from './event-detail.model';
import { EventDetailError } from './event-detail-error.model';
import { QueryEventsError } from './query-events-error.model';
import { QueryEventsResponse } from './query-events-response.model';

describe('EventApiClient', () => {
  let client: EventApiClient;
  let httpMock: HttpTestingController;
  const url = `${environment.eventBaseUrl}/events`;

  const validRequest = (): CreateEventRequest => ({
    eventName: 'Mateo turns five',
    eventDate: '2026-08-17',
    eventStartTime: '14:00',
    eventEndTime: '18:00',
    eventType: 'birthday',
    eventDescription: 'Backyard birthday party',
    timeZoneId: 'America/Los_Angeles',
    location: {
      venueName: 'The Backyard',
      address: '414 Maple Street, Brooklyn, NY 11215',
      notes: 'Side gate unlocked from 1:30.',
    },
  });

  const createdResponse = (): CreateEventResponse => ({
    id: 'e1',
    eventName: 'Mateo turns five',
    eventDate: '2026-08-17',
    eventStartTime: '14:00:00',
    eventEndTime: '18:00:00',
    eventType: 'birthday',
    eventDescription: 'Backyard birthday party',
    createdAt: '2026-07-06T10:00:00+00:00',
    updatedAt: '2026-07-06T10:00:00+00:00',
    concurrencyToken: 'token',
    location: {
      venueName: 'The Backyard',
      address: '414 Maple Street, Brooklyn, NY 11215',
      notes: 'Side gate unlocked from 1:30.',
    },
    timeZoneId: 'America/Los_Angeles',
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    client = TestBed.inject(EventApiClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('POSTs the typed request to /events and returns the typed response', () => {
    const body = validRequest();
    let actual: CreateEventResponse | undefined;
    client.createEvent(body).subscribe((r) => (actual = r));

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(createdResponse(), { status: 201, statusText: 'Created' });

    expect(actual).toEqual(createdResponse());
  });

  it('maps a 400 problem+json errors map to camelCase fieldErrors', () => {
    let err: CreateEventError | undefined;
    client.createEvent(validRequest()).subscribe({ error: (e) => (err = e as CreateEventError) });

    httpMock.expectOne(url).flush(
      {
        errors: {
          EventName: ['Event name must contain at least 3 characters.'],
          'Location.Address': ['Address must not exceed 500 characters.'],
          TimeZoneId: ['Time zone must be a valid IANA time zone id.'],
        },
      },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(err).toEqual({
      fieldErrors: {
        eventName: ['Event name must contain at least 3 characters.'],
        'location.address': ['Address must not exceed 500 characters.'],
        timeZoneId: ['Time zone must be a valid IANA time zone id.'],
      },
    });
  });

  it('maps 5xx responses to a generic pageError', () => {
    let err: CreateEventError | undefined;
    client.createEvent(validRequest()).subscribe({ error: (e) => (err = e as CreateEventError) });

    httpMock
      .expectOne(url)
      .flush({ title: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });

    expect(err?.fieldErrors).toEqual({});
    expect(err?.pageError).toMatch(/something went wrong/i);
  });

  it('maps a network failure to a generic pageError', () => {
    let err: CreateEventError | undefined;
    client.createEvent(validRequest()).subscribe({ error: (e) => (err = e as CreateEventError) });

    httpMock.expectOne(url).error(new ProgressEvent('error'));

    expect(err?.fieldErrors).toEqual({});
    expect(err?.pageError).toMatch(/something went wrong/i);
  });

  it('falls back to pageError when 400 body has no usable errors map', () => {
    let err: CreateEventError | undefined;
    client.createEvent(validRequest()).subscribe({ error: (e) => (err = e as CreateEventError) });

    httpMock
      .expectOne(url)
      .flush({ title: 'Bad request' }, { status: 400, statusText: 'Bad Request' });

    expect(err?.fieldErrors).toEqual({});
    expect(err?.pageError).toMatch(/something went wrong/i);
  });

  describe('queryEvents', () => {
    const queryUrl = `${environment.eventBaseUrl}/events/query`;

    const pageResponse = (): QueryEventsResponse => ({
      items: [
        {
          id: 'e1',
          eventName: 'Mateo turns five',
          eventDate: '2026-07-05',
          eventType: 'birthday',
          eventDescription: 'Backyard party',
          createdAt: '2026-06-01T10:00:00+00:00',
          updatedAt: '2026-06-01T10:00:00+00:00',
          location: { venueName: 'The Backyard', address: null, notes: null },
          eventStartTime: '14:00:00',
          eventEndTime: '18:00:00',
        },
      ],
      pageNumber: 1,
      pageSize: 100,
      totalCount: 1,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    });

    it('POSTs the query request to /events/query and returns the typed response', () => {
      const request = { timeFilter: 'all', pageSize: 100 } as const;
      let actual: QueryEventsResponse | undefined;
      client.queryEvents(request).subscribe((r) => (actual = r));

      const req = httpMock.expectOne(queryUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(pageResponse());

      expect(actual).toEqual(pageResponse());
    });

    it('maps a 401 to an unauthorized error', () => {
      let err: QueryEventsError | undefined;
      client.queryEvents({}).subscribe({ error: (e) => (err = e as QueryEventsError) });

      httpMock.expectOne(queryUrl).flush(null, { status: 401, statusText: 'Unauthorized' });

      expect(err?.kind).toBe('unauthorized');
    });

    it('maps a 403 to an unauthorized error', () => {
      let err: QueryEventsError | undefined;
      client.queryEvents({}).subscribe({ error: (e) => (err = e as QueryEventsError) });

      httpMock.expectOne(queryUrl).flush(null, { status: 403, statusText: 'Forbidden' });

      expect(err?.kind).toBe('unauthorized');
    });

    it('maps a 5xx to a generic server error', () => {
      let err: QueryEventsError | undefined;
      client.queryEvents({}).subscribe({ error: (e) => (err = e as QueryEventsError) });

      httpMock
        .expectOne(queryUrl)
        .flush(null, { status: 500, statusText: 'Internal Server Error' });

      if (err?.kind !== 'server') {
        throw new Error('expected a server error');
      }
      expect(err.message).toMatch(/try again/i);
    });

    it('maps a network failure to a generic server error', () => {
      let err: QueryEventsError | undefined;
      client.queryEvents({}).subscribe({ error: (e) => (err = e as QueryEventsError) });

      httpMock.expectOne(queryUrl).error(new ProgressEvent('error'));

      expect(err?.kind).toBe('server');
    });
  });

  describe('getEventDetails', () => {
    const eventId = 'e1';
    const detailUrl = `${environment.eventBaseUrl}/events/${eventId}`;

    const detailResponse = (): EventDetail => ({
      id: eventId,
      eventName: 'Mateo turns five',
      eventDate: '2026-07-05',
      eventType: 'birthday',
      eventDescription: 'Backyard party',
      createdAt: '2026-06-01T10:00:00+00:00',
      updatedAt: '2026-06-01T10:00:00+00:00',
      concurrencyToken: 'token',
      location: { venueName: 'The Backyard', address: '414 Maple Street', notes: null },
      timeZoneId: 'America/Los_Angeles',
      eventStartTime: '14:00:00',
      eventEndTime: '18:00:00',
    });

    it('GETs /events/{id} and returns the typed detail', () => {
      let actual: EventDetail | undefined;
      client.getEventDetails(eventId).subscribe((r) => (actual = r));

      const req = httpMock.expectOne(detailUrl);
      expect(req.request.method).toBe('GET');
      req.flush(detailResponse());

      expect(actual).toEqual(detailResponse());
    });

    it('encodes the event id in the URL', () => {
      client.getEventDetails('a b/c').subscribe();

      const req = httpMock.expectOne(`${environment.eventBaseUrl}/events/a%20b%2Fc`);
      req.flush(detailResponse());
    });

    it('maps a 404 to a notFound error', () => {
      let err: EventDetailError | undefined;
      client.getEventDetails(eventId).subscribe({ error: (e) => (err = e as EventDetailError) });

      httpMock.expectOne(detailUrl).flush(null, { status: 404, statusText: 'Not Found' });

      expect(err?.kind).toBe('notFound');
      expect(err?.message).toMatch(/couldn't find/i);
    });

    it('maps a 401 to an unauthorized error', () => {
      let err: EventDetailError | undefined;
      client.getEventDetails(eventId).subscribe({ error: (e) => (err = e as EventDetailError) });

      httpMock.expectOne(detailUrl).flush(null, { status: 401, statusText: 'Unauthorized' });

      expect(err?.kind).toBe('unauthorized');
    });

    it('maps a 403 to an unauthorized error', () => {
      let err: EventDetailError | undefined;
      client.getEventDetails(eventId).subscribe({ error: (e) => (err = e as EventDetailError) });

      httpMock.expectOne(detailUrl).flush(null, { status: 403, statusText: 'Forbidden' });

      expect(err?.kind).toBe('unauthorized');
    });

    it('maps a 5xx to a generic server error', () => {
      let err: EventDetailError | undefined;
      client.getEventDetails(eventId).subscribe({ error: (e) => (err = e as EventDetailError) });

      httpMock
        .expectOne(detailUrl)
        .flush(null, { status: 500, statusText: 'Internal Server Error' });

      expect(err?.kind).toBe('server');
      expect(err?.message).toMatch(/try again/i);
    });

    it('maps a network failure to a generic server error', () => {
      let err: EventDetailError | undefined;
      client.getEventDetails(eventId).subscribe({ error: (e) => (err = e as EventDetailError) });

      httpMock.expectOne(detailUrl).error(new ProgressEvent('error'));

      expect(err?.kind).toBe('server');
    });
  });
});
