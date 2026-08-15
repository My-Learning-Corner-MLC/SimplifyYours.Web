import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { InvitationApiClient } from './invitation-api-client';
import { InvitationError } from './invitation.model';

const TOKEN = 'gCpCQEPAlKKWznJy_LLbiQ';

/**
 * The public invitation client.
 *
 * Its sibling `invitation-settings-api-client` has had a spec since it was written; this one
 * shipped without. The error mapping below is the entire reason the RSVP form can say anything
 * useful when a submit fails, so an untested regression here shows up as a form that fails
 * silently.
 */
describe('InvitationApiClient', () => {
  let client: InvitationApiClient;
  let httpMock: HttpTestingController;

  const url = `${environment.apiBaseUrl}/api/v1/invitations/${TOKEN}`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), InvitationApiClient],
    });

    client = TestBed.inject(InvitationApiClient);
    httpMock = TestBed.inject(HttpTestingController);
    TestBed.inject(HttpClient);
  });

  afterEach(() => httpMock.verify());

  // ---------- URLs ----------

  it('builds the render URL the iframe loads', () => {
    expect(client.renderUrl(TOKEN)).toBe(`${url}/render`);
  });

  it('encodes a malformed token rather than emitting a broken URL', () => {
    // A token with a slash would otherwise change the path shape and hit a different route.
    expect(client.renderUrl('a/b?c')).toBe(
      `${environment.apiBaseUrl}/api/v1/invitations/a%2Fb%3Fc/render`,
    );
  });

  it('builds the preview render URL with the mode and type query params', () => {
    expect(client.previewRenderUrl(TOKEN, 'private')).toBe(`${url}/render?mode=preview&type=private`);
    expect(client.previewRenderUrl(TOKEN, 'public')).toBe(`${url}/render?mode=preview&type=public`);
  });

  it('never attaches credentials to the anonymous reads', () => {
    client.getInvitation(TOKEN).subscribe();

    const request = httpMock.expectOne(url);

    expect(request.request.withCredentials).toBe(false);
    request.flush({});
  });

  // ---------- error mapping ----------

  it('maps 404 to not-found', () => {
    let error: InvitationError | undefined;

    client.getInvitation(TOKEN).subscribe({ error: (e: InvitationError) => (error = e) });
    httpMock.expectOne(url).flush({}, { status: 404, statusText: 'Not Found' });

    expect(error?.reason).toBe('not-found');
  });

  it('maps 409 on submit to closed, so the page can switch to read-only', () => {
    let error: InvitationError | undefined;

    client
      .submitRsvp(TOKEN, { rsvpStatus: 'Accepted', plusOnesConfirmed: 0, dietaryNotes: null })
      .subscribe({ error: (e: InvitationError) => (error = e) });
    httpMock.expectOne(`${url}/rsvp`).flush({}, { status: 409, statusText: 'Conflict' });

    expect(error?.reason).toBe('closed');
  });

  it('maps a 500 to network rather than leaking the status to the form', () => {
    let error: InvitationError | undefined;

    client.getInvitation(TOKEN).subscribe({ error: (e: InvitationError) => (error = e) });
    httpMock.expectOne(url).flush({}, { status: 500, statusText: 'Server Error' });

    expect(error?.reason).toBe('network');
  });

  // ---------- field errors ----------

  it('lowercases the PascalCase property names FluentValidation actually sends', () => {
    // The real backend sends "PlusOnesConfirmed"; the form keys on "plusOnesConfirmed". Nothing
    // else in the suite exercises this with a genuinely PascalCase key — the component spec
    // already flushes camelCase, so it would pass with this normalization deleted.
    let error: InvitationError | undefined;

    client
      .submitRsvp(TOKEN, { rsvpStatus: 'Accepted', plusOnesConfirmed: 9, dietaryNotes: null })
      .subscribe({ error: (e: InvitationError) => (error = e) });

    httpMock.expectOne(`${url}/rsvp`).flush(
      { errors: { PlusOnesConfirmed: ["You're invited with up to 2 guests."] } },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(error?.reason).toBe('validation');
    expect(error?.fieldErrors['plusOnesConfirmed']).toEqual([
      "You're invited with up to 2 guests.",
    ]);
    expect(error?.fieldErrors['PlusOnesConfirmed']).toBeUndefined();
  });

  it('ignores an errors payload that is not shaped like a field map', () => {
    let error: InvitationError | undefined;

    client.getInvitation(TOKEN).subscribe({ error: (e: InvitationError) => (error = e) });
    httpMock
      .expectOne(url)
      .flush({ errors: 'something went wrong' }, { status: 400, statusText: 'Bad Request' });

    expect(error?.fieldErrors).toEqual({});
  });

  it('drops non-array entries rather than rendering them as messages', () => {
    let error: InvitationError | undefined;

    client.getInvitation(TOKEN).subscribe({ error: (e: InvitationError) => (error = e) });
    httpMock.expectOne(url).flush(
      { errors: { DietaryNotes: ['Too long.'], Nonsense: 42 } },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(error?.fieldErrors).toEqual({ dietaryNotes: ['Too long.'] });
  });
});
