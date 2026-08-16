import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { InvitationError } from './invitation.model';
import { InvitationSettingsApiClient } from './invitation-settings-api-client';

const EVENT_ID = '6f9b3c2a-6d1e-4f5b-9c3a-2e7d8b1f4a55';

describe('InvitationSettingsApiClient', () => {
  let client: InvitationSettingsApiClient;
  let httpMock: HttpTestingController;

  const url = `${environment.apiBaseUrl}/api/v1/invitations/settings/events/${EVENT_ID}`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), InvitationSettingsApiClient],
    });

    client = TestBed.inject(InvitationSettingsApiClient);
    httpMock = TestBed.inject(HttpTestingController);
    TestBed.inject(HttpClient);
  });

  afterEach(() => httpMock.verify());

  it('reads the saved settings for an event', () => {
    let received: unknown;
    client.getSettings(EVENT_ID).subscribe((settings) => (received = settings));

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('GET');
    req.flush({
      eventId: EVENT_ID,
      eventType: 'wedding',
      templateId: 'marigold',
      fieldValues: { brideName: 'Amara' },
      isConfigured: true,
      requiredFields: ['brideName'],
      publicLinkEnabled: false,
      publicEventToken: null,
    });

    expect(received).toMatchObject({ templateId: 'marigold', isConfigured: true });
  });

  it('saves with PUT', () => {
    client
      .saveSettings(EVENT_ID, { templateId: 'marigold', fieldValues: { brideName: 'Amara' } })
      .subscribe();

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ templateId: 'marigold', fieldValues: { brideName: 'Amara' } });
    req.flush({});
  });

  it('maps a 400 into field errors the form can show inline', async () => {
    const failure = new Promise<InvitationError>((resolve) => {
      client
        .saveSettings(EVENT_ID, { templateId: 'marigold', fieldValues: {} })
        .subscribe({ error: resolve });
    });

    httpMock.expectOne(url).flush(
      { errors: { groomName: ['This field is required.'], TemplateId: ['Choose a template.'] } },
      { status: 400, statusText: 'Bad Request' },
    );

    const error = await failure;
    expect(error.reason).toBe('validation');
    expect(error.fieldErrors['groomName']).toEqual(['This field is required.']);
    // PascalCase command-level names are normalised onto the keys the form uses.
    expect(error.fieldErrors['templateId']).toEqual(['Choose a template.']);
  });

  it('maps a 404 to not-found rather than a generic failure', async () => {
    const failure = new Promise<InvitationError>((resolve) => {
      client.getSettings(EVENT_ID).subscribe({ error: resolve });
    });

    httpMock.expectOne(url).flush({}, { status: 404, statusText: 'Not Found' });

    expect((await failure).reason).toBe('not-found');
  });

  it('treats anything else as a network failure', async () => {
    const failure = new Promise<InvitationError>((resolve) => {
      client.getSettings(EVENT_ID).subscribe({ error: resolve });
    });

    httpMock.expectOne(url).flush({}, { status: 500, statusText: 'Server Error' });

    expect((await failure).reason).toBe('network');
  });

  it('saves the public-link enable/disable action inline with the rest of the content', () => {
    client
      .saveSettings(EVENT_ID, {
        templateId: 'marigold',
        fieldValues: { brideName: 'Amara' },
        publicLinkEnabled: true,
      })
      .subscribe();

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      templateId: 'marigold',
      fieldValues: { brideName: 'Amara' },
      publicLinkEnabled: true,
    });
    req.flush({});
  });

  it('rotates the public token with POST', () => {
    let received: unknown;
    client.rotatePublicToken(EVENT_ID).subscribe((status) => (received = status));

    const req = httpMock.expectOne(`${url}/public-token`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ action: 'rotate' });
    req.flush({ enabled: true, publicEventToken: 'new-token' });

    expect(received).toEqual({ enabled: true, publicEventToken: 'new-token' });
  });

  it('issues a preview token with POST', () => {
    let received: unknown;
    client.issuePreviewToken(EVENT_ID).subscribe((token) => (received = token));

    const req = httpMock.expectOne(`${url}/preview-token`);
    expect(req.request.method).toBe('POST');
    req.flush({ token: 'preview-abc', expiresAt: '2026-08-15T00:00:00Z' });

    expect(received).toEqual({ token: 'preview-abc', expiresAt: '2026-08-15T00:00:00Z' });
  });
});
