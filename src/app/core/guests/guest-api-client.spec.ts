import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { GuestApiClient } from './guest-api-client';
import { Guest } from './guest.model';

describe('GuestApiClient', () => {
  let client: GuestApiClient;
  let httpMock: HttpTestingController;
  const base = environment.guestManagementBaseUrl;
  const eventId = 'e1';

  const guest = (): Guest => ({
    id: 'g1',
    firstName: 'Amara',
    lastName: 'Okoye',
    phoneNumber: '+1 555 0100',
    emailAddress: 'amara@example.com',
    gender: 'Female',
    relationship: 'Friend',
    side: 'Bride',
    plusOnes: 1,
    dietaryNotes: null,
    createdAt: '2026-07-01T10:00:00+00:00',
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    client = TestBed.inject(GuestApiClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists guests for an event', () => {
    let result: Guest[] | undefined;
    client.listGuests(eventId).subscribe((guests) => (result = guests));

    const req = httpMock.expectOne(`${base}/guests?eventId=${eventId}`);
    expect(req.request.method).toBe('GET');
    req.flush({ eventId, guests: [guest()] });

    expect(result).toEqual([guest()]);
  });

  it('maps a 404 to a notFound error', () => {
    let error: { kind: string } | undefined;
    client.listGuests(eventId).subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${base}/guests?eventId=${eventId}`).flush(null, { status: 404, statusText: 'Not Found' });

    expect(error?.kind).toBe('notFound');
  });

  it('maps a 401 to an unauthorized error', () => {
    let error: { kind: string } | undefined;
    client.listGuests(eventId).subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${base}/guests?eventId=${eventId}`).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(error?.kind).toBe('unauthorized');
  });
});
