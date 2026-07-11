import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { GuestApiClient } from '../guests/guest-api-client';
import { Guest } from '../guests/guest.model';
import { SeatingApiClient } from './seating-api-client';
import { SeatingLayout } from './seating-layout.model';
import { SeatingStore } from './seating-store';

const guest = (id: string): Guest => ({
  id,
  firstName: 'Amara',
  lastName: 'Okoye',
  phoneNumber: '+1 555 0100',
  emailAddress: null,
  gender: 'Female',
  relationship: null,
  side: null,
  plusOnes: 0,
  dietaryNotes: null,
  createdAt: '2026-07-01T10:00:00+00:00',
});

const layout = (overrides: Partial<SeatingLayout> = {}): SeatingLayout => ({
  eventId: 'e1',
  tables: [],
  areas: [],
  summary: { tableCount: 0, seatCount: 0, seatedCount: 0, floatingCount: 0 },
  ...overrides,
});

function createStore(
  seatingApi: Partial<SeatingApiClient> = { getLayout: () => of(layout()) },
  guestApi: Partial<GuestApiClient> = { listGuests: () => of([guest('g1')]) },
) {
  TestBed.configureTestingModule({
    providers: [
      SeatingStore,
      { provide: SeatingApiClient, useValue: seatingApi },
      { provide: GuestApiClient, useValue: guestApi },
    ],
  });
  return TestBed.inject(SeatingStore);
}

describe('SeatingStore', () => {
  it('starts in loading state', () => {
    const store = createStore();
    expect(store.state()).toBe('loading');
  });

  it('loads the layout and guests, then becomes ready', () => {
    const getLayout = vi.fn(() => of(layout()));
    const listGuests = vi.fn(() => of([guest('g1')]));
    const store = createStore({ getLayout }, { listGuests });

    store.load('e1');

    expect(store.state()).toBe('ready');
    expect(getLayout).toHaveBeenCalledWith('e1');
    expect(listGuests).toHaveBeenCalledWith('e1');
  });

  it('marks the layout empty when there are no tables', () => {
    const store = createStore();

    store.load('e1');

    expect(store.isEmpty()).toBe(true);
  });

  it('derives floating guests as guests minus seated guests', () => {
    const store = createStore(
      {
        getLayout: () =>
          of(
            layout({
              tables: [
                {
                  id: 't1',
                  name: 'Table 1',
                  shape: 'Round',
                  seatCount: 4,
                  isFull: false,
                  positionX: null,
                  positionY: null,
                  rotation: 0,
                  seats: [{ seatIndex: 0, guestId: 'g1', guestName: 'Amara Okoye' }],
                },
              ],
            }),
          ),
      },
      { listGuests: () => of([guest('g1'), guest('g2')]) },
    );

    store.load('e1');

    expect(store.floatingGuests().map((g) => g.id)).toEqual(['g2']);
  });

  it('surfaces an error and stops at the error state when the layout fails to load', () => {
    const store = createStore({
      getLayout: () => throwError(() => ({ kind: 'server', message: 'Boom' })),
    });

    store.load('e1');

    expect(store.state()).toBe('error');
    expect(store.loadError()?.message).toBe('Boom');
  });

  it('retries the last load', () => {
    const getLayout = vi.fn(() => of(layout()));
    const store = createStore({ getLayout });

    store.load('e1');
    getLayout.mockClear();
    store.retry();

    expect(getLayout).toHaveBeenCalledWith('e1');
  });
});
