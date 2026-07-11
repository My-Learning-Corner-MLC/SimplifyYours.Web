import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { Observable, Subject, debounceTime, forkJoin, tap } from 'rxjs';

import { GuestApiClient } from '../guests/guest-api-client';
import { Guest } from '../guests/guest.model';
import { withAreaMoved, withGuestAssigned, withGuestUnassigned, withTableMoved } from './seating-layout-mutations';
import { SeatingApiClient } from './seating-api-client';
import { AreaPositionInput, SeatingBatchOp, TablePositionInput } from './seating-batch.model';
import { CreateAreaInput, UpdateAreaInput } from './area-input.model';
import { SeatingError } from './seating-error.model';
import { SeatingLayout } from './seating-layout.model';
import { SeatingSummary } from './seating-summary.model';
import { SeatingTable } from './seating-table.model';
import { SeatingArea } from './seating-area.model';
import { CreateTablesInput, UpdateTableInput } from './table-input.model';

export type SeatingLoadState = 'loading' | 'error' | 'ready';
export type SaveState = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';

const EMPTY_SUMMARY: SeatingSummary = { tableCount: 0, seatCount: 0, seatedCount: 0, floatingCount: 0 };

// The frontend must not call the backend on every drop or drag — rapid seating
// and floor-plan dragging would flood the service. Rapid mutations coalesce
// (last-write-wins per guest/table) into a pending-ops map and flush as one
// batch request after this much idle time, or immediately via forceFlush().
export const FLUSH_DEBOUNCE_MS = 1500;
const MAX_PENDING_OPS = 100;

/**
 * Owns the Tables tab's data: the seating layout (tables/areas/summary) and the
 * event's guest list. Scoped per `event-tables-tab` instance (see its `providers`)
 * so switching events — or navigating away and back — starts from a clean load.
 */
@Injectable()
export class SeatingStore implements OnDestroy {
  private readonly api = inject(SeatingApiClient);
  private readonly guestApi = inject(GuestApiClient);

  private eventId = '';

  readonly state = signal<SeatingLoadState>('loading');
  readonly loadError = signal<SeatingError | null>(null);
  readonly saveState = signal<SaveState>('idle');
  readonly actionError = signal<string | null>(null);
  private readonly layout = signal<SeatingLayout | null>(null);
  private readonly guests = signal<Guest[]>([]);

  private readonly pendingAssignOps = new Map<string, SeatingBatchOp>();
  private readonly pendingPositionOps = new Map<string, TablePositionInput>();
  private readonly pendingAreaPositionOps = new Map<string, AreaPositionInput>();
  private assignSnapshot: SeatingLayout | null = null;
  private positionSnapshot: SeatingLayout | null = null;
  private areaPositionSnapshot: SeatingLayout | null = null;

  private readonly assignFlush$ = new Subject<void>();
  private readonly positionFlush$ = new Subject<void>();
  private readonly areaPositionFlush$ = new Subject<void>();

  constructor() {
    this.assignFlush$.pipe(debounceTime(FLUSH_DEBOUNCE_MS)).subscribe(() => this.flushAssignments());
    this.positionFlush$.pipe(debounceTime(FLUSH_DEBOUNCE_MS)).subscribe(() => this.flushPositions());
    this.areaPositionFlush$.pipe(debounceTime(FLUSH_DEBOUNCE_MS)).subscribe(() => this.flushAreaPositions());
  }

  readonly tables = computed(() => this.layout()?.tables ?? []);
  readonly areas = computed(() => this.layout()?.areas ?? []);
  readonly isEmpty = computed(() => this.state() === 'ready' && this.tables().length === 0);

  // Derived live from tables/guests (not the server's `summary` field) so it
  // stays correct through optimistic local mutations, not just fresh loads.
  readonly summary = computed<SeatingSummary>(() => {
    if (this.state() !== 'ready') {
      return EMPTY_SUMMARY;
    }
    const tables = this.tables();
    const seatedCount = tables.reduce(
      (sum, table) => sum + table.seats.filter((seat) => seat.guestId !== null).length,
      0,
    );
    return {
      tableCount: tables.length,
      seatCount: tables.reduce((sum, table) => sum + table.seatCount, 0),
      seatedCount,
      floatingCount: Math.max(this.guests().length - seatedCount, 0),
    };
  });

  readonly floatingGuests = computed(() => {
    const seatedGuestIds = new Set(
      this.tables()
        .flatMap((table) => table.seats)
        .map((seat) => seat.guestId)
        .filter((id): id is string => id !== null),
    );
    return this.guests().filter((guest) => !seatedGuestIds.has(guest.id));
  });

