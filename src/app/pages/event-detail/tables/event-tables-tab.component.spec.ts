import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { GuestApiClient } from '../../../core/guests/guest-api-client';
import { SeatingApiClient } from '../../../core/seating/seating-api-client';
import { SeatingLayout } from '../../../core/seating/seating-layout.model';
import { EventTablesTabComponent } from './event-tables-tab.component';

const layout = (overrides: Partial<SeatingLayout> = {}): SeatingLayout => ({
  eventId: 'e1',
  tables: [],
  areas: [],
  summary: { tableCount: 0, seatCount: 0, seatedCount: 0, floatingCount: 0 },
  ...overrides,
});

function setup(seatingApi: Partial<SeatingApiClient>, guestApi: Partial<GuestApiClient> = { listGuests: () => of([]) }) {
  TestBed.configureTestingModule({
    imports: [EventTablesTabComponent],
    providers: [
      { provide: SeatingApiClient, useValue: seatingApi },
      { provide: GuestApiClient, useValue: guestApi },
    ],
  });
  const fixture = TestBed.createComponent(EventTablesTabComponent);
  fixture.componentInstance.eventId = 'e1';
  fixture.detectChanges();
  return fixture;
}

describe('EventTablesTabComponent', () => {
  it('shows a loading state before the layout resolves', () => {
    const pending = new Subject<SeatingLayout>();
    const fixture = setup({ getLayout: () => pending.asObservable() });

    expect(fixture.nativeElement.querySelector('[data-testid="tables-tab-loading"]')).toBeTruthy();

    pending.next(layout());
    pending.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="tables-tab-loading"]')).toBeFalsy();
  });

  it('shows the empty state when there are no tables', () => {
    const fixture = setup({ getLayout: () => of(layout()) });

    expect(fixture.nativeElement.querySelector('[data-testid="event-detail-tables"]')).toBeTruthy();
  });

  it('shows the grid with table cards when tables exist', () => {
    const fixture = setup({
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
    const fixture = setup({
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
    const fixture = setup({ getLayout });
    getLayout.mockClear();

    fixture.componentInstance.eventId = 'e2';
    fixture.componentInstance.ngOnChanges({
      eventId: { currentValue: 'e2', previousValue: 'e1', firstChange: false, isFirstChange: () => false },
    });

    expect(getLayout).toHaveBeenCalledWith('e2');
  });
});
