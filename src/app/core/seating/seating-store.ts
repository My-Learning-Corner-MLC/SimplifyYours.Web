import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { GuestApiClient } from '../guests/guest-api-client';
import { Guest } from '../guests/guest.model';
import { SeatingApiClient } from './seating-api-client';
import { SeatingError } from './seating-error.model';
import { SeatingLayout } from './seating-layout.model';
import { SeatingSummary } from './seating-summary.model';

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

    forkJoin({
      layout: this.api.getLayout(eventId),
      guests: this.guestApi.listGuests(eventId),
    }).subscribe({
      next: ({ layout, guests }) => {
        this.layout.set(layout);
        this.guests.set(guests);
        this.state.set('ready');
      },
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

  private normalizeErrorKind(kind: string): SeatingError['kind'] {
    return kind === 'notFound' || kind === 'unauthorized' || kind === 'conflict' || kind === 'validation'
      ? kind
      : 'server';
  }
}
