import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { GuestApiClient } from './guest-api-client';
import { GuestListStore } from './guest-list-store';
import { Guest } from './guest.model';

const guest = (id: string): Guest => ({
  id,
  firstName: 'Amara',
  lastName: 'Okoye',
  phoneNumber: '+1 555 0100',
  emailAddress: null,
  eventMetadata: null,
  createdAt: '2026-07-01T10:00:00+00:00',
});

function createStore(guestApi: Partial<GuestApiClient> = { listGuests: () => of([guest('g1')]) }) {
  TestBed.configureTestingModule({
    providers: [GuestListStore, { provide: GuestApiClient, useValue: guestApi }],
  });
  return TestBed.inject(GuestListStore);
}

describe('GuestListStore', () => {
  it('starts idle with no guests', () => {
    const store = createStore();

    expect(store.state()).toBe('idle');
    expect(store.guests()).toEqual([]);
  });

  it('loads guests for an event and becomes ready', () => {
    const listGuests = vi.fn(() => of([guest('g1')]));
    const store = createStore({ listGuests });

    store.load('e1');

    expect(listGuests).toHaveBeenCalledWith('e1');
    expect(store.state()).toBe('ready');
    expect(store.guests().map((g) => g.id)).toEqual(['g1']);
  });

  it('reuses the cached list on a second load for the same event (BUG-004)', () => {
    const listGuests = vi.fn(() => of([guest('g1')]));
    const store = createStore({ listGuests });

    store.load('e1'); // e.g. Table Management tab loads first
    store.load('e1'); // Guests tab opened next — should reuse, not refetch

    expect(listGuests).toHaveBeenCalledTimes(1);
  });

  it('force-reloads even when already ready for the same event', () => {
    const listGuests = vi.fn(() => of([guest('g1')]));
    const store = createStore({ listGuests });

    store.load('e1');
    store.load('e1', true);

    expect(listGuests).toHaveBeenCalledTimes(2);
  });

  it('refetches when switching to a different event', () => {
    const listGuests = vi.fn(() => of([guest('g1')]));
    const store = createStore({ listGuests });

    store.load('e1');
    store.load('e2');

    expect(listGuests).toHaveBeenCalledTimes(2);
    expect(listGuests).toHaveBeenLastCalledWith('e2');
  });

  it('surfaces an error and stops at the error state', () => {
    const store = createStore({ listGuests: () => throwError(() => ({ kind: 'server', message: 'Boom' })) });

    store.load('e1');

    expect(store.state()).toBe('error');
    expect(store.error()?.message).toBe('Boom');
  });

  it('retries the last load', () => {
    const listGuests = vi.fn(() => of([guest('g1')]));
    const store = createStore({ listGuests });

    store.load('e1');
    listGuests.mockClear();
    store.retry();

    expect(listGuests).toHaveBeenCalledWith('e1');
  });

  it('appends a newly added guest without refetching, visible to every consumer of the shared signal (BUG-004)', () => {
    const listGuests = vi.fn(() => of([guest('g1')]));
    const store = createStore({ listGuests });
    store.load('e1');

    store.addGuest(guest('g2'));

    expect(listGuests).toHaveBeenCalledTimes(1);
    expect(store.guests().map((g) => g.id)).toEqual(['g1', 'g2']);
  });

  it('resetForEvent clears cached data for a different event without fetching', () => {
    const listGuests = vi.fn(() => of([guest('g1')]));
    const store = createStore({ listGuests });
    store.load('e1');

    store.resetForEvent('e2');

    expect(store.guests()).toEqual([]);
    expect(store.state()).toBe('idle');
    expect(listGuests).toHaveBeenCalledTimes(1);
  });

  it('resetForEvent is a no-op for the same event', () => {
    const listGuests = vi.fn(() => of([guest('g1')]));
    const store = createStore({ listGuests });
    store.load('e1');

    store.resetForEvent('e1');

    expect(store.guests().map((g) => g.id)).toEqual(['g1']);
    expect(store.state()).toBe('ready');
  });
});
