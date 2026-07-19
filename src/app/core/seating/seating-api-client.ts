import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AreaPositionInput, AreaPositionResult, SeatingBatchOp, SeatingBatchOpResult, TablePositionInput, TablePositionResult } from './seating-batch.model';
import { CreateAreaInput, UpdateAreaInput } from './area-input.model';
import { CreateTablesInput, UpdateTableInput } from './table-input.model';
import { SeatingArea } from './seating-area.model';
import { SeatingError } from './seating-error.model';
import { SeatingLayout } from './seating-layout.model';
import { SeatingTable } from './seating-table.model';

interface CreateTablesResponse {
  tables: SeatingTable[];
}

interface ApplyAssignmentsBatchResponse {
  layout: SeatingLayout;
  opResults: SeatingBatchOpResult[];
}

interface ApplyTablePositionsBatchResponse {
  results: TablePositionResult[];
}

interface ApplyAreaPositionsBatchResponse {
  results: AreaPositionResult[];
}

const GENERIC_SERVER_ERROR = "We couldn't save that change right now. Please try again in a moment.";
const AUTH_ERROR = 'Your session has expired. Please sign in again to keep editing this layout.';
const NOT_FOUND_ERROR = "That item wasn't found. It may have already been removed — try reloading the layout.";
const CONFLICT_ERROR = 'That seat is already taken. Someone else may have just been seated there.';

@Injectable({ providedIn: 'root' })
export class SeatingApiClient {
  private readonly http = inject(HttpClient);
  private readonly base = environment.guestManagementBaseUrl;

  getLayout(eventId: string): Observable<SeatingLayout> {
    const url = `${this.base}/seating?eventId=${encodeURIComponent(eventId)}`;
    return this.http.get<SeatingLayout>(url, { withCredentials: false }).pipe(this.catchAsSeatingError());
  }

  createTables(eventId: string, input: CreateTablesInput): Observable<SeatingTable[]> {
    const url = `${this.base}/seating/tables`;
    return this.http
      .post<CreateTablesResponse>(url, { eventId, ...input }, { withCredentials: false })
      .pipe(map((response) => response.tables), this.catchAsSeatingError());
  }

  updateTable(eventId: string, tableId: string, input: UpdateTableInput): Observable<SeatingTable> {
    const url = `${this.base}/seating/tables/${encodeURIComponent(tableId)}`;
    return this.http
      .put<SeatingTable>(url, { eventId, ...input }, { withCredentials: false })
      .pipe(this.catchAsSeatingError());
  }

  deleteTable(eventId: string, tableId: string): Observable<void> {
    const url = `${this.base}/seating/tables/${encodeURIComponent(tableId)}?eventId=${encodeURIComponent(eventId)}`;
    return this.http
      .delete<void>(url, { withCredentials: false })
      .pipe(this.catchAsSeatingError());
  }

  assignSeat(eventId: string, tableId: string, seatIndex: number, guestId: string): Observable<SeatingTable> {
    const url = `${this.base}/seating/tables/${encodeURIComponent(tableId)}/seats/${seatIndex}`;
    return this.http
      .put<SeatingTable>(url, { eventId, guestId }, { withCredentials: false })
      .pipe(this.catchAsSeatingError());
  }

  unassignSeat(eventId: string, tableId: string, seatIndex: number): Observable<void> {
    const url =
      `${this.base}/seating/tables/${encodeURIComponent(tableId)}/seats/${seatIndex}` +
      `?eventId=${encodeURIComponent(eventId)}`;
    return this.http.delete<void>(url, { withCredentials: false }).pipe(this.catchAsSeatingError());
  }

  applyAssignmentsBatch(
    eventId: string,
    ops: readonly SeatingBatchOp[],
  ): Observable<{ layout: SeatingLayout; opResults: SeatingBatchOpResult[] }> {
    const url = `${this.base}/seating/assignments`;
    return this.http
      .put<ApplyAssignmentsBatchResponse>(url, { eventId, ops }, { withCredentials: false })
      .pipe(this.catchAsSeatingError());
  }

  updateTablePosition(
    eventId: string,
    tableId: string,
    positionX: number,
    positionY: number,
    rotation: number,
  ): Observable<SeatingTable> {
    const url = `${this.base}/seating/tables/${encodeURIComponent(tableId)}/position`;
    return this.http
      .patch<SeatingTable>(url, { eventId, positionX, positionY, rotation }, { withCredentials: false })
      .pipe(this.catchAsSeatingError());
  }

  applyTablePositionsBatch(
    eventId: string,
    positions: readonly TablePositionInput[],
  ): Observable<TablePositionResult[]> {
    const url = `${this.base}/seating/tables/positions`;
    return this.http
      .patch<ApplyTablePositionsBatchResponse>(url, { eventId, positions }, { withCredentials: false })
      .pipe(map((response) => response.results), this.catchAsSeatingError());
  }

  createArea(eventId: string, input: CreateAreaInput): Observable<SeatingArea> {
    const url = `${this.base}/seating/areas`;
    return this.http
      .post<SeatingArea>(url, { eventId, ...input }, { withCredentials: false })
      .pipe(this.catchAsSeatingError());
  }

  updateArea(eventId: string, areaId: string, input: UpdateAreaInput): Observable<SeatingArea> {
    const url = `${this.base}/seating/areas/${encodeURIComponent(areaId)}`;
    return this.http
      .put<SeatingArea>(url, { eventId, ...input }, { withCredentials: false })
      .pipe(this.catchAsSeatingError());
  }

  deleteArea(eventId: string, areaId: string): Observable<void> {
    const url = `${this.base}/seating/areas/${encodeURIComponent(areaId)}?eventId=${encodeURIComponent(eventId)}`;
    return this.http.delete<void>(url, { withCredentials: false }).pipe(this.catchAsSeatingError());
  }

  updateAreaPosition(
    eventId: string,
    areaId: string,
    positionX: number,
    positionY: number,
    rotation: number,
  ): Observable<SeatingArea> {
    const url = `${this.base}/seating/areas/${encodeURIComponent(areaId)}/position`;
    return this.http
      .patch<SeatingArea>(url, { eventId, positionX, positionY, rotation }, { withCredentials: false })
      .pipe(this.catchAsSeatingError());
  }

  applyAreaPositionsBatch(
    eventId: string,
    positions: readonly AreaPositionInput[],
  ): Observable<AreaPositionResult[]> {
    const url = `${this.base}/seating/areas/positions`;
    return this.http
      .patch<ApplyAreaPositionsBatchResponse>(url, { eventId, positions }, { withCredentials: false })
      .pipe(map((response) => response.results), this.catchAsSeatingError());
  }

  private catchAsSeatingError<T>() {
    return catchError<T, Observable<T>>((response: HttpErrorResponse) =>
      throwError(() => this.toError(response)),
    );
  }

  private toError(response: HttpErrorResponse): SeatingError {
    if (response.status === 404) {
      return { kind: 'notFound', message: NOT_FOUND_ERROR };
    }
    if (response.status === 401 || response.status === 403) {
      return { kind: 'unauthorized', message: AUTH_ERROR };
    }
    if (response.status === 409) {
      return { kind: 'conflict', message: CONFLICT_ERROR };
    }
    if (response.status === 400) {
      return { kind: 'validation', message: GENERIC_SERVER_ERROR };
    }
    return { kind: 'server', message: GENERIC_SERVER_ERROR };
  }
}
