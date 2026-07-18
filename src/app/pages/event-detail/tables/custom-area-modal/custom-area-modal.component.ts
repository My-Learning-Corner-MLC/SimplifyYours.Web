import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AreaKind, CUSTOM_AREA_PRESETS, CustomAreaPreset } from '../../../../core/seating/area-kind.model';
import { AreaShape } from '../../../../core/seating/area-shape.model';
import { SeatingArea } from '../../../../core/seating/seating-area.model';
import { SeatingStore } from '../../../../core/seating/seating-store';
import { ModalComponent } from '../../../../shared/modal/modal.component';

const AREA_SHAPES: readonly AreaShape[] = ['Rect', 'Round', 'Free'];
const MIN_DIMENSION = 0.5;
const MAX_DIMENSION = 50;
const MIN_CAPACITY = 0;
const MAX_CAPACITY = 500;

const COLOR_SWATCHES = ['#EFE3E8', '#F6ECE0', '#F4E2DD', '#F0EFE2', '#D7C7E0'];

const BLANK_PRESET_KEY = 'blank';

/**
 * "Add a custom area" modal — one-off room elements (photo booth, kids'
 * corner, gift table, ...), distinct from the room-fixture presets offered
 * directly in the floor-plan sidebar's palette (see selected-table-panel).
 * Every area created here is `kind: 'Custom'`; editing an existing non-Custom
 * area (a Stage/Bar/etc. placed via the palette) preserves its original kind
 * unless the organizer explicitly reassigns it by picking a preset.
 * Shares the app-modal shell (blur, animation, fixed header/footer, scrolling
 * body) with every other modal in the app — see table-form-modal for the
 * same pattern.
 */
@Component({
  standalone: true,
  selector: 'app-custom-area-modal',
  imports: [ReactiveFormsModule, ModalComponent],
  templateUrl: './custom-area-modal.component.html',
  styleUrl: './custom-area-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomAreaModalComponent implements OnChanges {
  private readonly store = inject(SeatingStore);
  private readonly fb = inject(FormBuilder);

  @Input() visible = false;
  @Input() area: SeatingArea | null = null;

  @Output() readonly closed = new EventEmitter<void>();

  readonly presets = CUSTOM_AREA_PRESETS;
  readonly shapes = AREA_SHAPES;
  readonly swatches = COLOR_SWATCHES;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  private selectedPresetKey: string | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    kind: this.fb.nonNullable.control<AreaKind>('Custom'),
    shape: this.fb.nonNullable.control<AreaShape>('Rect'),
    width: [1.5, [Validators.required, Validators.min(MIN_DIMENSION), Validators.max(MAX_DIMENSION)]],
    height: [1.5, [Validators.required, Validators.min(MIN_DIMENSION), Validators.max(MAX_DIMENSION)]],
    color: [COLOR_SWATCHES[0]],
    capacity: [null as number | null],
  });

  get isEditMode(): boolean {
    return this.area !== null;
  }

  get width(): number {
    return this.form.controls.width.value;
  }

  get height(): number {
    return this.form.controls.height.value;
  }

  get capacityDisplay(): string {
    const value = this.form.controls.capacity.value;
    return value === null ? '—' : String(value);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.error.set(null);
      this.saving.set(false);
      this.selectedPresetKey = null;
      if (this.area) {
        this.form.reset({
          name: this.area.name,
          kind: this.area.kind,
          shape: this.area.shape,
          width: this.area.width,
          height: this.area.height,
          color: this.area.color ?? COLOR_SWATCHES[0],
          capacity: this.area.capacity,
        });
      } else {
        this.form.reset({
          name: '',
          kind: 'Custom',
          shape: 'Rect',
          width: 1.5,
          height: 1.5,
          color: COLOR_SWATCHES[0],
          capacity: null,
        });
      }
    }
  }

  isPresetSelected(preset: CustomAreaPreset): boolean {
    return this.selectedPresetKey === preset.key;
  }

  applyPreset(preset: CustomAreaPreset): void {
    this.selectedPresetKey = preset.key;
    if (preset.key === BLANK_PRESET_KEY) {
      this.form.patchValue({ name: '', kind: 'Custom' });
      return;
    }
    this.form.patchValue({
      name: preset.defaultName,
      kind: 'Custom',
      width: preset.defaultWidth,
      height: preset.defaultHeight,
      color: preset.defaultColor,
    });
  }

  selectColor(swatch: string): void {
    this.form.patchValue({ color: swatch });
  }

  changeCapacity(delta: number): void {
    const current = this.form.controls.capacity.value ?? 0;
    const next = Math.min(MAX_CAPACITY, Math.max(MIN_CAPACITY, current + delta));
    this.form.controls.capacity.setValue(next === 0 ? null : next);
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      return;
    }
    const { name, kind, shape, width, height, color, capacity } = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);

    const input = { name, kind, shape, width, height, color, capacity };
    const op$ = this.area
      ? this.store.updateArea(this.area.id, input)
      : this.store.createArea(input);

    op$.subscribe({
      next: () => {
        this.saving.set(false);
        this.close();
      },
      error: () => {
        this.saving.set(false);
        this.error.set("Couldn't save the area. Please try again.");
      },
    });
  }

  close(): void {
    if (!this.saving()) {
      this.closed.emit();
    }
  }
}
