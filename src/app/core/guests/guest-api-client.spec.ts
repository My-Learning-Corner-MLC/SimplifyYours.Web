import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { AddGuestError, ListGuestsError } from './guest-error.model';
import { AddGuestRequest } from './add-guest-request.model';
import { GuestApiClient } from './guest-api-client';

describe('GuestApiClient', () => {
  let client: GuestApiClient;
  let httpMock: HttpTestingController;

  const addRequest = (): AddGuestRequest => ({
    eventId: 'e1',
    guestInfo: {
      firstName: 'Ada',
      lastName: 'Tester',
      phoneNumber: '+15551234567',
      emailAddress: 'ada@example.com',
      eventMetadata: {
        relationship: 'Family',
        side: 'Bride',
        plusOnes: 1,
        dietaryNotes: 'Vegan',
      },
    },
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    client = TestBed.inject(GuestApiClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('listGuests', () => {
    it('POSTs a guest query for an event and maps the payload', () => {
      let result: unknown;
      client.listGuests('e1').subscribe((guests) => (result = guests));

      const req = httpMock.expectOne(`${environment.guestBaseUrl}/guests/query`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ eventId: 'e1' });
      req.flush({
        eventId: 'e1',
        items: [
          {
            id: 'g1',
            firstName: 'Ada',
            lastName: 'Tester',
            phoneNumber: '+15551234567',
            emailAddress: 'ada@example.com',
            gender: 'preferNotToSay',
            eventMetadata: {
              relationship: 'Family',
              side: 'Bride',
              plusOnes: 1,
              dietaryNotes: 'Vegan',
            },
            createdAt: '2026-06-02T10:00:00+00:00',
          },
        ],
        pageNumber: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      });

      expect(result).toEqual([
        expect.objectContaining({
          id: 'g1',
          firstName: 'Ada',
          eventMetadata: expect.objectContaining({ side: 'Bride' }),
        }),
      ]);
    });

    it('maps a 404 to a notFound error', () => {
      let error: ListGuestsError | undefined;
      client.listGuests('missing').subscribe({ error: (e: ListGuestsError) => (error = e) });

      httpMock
        .expectOne(`${environment.guestBaseUrl}/guests/query`)
        .flush(null, { status: 404, statusText: 'Not Found' });

      expect(error?.kind).toBe('notFound');
    });

    it('maps a 500 to a server error', () => {
      let error: ListGuestsError | undefined;
      client.listGuests('e1').subscribe({ error: (e: ListGuestsError) => (error = e) });

      httpMock
        .expectOne(`${environment.guestBaseUrl}/guests/query`)
        .flush(null, { status: 500, statusText: 'Server Error' });

      expect(error?.kind).toBe('server');
    });
  });

  describe('addGuest', () => {
    it('POSTs the guest and maps the created response', () => {
      let result: unknown;
      client.addGuest(addRequest()).subscribe((guest) => (result = guest));

      const req = httpMock.expectOne(`${environment.guestBaseUrl}/guest`);
      expect(req.request.method).toBe('POST');
      req.flush({
        id: 'g1',
        eventId: 'e1',
        guestInfo: {
          firstName: 'Ada',
          lastName: 'Tester',
          phoneNumber: '+15551234567',
          emailAddress: 'ada@example.com',
          gender: 'preferNotToSay',
          eventMetadata: {
            relationship: 'Family',
            side: 'Bride',
            plusOnes: 1,
            dietaryNotes: 'Vegan',
          },
        },
        createdAt: '2026-06-02T10:00:00+00:00',
      });

      expect(result).toEqual(
        expect.objectContaining({
          id: 'g1',
          firstName: 'Ada',
          eventMetadata: expect.objectContaining({ plusOnes: 1 }),
        }),
      );
    });

    it('maps a 409 to a duplicate error', () => {
      let error: AddGuestError | undefined;
      client.addGuest(addRequest()).subscribe({ error: (e: AddGuestError) => (error = e) });

      httpMock
        .expectOne(`${environment.guestBaseUrl}/guest`)
        .flush(null, { status: 409, statusText: 'Conflict' });

      expect(error?.kind).toBe('duplicate');
    });

    it('maps a 400 with field errors to a validation error', () => {
      let error: AddGuestError | undefined;
      client.addGuest(addRequest()).subscribe({ error: (e: AddGuestError) => (error = e) });

      httpMock.expectOne(`${environment.guestBaseUrl}/guest`).flush(
        { errors: { EmailAddress: ['Email is required.'] } },
        { status: 400, statusText: 'Bad Request' },
      );

      expect(error?.kind).toBe('validation');
      expect(error?.fieldErrors?.['emailAddress']).toContain('Email is required.');
    });

    it('maps a 500 to a server error', () => {
      let error: AddGuestError | undefined;
      client.addGuest(addRequest()).subscribe({ error: (e: AddGuestError) => (error = e) });

      httpMock
        .expectOne(`${environment.guestBaseUrl}/guest`)
        .flush(null, { status: 500, statusText: 'Server Error' });

      expect(error?.kind).toBe('server');
    });
  });
});
