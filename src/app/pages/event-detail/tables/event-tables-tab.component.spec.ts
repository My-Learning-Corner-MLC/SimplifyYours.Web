import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { GuestApiClient } from '../../../core/guests/guest-api-client';
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
            gender: 'Female',
            relationship: null,
            side: null,
            plusOnes: 0,
            dietaryNotes: null,
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
});
