import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, forkJoin, tap } from 'rxjs';

import { GuestApiClient } from '../guests/guest-api-client';
import { Guest } from '../guests/guest.model';
import { SeatingApiClient } from './seating-api-client';
import { SeatingError } from './seating-error.model';
import { SeatingLayout } from './seating-layout.model';
import { SeatingSummary } from './seating-summary.model';
import { SeatingTable } from './seating-table.model';
import { CreateTablesInput, UpdateTableInput } from './table-input.model';

export type SeatingLoadState = 'loading' | 'error' | 'ready';

const EMPTY_SUMMARY: SeatingSummary = { tableCount: 0, seatCount: 0, seatedCount: 0, floatingCount: 0 };

/**
 * Owns the Tables tab's data: the seating layout (tables/areas/summary) and the
 * event's guest list. Scoped per `event-tables-tab` instance (see its `providers`)
 * so switching events — or navigating away and back — starts from a clean load.
 */
@Injectable()
export class SeatingStore {
  private readonly api = inject(SeatingApiClient);
  private readonly guestApi = inject(GuestApiClient);

  private eventId = '';

  readonly state = signal<SeatingLoadState>('loading');
  readonly loadError = signal<SeatingError | null>(null);
  private readonly layout = signal<SeatingLayout | null>(null);
  private readonly guests = signal<Guest[]>([]);

  readonly tables = computed(() => this.layout()?.tables ?? []);
  readonly areas = computed(() => this.layout()?.areas ?? []);
  readonly summary = computed(() => this.layout()?.summary ?? EMPTY_SUMMARY);
  readonly isEmpty = computed(() => this.state() === 'ready' && this.tables().length === 0);

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
    this.eventId = eventId;
    this.state.set('loading');
    this.loadError.set(null);

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
