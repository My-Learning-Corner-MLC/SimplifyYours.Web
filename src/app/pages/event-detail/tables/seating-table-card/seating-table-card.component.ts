import { CdkDrag, CdkDragDrop, CdkDragEnd, CdkDropList, DragDropModule } from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Output,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { NgStyle } from '@angular/common';

import { computeSeatPositions } from '../../../../core/seating/seat-geometry';
import { SeatingSeat } from '../../../../core/seating/seating-seat.model';
import { SeatingTable } from '../../../../core/seating/seating-table.model';
import { TableShape } from '../../../../core/seating/table-shape.model';

// Deterministic pastel tint per guest — stable across re-renders.
const SEAT_TINTS = ['#f0d9b8', '#e8c9d8', '#d8e0c9', '#e5c9c0', '#d7c7e0'];

const SHAPE_LABELS: Record<TableShape, string> = {
  Round: 'Round',
  Long: 'Rectangular',
  Square: 'Square',
};

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
  // A guest's own seat, or one reserved for their party's accompanying attendees —
  // either way, the seat isn't free.
  readonly isOccupied: boolean;
}

export interface SeatDropIntent {
  readonly seatIndex: number;
  readonly guestId: string;
}

export interface SeatDragEndedOutside {
  readonly guestId: string;
  readonly dropPoint: { readonly x: number; readonly y: number };
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
  private readonly hostElement = inject(ElementRef<HTMLElement>);

  readonly table = input.required<SeatingTable>();
  readonly assigningGuestId = input<string | null>(null);

  @Output() readonly editTable = new EventEmitter<void>();
  @Output() readonly markFull = new EventEmitter<void>();
  @Output() readonly deleteTable = new EventEmitter<void>();
  @Output() readonly seatDrop = new EventEmitter<SeatDropIntent>();
  @Output() readonly seatDragStarted = new EventEmitter<void>();
  @Output() readonly seatDragEndedOutside = new EventEmitter<SeatDragEndedOutside>();

  // Drop-receiving counter — tracks when any seat on this card is actively
  // being dragged over (multiple cdkDropList enter/exit events fire as the
  // user moves between adjacent seat slots without leaving the card area).
  private dropEnterCount = 0;
  readonly receivingDrop = signal(false);

  // Which specific seat is currently being hovered by an active drag — drives
  // a per-seat highlight ring (the seat itself never moves; only its style changes).
  readonly hoveredSeatIndex = signal<number | null>(null);

  readonly seats = computed<SeatVm[]>(() => {
    const table = this.table();
    const positions = computeSeatPositions(table.shape, table.seatCount);
    return table.seats.map((seat, index) => {
      const tintKey = seat.guestId ?? seat.partyOwnerGuestId;
      return {
        seat,
        xPercent: positions[index]?.xPercent ?? 50,
        yPercent: positions[index]?.yPercent ?? 50,
        initial: seat.guestName ? seat.guestName.trim().charAt(0).toUpperCase() : '',
        tint: tintKey ? guestTint(tintKey) : null,
        dropListId: `seat-drop_${table.id}_${seat.seatIndex}`,
        isOccupied: seat.guestId !== null || !!seat.isReservedForParty,
      };
    });
  });

  readonly seatedCount = computed(() => this.seats().filter((seatVm) => seatVm.isOccupied).length);

  readonly shapeLabel = computed(() => SHAPE_LABELS[this.table().shape]);

  // Bound once (not per-seat) — CdkDropList exposes the bound [cdkDropListData]
  // as `drop.data`, so this single predicate works for every seat's drop list.
  // A seat reserved for someone else's party is occupied too, even though its
  // guestId is null, so it isn't a valid drop target.
  readonly seatEnterPredicate = (drag: CdkDrag<string>, drop: CdkDropList<SeatingSeat>): boolean => {
    const seat = drop.data;
    const isOwnSeat = seat.guestId === drag.data;
    // A table marked full rejects every seat except a guest re-entering their
    // own current seat (harmless no-op reassignment, not a new occupant).
    if (this.table().isFull && !isOwnSeat) {
      this.dropEnterCount = 0;
      this.receivingDrop.set(false);
      this.hoveredSeatIndex.set(null);
      return false;
    }
    const isValidTarget = (seat.guestId === null && !seat.isReservedForParty) || isOwnSeat;
    if (!isValidTarget) {
      // CDK only fires `cdkDropListExited` on the previously active container
      // when the pointer enters a *different accepting* container — moving
      // from an accepted seat straight into a rejected (occupied) one never
      // triggers that exit, so the ring/hint set by onSeatEnter on the seat
      // left behind would otherwise persist for the rest of the drag. This
      // predicate is invoked exactly when the pointer enters this rejected
      // seat's bounding box, making it the only reliable signal available to
      // clear the stale state immediately rather than waiting for drag end.
      this.dropEnterCount = 0;
      this.receivingDrop.set(false);
      this.hoveredSeatIndex.set(null);
    }
    return isValidTarget;
  };

