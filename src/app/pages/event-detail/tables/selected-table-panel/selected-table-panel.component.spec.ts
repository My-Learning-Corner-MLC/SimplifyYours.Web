import { TestBed } from '@angular/core/testing';

import { SeatingTable } from '../../../../core/seating/seating-table.model';
import { SelectedTablePanelComponent } from './selected-table-panel.component';

function makeTable(overrides: Partial<SeatingTable> = {}): SeatingTable {
  return {
    id: 't1',
    name: 'Table 1',
    shape: 'Round',
    seatCount: 4,
    isFull: false,
    positionX: 100,
    positionY: 200,
    rotation: 0,
    seats: [
      { seatIndex: 0, guestId: 'g1', guestName: 'Amara Okoye' },
      { seatIndex: 1, guestId: null, guestName: null },
    ],
    ...overrides,
  };
}

function setup(table: SeatingTable | null) {
  TestBed.configureTestingModule({ imports: [SelectedTablePanelComponent] });
  const fixture = TestBed.createComponent(SelectedTablePanelComponent);
  fixture.componentRef.setInput('table', table);
  fixture.detectChanges();
  return fixture;
}

describe('SelectedTablePanelComponent', () => {
  it('shows a placeholder when no table is selected', () => {
    const fixture = setup(null);

    expect(fixture.nativeElement.textContent).toContain('Select a table on the floor plan');
  });

  it('shows the table name, position, and seated count', () => {
    const fixture = setup(makeTable());

    expect(fixture.nativeElement.textContent).toContain('Table 1');
    expect(fixture.nativeElement.textContent).toContain('100');
    expect(fixture.nativeElement.textContent).toContain('200');
    expect(fixture.nativeElement.textContent).toContain('1 / 4');
  });

  it('shows "Not placed yet" for a table without a position', () => {
    const fixture = setup(makeTable({ positionX: null, positionY: null }));

    expect(fixture.nativeElement.textContent).toContain('Not placed yet');
  });

  it('lists the seated guests', () => {
    const fixture = setup(makeTable());

    const items = fixture.nativeElement.querySelectorAll('.selected-panel__guests li');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('Amara Okoye');
  });

  it('emits editTable/markFull/deleteTable when their buttons are clicked', () => {
    const fixture = setup(makeTable());
    const editSpy = vi.fn();
    const fullSpy = vi.fn();
    const deleteSpy = vi.fn();
    fixture.componentInstance.editTable.subscribe(editSpy);
    fixture.componentInstance.markFull.subscribe(fullSpy);
    fixture.componentInstance.deleteTable.subscribe(deleteSpy);

    const buttons = fixture.nativeElement.querySelectorAll('.selected-panel__btn');
    buttons[0].click();
    buttons[1].click();
    buttons[2].click();

    expect(editSpy).toHaveBeenCalledOnce();
    expect(fullSpy).toHaveBeenCalledOnce();
    expect(deleteSpy).toHaveBeenCalledOnce();
  });
});
