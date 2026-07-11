import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';

import { SeatingStore } from '../../../core/seating/seating-store';
import { EventEmptyTabComponent } from '../empty-tab/event-empty-tab.component';
import { FloatingGuestsPanelComponent } from './floating-guests-panel/floating-guests-panel.component';
import { SeatingTableCardComponent } from './seating-table-card/seating-table-card.component';

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
  imports: [EventEmptyTabComponent, SeatingTableCardComponent, FloatingGuestsPanelComponent],
  providers: [SeatingStore],
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

  ngOnInit(): void {
    this.store.load(this.eventId);
  }

  ngOnChanges(changes: SimpleChanges): void {
    const eventIdChange = changes['eventId'];
    if (eventIdChange && !eventIdChange.firstChange) {
      this.store.load(this.eventId);
    }
  }

  retry(): void {
    this.store.retry();
  }

  setView(view: TablesView): void {
    this.view.set(view);
  }
}
