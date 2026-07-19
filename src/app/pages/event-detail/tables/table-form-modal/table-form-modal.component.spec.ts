import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { SeatingStore } from '../../../../core/seating/seating-store';
import { SeatingTable } from '../../../../core/seating/seating-table.model';
import { TableFormModalComponent } from './table-form-modal.component';

function makeTable(overrides: Partial<SeatingTable> = {}): SeatingTable {
  return {
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
  };
}

function setup(store: Partial<SeatingStore>) {
  TestBed.configureTestingModule({
    imports: [TableFormModalComponent],
    providers: [{ provide: SeatingStore, useValue: store }],
  });
  const fixture = TestBed.createComponent(TableFormModalComponent);
  fixture.componentInstance.visible = true;
  fixture.componentInstance.ngOnChanges({ visible: { currentValue: true, previousValue: false, firstChange: true, isFirstChange: () => true } });
  fixture.detectChanges();
  return fixture;
}

describe('TableFormModalComponent', () => {
  it('defaults to create mode with an empty form', () => {
    const fixture = setup({});
    const c = fixture.componentInstance;

    expect(c.isEditMode).toBe(false);
    expect(c.form.controls.name.value).toBe('');
    expect(c.form.controls.shape.value).toBe('Round');
    expect(c.form.controls.seatCount.value).toBe(8);
  });

  it('pre-fills the form in edit mode from the given table', () => {
    const fixture = setup({});
    fixture.componentInstance.table = makeTable({ name: 'Head table', shape: 'Long', seatCount: 6 });
    fixture.componentInstance.ngOnChanges({ visible: { currentValue: true, previousValue: true, firstChange: false, isFirstChange: () => false } });

    const c = fixture.componentInstance;
    expect(c.isEditMode).toBe(true);
    expect(c.form.controls.name.value).toBe('Head table');
    expect(c.form.controls.shape.value).toBe('Long');
    expect(c.form.controls.seatCount.value).toBe(6);
  });

  it('marks the name field invalid when blank and does not call the store on submit', () => {
    const createTables = vi.fn();
    const fixture = setup({ createTables });

    fixture.componentInstance.form.controls.name.setValue('');
    fixture.componentInstance.submit();

    expect(createTables).not.toHaveBeenCalled();
    expect(fixture.componentInstance.form.controls.name.touched).toBe(true);
  });

  it('previewChips shows Name · N · shape · seats chips when bulk count > 1', () => {
    const fixture = setup({});
    const c = fixture.componentInstance;
    c.form.controls.name.setValue('Table');
    c.form.controls.shape.setValue('Round');
    c.form.controls.seatCount.setValue(8);
    c.form.controls.bulkCount.setValue(3);

    expect(c.previewChips()).toEqual(['Table · 1 · round · 8', 'Table · 2 · round · 8', 'Table · 3 · round · 8']);
  });

  it('previewChips shows a single Name · shape · seats chip when bulk count is 1', () => {
    const fixture = setup({});
    const c = fixture.componentInstance;
    c.form.controls.name.setValue('Table');
    c.form.controls.shape.setValue('Long');
    c.form.controls.seatCount.setValue(6);
    c.form.controls.bulkCount.setValue(1);

    expect(c.previewChips()).toEqual(['Table · long · 6']);
  });

  it('changeSeats increments and decrements, clamped between 1 and 20', () => {
    const fixture = setup({});
    const c = fixture.componentInstance;
    c.form.controls.seatCount.setValue(1);

    c.changeSeats(-1);
    expect(c.seatCount).toBe(1);

    c.form.controls.seatCount.setValue(20);
    c.changeSeats(1);
    expect(c.seatCount).toBe(20);

    c.form.controls.seatCount.setValue(8);
    c.changeSeats(1);
    expect(c.seatCount).toBe(9);
  });

  it('changeBulkCount increments and decrements, clamped between 1 and 20', () => {
    const fixture = setup({});
    const c = fixture.componentInstance;
    c.form.controls.bulkCount.setValue(1);

    c.changeBulkCount(-1);
    expect(c.bulkCount).toBe(1);

    c.changeBulkCount(1);
    expect(c.bulkCount).toBe(2);
  });

  it('calls createTables with the form values and closes on success', () => {
    const createTables = vi.fn(() => of([makeTable()]));
    const fixture = setup({ createTables });
    const closedSpy = vi.fn();
    fixture.componentInstance.closed.subscribe(closedSpy);

    const c = fixture.componentInstance;
    c.form.setValue({ name: '  Head table  ', shape: 'Long', seatCount: 6, bulkCount: 2 });
    c.submit();

    expect(createTables).toHaveBeenCalledWith({ name: 'Head table', shape: 'Long', seatCount: 6, count: 2 });
    expect(closedSpy).toHaveBeenCalledOnce();
    expect(c.saving()).toBe(false);
  });

  it('calls updateTable in edit mode and closes on success', () => {
    const updateTable = vi.fn(() => of(makeTable()));
    const fixture = setup({ updateTable });
    fixture.componentInstance.table = makeTable({ isFull: true });
    fixture.componentInstance.ngOnChanges({ visible: { currentValue: true, previousValue: true, firstChange: false, isFirstChange: () => false } });
    const closedSpy = vi.fn();
    fixture.componentInstance.closed.subscribe(closedSpy);

    fixture.componentInstance.form.controls.name.setValue('Renamed');
    fixture.componentInstance.submit();

    expect(updateTable).toHaveBeenCalledWith('t1', { name: 'Renamed', shape: 'Round', seatCount: 8, isFull: true });
    expect(closedSpy).toHaveBeenCalledOnce();
  });

  it('shows a friendly error and stays open when the mutation fails', () => {
    const createTables = vi.fn(() => throwError(() => ({ message: 'Server said no.' })));
    const fixture = setup({ createTables });
    const closedSpy = vi.fn();
    fixture.componentInstance.closed.subscribe(closedSpy);

    fixture.componentInstance.form.controls.name.setValue('Table');
    fixture.componentInstance.submit();

    expect(fixture.componentInstance.error()).toBe('Server said no.');
    expect(fixture.componentInstance.saving()).toBe(false);
    expect(closedSpy).not.toHaveBeenCalled();
  });

  it('shows a saving indicator while a mutation is pending', () => {
    const pending = new Subject<SeatingTable[]>();
    const fixture = setup({ createTables: () => pending.asObservable() });

    fixture.componentInstance.form.controls.name.setValue('Table');
    fixture.componentInstance.submit();

    expect(fixture.componentInstance.saving()).toBe(true);
  });

  it('reports an invalid field count when the name is blank, and clears once filled in', () => {
    const fixture = setup({});
    const c = fixture.componentInstance;

    c.form.controls.name.setValue('');
    c.submit();
    expect(c.invalidCount()).toBe(1);

    c.form.controls.name.setValue('Table');
    expect(c.invalidCount()).toBe(0);
  });

  it('does not render a Delete table action', () => {
    const fixture = setup({});
    fixture.componentInstance.table = makeTable();
    fixture.componentInstance.ngOnChanges({ visible: { currentValue: true, previousValue: true, firstChange: false, isFirstChange: () => false } });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Delete table');
  });
});