  onSeatEnter(seatIndex: number): void {
    this.dropEnterCount++;
    if (this.dropEnterCount === 1) {
      this.receivingDrop.set(true);
    }
    this.hoveredSeatIndex.set(seatIndex);
  }

  onSeatExit(seatIndex: number): void {
    this.dropEnterCount = Math.max(0, this.dropEnterCount - 1);
    if (this.dropEnterCount === 0) {
      // Unconditional clear: with overlapping seat hit-boxes, the exit event
      // that brings the counter to zero can report a different seatIndex than
      // the one currently hovered, so the equality check below would miss it
      // and leave the ring stuck until the drag ends.
      this.receivingDrop.set(false);
      this.hoveredSeatIndex.set(null);
      return;
    }
    if (this.hoveredSeatIndex() === seatIndex) {
      this.hoveredSeatIndex.set(null);
    }
  }

  // Fallback cleanup for the case where CDK routes a drag release back to the
  // floating panel's own drop list (the item's origin) instead of any seat —
  // e.g. the pointer hovered an empty seat, then moved onto an occupied
  // (rejected) seat whose bounding box overlaps the first without a clean
  // `cdkDropListExited` firing. In that path no seat's `onSeatDropped` runs at
  // all, so the hover state set by `onSeatEnter` would otherwise persist
  // indefinitely. Safe regardless of firing order relative to a seat's own
  // `onSeatDropped`: the reset here and `seatDrop.emit(...)` there are
  // independent, so whichever runs first, the other still behaves correctly —
  // a genuine drop still emits, and this handler is just a harmless re-set of
  // already-null/false values when it runs after `onSeatDropped`.
  @HostListener('document:pointerup')
  @HostListener('document:pointercancel')
  onDocumentPointerUp(): void {
    this.dropEnterCount = 0;
    this.receivingDrop.set(false);
    this.hoveredSeatIndex.set(null);
  }

  // Fallback that also re-derives entry, not just exit — both directions of
  // the same underlying CDK quirk. Angular CDK's `_updateActiveDropContainer`
  // only calls `exit()`/`enter()` when its own *internal* notion of the active
  // container actually changes to a different one. Moving to open space finds
  // no candidate container at all, so CDK skips the exit call and keeps
  // privately believing it's still "inside" the seat just left — meaning if
  // the pointer comes straight back to that same seat, CDK sees no container
  // change and never fires a fresh `cdkDropListEntered` either, leaving the
  // ring stuck off even though the pointer is back on a valid target. A
  // document-wide `pointermove` listener sidesteps CDK's internal bookkeeping
  // entirely: it re-derives "which seat, if any, is under the pointer" by
  // direct DOM hit-testing every move, so it can't be left out of sync by
  // whatever CDK's own container-change detection does or doesn't fire.
  @HostListener('document:pointermove', ['$event'])
  onDocumentPointerMove(event: PointerEvent): void {
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const seatSlot = target?.closest('.table-card__seat-slot') ?? null;
    const ownSeatSlot = seatSlot && this.hostElement.nativeElement.contains(seatSlot) ? seatSlot : null;

    if (!ownSeatSlot) {
      if (this.hoveredSeatIndex() !== null) {
        this.dropEnterCount = 0;
        this.receivingDrop.set(false);
        this.hoveredSeatIndex.set(null);
      }
      return;
    }

    // Only synthesize a fresh "enter" while a drag is actually in progress
    // (CDK stamps the dragged element with this class) — otherwise plain
    // mouse movement with no drag at all would light up the ring.
    const isDragActive = document.querySelector('.cdk-drag-dragging') !== null;
    if (!isDragActive) {
      return;
    }
    const seatIndex = this.seatIndexFromSlot(ownSeatSlot);
    if (seatIndex !== null && seatIndex !== this.hoveredSeatIndex() && this.isValidDropTarget(seatIndex)) {
      this.onSeatEnter(seatIndex);
    }
  }

