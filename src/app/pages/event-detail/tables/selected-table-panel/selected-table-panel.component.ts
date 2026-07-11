import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, input } from '@angular/core';

import { SeatingTable } from '../../../../core/seating/seating-table.model';

/**
 * Floor-plan right rail: details for whichever table is selected on the
 * canvas — position, seated-here roster, and the same edit/mark-full/delete
 * actions as the grid card's `···` menu, always visible instead of nested
 * in a dropdown.
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

  readonly seatedGuests = computed(() => this.table()?.seats.filter((seat) => seat.guestId !== null) ?? []);
}
