import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { GuestApiClient } from '../guests/guest-api-client';
import { GuestListStore } from '../guests/guest-list-store';
import { Guest } from '../guests/guest.model';
import { SeatingApiClient } from './seating-api-client';
import { SeatingLayout } from './seating-layout.model';
import { FLUSH_DEBOUNCE_MS, SeatingStore } from './seating-store';

const guest = (id: string): Guest => ({
  id,
  firstName: 'Amara',
  lastName: 'Okoye',
  phoneNumber: '+1 555 0100',
  emailAddress: null,
  eventMetadata: null,
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
  seatingApi: Partial<SeatingApiClient> = {},
  guestApi: Partial<GuestApiClient> = { listGuests: () => of([guest('g1')]) },
) {
  // Safe no-op defaults for the flush endpoints: SeatingStore.ngOnDestroy force-flushes
  // any pending batch on TestBed teardown, so every store needs these callable even
  // when a test never intends to exercise them.
  const seatingApiWithDefaults: Partial<SeatingApiClient> = {
    getLayout: () => of(layout()),
    applyAssignmentsBatch: () => of({ layout: layout(), opResults: [] }),
    applyTablePositionsBatch: () => of([]),
    ...seatingApi,
  };
  TestBed.configureTestingModule({
    providers: [
      SeatingStore,
      GuestListStore,
      { provide: SeatingApiClient, useValue: seatingApiWithDefaults },
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

  const table = (overrides: Partial<SeatingLayout['tables'][number]> = {}): SeatingLayout['tables'][number] => ({
    id: 't1',
    name: 'Table 1',
    shape: 'Round',
    seatCount: 8,
    isFull: false,
    positionX: null,
    positionY: null,
    rotation: 0,
    seats: [],
    ...overrides,
  });

  it('createTables calls the API and silently reloads the layout on success', () => {
    const getLayout = vi.fn(() => of(layout()));
    const createTables = vi.fn(() => of([table()]));
    const store = createStore({ getLayout, createTables });
    store.load('e1');
    getLayout.mockClear();

    let result: unknown;
    store.createTables({ name: 'Table', shape: 'Round', seatCount: 8, count: 1 }).subscribe((r) => (result = r));

    expect(createTables).toHaveBeenCalledWith('e1', { name: 'Table', shape: 'Round', seatCount: 8, count: 1 });
    expect(result).toEqual([table()]);
    expect(getLayout).toHaveBeenCalledWith('e1');
    expect(store.state()).toBe('ready');
  });

  it('updateTable calls the API and silently reloads', () => {
    const getLayout = vi.fn(() => of(layout({ tables: [table()] })));
    const updateTable = vi.fn(() => of(table({ name: 'Renamed' })));
    const store = createStore({ getLayout, updateTable });
    store.load('e1');
    getLayout.mockClear();

    store.updateTable('t1', { name: 'Renamed', shape: 'Round', seatCount: 8, isFull: false }).subscribe();

    expect(updateTable).toHaveBeenCalledWith('e1', 't1', { name: 'Renamed', shape: 'Round', seatCount: 8, isFull: false });
    expect(getLayout).toHaveBeenCalledWith('e1');
  });

  it('deleteTable calls the API and silently reloads', () => {
    const getLayout = vi.fn(() => of(layout()));
    const deleteTable = vi.fn(() => of(undefined));
    const store = createStore({ getLayout, deleteTable });
    store.load('e1');
    getLayout.mockClear();

    store.deleteTable('t1').subscribe();

    expect(deleteTable).toHaveBeenCalledWith('e1', 't1');
    expect(getLayout).toHaveBeenCalledWith('e1');
  });

  it('does not touch state (no loading flash) when a mutation reloads the layout', () => {
    const store = createStore({
      getLayout: () => of(layout()),
      createTables: () => of([table()]),
    });
    store.load('e1');

    store.createTables({ name: 'Table', shape: 'Round', seatCount: 8, count: 1 }).subscribe();

    expect(store.state()).toBe('ready');
  });

  // ---- Debounced batch queue (seat assignment + table position drags) ----
  describe('batched assignment', () => {
    const tableWithSeats = (): SeatingLayout['tables'][number] =>
      table({
        seats: [
          { seatIndex: 0, guestId: null, guestName: null },
          { seatIndex: 1, guestId: null, guestName: null },
        ],
      });

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('assigns a guest to a seat optimistically, before any flush', () => {
      const store = createStore({ getLayout: () => of(layout({ tables: [tableWithSeats()] })) });
      store.load('e1');

      store.assignGuest('g1', 't1', 0);

      expect(store.tables()[0].seats[0]).toEqual({
        seatIndex: 0,
        guestId: 'g1',
        guestName: 'Amara Okoye',
        isReservedForParty: false,
        partyOwnerGuestId: 'g1',
      });
      expect(store.saveState()).toBe('unsaved');
    });

    it('removes an assigned guest from the floating list immediately', () => {
      const store = createStore({ getLayout: () => of(layout({ tables: [tableWithSeats()] })) });
      store.load('e1');

      store.assignGuest('g1', 't1', 0);

      expect(store.floatingGuests().map((g) => g.id)).not.toContain('g1');
    });

    it('marks the drag gesture consumed when assignGuest runs, for the "drop guest out" fallback to distinguish a real reassignment from an open-space release', () => {
      const store = createStore({ getLayout: () => of(layout({ tables: [tableWithSeats()] })) });
      store.load('e1');

      store.beginDragGesture();
      expect(store.wasDragGestureConsumed()).toBe(false);

      store.assignGuest('g1', 't1', 0);

      expect(store.wasDragGestureConsumed()).toBe(true);
    });

    it('marks the drag gesture consumed when unassignGuest runs', () => {
      const store = createStore({ getLayout: () => of(layout({ tables: [tableWithSeats()] })) });
      store.load('e1');
      store.assignGuest('g1', 't1', 0);

      store.beginDragGesture();
      expect(store.wasDragGestureConsumed()).toBe(false);

      store.unassignGuest('g1');

      expect(store.wasDragGestureConsumed()).toBe(true);
    });

    it('coalesces N rapid assignments into a single flushed batch request', () => {
      const applyAssignmentsBatch = vi.fn(() =>
        of({ layout: layout({ tables: [tableWithSeats()] }), opResults: [] }),
      );
      const store = createStore({
        getLayout: () => of(layout({ tables: [tableWithSeats()] })),
        applyAssignmentsBatch,
      });
      store.load('e1');

      store.assignGuest('g1', 't1', 0);
      store.assignGuest('g1', 't1', 1); // same guest, moved — last-write-wins, still one op
      vi.advanceTimersByTime(FLUSH_DEBOUNCE_MS);

      expect(applyAssignmentsBatch).toHaveBeenCalledTimes(1);
      expect(applyAssignmentsBatch).toHaveBeenCalledWith('e1', [{ op: 'Assign', guestId: 'g1', tableId: 't1', seatIndex: 1 }]);
    });

    it('does not flush before the debounce window elapses', () => {
      const applyAssignmentsBatch = vi.fn(() => of({ layout: layout(), opResults: [] }));
      const store = createStore({
        getLayout: () => of(layout({ tables: [tableWithSeats()] })),
        applyAssignmentsBatch,
      });
      store.load('e1');

      store.assignGuest('g1', 't1', 0);
      vi.advanceTimersByTime(FLUSH_DEBOUNCE_MS - 100);

      expect(applyAssignmentsBatch).not.toHaveBeenCalled();
    });

    it('goes Unsaved -> Saving -> Saved across the debounce/flush cycle', () => {
      const applyAssignmentsBatch = vi.fn(() => of({ layout: layout({ tables: [tableWithSeats()] }), opResults: [] }));
      const store = createStore({
        getLayout: () => of(layout({ tables: [tableWithSeats()] })),
        applyAssignmentsBatch,
      });
      store.load('e1');

      store.assignGuest('g1', 't1', 0);
      expect(store.saveState()).toBe('unsaved');

      vi.advanceTimersByTime(FLUSH_DEBOUNCE_MS);
      expect(store.saveState()).toBe('saved');
    });

    it('force-flushes immediately without waiting for the debounce window', () => {
      const applyAssignmentsBatch = vi.fn(() => of({ layout: layout({ tables: [tableWithSeats()] }), opResults: [] }));
      const store = createStore({
        getLayout: () => of(layout({ tables: [tableWithSeats()] })),
        applyAssignmentsBatch,
      });
      store.load('e1');

      store.assignGuest('g1', 't1', 0);
      store.forceFlush();

      expect(applyAssignmentsBatch).toHaveBeenCalledTimes(1);
    });

    it('flushes on destroy (leaving the tab) even if the debounce has not elapsed', () => {
      const applyAssignmentsBatch = vi.fn(() => of({ layout: layout({ tables: [tableWithSeats()] }), opResults: [] }));
      const store = createStore({
        getLayout: () => of(layout({ tables: [tableWithSeats()] })),
        applyAssignmentsBatch,
      });
      store.load('e1');

      store.assignGuest('g1', 't1', 0);
      store.ngOnDestroy();

      expect(applyAssignmentsBatch).toHaveBeenCalledTimes(1);
    });

    it('rolls back the optimistic change and re-queues on a hard failure', () => {
      const applyAssignmentsBatch = vi.fn(() => throwError(() => ({ kind: 'server', message: 'Boom' })));
      const store = createStore({
        getLayout: () => of(layout({ tables: [tableWithSeats()] })),
        applyAssignmentsBatch,
      });
      store.load('e1');

      store.assignGuest('g1', 't1', 0);
      vi.advanceTimersByTime(FLUSH_DEBOUNCE_MS);

      expect(store.tables()[0].seats[0].guestId).toBeNull();
      expect(store.saveState()).toBe('error');

      // re-queued: the retry fires on the next debounce tick
      applyAssignmentsBatch.mockClear();
      vi.advanceTimersByTime(FLUSH_DEBOUNCE_MS);
      expect(applyAssignmentsBatch).toHaveBeenCalledTimes(1);
    });

    it('reconciles against the server-authoritative layout on a partial conflict', () => {
      const serverLayout = layout({
        tables: [table({ seats: [{ seatIndex: 0, guestId: 'g2', guestName: 'Someone Else' }, { seatIndex: 1, guestId: null, guestName: null }] })],
      });
      const applyAssignmentsBatch = vi.fn(() =>
        of({ layout: serverLayout, opResults: [{ guestId: 'g1', status: 'Conflict' as const }] }),
      );
      const store = createStore({
        getLayout: () => of(layout({ tables: [tableWithSeats()] })),
        applyAssignmentsBatch,
      });
      store.load('e1');

      store.assignGuest('g1', 't1', 0);
      vi.advanceTimersByTime(FLUSH_DEBOUNCE_MS);

      expect(store.tables()).toEqual(serverLayout.tables);
      expect(store.saveState()).toBe('error');
      expect(store.actionError()).toBeTruthy();
    });

    it('moveTable optimistically updates position and batches via the position queue', () => {
      const applyTablePositionsBatch = vi.fn(() => of([{ tableId: 't1', status: 'Applied' as const }]));
      const store = createStore({
        getLayout: () => of(layout({ tables: [table()] })),
        applyTablePositionsBatch,
      });
      store.load('e1');

      store.moveTable('t1', 42, 84, 90);
      expect(store.tables()[0]).toMatchObject({ positionX: 42, positionY: 84, rotation: 90 });

      vi.advanceTimersByTime(FLUSH_DEBOUNCE_MS);
      expect(applyTablePositionsBatch).toHaveBeenCalledWith('e1', [{ tableId: 't1', positionX: 42, positionY: 84, rotation: 90 }]);
    });

    it('force-flushes assignment and position queues independently', () => {
      const applyAssignmentsBatch = vi.fn(() => of({ layout: layout({ tables: [tableWithSeats()] }), opResults: [] }));
      const applyTablePositionsBatch = vi.fn(() => of([{ tableId: 't1', status: 'Applied' as const }]));
      const store = createStore({
        getLayout: () => of(layout({ tables: [tableWithSeats()] })),
        applyAssignmentsBatch,
        applyTablePositionsBatch,
      });
      store.load('e1');

      store.assignGuest('g1', 't1', 0);
      store.moveTable('t1', 1, 2, 0);
      store.forceFlush();

      expect(applyAssignmentsBatch).toHaveBeenCalledTimes(1);
      expect(applyTablePositionsBatch).toHaveBeenCalledTimes(1);
    });
  });
});
