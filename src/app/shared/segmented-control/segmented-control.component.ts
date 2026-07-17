import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  QueryList,
  ViewChildren,
} from '@angular/core';

/**
 * Pill-style option picker with a sliding highlight behind the active option
 * (segmented control). Generic over the option value type so any short list
 * of mutually-exclusive string options can reuse it — e.g. guest relationship,
 * wedding side, RSVP status filters.
 *
 * Not a ControlValueAccessor: callers bind `[value]` / `(valueChange)"` directly
 * (optionally to a FormControl's value), keeping the component usable outside
 * reactive forms too.
 */
@Component({
  standalone: true,
  selector: 'app-segmented-control',
  templateUrl: './segmented-control.component.html',
  styleUrl: './segmented-control.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SegmentedControlComponent<T extends string = string> {
  @Input({ required: true }) options: readonly T[] = [];
  @Input() value: T | null = null;
  @Input() disabled = false;
  @Input({ required: true }) ariaLabel = '';
  /** Formats an option for display; defaults to the raw option value. */
  @Input() getLabel: (option: T) => string = (option) => option;

  @Output() readonly valueChange = new EventEmitter<T>();

  @ViewChildren('optionButton') private readonly optionButtons?: QueryList<
    ElementRef<HTMLButtonElement>
  >;

  get activeIndex(): number {
    const index = this.value === null ? -1 : this.options.indexOf(this.value);
    return index < 0 ? 0 : index;
  }

  select(option: T): void {
    if (this.disabled || option === this.value) {
      return;
    }
    this.valueChange.emit(option);
  }

  onKeydown(event: KeyboardEvent, index: number): void {
    if (this.disabled) {
      return;
    }
    let nextIndex: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (index + 1) % this.options.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (index - 1 + this.options.length) % this.options.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = this.options.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.select(this.options[nextIndex]);
    this.optionButtons?.get(nextIndex)?.nativeElement.focus();
  }
}
