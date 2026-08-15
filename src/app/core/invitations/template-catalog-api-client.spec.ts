import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { ListTemplatesError } from './template-catalog.model';
import { TemplateCatalogApiClient } from './template-catalog-api-client';

describe('TemplateCatalogApiClient', () => {
  let client: TemplateCatalogApiClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), TemplateCatalogApiClient],
    });

    client = TestBed.inject(TemplateCatalogApiClient);
    httpMock = TestBed.inject(HttpTestingController);
    TestBed.inject(HttpClient);
  });

  afterEach(() => httpMock.verify());

  it('lists templates for an event type as a bare array', () => {
    let received: readonly unknown[] | undefined;
    client.listTemplates('wedding').subscribe((templates) => (received = templates));

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiBaseUrl}/api/v1/templates` && r.params.get('eventType') === 'wedding',
    );
    expect(req.request.method).toBe('GET');
    req.flush([
      { id: 't1', name: 'Verona', tone: 'Classic', palette: ['#111', '#222'], eventType: 'wedding', currentVersion: 1 },
    ]);

    expect(received).toEqual([
      { id: 't1', name: 'Verona', tone: 'Classic', palette: ['#111', '#222'], eventType: 'wedding', currentVersion: 1 },
    ]);
  });

  it('treats an unknown event type as an empty list, not an error', () => {
    let received: readonly unknown[] | undefined;
    client.listTemplates('unknown-type').subscribe((templates) => (received = templates));

    httpMock.expectOne((r) => r.url === `${environment.apiBaseUrl}/api/v1/templates`).flush([]);

    expect(received).toEqual([]);
  });

  it('maps a 400 (malformed eventType) to a validation error', async () => {
    const failure = new Promise<ListTemplatesError>((resolve) => {
      client.listTemplates('').subscribe({ error: resolve });
    });

    httpMock.expectOne((r) => r.url === `${environment.apiBaseUrl}/api/v1/templates`).flush(
      {},
      { status: 400, statusText: 'Bad Request' },
    );

    expect((await failure).reason).toBe('validation');
  });

  it('treats anything else as a network failure', async () => {
    const failure = new Promise<ListTemplatesError>((resolve) => {
      client.listTemplates('wedding').subscribe({ error: resolve });
    });

    httpMock.expectOne((r) => r.url === `${environment.apiBaseUrl}/api/v1/templates`).flush(
      {},
      { status: 500, statusText: 'Server Error' },
    );

    expect((await failure).reason).toBe('network');
  });
});