  load(eventId: string): void {
    // Skip redundant fetches caused by tab-switch re-mounting when the store is
    // scoped to the parent (EventDetailPage) and the data is already fresh.
    if (eventId === this.eventId && this.state() === 'ready') {
      return;
    }
    this.eventId = eventId;
    this.state.set('loading');
    this.loadError.set(null);
    this.saveState.set('idle');
    this.actionError.set(null);
    this.pendingAssignOps.clear();
    this.pendingPositionOps.clear();
    this.pendingAreaPositionOps.clear();

    this.fetchLayoutAndGuests().subscribe({
      next: () => this.state.set('ready'),
      error: (error: SeatingError | { kind: string; message: string }) => {
        this.loadError.set({ kind: this.normalizeErrorKind(error.kind), message: error.message });
        this.state.set('error');
      },
    });
  }

  retry(): void {
    if (this.eventId) {
      this.load(this.eventId);
    }
  }

  ngOnDestroy(): void {
    // Leaving the Tables tab (or navigating away) must not silently drop
    // whatever the debounce timer hasn't flushed yet.
    this.forceFlush();
  }

  // ---- High-frequency, batched mutations (seat assignment, table drags) ----
  // Optimistic and instant locally; the actual write is coalesced (last-write
  // wins per guest/table) and debounced — see FLUSH_DEBOUNCE_MS above.

  assignGuest(guestId: string, tableId: string, seatIndex: number): void {
    const guest = this.guests().find((g) => g.id === guestId);
    const current = this.layout();
    if (!guest || !current) {
      return;
    }
    this.captureAssignSnapshotIfNeeded(current);
    this.layout.set(withGuestAssigned(current, guest, tableId, seatIndex));
    this.pendingAssignOps.set(guestId, { op: 'Assign', guestId, tableId, seatIndex });
    this.queueAssignFlush();
  }

  unassignGuest(guestId: string): void {
    const current = this.layout();
    if (!current) {
      return;
    }
    this.captureAssignSnapshotIfNeeded(current);
    this.layout.set(withGuestUnassigned(current, guestId));
    this.pendingAssignOps.set(guestId, { op: 'Unassign', guestId, tableId: null, seatIndex: null });
    this.queueAssignFlush();
  }

  moveTable(tableId: string, positionX: number, positionY: number, rotation: number): void {
    const current = this.layout();
    if (!current) {
      return;
    }
    if (this.pendingPositionOps.size === 0) {
      this.positionSnapshot = current;
    }
    this.layout.set(withTableMoved(current, tableId, positionX, positionY, rotation));
    this.pendingPositionOps.set(tableId, { tableId, positionX, positionY, rotation });
    this.queuePositionFlush();
  }

  moveArea(areaId: string, positionX: number, positionY: number, rotation: number): void {
    const current = this.layout();
    if (!current) {
      return;
    }
    if (this.pendingAreaPositionOps.size === 0) {
      this.areaPositionSnapshot = current;
    }
    this.layout.set(withAreaMoved(current, areaId, positionX, positionY, rotation));
    this.pendingAreaPositionOps.set(areaId, { areaId, positionX, positionY, rotation });
    this.queueAreaPositionFlush();
  }

  /** Captures the pre-batch layout the first time a new pending assignment batch starts. */
  private captureAssignSnapshotIfNeeded(current: SeatingLayout): void {
    if (this.pendingAssignOps.size === 0) {
      this.assignSnapshot = current;
    }
  }

  /** Force-flush all queues now. Call on Grid⇄Floor switch, leaving the tab, beforeunload. */
  forceFlush(): void {
    this.flushAssignments();
    this.flushPositions();
    this.flushAreaPositions();
  }

  private queueAssignFlush(): void {
    this.saveState.set('unsaved');
    if (this.pendingAssignOps.size >= MAX_PENDING_OPS) {
      this.flushAssignments();
      return;
    }
    this.assignFlush$.next();
  }

  private queuePositionFlush(): void {
    this.saveState.set('unsaved');
    if (this.pendingPositionOps.size >= MAX_PENDING_OPS) {
      this.flushPositions();
      return;
    }
    this.positionFlush$.next();
  }

  private queueAreaPositionFlush(): void {
    this.saveState.set('unsaved');
    if (this.pendingAreaPositionOps.size >= MAX_PENDING_OPS) {
      this.flushAreaPositions();
      return;
    }
    this.areaPositionFlush$.next();
  }

  private flushAssignments(): void {
    if (this.pendingAssignOps.size === 0) {
      return;
    }
    const ops = Array.from(this.pendingAssignOps.values());
    this.pendingAssignOps.clear();
    this.saveState.set('saving');

    this.api.applyAssignmentsBatch(this.eventId, ops).subscribe({
      next: ({ layout, opResults }) => {
        this.layout.set(layout);
        this.assignSnapshot = null;
        const hasConflict = opResults.some((result) => result.status !== 'Applied');
        if (hasConflict) {
          this.actionError.set('Some seat changes could not be saved. The layout has been refreshed.');
          this.saveState.set('error');
        } else {
          this.saveState.set('saved');
        }
      },
      error: () => {
        // Keep the pre-batch snapshot around (don't null it) — these ops are
        // re-queued for retry, so a second failed attempt must still be able
        // to roll back to the state from *before* the very first optimistic op.
        if (this.assignSnapshot) {
          this.layout.set(this.assignSnapshot);
        }
        for (const op of ops) {
          if (!this.pendingAssignOps.has(op.guestId)) {
            this.pendingAssignOps.set(op.guestId, op);
          }
        }
        this.actionError.set("We couldn't save your seating changes. Retrying shortly.");
        this.saveState.set('error');
        this.assignFlush$.next();
      },
    });
  }

