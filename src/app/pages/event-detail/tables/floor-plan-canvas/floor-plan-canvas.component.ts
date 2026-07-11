import { CdkDrag, CdkDragEnd, DragDropModule } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, input, signal } from '@angular/core';

import { SeatingTable } from '../../../../core/seating/seating-table.model';

export interface TableMoveIntent {
  readonly tableId: string;
  readonly positionX: number;
  readonly positionY: number;
  readonly rotation: number;
}

interface TableVm {
  readonly table: SeatingTable;
  readonly x: number;
  readonly y: number;
}

// Auto-arrange fallback for tables that haven't been placed on the floor plan
// yet (positionX/Y null) — a simple grid so every table starts visible and
// draggable rather than stacked at the origin.
const FALLBACK_COLUMN_COUNT = 4;
const FALLBACK_SPACING = 160;
const FALLBACK_ORIGIN = 60;
const GRID_SIZE = 20;

/**
 * Room canvas for the Floor plan view: tables are free-draggable (CDK,
 * absolute-position pattern — see onTableDragEnded) and go through the same
 * debounced batch queue as Grid-view seat drags (SeatingStore.moveTable),
 * not one request per pixel. Optional snap-to-grid rounds the dropped
 * position to the nearest GRID_SIZE.
 */
@Component({
  standalone: true,
  selector: 'app-floor-plan-canvas',
  imports: [DragDropModule],
  templateUrl: './floor-plan-canvas.component.html',
  styleUrl: './floor-plan-canvas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorPlanCanvasComponent {
  readonly tables = input.required<readonly SeatingTable[]>();
  readonly selectedTableId = input<string | null>(null);

  @Output() readonly tableSelected = new EventEmitter<string>();
  @Output() readonly tableMoved = new EventEmitter<TableMoveIntent>();

  readonly snapToGrid = signal(false);
  readonly zeroOffset = { x: 0, y: 0 };

  readonly tableVms = computed<TableVm[]>(() =>
    this.tables().map((table, index) => ({
      table,
      x: table.positionX ?? FALLBACK_ORIGIN + (index % FALLBACK_COLUMN_COUNT) * FALLBACK_SPACING,
      y: table.positionY ?? FALLBACK_ORIGIN + Math.floor(index / FALLBACK_COLUMN_COUNT) * FALLBACK_SPACING,
    })),
  );

  toggleSnap(): void {
    this.snapToGrid.update((value) => !value);
  }

  selectTable(tableId: string): void {
    this.tableSelected.emit(tableId);
  }

  onTableDragEnded(vm: TableVm, event: CdkDragEnd<unknown> & { source: CdkDrag }): void {
    let x = vm.x + event.distance.x;
    let y = vm.y + event.distance.y;
    if (this.snapToGrid()) {
      x = Math.round(x / GRID_SIZE) * GRID_SIZE;
      y = Math.round(y / GRID_SIZE) * GRID_SIZE;
    }
    event.source.reset();
    this.tableMoved.emit({ tableId: vm.table.id, positionX: x, positionY: y, rotation: vm.table.rotation });
  }
}
