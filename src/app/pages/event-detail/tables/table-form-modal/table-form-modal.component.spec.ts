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

  it('previewNames shows Name · N chips when bulk count > 1', () => {
    const fixture = setup({});
    const c = fixture.componentInstance;
    c.form.controls.name.setValue('Table');
    c.form.controls.bulkCount.setValue(3);

    expect(c.previewNames()).toEqual(['Table · 1', 'Table · 2', 'Table · 3']);
  });

  it('previewNames shows just the plain name when bulk count is 1', () => {
    const fixture = setup({});
    const c = fixture.componentInstance;
    c.form.controls.name.setValue('Table');
    c.form.controls.bulkCount.setValue(1);

    expect(c.previewNames()).toEqual(['Table']);
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

  it('requires a second click to actually delete', () => {
    const deleteTable = vi.fn(() => of(undefined));
    const fixture = setup({ deleteTable });
    fixture.componentInstance.table = makeTable();
    fixture.componentInstance.ngOnChanges({ visible: { currentValue: true, previousValue: true, firstChange: false, isFirstChange: () => false } });

    fixture.componentInstance.requestDelete();
    expect(fixture.componentInstance.confirmingDelete()).toBe(true);
    expect(deleteTable).not.toHaveBeenCalled();

    fixture.componentInstance.requestDelete();
    expect(deleteTable).toHaveBeenCalledWith('t1');
  });

  it('shows a saving indicator while a mutation is pending', () => {
    const pending = new Subject<SeatingTable[]>();
    const fixture = setup({ createTables: () => pending.asObservable() });

    fixture.componentInstance.form.controls.name.setValue('Table');
    fixture.componentInstance.submit();

    expect(fixture.componentInstance.saving()).toBe(true);
  });
});
