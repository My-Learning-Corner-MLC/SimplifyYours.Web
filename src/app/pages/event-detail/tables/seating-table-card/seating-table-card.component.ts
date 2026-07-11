import { CdkDrag, CdkDragDrop, CdkDropList, DragDropModule } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, input, signal } from '@angular/core';
import { NgStyle } from '@angular/common';

import { computeSeatPositions } from '../../../../core/seating/seat-geometry';
import { SeatingSeat } from '../../../../core/seating/seating-seat.model';
import { SeatingTable } from '../../../../core/seating/seating-table.model';

// Deterministic pastel tint per guest — stable across re-renders.
const SEAT_TINTS = ['#f0d9b8', '#e8c9d8', '#d8e0c9', '#e5c9c0', '#d7c7e0'];

function guestTint(guestId: string): string {
  let h = 0;
  for (const c of guestId) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return SEAT_TINTS[h % SEAT_TINTS.length];
}

interface SeatVm {
  readonly seat: SeatingSeat;
  readonly xPercent: number;
  readonly yPercent: number;
  readonly initial: string;
  readonly tint: string | null;
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
 *
 * Uses signal `input()` (not the `@Input()` decorator) specifically so the
 * `computed()`s below re-run when the table changes — `computed()` only
 * tracks signal reads, so a plain `@Input() table` field would silently
 * freeze `seats`/`seatedCount` at their first value forever.
 */
@Component({
  standalone: true,
  selector: 'app-seating-table-card',
  imports: [DragDropModule, NgStyle],
  templateUrl: './seating-table-card.component.html',
  styleUrl: './seating-table-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeatingTableCardComponent {
  readonly table = input.required<SeatingTable>();
  readonly assigningGuestId = input<string | null>(null);

  @Output() readonly editTable = new EventEmitter<void>();
  @Output() readonly markFull = new EventEmitter<void>();
  @Output() readonly deleteTable = new EventEmitter<void>();
  @Output() readonly seatDrop = new EventEmitter<SeatDropIntent>();

  // Drop-receiving counter — tracks when any seat on this card is actively
  // being dragged over (multiple cdkDropList enter/exit events fire as the
  // user moves between adjacent seat slots without leaving the card area).
  private dropEnterCount = 0;
  readonly receivingDrop = signal(false);

  readonly seats = computed<SeatVm[]>(() => {
    const table = this.table();
    const positions = computeSeatPositions(table.shape, table.seatCount);
    return table.seats.map((seat, index) => ({
      seat,
      xPercent: positions[index]?.xPercent ?? 50,
      yPercent: positions[index]?.yPercent ?? 50,
      initial: seat.guestName ? seat.guestName.trim().charAt(0).toUpperCase() : '',
      tint: seat.guestId ? guestTint(seat.guestId) : null,
      dropListId: `seat-drop_${table.id}_${seat.seatIndex}`,
    }));
  });

  readonly seatedCount = computed(() => this.table().seats.filter((seat) => seat.guestId !== null).length);

  // Bound once (not per-seat) — CdkDropList exposes the bound [cdkDropListData]
  // as `drop.data`, so this single predicate works for every seat's drop list.
  readonly seatEnterPredicate = (drag: CdkDrag<string>, drop: CdkDropList<SeatingSeat>): boolean => {
    return drop.data.guestId === null || drop.data.guestId === drag.data;
  };

  onSeatEnter(): void {
    this.dropEnterCount++;
    this.receivingDrop.set(true);
  }

  onSeatExit(): void {
    this.dropEnterCount = Math.max(0, this.dropEnterCount - 1);
    if (this.dropEnterCount === 0) {
      this.receivingDrop.set(false);
    }
  }

  onSeatDropped(event: CdkDragDrop<SeatingSeat, SeatingSeat, string>, seatIndex: number): void {
    const guestId = event.item.data;
    if (!guestId) {
      return;
    }
    this.seatDrop.emit({ seatIndex, guestId });
  }

  onSeatClick(seat: SeatingSeat): void {
    const assigningGuestId = this.assigningGuestId();
    if (assigningGuestId && seat.guestId === null) {
      this.seatDrop.emit({ seatIndex: seat.seatIndex, guestId: assigningGuestId });
    }
  }

  seatLabel(seat: SeatingSeat): string {
    if (seat.guestId) {
      return `Seat ${seat.seatIndex + 1}, occupied by ${seat.guestName ?? 'a guest'}`;
    }
    return this.assigningGuestId()
      ? `Seat ${seat.seatIndex + 1}, empty. Press Enter to seat the selected guest here.`
      : `Seat ${seat.seatIndex + 1}, empty`;
  }
}