  private seatIndexFromSlot(slot: Element): number | null {
    const raw = slot.getAttribute('data-seat-index');
    if (raw === null) {
      return null;
    }
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? null : parsed;
  }

  // Visual-only approximation of seatEnterPredicate's validity check (no
  // access to the dragged guest's id here, so it can't grant the "re-enter
  // your own seat" exception) — acceptable because the actual drop is still
  // gated by seatEnterPredicate regardless of what the ring shows.
  private isValidDropTarget(seatIndex: number): boolean {
    if (this.table().isFull) {
      return false;
    }
    const seat = this.table().seats[seatIndex];
    return !!seat && seat.guestId === null && !seat.isReservedForParty;
  }

  onSeatDropped(event: CdkDragDrop<SeatingSeat, SeatingSeat, string>, seatIndex: number): void {
    // CDK fires (cdkDropListDropped) without a following (cdkDropListExited) —
    // the pointer never physically leaves the zone it drops into — so hover
    // state must be cleared here explicitly or it sticks until the next drag.
    this.dropEnterCount = 0;
    this.receivingDrop.set(false);
    this.hoveredSeatIndex.set(null);

    const guestId = event.item.data;
    if (!guestId) {
      return;
    }
    // When a drag is released somewhere no drop list will accept it (e.g. over
    // the floating-guests panel, which deliberately rejects entries so the
    // unseat gesture can be detected by DOM hit-testing on drag end instead —
    // see EventTablesTabComponent.onSeatDragEndedOutside), CDK falls back to
    // "dropping" the item back into its own origin list. Treating that as a
    // real assign would silently no-op the seat and consume the gesture,
    // starving the hit-test fallback of its chance to run.
    if (event.previousContainer === event.container) {
      return;
    }
    // CDK fires `dropped` on the last container that accepted the drag even
    // if the pointer has since moved off it without triggering an exit event
    // (small, closely-packed seat zones). `isPointerOverContainer` is false
    // in that case — treat it as a miss rather than assigning the wrong seat.
    // No explicit "undo" is needed: the guest chip is store-driven, so
    // returning here without emitting simply leaves it rendered in the
    // floating panel on the next change-detection pass.
    if (!event.isPointerOverContainer) {
      return;
    }
    this.seatDrop.emit({ seatIndex, guestId });
  }

  onSeatDragStarted(): void {
    this.seatDragStarted.emit();
  }

  // Always fires on release, whether or not a cdkDropList claimed the drop.
  // The parent checks SeatingStore.wasDragGestureConsumed() to tell a genuine
  // "released over open space" from a drop that a list already handled.
  onSeatDragEnded(seat: SeatingSeat, event: CdkDragEnd<unknown>): void {
    if (seat.guestId === null) {
      return;
    }
    this.seatDragEndedOutside.emit({ guestId: seat.guestId, dropPoint: event.dropPoint });
  }

  onSeatClick(seat: SeatingSeat): void {
    const assigningGuestId = this.assigningGuestId();
    if (assigningGuestId && seat.guestId === null && !seat.isReservedForParty) {
      this.seatDrop.emit({ seatIndex: seat.seatIndex, guestId: assigningGuestId });
    }
  }

  seatLabel(seat: SeatingSeat): string {
    if (seat.guestId) {
      return `Seat ${seat.seatIndex + 1}, occupied by ${seat.guestName ?? 'a guest'}`;
    }
    if (seat.isReservedForParty) {
      return `Seat ${seat.seatIndex + 1}, reserved for a guest's accompanying attendee`;
    }
    return this.assigningGuestId()
      ? `Seat ${seat.seatIndex + 1}, empty. Press Enter to seat the selected guest here.`
      : `Seat ${seat.seatIndex + 1}, empty`;
  }
}
