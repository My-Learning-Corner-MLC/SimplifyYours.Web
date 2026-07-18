import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { GuestApiClient } from '../../../core/guests/guest-api-client';
import { GuestListStore } from '../../../core/guests/guest-list-store';
import { SeatingApiClient } from '../../../core/seating/seating-api-client';
import { SeatingLayout } from '../../../core/seating/seating-layout.model';
import { SeatingStore } from '../../../core/seating/seating-store';
import { EventTablesTabComponent } from './event-tables-tab.component';

const layout = (overrides: Partial<SeatingLayout> = {}): SeatingLayout => ({
  eventId: 'e1',
  tables: [],
  areas: [],
  summary: { tableCount: 0, seatCount: 0, seatedCount: 0, floatingCount: 0 },
  ...overrides,
});

function setup(seatingApi: Partial<SeatingApiClient>, guestApi: Partial<GuestApiClient> = { listGuests: () => of([]) }) {
  // Safe no-op defaults for the flush endpoints — SeatingStore.ngOnDestroy
  // force-flushes any pending batch on TestBed teardown.
  const seatingApiWithDefaults: Partial<SeatingApiClient> = {
    applyAssignmentsBatch: () => of({ layout: layout(), opResults: [] }),
    applyTablePositionsBatch: () => of([]),
    ...seatingApi,
  };
  TestBed.configureTestingModule({
    imports: [EventTablesTabComponent],
    providers: [
      SeatingStore,
      GuestListStore,
      { provide: SeatingApiClient, useValue: seatingApiWithDefaults },
      { provide: GuestApiClient, useValue: guestApi },
    ],
  });
  const fixture = TestBed.createComponent(EventTablesTabComponent);
  fixture.componentInstance.eventId = 'e1';
  fixture.detectChanges();
  const store = fixture.debugElement.injector.get(SeatingStore);
  return { fixture, store };
}

