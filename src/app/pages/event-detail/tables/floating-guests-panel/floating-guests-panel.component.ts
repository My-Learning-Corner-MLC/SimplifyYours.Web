import { CdkDrag, CdkDropList, DragDropModule } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, input, signal } from '@angular/core';

import { NgStyle } from '@angular/common';
import { Guest, guestFullName } from '../../../../core/guests/guest.model';

/**
 * Searchable list of guests not yet seated at any table. Rows are CDK drag
 * sources (dropping one onto a seat assigns them — see seating-table-card).
 * Unseating a guest (dragging their seat chip back out) is handled entirely
 * by EventTablesTabComponent via DOM hit-testing on drag end, not by this
 * component being a drop target — see onSeatDragEndedOutside. Clicking a row
 * (instead of dragging) selects the guest for "assigning" mode — the
 * keyboard/click fallback required for WCAG 2.1 AA; Escape (handled by the
 * parent) cancels it.
 *
 * Uses signal `input()` (not the `@Input()` decorator) so `filteredGuests`
 * re-runs when `guests` changes — `computed()` only tracks signal reads, so
 * a plain `@Input() guests` field would silently freeze the filtered list
 * at whatever it was on the first render.
 */
const AVATAR_TINTS = ['#f0d9b8', '#e8c9d8', '#d8e0c9', '#e5c9c0', '#d7c7e0'];

@Component({
  standalone: true,
  selector: 'app-floating-guests-panel',
  imports: [DragDropModule, NgStyle],
  templateUrl: './floating-guests-panel.component.html',
  styleUrl: './floating-guests-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloatingGuestsPanelComponent {
  // Home cdkDropList for guest rows — required so a row's cdkDrag has a
  // container to leave from when it's dropped onto a seat's cdkDropList in a
  // different component (connected via the ancestor cdkDropListGroup).
  readonly dropListId = 'floating-guests-drop-list';

  // This list must never actually accept a drop — unseating is handled by
  // EventTablesTabComponent's DOM hit-testing on drag end (see class doc),
  // not by list membership. Without this, a seated guest's seat — connected
  // to this list via the same cdkDropListGroup — would be accepted as a
  // silent no-op "valid entry" when dropped here, which suppresses the
  // cdkDragEnded fallback that's supposed to detect the unseat gesture.
  readonly rejectAllEnterPredicate = (_drag: CdkDrag<string>, _drop: CdkDropList<unknown>): boolean => false;

  readonly guests = input.required<readonly Guest[]>();
  readonly assigningGuestId = input<string | null>(null);

  @Output() readonly guestSelected = new EventEmitter<string>();

  readonly search = signal('');

  readonly filteredGuests = computed(() => {
    const term = this.search().trim().toLowerCase();
    const guests = this.guests();
    if (!term) {
      return guests;
    }
    return guests.filter((guest) => guestFullName(guest).toLowerCase().includes(term));
  });

  readonly guestFullName = guestFullName;

  avatarTint(index: number): string {
    return AVATAR_TINTS[index % AVATAR_TINTS.length];
  }

  guestDetail(guest: Guest): string {
    const parts: string[] = [];
    if (guest.plusOnes > 0) {
      parts.push(`+${guest.plusOnes}`);
    }
    if (guest.dietaryNotes?.trim()) {
      parts.push(guest.dietaryNotes.trim());
    }
    return parts.join(' · ');
  }

  onSearchInput(value: string): void {
    this.search.set(value);
  }

  onRowClick(guestId: string): void {
    this.guestSelected.emit(guestId);
  }
}
