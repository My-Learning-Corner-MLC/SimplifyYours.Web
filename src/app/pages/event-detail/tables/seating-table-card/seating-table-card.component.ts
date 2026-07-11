import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

import { computeSeatPositions } from '../../../../core/seating/seat-geometry';
import { SeatingSeat } from '../../../../core/seating/seating-seat.model';
import { SeatingTable } from '../../../../core/seating/seating-table.model';

interface SeatVm {
  readonly seat: SeatingSeat;
  readonly xPercent: number;
  readonly yPercent: number;
  readonly initial: string;
}

/**
 * A single table's card in Grid view: a shape-appropriate seat ring (round /
 * long / square, from computeSeatPositions), filled vs. empty seats, and the
 * `n / m seated` footer. Drag-and-drop assignment lands in a later slice —
 * for now seats are read-only, and the `···` menu only emits intents.
 */
@Component({
  standalone: true,
  selector: 'app-seating-table-card',
  templateUrl: './seating-table-card.component.html',
  styleUrl: './seating-table-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeatingTableCardComponent {
  @Input({ required: true }) table!: SeatingTable;

  @Output() readonly editTable = new EventEmitter<void>();
  @Output() readonly markFull = new EventEmitter<void>();
  @Output() readonly deleteTable = new EventEmitter<void>();

  readonly menuOpen = signal(false);

  readonly seats = computed<SeatVm[]>(() => {
    if (!this.table) {
      return [];
    }
    const positions = computeSeatPositions(this.table.shape, this.table.seatCount);
    return this.table.seats.map((seat, index) => ({
      seat,
      xPercent: positions[index]?.xPercent ?? 50,
      yPercent: positions[index]?.yPercent ?? 50,
      initial: seat.guestName ? seat.guestName.trim().charAt(0).toUpperCase() : '',
    }));
  });

  readonly seatedCount = computed(() => this.table?.seats.filter((seat) => seat.guestId !== null).length ?? 0);

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  onEdit(): void {
    this.closeMenu();
    this.editTable.emit();
  }

  onMarkFull(): void {
    this.closeMenu();
    this.markFull.emit();
  }

  onDelete(): void {
    this.closeMenu();
    this.deleteTable.emit();
  }

  seatLabel(seat: SeatingSeat): string {
    return seat.guestId
      ? `Seat ${seat.seatIndex + 1}, occupied by ${seat.guestName ?? 'a guest'}`
      : `Seat ${seat.seatIndex + 1}, empty`;
  }
}
