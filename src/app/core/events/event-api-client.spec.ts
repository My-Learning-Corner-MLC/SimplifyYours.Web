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

describe('EventApiClient', () => {
  let client: EventApiClient;
  let httpMock: HttpTestingController;
  const url = `${environment.eventBaseUrl}/events`;

  const validRequest = (): CreateEventRequest => ({
    eventName: 'Mateo turns five',
    eventTime: '2026-08-17T14:00:00Z',
    eventStartTime: '2026-08-17T14:00:00Z',
    eventEndTime: '2026-08-17T18:00:00Z',
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
    eventTime: '2026-08-17T14:00:00+00:00',
    eventStartTime: '2026-08-17T14:00:00+00:00',
    eventEndTime: '2026-08-17T18:00:00+00:00',
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
});