describe('EventTablesTabComponent', () => {
  it('shows a loading state before the layout resolves', () => {
    const pending = new Subject<SeatingLayout>();
    const { fixture } = setup({ getLayout: () => pending.asObservable() });

    expect(fixture.nativeElement.querySelector('[data-testid="tables-tab-loading"]')).toBeTruthy();

    pending.next(layout());
    pending.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="tables-tab-loading"]')).toBeFalsy();
  });

  it('shows the empty state when there are no tables', () => {
    const { fixture } = setup({ getLayout: () => of(layout()) });

    expect(fixture.nativeElement.querySelector('[data-testid="event-detail-tables"]')).toBeTruthy();
  });

  it('shows the grid with table cards when tables exist', () => {
    const { fixture } = setup({
      getLayout: () =>
        of(
          layout({
            tables: [
              {
                id: 't1',
                name: 'Table 1',
                shape: 'Round',
                seatCount: 8,
                isFull: false,
                positionX: null,
                positionY: null,
                rotation: 0,
                seats: Array.from({ length: 8 }, (_, i) => ({ seatIndex: i, guestId: null, guestName: null })),
              },
            ],
            summary: { tableCount: 1, seatCount: 8, seatedCount: 0, floatingCount: 1 },
          }),
        ),
    });

    const cards = fixture.nativeElement.querySelectorAll('[data-testid="table-card"]');
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain('Table 1');
    expect(cards[0].textContent).toContain('0 / 8 seated');
  });

  it('shows an error state and allows retry when the load fails', () => {
    let calls = 0;
    const { fixture } = setup({
      getLayout: () => {
        calls++;
        return calls === 1 ? throwError(() => ({ kind: 'server', message: 'Boom' })) : of(layout());
      },
    });

    const errorEl = fixture.nativeElement.querySelector('[data-testid="tables-tab-error"]');
    expect(errorEl?.textContent).toContain('Boom');

    fixture.nativeElement.querySelector('[data-testid="tables-tab-error"] button').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="tables-tab-ready"]')).toBeFalsy();
    expect(calls).toBe(2);
  });

  it('reloads when eventId changes', () => {
    const getLayout = vi.fn(() => of(layout()));
    const { fixture } = setup({ getLayout });
    getLayout.mockClear();

    fixture.componentInstance.eventId = 'e2';
    fixture.componentInstance.ngOnChanges({
      eventId: { currentValue: 'e2', previousValue: 'e1', firstChange: false, isFirstChange: () => false },
    });

    expect(getLayout).toHaveBeenCalledWith('e2');
  });

  describe('seat assignment wiring', () => {
    const guestApiWithG1: Partial<GuestApiClient> = {
      listGuests: () =>
        of([
          {
            id: 'g1',
            firstName: 'Amara',
            lastName: 'Okoye',
            phoneNumber: '',
            emailAddress: null,
            eventMetadata: null,
            createdAt: '2026-01-01T00:00:00+00:00',
          },
        ]),
    };

    const tableWithSeats = () => ({
      id: 't1',
      name: 'Table 1',
      shape: 'Round' as const,
      seatCount: 2,
      isFull: false,
      positionX: null,
      positionY: null,
      rotation: 0,
      seats: [
        { seatIndex: 0, guestId: null, guestName: null },
        { seatIndex: 1, guestId: null, guestName: null },
      ],
    });

    it('assigns a guest and clears assigning mode when a seat is dropped on', () => {
      const applyAssignmentsBatch = vi.fn(() => of({ layout: layout(), opResults: [] }));
      const { fixture, store } = setup(
        { getLayout: () => of(layout({ tables: [tableWithSeats()] })), applyAssignmentsBatch },
        guestApiWithG1,
      );
      fixture.componentInstance.assigningGuestId.set('g1');

      fixture.componentInstance.onSeatDrop(tableWithSeats(), { seatIndex: 0, guestId: 'g1' });

      expect(store.tables()[0].seats[0].guestId).toBe('g1');
      expect(fixture.componentInstance.assigningGuestId()).toBeNull();
      expect(fixture.componentInstance.announcement()).toContain('Amara Okoye');
    });

    it('toggles assigning mode on guestSelected, and clears it if the same guest is selected again', () => {
      const { fixture } = setup({ getLayout: () => of(layout({ tables: [tableWithSeats()] })) });

      fixture.componentInstance.onGuestSelected('g1');
      expect(fixture.componentInstance.assigningGuestId()).toBe('g1');

      fixture.componentInstance.onGuestSelected('g1');
      expect(fixture.componentInstance.assigningGuestId()).toBeNull();
    });

    it('clears assigning mode on Escape', () => {
      const { fixture } = setup({ getLayout: () => of(layout()) });
      fixture.componentInstance.assigningGuestId.set('g1');

      fixture.componentInstance.onEscape();

      expect(fixture.componentInstance.assigningGuestId()).toBeNull();
    });

    it('marks isDraggingSeatedGuest true on seat drag start, false once the drag ends (drives the floating panel\'s drop hint)', () => {
      // jsdom does not implement elementFromPoint — stub it so
      // onSeatDragEndedOutside's own hit-testing doesn't throw.
      const hadElementFromPoint = 'elementFromPoint' in document;
      document.elementFromPoint = vi.fn().mockReturnValue(null);
      try {
        const { fixture } = setup({ getLayout: () => of(layout()) });
        expect(fixture.componentInstance.isDraggingSeatedGuest()).toBe(false);

        fixture.componentInstance.onSeatDragStarted();
        expect(fixture.componentInstance.isDraggingSeatedGuest()).toBe(true);

        fixture.componentInstance.onSeatDragEndedOutside({ guestId: 'g1', dropPoint: { x: 0, y: 0 } });
        expect(fixture.componentInstance.isDraggingSeatedGuest()).toBe(false);
      } finally {
        if (!hadElementFromPoint) {
          // @ts-expect-error - removing the jsdom-incompatible stub after the test
          delete document.elementFromPoint;
        }
      }
    });

    it('force-flushes pending changes when switching Grid <-> Floor plan', () => {
      const applyAssignmentsBatch = vi.fn(() => of({ layout: layout({ tables: [tableWithSeats()] }), opResults: [] }));
      const { fixture, store } = setup(
        { getLayout: () => of(layout({ tables: [tableWithSeats()] })), applyAssignmentsBatch },
        guestApiWithG1,
      );
      store.assignGuest('g1', 't1', 0);
      applyAssignmentsBatch.mockClear();

      fixture.componentInstance.setView('floor');

      expect(applyAssignmentsBatch).toHaveBeenCalledTimes(1);
    });

    it('force-flushes pending changes on beforeunload', () => {
      const applyAssignmentsBatch = vi.fn(() => of({ layout: layout({ tables: [tableWithSeats()] }), opResults: [] }));
      const { fixture, store } = setup(
        { getLayout: () => of(layout({ tables: [tableWithSeats()] })), applyAssignmentsBatch },
        guestApiWithG1,
      );
      store.assignGuest('g1', 't1', 0);
      applyAssignmentsBatch.mockClear();

      fixture.componentInstance.onBeforeUnload();

      expect(applyAssignmentsBatch).toHaveBeenCalledTimes(1);
    });

    it('unseats a guest via onGuestUnseated', () => {
      const { fixture, store } = setup({
        getLayout: () =>
          of(
            layout({
              tables: [
                {
                  ...tableWithSeats(),
                  seats: [
                    { seatIndex: 0, guestId: 'g1', guestName: 'Amara Okoye' },
                    { seatIndex: 1, guestId: null, guestName: null },
                  ],
                },
              ],
            }),
          ),
      });

      fixture.componentInstance.onGuestUnseated('g1');

      expect(store.tables()[0].seats[0].guestId).toBeNull();
      expect(fixture.componentInstance.announcement()).toContain('Amara Okoye');
    });
  });

  describe('a missed seat drop only unseats the guest when released onto the floating-guests panel', () => {
    const guestApiWithG1: Partial<GuestApiClient> = {
      listGuests: () =>
        of([
          {
            id: 'g1',
            firstName: 'Amara',
            lastName: 'Okoye',
            phoneNumber: '',
            emailAddress: null,
            eventMetadata: null,
            createdAt: '2026-01-01T00:00:00+00:00',
          },
        ]),
    };

    const seatedTable = () => ({
      id: 't1',
      name: 'Table 1',
      shape: 'Round' as const,
      seatCount: 2,
      isFull: false,
      positionX: null,
      positionY: null,
      rotation: 0,
      seats: [
        { seatIndex: 0, guestId: 'g1', guestName: 'Amara Okoye' },
        { seatIndex: 1, guestId: null, guestName: null },
      ],
    });

    // onSeatDragEndedOutside hit-tests the real DOM via document.elementFromPoint
    // (see event-tables-tab.component.ts) rather than bounding-box math, so it's
    // correct regardless of scroll position or which sub-area of a panel was
    // under the pointer. jsdom doesn't implement elementFromPoint at all, so it
    // must be assigned directly (vi.spyOn requires the property to pre-exist).
    function stubElementFromPoint(element: Element | null) {
      document.elementFromPoint = vi.fn().mockReturnValue(element);
    }

    afterEach(() => {
      // @ts-expect-error - removing the jsdom-incompatible stub between tests
      delete document.elementFromPoint;
    });

    it('leaves the guest seated when the drag was not claimed by any drop list and the release landed inside the room panel but not on the floating panel — only a genuine drop onto the floating panel unseats', () => {
      const { fixture, store } = setup({ getLayout: () => of(layout({ tables: [seatedTable()] })) });
      const roomPanel = fixture.nativeElement.querySelector('.tables-tab__room-panel');
      stubElementFromPoint(roomPanel);
      fixture.componentInstance.onSeatDragStarted();

      fixture.componentInstance.onSeatDragEndedOutside({ guestId: 'g1', dropPoint: { x: 250, y: 250 } });

      expect(store.tables()[0].seats[0].guestId).toBe('g1');
    });

    it('unseats the guest when the release landed on the floating-guests panel', () => {
      const { fixture, store } = setup({ getLayout: () => of(layout({ tables: [seatedTable()] })) });
      const floatingPanel = fixture.nativeElement.querySelector('[data-testid="floating-guests-panel"]');
      stubElementFromPoint(floatingPanel);
      fixture.componentInstance.onSeatDragStarted();

      fixture.componentInstance.onSeatDragEndedOutside({ guestId: 'g1', dropPoint: { x: 900, y: 250 } });

      expect(store.tables()[0].seats[0].guestId).toBeNull();
    });

    it('does nothing when the release landed outside both panels', () => {
      const { fixture, store } = setup({ getLayout: () => of(layout({ tables: [seatedTable()] })) });
      stubElementFromPoint(document.body);
      fixture.componentInstance.onSeatDragStarted();

      fixture.componentInstance.onSeatDragEndedOutside({ guestId: 'g1', dropPoint: { x: 9999, y: 9999 } });

      expect(store.tables()[0].seats[0].guestId).toBe('g1');
    });

    it('does nothing when elementFromPoint finds nothing at the release point', () => {
      const { fixture, store } = setup({ getLayout: () => of(layout({ tables: [seatedTable()] })) });
      stubElementFromPoint(null);
      fixture.componentInstance.onSeatDragStarted();

      fixture.componentInstance.onSeatDragEndedOutside({ guestId: 'g1', dropPoint: { x: 0, y: 0 } });

      expect(store.tables()[0].seats[0].guestId).toBe('g1');
    });

    it('does nothing when a drop list already claimed the gesture (e.g. reassigned to another seat)', () => {
      const { fixture, store } = setup(
        { getLayout: () => of(layout({ tables: [seatedTable()] })) },
        guestApiWithG1,
      );
      const roomPanel = fixture.nativeElement.querySelector('.tables-tab__room-panel');
      stubElementFromPoint(roomPanel);
      fixture.componentInstance.onSeatDragStarted();
      store.assignGuest('g1', 't1', 1);

      fixture.componentInstance.onSeatDragEndedOutside({ guestId: 'g1', dropPoint: { x: 250, y: 250 } });

      expect(store.tables()[0].seats[1].guestId).toBe('g1');
    });
  });

  describe('floor-plan view', () => {
    const tableAt = (x: number | null, y: number | null) => ({
      id: 't1',
      name: 'Table 1',
      shape: 'Round' as const,
      seatCount: 4,
      isFull: false,
      positionX: x,
      positionY: y,
      rotation: 0,
      seats: [],
    });

    it('selects a table and exposes it via selectedTable', () => {
      const { fixture } = setup({ getLayout: () => of(layout({ tables: [tableAt(10, 20)] })) });

      fixture.componentInstance.selectTable('t1');

      expect(fixture.componentInstance.selectedTable()?.id).toBe('t1');
    });

    it('moves a table via onTableMoved', () => {
      const applyTablePositionsBatch = vi.fn(() => of([{ tableId: 't1', status: 'Applied' as const }]));
      const { fixture, store } = setup({
        getLayout: () => of(layout({ tables: [tableAt(10, 20)] })),
        applyTablePositionsBatch,
      });

      fixture.componentInstance.onTableMoved({ tableId: 't1', positionX: 50, positionY: 60, rotation: 0 });

      expect(store.tables()[0]).toMatchObject({ positionX: 50, positionY: 60 });
    });

    it('deleteSelectedTable clears the selection after deleting', () => {
      const deleteTable = vi.fn(() => of(undefined));
      const { fixture } = setup({
        getLayout: () => of(layout({ tables: [tableAt(10, 20)] })),
        deleteTable,
      });
      fixture.componentInstance.selectTable('t1');
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      fixture.componentInstance.deleteSelectedTable();

      expect(deleteTable).toHaveBeenCalledWith('e1', 't1');
      expect(fixture.componentInstance.selectedTableId()).toBeNull();
    });

    it('editSelectedTable opens the modal with the selected table', () => {
      const { fixture } = setup({ getLayout: () => of(layout({ tables: [tableAt(10, 20)] })) });
      fixture.componentInstance.selectTable('t1');

      fixture.componentInstance.editSelectedTable();

      expect(fixture.componentInstance.formModalOpen()).toBe(true);
      expect(fixture.componentInstance.editingTable()?.id).toBe('t1');
    });

    it('createRoomElement creates the preset area directly, without opening the modal', () => {
      const createArea = vi.fn(() =>
        of({
          id: 'a1',
          name: 'Stage',
          kind: 'Stage' as const,
          shape: 'Rect' as const,
          width: 3.4,
          height: 0.9,
          positionX: null,
          positionY: null,
          rotation: 0,
          color: '#5A2849',
          capacity: null,
        }),
      );
      const { fixture } = setup({ getLayout: () => of(layout()), createArea });

      fixture.componentInstance.createRoomElement({
        kind: 'Stage',
        label: 'Stage',
        defaultShape: 'Rect',
        defaultWidth: 3.4,
        defaultHeight: 0.9,
        defaultColor: '#5A2849',
      });

      expect(createArea).toHaveBeenCalledWith('e1', {
        name: 'Stage',
        kind: 'Stage',
        shape: 'Rect',
        width: 3.4,
        height: 0.9,
        color: '#5A2849',
        capacity: null,
      });
      expect(fixture.componentInstance.areaModalOpen()).toBe(false);
    });
  });
});
