import { CdkDrag, CdkDragEnd, DragDropModule } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, input, signal } from '@angular/core';

import { NgStyle } from '@angular/common';
import { AreaKind } from '../../../../core/seating/area-kind.model';
import { SeatingArea } from '../../../../core/seating/seating-area.model';
import { SeatingTable } from '../../../../core/seating/seating-table.model';
import { TableShape } from '../../../../core/seating/table-shape.model';
import { computeSeatPositions, guestTint } from '../../../../core/seating/seat-geometry';

export interface AreaMoveIntent {
  readonly areaId: string;
  readonly positionX: number;
  readonly positionY: number;
  readonly rotation: number;
}

export interface TableMoveIntent {
  readonly tableId: string;
  readonly positionX: number;
  readonly positionY: number;
  readonly rotation: number;
}

interface FloorSeatDot {
  readonly xPercent: number;
  readonly yPercent: number;
  readonly isOccupied: boolean;
  readonly tint: string | null;
}

interface TableVm {
  readonly table: SeatingTable;
  readonly x: number;
  readonly y: number;
  readonly containerWidth: number;
  readonly containerHeight: number;
  readonly seatDots: FloorSeatDot[];
  readonly occupiedCount: number;
}

// Container footprint (px) each table shape renders within on the canvas —
// a round/square table gets a squarish box with seats ringed around a
// circle; a long table gets a wide, short box with seats in two rows. The
// shared computeSeatPositions percentages apply to either box unchanged
// since left/top are independent per-axis percentages of *this* container.
const TABLE_CONTAINER_SIZE: Record<TableShape, { readonly width: number; readonly height: number }> = {
  Round: { width: 120, height: 120 },
  Square: { width: 120, height: 120 },
  Long: { width: 220, height: 64 },
};

// 1 metre ≈ 40px at the default canvas zoom level.
const METRE_PX = 40;

interface AreaVm {
  readonly area: SeatingArea;
  readonly x: number;
  readonly y: number;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly kindClass: string;
}

const AREA_KIND_CLASS: Record<AreaKind, string> = {
  Stage: 'floor-plan__area--stage',
  DanceFloor: 'floor-plan__area--dance-floor',
  Bar: 'floor-plan__area--bar',
  Entrance: 'floor-plan__area--entrance',
  Buffet: 'floor-plan__area--buffet',
  Cake: 'floor-plan__area--cake',
  Custom: 'floor-plan__area--custom',
};

// Auto-arrange fallback for tables/areas that haven't been placed on the
// floor plan yet (positionX/Y null) — a simple grid so everything starts
// visible and draggable rather than stacked at the origin.
const FALLBACK_COLUMN_COUNT = 4;
const FALLBACK_SPACING = 160;
const FALLBACK_ORIGIN = 60;
const GRID_SIZE = 20;

/**
 * Room canvas for the Floor plan view: tables are free-draggable (CDK,
 * absolute-position pattern — see onTableDragEnded) and go through the same
 * debounced batch queue as Grid-view seat drags (SeatingStore.moveTable),
 * not one request per pixel. Optional snap-to-grid rounds the dropped
 * position to the nearest GRID_SIZE. Tables render with a shape-appropriate
 * mini seat ring (same computeSeatPositions helper as the grid card) so the
 * floor plan reads as "the same tables from above", not a placeholder box.
 */
@Component({
  standalone: true,
  selector: 'app-floor-plan-canvas',
  imports: [DragDropModule, NgStyle],
  templateUrl: './floor-plan-canvas.component.html',
  styleUrl: './floor-plan-canvas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorPlanCanvasComponent {
  readonly tables = input.required<readonly SeatingTable[]>();
  readonly areas = input<readonly SeatingArea[]>([]);
  readonly selectedTableId = input<string | null>(null);

  @Output() readonly tableSelected = new EventEmitter<string>();
  @Output() readonly tableMoved = new EventEmitter<TableMoveIntent>();
  @Output() readonly areaMoved = new EventEmitter<AreaMoveIntent>();

  readonly snapToGrid = signal(false);
  readonly zeroOffset = { x: 0, y: 0 };

  readonly tableVms = computed<TableVm[]>(() =>
    this.tables().map((table, index) => {
      const size = TABLE_CONTAINER_SIZE[table.shape];
      const positions = computeSeatPositions(table.shape, table.seatCount);
      const seatDots = table.seats.map((seat, seatIndex) => {
        const tintKey = seat.guestId ?? seat.partyOwnerGuestId;
        return {
          xPercent: positions[seatIndex]?.xPercent ?? 50,
          yPercent: positions[seatIndex]?.yPercent ?? 50,
          isOccupied: seat.guestId !== null || !!seat.isReservedForParty,
          tint: tintKey ? guestTint(tintKey) : null,
        };
      });
      return {
        table,
        x: table.positionX ?? FALLBACK_ORIGIN + (index % FALLBACK_COLUMN_COUNT) * FALLBACK_SPACING,
        y: table.positionY ?? FALLBACK_ORIGIN + Math.floor(index / FALLBACK_COLUMN_COUNT) * FALLBACK_SPACING,
        containerWidth: size.width,
        containerHeight: size.height,
        seatDots,
        occupiedCount: seatDots.filter((dot) => dot.isOccupied).length,
      };
    }),
  );

  readonly areaVms = computed<AreaVm[]>(() =>
    this.areas().map((area, index) => ({
      area,
      x: area.positionX ?? FALLBACK_ORIGIN + (index % FALLBACK_COLUMN_COUNT) * FALLBACK_SPACING,
      y: area.positionY ?? FALLBACK_ORIGIN + Math.floor(index / FALLBACK_COLUMN_COUNT) * FALLBACK_SPACING,
      widthPx: area.width * METRE_PX,
      heightPx: area.height * METRE_PX,
      kindClass: AREA_KIND_CLASS[area.kind],
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

  onAreaDragEnded(vm: AreaVm, event: CdkDragEnd<unknown> & { source: CdkDrag }): void {
    let x = vm.x + event.distance.x;
    let y = vm.y + event.distance.y;
    if (this.snapToGrid()) {
      x = Math.round(x / GRID_SIZE) * GRID_SIZE;
      y = Math.round(y / GRID_SIZE) * GRID_SIZE;
    }
    event.source.reset();
    this.areaMoved.emit({ areaId: vm.area.id, positionX: x, positionY: y, rotation: vm.area.rotation });
  }
}