  private flushPositions(): void {
    if (this.pendingPositionOps.size === 0) {
      return;
    }
    const positions = Array.from(this.pendingPositionOps.values());
    this.pendingPositionOps.clear();
    this.saveState.set('saving');

    this.api.applyTablePositionsBatch(this.eventId, positions).subscribe({
      next: (results) => {
        this.positionSnapshot = null;
        const hasConflict = results.some((result) => result.status !== 'Applied');
        if (hasConflict) {
          this.actionError.set('Some table positions could not be saved. The layout has been refreshed.');
          this.saveState.set('error');
          this.silentReload();
        } else {
          this.saveState.set('saved');
        }
      },
      error: () => {
        if (this.positionSnapshot) {
          this.layout.set(this.positionSnapshot);
        }
        for (const position of positions) {
          if (!this.pendingPositionOps.has(position.tableId)) {
            this.pendingPositionOps.set(position.tableId, position);
          }
        }
        this.actionError.set("We couldn't save the table positions. Retrying shortly.");
        this.saveState.set('error');
        this.positionFlush$.next();
      },
    });
  }

  private flushAreaPositions(): void {
    if (this.pendingAreaPositionOps.size === 0) {
      return;
    }
    const positions = Array.from(this.pendingAreaPositionOps.values());
    this.pendingAreaPositionOps.clear();
    this.saveState.set('saving');

    this.api.applyAreaPositionsBatch(this.eventId, positions).subscribe({
      next: (results) => {
        this.areaPositionSnapshot = null;
        const hasConflict = results.some((result) => result.status !== 'Applied');
        if (hasConflict) {
          this.actionError.set('Some area positions could not be saved. The layout has been refreshed.');
          this.saveState.set('error');
          this.silentReload();
        } else {
          this.saveState.set('saved');
        }
      },
      error: () => {
        if (this.areaPositionSnapshot) {
          this.layout.set(this.areaPositionSnapshot);
        }
        for (const position of positions) {
          if (!this.pendingAreaPositionOps.has(position.areaId)) {
            this.pendingAreaPositionOps.set(position.areaId, position);
          }
        }
        this.actionError.set("We couldn't save the area positions. Retrying shortly.");
        this.saveState.set('error');
        this.areaPositionFlush$.next();
      },
    });
  }

  // Immediate (non-batched) table mutations — create/edit/delete are rare
  // and need the server-assigned id, unlike the high-frequency seat-assignment
  // and position drags that go through the debounced batch queue (Slice 4/5).
  createTables(input: CreateTablesInput): Observable<SeatingTable[]> {
    return this.api.createTables(this.eventId, input).pipe(tap(() => this.silentReload()));
  }

  updateTable(tableId: string, input: UpdateTableInput): Observable<SeatingTable> {
    return this.api.updateTable(this.eventId, tableId, input).pipe(tap(() => this.silentReload()));
  }

  deleteTable(tableId: string): Observable<void> {
    return this.api.deleteTable(this.eventId, tableId).pipe(tap(() => this.silentReload()));
  }

  createArea(input: CreateAreaInput): Observable<SeatingArea> {
    return this.api.createArea(this.eventId, input).pipe(tap(() => this.silentReload()));
  }

  updateArea(areaId: string, input: UpdateAreaInput): Observable<SeatingArea> {
    return this.api.updateArea(this.eventId, areaId, input).pipe(tap(() => this.silentReload()));
  }

  deleteArea(areaId: string): Observable<void> {
    return this.api.deleteArea(this.eventId, areaId).pipe(tap(() => this.silentReload()));
  }

  /** Refreshes layout/guests signals in place without disturbing `state` (no loading skeleton flash). */
  private silentReload(): void {
    this.fetchLayoutAndGuests().subscribe();
  }

  private fetchLayoutAndGuests(): Observable<{ layout: SeatingLayout; guests: Guest[] }> {
    return forkJoin({
      layout: this.api.getLayout(this.eventId),
      guests: this.guestApi.listGuests(this.eventId),
    }).pipe(
      tap(({ layout, guests }) => {
        this.layout.set(layout);
        this.guests.set(guests);
      }),
    );
  }

  private normalizeErrorKind(kind: string): SeatingError['kind'] {
    return kind === 'notFound' || kind === 'unauthorized' || kind === 'conflict' || kind === 'validation'
      ? kind
      : 'server';
  }
}
