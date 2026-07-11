import { TestBed } from '@angular/core/testing';

import { SeatingTable } from '../../../../core/seating/seating-table.model';
import { FloorPlanCanvasComponent } from './floor-plan-canvas.component';

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

function setup(tables: SeatingTable[]) {
  TestBed.configureTestingModule({ imports: [FloorPlanCanvasComponent] });
  const fixture = TestBed.createComponent(FloorPlanCanvasComponent);
  fixture.componentRef.setInput('tables', tables);
  fixture.detectChanges();
  return fixture;
}

describe('FloorPlanCanvasComponent', () => {
  it('renders one element per table', () => {
    const fixture = setup([makeTable({ id: 't1' }), makeTable({ id: 't2', name: 'Table 2' })]);

    expect(fixture.nativeElement.querySelectorAll('[data-testid="floor-plan-table"]').length).toBe(2);
  });

  it('places an unplaced table at its auto-arranged fallback position', () => {
    const fixture = setup([makeTable({ positionX: null, positionY: null })]);

    expect(fixture.componentInstance.tableVms()[0]).toMatchObject({ x: 60, y: 60 });
  });

  it('uses the stored position for a placed table', () => {
    const fixture = setup([makeTable({ positionX: 200, positionY: 340 })]);

    expect(fixture.componentInstance.tableVms()[0]).toMatchObject({ x: 200, y: 340 });
  });

  it('emits tableSelected when a table is clicked', () => {
    const fixture = setup([makeTable({ id: 't1' })]);
    const spy = vi.fn();
    fixture.componentInstance.tableSelected.subscribe(spy);

    fixture.nativeElement.querySelector('[data-testid="floor-plan-table"]').click();

    expect(spy).toHaveBeenCalledWith('t1');
  });

  it('emits tableMoved with the absolute new position after a drag', () => {
    const fixture = setup([makeTable({ id: 't1', positionX: 100, positionY: 100, rotation: 15 })]);
    const spy = vi.fn();
    fixture.componentInstance.tableMoved.subscribe(spy);
    const reset = vi.fn();

    fixture.componentInstance.onTableDragEnded(fixture.componentInstance.tableVms()[0], {
      distance: { x: 30, y: -10 },
      source: { reset },
    } as never);

    expect(spy).toHaveBeenCalledWith({ tableId: 't1', positionX: 130, positionY: 90, rotation: 15 });
    expect(reset).toHaveBeenCalledOnce();
  });

  it('snaps the dropped position to the grid when enabled', () => {
    const fixture = setup([makeTable({ id: 't1', positionX: 103, positionY: 97 })]);
    fixture.componentInstance.toggleSnap();
    const spy = vi.fn();
    fixture.componentInstance.tableMoved.subscribe(spy);

    fixture.componentInstance.onTableDragEnded(fixture.componentInstance.tableVms()[0], {
      distance: { x: 4, y: 6 },
      source: { reset: vi.fn() },
    } as never);

    // 103+4=107 -> nearest 20 = 100; 97+6=103 -> nearest 20 = 100
    expect(spy).toHaveBeenCalledWith({ tableId: 't1', positionX: 100, positionY: 100, rotation: 0 });
  });

  it('toggles the snap-to-grid state', () => {
    const fixture = setup([]);
    expect(fixture.componentInstance.snapToGrid()).toBe(false);

    fixture.componentInstance.toggleSnap();

    expect(fixture.componentInstance.snapToGrid()).toBe(true);
  });
});
