import { CdkDropListGroup } from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';

import { guestFullName } from '../../../core/guests/guest.model';
import { SeatingStore } from '../../../core/seating/seating-store';
import { SeatingTable } from '../../../core/seating/seating-table.model';
import { EventEmptyTabComponent } from '../empty-tab/event-empty-tab.component';
import { FloatingGuestsPanelComponent } from './floating-guests-panel/floating-guests-panel.component';
import { FloorPlanCanvasComponent, TableMoveIntent } from './floor-plan-canvas/floor-plan-canvas.component';
import { SeatDropIntent, SeatingTableCardComponent } from './seating-table-card/seating-table-card.component';
import { SelectedTablePanelComponent } from './selected-table-panel/selected-table-panel.component';
import { TableFormModalComponent } from './table-form-modal/table-form-modal.component';

export type TablesView = 'grid' | 'floor';

/**
 * Container for the event-detail "Table management" tab. Owns the seating layout
 * + guest load (via SeatingStore, scoped to this component instance) and the
 * Grid ⇄ Floor-plan view toggle; child components (added in later slices) render
 * the actual table cards, floating-guests panel, and floor-plan canvas.
 */
@Component({
  standalone: true,
  selector: 'app-event-tables-tab',
  imports: [
    EventEmptyTabComponent,
    SeatingTableCardComponent,
    FloatingGuestsPanelComponent,
    TableFormModalComponent,
    FloorPlanCanvasComponent,
    SelectedTablePanelComponent,
    CdkDropListGroup,
  ],
  templateUrl: './event-tables-tab.component.html',
  styleUrl: './event-tables-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventTablesTabComponent implements OnInit, OnChanges {
  @Input({ required: true }) eventId!: string;
  @Input() confirmedGuestCount = 0;

  @Output() readonly seeGuestList = new EventEmitter<void>();

  protected readonly store = inject(SeatingStore);
  readonly view = signal<TablesView>('grid');
  readonly formModalOpen = signal(false);
  readonly editingTable = signal<SeatingTable | null>(null);
  readonly assigningGuestId = signal<string | null>(null);
  readonly announcement = signal('');
  readonly selectedTableId = signal<string | null>(null);

  readonly selectedTable = computed(
    () => this.store.tables().find((table) => table.id === this.selectedTableId()) ?? null,
  );

  ngOnInit(): void {
    this.store.load(this.eventId);
  }

  ngOnChanges(changes: SimpleChanges): void {
    const eventIdChange = changes['eventId'];
    if (eventIdChange && !eventIdChange.firstChange) {
      this.store.load(this.eventId);
    }
  }

  // Grid<->Floor is a strong force-flush trigger — don't leave a view with
  // in-flight drag changes still sitting in the debounce window.
  setView(view: TablesView): void {
    this.store.forceFlush();
    this.view.set(view);
  }

  @HostListener('window:beforeunload')
  onBeforeUnload(): void {
    this.store.forceFlush();
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.assigningGuestId.set(null);
  }

  retry(): void {
    this.store.retry();
  }

  openCreateModal(): void {
    this.editingTable.set(null);
    this.formModalOpen.set(true);
  }

  openEditModal(table: SeatingTable): void {
    this.editingTable.set(table);
    this.formModalOpen.set(true);
  }

  closeModal(): void {
    this.formModalOpen.set(false);
  }

  toggleFull(table: SeatingTable): void {
    this.store
      .updateTable(table.id, {
        name: table.name,
        shape: table.shape,
        seatCount: table.seatCount,
        isFull: !table.isFull,
      })
      .subscribe();
  }

  quickDelete(table: SeatingTable): void {
    if (!confirm(`Delete "${table.name}"? Any seated guests will be unseated.`)) {
      return;
    }
    this.store.deleteTable(table.id).subscribe();
  }

  // ---- Seat assignment: drag-and-drop + the click/keyboard fallback ----

  onSeatDrop(table: SeatingTable, intent: SeatDropIntent): void {
    this.assigningGuestId.set(null);
    const guestName = this.guestDisplayName(intent.guestId);
    this.store.assignGuest(intent.guestId, table.id, intent.seatIndex);
    this.announcement.set(`${guestName} seated at ${table.name}, seat ${intent.seatIndex + 1}.`);
  }

  onGuestSelected(guestId: string): void {
    this.assigningGuestId.update((current) => (current === guestId ? null : guestId));
  }

  onGuestUnseated(guestId: string): void {
    const guestName = this.guestDisplayName(guestId);
    this.store.unassignGuest(guestId);
    this.announcement.set(`${guestName} moved back to the floating list.`);
  }

  // ---- Floor-plan view ----

  selectTable(tableId: string): void {
    this.selectedTableId.set(tableId);
  }

  onTableMoved(intent: TableMoveIntent): void {
    this.store.moveTable(intent.tableId, intent.positionX, intent.positionY, intent.rotation);
  }

  editSelectedTable(): void {
    const table = this.selectedTable();
    if (table) {
      this.openEditModal(table);
    }
  }

  toggleFullSelectedTable(): void {
    const table = this.selectedTable();
    if (table) {
      this.toggleFull(table);
    }
  }

  deleteSelectedTable(): void {
    const table = this.selectedTable();
    if (table) {
      this.quickDelete(table);
      this.selectedTableId.set(null);
    }
  }

  private guestDisplayName(guestId: string): string {
    const table = this.store.tables().find((t) => t.seats.some((seat) => seat.guestId === guestId));
    const seatName = table?.seats.find((s) => s.guestId === guestId)?.guestName;
    if (seatName) {
      return seatName;
    }
    const floatingGuest = this.store.floatingGuests().find((g) => g.id === guestId);
    return floatingGuest ? guestFullName(floatingGuest) : 'Guest';
  }
}
