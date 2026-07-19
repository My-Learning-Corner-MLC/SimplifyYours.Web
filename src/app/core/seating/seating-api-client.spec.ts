import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { SeatingApiClient } from './seating-api-client';
import { SeatingLayout } from './seating-layout.model';
import { SeatingTable } from './seating-table.model';
import { SeatingArea } from './seating-area.model';

describe('SeatingApiClient', () => {
  let client: SeatingApiClient;
  let httpMock: HttpTestingController;
  const base = environment.guestManagementBaseUrl;
  const eventId = 'e1';

  const layout = (): SeatingLayout => ({
    eventId,
    tables: [],
    areas: [],
    summary: { tableCount: 0, seatCount: 0, seatedCount: 0, floatingCount: 0 },
  });

  const table = (): SeatingTable => ({
    id: 't1',
    name: 'Table 1',
    shape: 'Round',
    seatCount: 8,
    isFull: false,
    positionX: null,
    positionY: null,
    rotation: 0,
    seats: [],
  });

  const area = (): SeatingArea => ({
    id: 'a1',
    name: 'Stage',
    kind: 'Stage',
    shape: 'Rect',
    width: 3.4,
    height: 0.9,
    positionX: null,
    positionY: null,
    rotation: 0,
    color: null,
    capacity: null,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    client = TestBed.inject(SeatingApiClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('gets the seating layout', () => {
    let result: SeatingLayout | undefined;
    client.getLayout(eventId).subscribe((response) => (result = response));

    const req = httpMock.expectOne(`${base}/seating?eventId=${eventId}`);
    expect(req.request.method).toBe('GET');
    req.flush(layout());

    expect(result).toEqual(layout());
  });

  it('maps a 404 on getLayout to a notFound error', () => {
    let error: { kind: string } | undefined;
    client.getLayout(eventId).subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${base}/seating?eventId=${eventId}`).flush(null, { status: 404, statusText: 'Not Found' });

    expect(error?.kind).toBe('notFound');
  });

  it('maps a 409 on assignSeat to a conflict error', () => {
    let error: { kind: string } | undefined;
    client.assignSeat(eventId, 't1', 0, 'g1').subscribe({ error: (e) => (error = e) });

    httpMock
      .expectOne(`${base}/seating/tables/t1/seats/0`)
      .flush(null, { status: 409, statusText: 'Conflict' });

    expect(error?.kind).toBe('conflict');
  });

  it('creates tables via POST /seating/tables', () => {
    let result: SeatingTable[] | undefined;
    client
      .createTables(eventId, { name: 'Table', shape: 'Round', seatCount: 8, count: 2 })
      .subscribe((tables) => (result = tables));

    const req = httpMock.expectOne(`${base}/seating/tables`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ eventId, name: 'Table', shape: 'Round', seatCount: 8, count: 2 });
    req.flush({ tables: [table()] });

    expect(result).toEqual([table()]);
  });

  it('updates a table via PUT /seating/tables/{id}', () => {
    client
      .updateTable(eventId, 't1', { name: 'Head table', shape: 'Long', seatCount: 6, isFull: false })
      .subscribe();

    const req = httpMock.expectOne(`${base}/seating/tables/t1`);
    expect(req.request.method).toBe('PUT');
    req.flush(table());
  });

  it('deletes a table via DELETE /seating/tables/{id}', () => {
    client.deleteTable(eventId, 't1').subscribe();

    const req = httpMock.expectOne(`${base}/seating/tables/t1?eventId=${eventId}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('assigns a seat via PUT /seating/tables/{id}/seats/{index}', () => {
    client.assignSeat(eventId, 't1', 2, 'g1').subscribe();

    const req = httpMock.expectOne(`${base}/seating/tables/t1/seats/2`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ eventId, guestId: 'g1' });
    req.flush(table());
  });

  it('unassigns a seat via DELETE /seating/tables/{id}/seats/{index}', () => {
    client.unassignSeat(eventId, 't1', 2).subscribe();

    const req = httpMock.expectOne(`${base}/seating/tables/t1/seats/2?eventId=${eventId}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('applies an assignments batch via PUT /seating/assignments', () => {
    const ops = [{ op: 'Assign' as const, guestId: 'g1', tableId: 't1', seatIndex: 0 }];
    client.applyAssignmentsBatch(eventId, ops).subscribe();

    const req = httpMock.expectOne(`${base}/seating/assignments`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ eventId, ops });
    req.flush({ layout: layout(), opResults: [] });
  });

  it('updates a table position via PATCH /seating/tables/{id}/position', () => {
    client.updateTablePosition(eventId, 't1', 10, 20, 90).subscribe();

    const req = httpMock.expectOne(`${base}/seating/tables/t1/position`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ eventId, positionX: 10, positionY: 20, rotation: 90 });
    req.flush(table());
  });

  it('applies a table positions batch via PATCH /seating/tables/positions', () => {
    const positions = [{ tableId: 't1', positionX: 10, positionY: 20, rotation: 0 }];
    client.applyTablePositionsBatch(eventId, positions).subscribe();

    const req = httpMock.expectOne(`${base}/seating/tables/positions`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ results: [] });
  });

  it('creates an area via POST /seating/areas', () => {
    client
      .createArea(eventId, { name: 'Stage', kind: 'Stage', shape: 'Rect', width: 3.4, height: 0.9, color: null, capacity: null })
      .subscribe();

    const req = httpMock.expectOne(`${base}/seating/areas`);
    expect(req.request.method).toBe('POST');
    req.flush(area());
  });

  it('updates an area via PUT /seating/areas/{id}', () => {
    client
      .updateArea(eventId, 'a1', { name: 'Gift table', kind: 'Custom', shape: 'Round', width: 1.2, height: 1.2, color: null, capacity: null })
      .subscribe();

    const req = httpMock.expectOne(`${base}/seating/areas/a1`);
    expect(req.request.method).toBe('PUT');
    req.flush(area());
  });

  it('deletes an area via DELETE /seating/areas/{id}', () => {
    client.deleteArea(eventId, 'a1').subscribe();

    const req = httpMock.expectOne(`${base}/seating/areas/a1?eventId=${eventId}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('updates an area position via PATCH /seating/areas/{id}/position', () => {
    client.updateAreaPosition(eventId, 'a1', 10, 20, 0).subscribe();

    const req = httpMock.expectOne(`${base}/seating/areas/a1/position`);
    expect(req.request.method).toBe('PATCH');
    req.flush(area());
  });

  it('applies an area positions batch via PATCH /seating/areas/positions', () => {
    const positions = [{ areaId: 'a1', positionX: 10, positionY: 20, rotation: 0 }];
    client.applyAreaPositionsBatch(eventId, positions).subscribe();

    const req = httpMock.expectOne(`${base}/seating/areas/positions`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ results: [] });
  });
});
