import { CdkDrag, CdkDragDrop, CdkDropList, DragDropModule } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

import { computeSeatPositions } from '../../../../core/seating/seat-geometry';
import { SeatingSeat } from '../../../../core/seating/seating-seat.model';
import { SeatingTable } from '../../../../core/seating/seating-table.model';

interface SeatVm {
  readonly seat: SeatingSeat;
  readonly xPercent: number;
  readonly yPercent: number;
  readonly initial: string;
  readonly dropListId: string;
}

export interface SeatDropIntent {
  readonly seatIndex: number;
  readonly guestId: string;
}

/**
 * A single table's card in Grid view: a shape-appropriate seat ring (round /
 * long / square, from computeSeatPositions), filled vs. empty seats, and the
 * `n / m seated` footer. Every empty seat is a CDK drop target (connected via
 * the ancestor cdkDropListGroup in event-tables-tab); filled seats are also
 * drag sources so a seated guest can be moved to another seat. Assigning-mode
 * (`assigningGuestId` set) turns empty seats into keyboard/click targets too —
 * the non-drag equivalent required for WCAG 2.1 AA.
 */
@Component({
  standalone: true,
  selector: 'app-seating-table-card',
  imports: [DragDropModule],
  templateUrl: './seating-table-card.component.html',
  styleUrl: './seating-table-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeatingTableCardComponent {
  @Input({ required: true }) table!: SeatingTable;
  @Input() assigningGuestId: string | null = null;

  @Output() readonly editTable = new EventEmitter<void>();
  @Output() readonly markFull = new EventEmitter<void>();
  @Output() readonly deleteTable = new EventEmitter<void>();
  @Output() readonly seatDrop = new EventEmitter<SeatDropIntent>();

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
      dropListId: `seat-drop_${this.table.id}_${seat.seatIndex}`,
    }));
  });

  readonly seatedCount = computed(() => this.table?.seats.filter((seat) => seat.guestId !== null).length ?? 0);

  // Bound once (not per-seat) — CdkDropList exposes the bound [cdkDropListData]
  // as `drop.data`, so this single predicate works for every seat's drop list.
  readonly seatEnterPredicate = (drag: CdkDrag<string>, drop: CdkDropList<SeatingSeat>): boolean => {
    return drop.data.guestId === null || drop.data.guestId === drag.data;
  };

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

  onSeatDropped(event: CdkDragDrop<SeatingSeat, SeatingSeat, string>, seatIndex: number): void {
    const guestId = event.item.data;
    if (!guestId) {
      return;
    }
    this.seatDrop.emit({ seatIndex, guestId });
  }

  onSeatClick(seat: SeatingSeat): void {
    if (this.assigningGuestId && seat.guestId === null) {
      this.seatDrop.emit({ seatIndex: seat.seatIndex, guestId: this.assigningGuestId });
    }
  }

  seatLabel(seat: SeatingSeat): string {
    if (seat.guestId) {
      return `Seat ${seat.seatIndex + 1}, occupied by ${seat.guestName ?? 'a guest'}`;
    }
    return this.assigningGuestId
      ? `Seat ${seat.seatIndex + 1}, empty. Press Enter to seat the selected guest here.`
      : `Seat ${seat.seatIndex + 1}, empty`;
  }
}
