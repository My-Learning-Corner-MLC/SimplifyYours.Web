import { TestBed } from '@angular/core/testing';

import { SeatingTable } from '../../../../core/seating/seating-table.model';
import { SeatingTableCardComponent } from './seating-table-card.component';

function makeTable(overrides: Partial<SeatingTable> = {}): SeatingTable {
  return {
    id: 't1',
    name: 'Table 1',
    shape: 'Round',
    seatCount: 4,
    isFull: false,
    positionX: null,
    positionY: null,
    rotation: 0,
    seats: [
      { seatIndex: 0, guestId: 'g1', guestName: 'Amara Okoye' },
      { seatIndex: 1, guestId: null, guestName: null },
      { seatIndex: 2, guestId: null, guestName: null },
      { seatIndex: 3, guestId: null, guestName: null },
    ],
    ...overrides,
  };
}

function setup(table: SeatingTable) {
  TestBed.configureTestingModule({ imports: [SeatingTableCardComponent] });
  const fixture = TestBed.createComponent(SeatingTableCardComponent);
  fixture.componentInstance.table = table;
  fixture.detectChanges();
  return fixture;
}

describe('SeatingTableCardComponent', () => {
  it('renders the table name and seated/total footer', () => {
    const fixture = setup(makeTable());

    expect(fixture.nativeElement.textContent).toContain('Table 1');
    expect(fixture.nativeElement.textContent).toContain('1 / 4 seated');
  });

  it('renders one seat element per seat, marking filled vs empty', () => {
    const fixture = setup(makeTable());

    const seats = fixture.nativeElement.querySelectorAll('.table-card__seat');
    expect(seats.length).toBe(4);
    const filled = fixture.nativeElement.querySelectorAll('.table-card__seat--filled');
    expect(filled.length).toBe(1);
    expect(filled[0].textContent.trim()).toBe('A');
  });

  it('shows a Full badge when the table is marked full', () => {
    const fixture = setup(makeTable({ isFull: true }));

    expect(fixture.nativeElement.querySelector('.table-card__full-badge')).toBeTruthy();
  });

  it('opens the actions menu and emits editTable when Edit is clicked', () => {
    const fixture = setup(makeTable());
    const editSpy = vi.fn();
    fixture.componentInstance.editTable.subscribe(editSpy);

    fixture.nativeElement.querySelector('.table-card__menu-btn').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.table-card__menu')).toBeTruthy();

    const editBtn = Array.from(fixture.nativeElement.querySelectorAll('[role="menuitem"]') as NodeListOf<HTMLElement>)
      .find((el) => el.textContent?.includes('Edit table'));
    editBtn!.click();

    expect(editSpy).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.menuOpen()).toBe(false);
  });

  it('emits deleteTable when Delete is clicked', () => {
    const fixture = setup(makeTable());
    const deleteSpy = vi.fn();
    fixture.componentInstance.deleteTable.subscribe(deleteSpy);

    fixture.nativeElement.querySelector('.table-card__menu-btn').click();
    fixture.detectChanges();
    const deleteBtn = Array.from(fixture.nativeElement.querySelectorAll('[role="menuitem"]') as NodeListOf<HTMLElement>)
      .find((el) => el.textContent?.includes('Delete table'));
    deleteBtn!.click();

    expect(deleteSpy).toHaveBeenCalledOnce();
  });

  it.each(['Round', 'Long', 'Square'] as const)('renders %s tables without error', (shape) => {
    const fixture = setup(makeTable({ shape, seatCount: 6, seats: Array.from({ length: 6 }, (_, i) => ({ seatIndex: i, guestId: null, guestName: null })) }));

    expect(fixture.nativeElement.querySelectorAll('.table-card__seat').length).toBe(6);
  });
});
