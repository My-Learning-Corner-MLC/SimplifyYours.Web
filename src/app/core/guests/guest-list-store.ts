import { Injectable, inject, signal } from '@angular/core';

import { GuestApiClient } from './guest-api-client';
import { ListGuestsError } from './guest-error.model';
import { Guest } from './guest.model';

export type GuestListLoadState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Single shared guest-list cache for an event, scoped to `EventDetailPage`
 * (see its `providers`) so the Guests tab and the Table Management tab —
 * previously two independent `GuestApiClient.listGuests()` calls with their
 * own signals — read and write the same data. Whichever tab is opened first
 * pays for the fetch; the other reuses it. `addGuest` appends the newly
 * created guest locally so both tabs reflect it immediately without a second
 * round-trip.
 */
@Injectable()
export class GuestListStore {
  private readonly api = inject(GuestApiClient);

  private eventId = '';

  readonly state = signal<GuestListLoadState>('idle');
  readonly error = signal<ListGuestsError | null>(null);
  readonly guests = signal<readonly Guest[]>([]);

  /**
   * Clears cached data when switching to a different event, without fetching —
   * the guest list stays lazy, loaded only once a tab that needs it (Guests or
   * Table Management) actually calls `load`.
   */
  resetForEvent(eventId: string): void {
    if (eventId === this.eventId) {
      return;
    }
    this.eventId = eventId;
    this.guests.set([]);
    this.state.set('idle');
    this.error.set(null);
  }

  /** Cache-first: fetches only if this event's list isn't already loaded. Pass `force` to bypass the cache. */
  load(eventId: string, force = false): void {
    if (!force && eventId === this.eventId && this.state() === 'ready') {
      return;
    }
    if (eventId !== this.eventId) {
      this.guests.set([]);
    }
    this.eventId = eventId;
    this.state.set('loading');
    this.error.set(null);
    this.api.listGuests(eventId).subscribe({
      next: (guests) => {
        this.guests.set(guests);
        this.state.set('ready');
      },
      error: (error: ListGuestsError) => {
        this.error.set(error);
        this.state.set('error');
      },
    });
  }

  retry(): void {
    if (this.eventId) {
      this.load(this.eventId, true);
    }
  }

  /** Appends a just-created guest so every consumer reflects it without refetching. */
  addGuest(guest: Guest): void {
    this.guests.update((guests) => [...guests, guest]);
    if (this.state() !== 'ready') {
      this.state.set('ready');
    }
  }
}
