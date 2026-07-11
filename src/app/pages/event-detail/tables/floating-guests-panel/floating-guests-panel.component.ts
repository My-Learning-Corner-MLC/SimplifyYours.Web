import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';

import { Guest, guestFullName } from '../../../../core/guests/guest.model';

/**
 * Searchable list of guests not yet seated at any table. Rows are draggable
 * handles once CDK drag-drop lands (Slice 4) — for now this is a read-only,
 * searchable roster with a live count.
 */
@Component({
  standalone: true,
  selector: 'app-floating-guests-panel',
  templateUrl: './floating-guests-panel.component.html',
  styleUrl: './floating-guests-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloatingGuestsPanelComponent {
  @Input({ required: true }) guests: readonly Guest[] = [];

  readonly search = signal('');

  readonly filteredGuests = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) {
      return this.guests;
    }
    return this.guests.filter((guest) => guestFullName(guest).toLowerCase().includes(term));
  });

  readonly guestFullName = guestFullName;

  onSearchInput(value: string): void {
    this.search.set(value);
  }
}
