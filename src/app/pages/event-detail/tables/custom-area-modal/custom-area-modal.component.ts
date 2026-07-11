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
import { DialogModule } from 'primeng/dialog';

import { AREA_PRESETS, AreaKind, AreaPreset } from '../../../../core/seating/area-kind.model';
import { AreaShape } from '../../../../core/seating/area-shape.model';
import { SeatingArea } from '../../../../core/seating/seating-area.model';
import { SeatingStore } from '../../../../core/seating/seating-store';

const AREA_SHAPES: readonly AreaShape[] = ['Rect', 'Round', 'Free'];

const COLOR_SWATCHES = [
  '#5A2849', // plum
  '#C8A876', // champagne
  '#7A8F5A', // olive
  '#E07B5A', // coral
  '#C28840', // amber
  '#A0C4B8', // sage
  '#EFE3E8', // blush
];

@Component({
  standalone: true,
  selector: 'app-custom-area-modal',
  imports: [ReactiveFormsModule, DialogModule],
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

  readonly presets = AREA_PRESETS;
  readonly shapes = AREA_SHAPES;
  readonly swatches = COLOR_SWATCHES;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    kind: this.fb.nonNullable.control<AreaKind>('Custom'),
    shape: this.fb.nonNullable.control<AreaShape>('Rect'),
    width: [2, [Validators.required, Validators.min(0.5), Validators.max(50)]],
    height: [2, [Validators.required, Validators.min(0.5), Validators.max(50)]],
    color: ['#EFE3E8'],
    capacity: [null as number | null],
  });

  get isEditMode(): boolean {
    return this.area !== null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.error.set(null);
      this.saving.set(false);
      if (this.area) {
        this.form.reset({
          name: this.area.name,
          kind: this.area.kind,
          shape: this.area.shape,
          width: this.area.width,
          height: this.area.height,
          color: this.area.color ?? '#EFE3E8',
          capacity: this.area.capacity,
        });
      } else {
        this.form.reset({ name: '', kind: 'Custom', shape: 'Rect', width: 2, height: 2, color: '#EFE3E8', capacity: null });
      }
    }
  }

  applyPreset(preset: AreaPreset): void {
    this.form.patchValue({
      name: preset.label,
      kind: preset.kind,
      width: preset.defaultWidth,
      height: preset.defaultHeight,
      color: preset.defaultColor,
    });
  }

  selectColor(swatch: string): void {
    this.form.patchValue({ color: swatch });
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
        this.closed.emit();
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
