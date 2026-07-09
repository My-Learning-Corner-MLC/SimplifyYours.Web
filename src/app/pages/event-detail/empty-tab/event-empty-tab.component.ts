import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export type EmptyTabVariant = 'tables' | 'budget';

/**
 * Presentational empty-state for the Table management and Budget tabs, matching
 * the design's "no tables yet" and "no budget set" frames. Purely presentational —
 * the parent owns the (mock) data and handles the actions.
 */
@Component({
  standalone: true,
  selector: 'app-event-empty-tab',
  templateUrl: './event-empty-tab.component.html',
  styleUrl: './event-empty-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventEmptyTabComponent {
  @Input({ required: true }) variant!: EmptyTabVariant;
  @Input() confirmedCount = 0;
  @Input() guestCount = 0;
  @Input() suggestions: readonly string[] = [];

  @Output() readonly seeGuestList = new EventEmitter<void>();

  // Eight evenly-spaced seats around the empty-table illustration.
  readonly seats = Array.from({ length: 8 }, (_, i) => i * 45);
}
