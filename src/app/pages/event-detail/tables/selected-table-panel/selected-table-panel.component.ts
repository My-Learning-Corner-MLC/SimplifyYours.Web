import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, input } from '@angular/core';

import { AREA_PRESETS, AreaKind, AreaPreset } from '../../../../core/seating/area-kind.model';
import { SeatingTable } from '../../../../core/seating/seating-table.model';

// Kebab-case swatch class per kind — kept in sync with floor-plan-canvas's
// own AREA_KIND_CLASS so the palette tile's swatch previews the same look
// the area gets once placed on the canvas.
const SWATCH_CLASS: Record<AreaKind, string> = {
  Stage: 'stage',
  DanceFloor: 'dance-floor',
  Bar: 'bar',
  Entrance: 'entrance',
  Buffet: 'buffet',
  Cake: 'cake',
  Custom: 'custom',
};

/**
 * Floor-plan right rail: details for whichever table is selected on the
 * canvas — position, seated-here roster, and the same edit/mark-full/delete
 * actions as the grid card's `···` menu, always visible instead of nested
 * in a dropdown. Also hosts the "Drag into the room" room-elements palette
 * (Stage/Dance floor/Bar/Entrance/Buffet/Cake) and the "+ Add a custom area"
 * entry point, both always visible regardless of whether a table is selected.
 */
@Component({
  standalone: true,
  selector: 'app-selected-table-panel',
  imports: [DecimalPipe],
  templateUrl: './selected-table-panel.component.html',
  styleUrl: './selected-table-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectedTablePanelComponent {
  readonly table = input<SeatingTable | null>(null);

  @Output() readonly editTable = new EventEmitter<void>();
  @Output() readonly markFull = new EventEmitter<void>();
  @Output() readonly deleteTable = new EventEmitter<void>();
  @Output() readonly addArea = new EventEmitter<void>();
  @Output() readonly addRoomElement = new EventEmitter<AreaPreset>();

  readonly roomElementPresets = AREA_PRESETS;

  swatchClass(kind: AreaKind): string {
    return `selected-panel__palette-swatch--${SWATCH_CLASS[kind]}`;
  }

  // Named guests only — reserved-for-party seats have no guestName to list.
  readonly seatedGuests = computed(() => this.table()?.seats.filter((seat) => seat.guestId !== null) ?? []);

  // "n / m" tally: a guest's own seat and any reserved for their party's
  // accompanying attendees both count as occupied.
  readonly occupiedSeatCount = computed(
    () => this.table()?.seats.filter((seat) => seat.guestId !== null || seat.isReservedForParty).length ?? 0,
  );
}
