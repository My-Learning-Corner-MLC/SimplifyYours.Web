import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { SeatingStore } from '../../../../core/seating/seating-store';
import { TABLE_SHAPES, TableShape } from '../../../../core/seating/table-shape.model';
import { SeatingTable } from '../../../../core/seating/seating-table.model';
import { ModalComponent } from '../../../../shared/modal/modal.component';

const MAX_SEATS = 20;
const MIN_SEATS = 1;
const MAX_BULK_COUNT = 20;
const MIN_BULK_COUNT = 1;

/**
 * Add / edit table modal. `table === null` means "create" mode, which also
 * exposes bulk-create (N numbered tables, "Name · 1" .. "Name · N"); a
 * non-null `table` switches to "edit" mode (no bulk count). Deleting a table
 * lives elsewhere (the table card's own action and the floor-plan selected-
 * table panel) — this modal is name/shape/seats only, matching the "Add /
 * edit table" mockup. Shares the app-modal shell (blur, animation, fixed
 * header/footer, scrolling body) with every other modal in the app; this
 * component stays always-mounted with `[open]="visible"` bound to the shared
 * shell so its existing `visible`/`ngOnChanges` form-reset pattern is
 * untouched.
 */
@Component({
  standalone: true,
  selector: 'app-table-form-modal',
  imports: [ReactiveFormsModule, ModalComponent],
  templateUrl: './table-form-modal.component.html',
  styleUrl: './table-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableFormModalComponent implements OnChanges {
  private readonly store = inject(SeatingStore);
  private readonly fb = inject(FormBuilder);

  @Input() visible = false;
  @Input() table: SeatingTable | null = null;

  @Output() readonly closed = new EventEmitter<void>();

  readonly shapes: readonly TableShape[] = TABLE_SHAPES;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly submitted = signal(false);

  // Bumped on every form edit so `invalidCount` (which reads non-signal control
  // validity) recomputes live as the guest fixes fields — same pattern as
  // the Add Guest modal.
  private readonly formRevision = signal(0);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    shape: this.fb.nonNullable.control<TableShape>('Round', Validators.required),
    seatCount: [8, [Validators.required, Validators.min(MIN_SEATS), Validators.max(MAX_SEATS)]],
    bulkCount: [1, [Validators.required, Validators.min(MIN_BULK_COUNT), Validators.max(MAX_BULK_COUNT)]],
  });

  constructor() {
    this.form.valueChanges.subscribe(() => this.formRevision.update((revision) => revision + 1));
  }

  readonly invalidCount = computed(() => {
    this.submitted();
    this.formRevision();
    return ['name'].filter((name) => this.form.get(name)?.invalid).length;
  });

  get isEditMode(): boolean {
    return this.table !== null;
  }

  get activeShapeIndex(): number {
    return this.shapes.indexOf(this.form.controls.shape.value);
  }

  get seatCount(): number {
    return this.form.controls.seatCount.value;
  }

  get bulkCount(): number {
    return this.form.controls.bulkCount.value;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.resetForm();
    }
  }

  showError(controlName: 'name'): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || this.submitted());
  }

  changeSeats(delta: number): void {
    if (this.saving()) {
      return;
    }
    const next = Math.min(MAX_SEATS, Math.max(MIN_SEATS, this.seatCount + delta));
    this.form.controls.seatCount.setValue(next);
  }

  changeBulkCount(delta: number): void {
    if (this.saving()) {
      return;
    }
    const next = Math.min(MAX_BULK_COUNT, Math.max(MIN_BULK_COUNT, this.bulkCount + delta));
    this.form.controls.bulkCount.setValue(next);
  }

  previewChips(): string[] {
    const name = this.form.controls.name.value.trim();
    if (!name) {
      return [];
    }
    const shapeLabel = this.form.controls.shape.value.toLowerCase();
    const seats = this.seatCount;
    const count = this.isEditMode ? 1 : this.bulkCount;
    if (count <= 1) {
      return [`${name} · ${shapeLabel} · ${seats}`];
    }
    return Array.from({ length: count }, (_, i) => `${name} · ${i + 1} · ${shapeLabel} · ${seats}`);
  }

  submit(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    const { name, shape, seatCount, bulkCount } = this.form.getRawValue();
    const trimmedName = name.trim();

    const onSettled = {
      next: () => {
        this.saving.set(false);
        this.close();
      },
      error: (err: { message?: string }) => {
        this.saving.set(false);
        this.error.set(err.message ?? 'Something went wrong. Please try again.');
      },
    };

    if (this.isEditMode) {
      this.store
        .updateTable(this.table!.id, { name: trimmedName, shape, seatCount, isFull: this.table!.isFull })
        .subscribe(onSettled);
    } else {
      this.store.createTables({ name: trimmedName, shape, seatCount, count: bulkCount }).subscribe(onSettled);
    }
  }

  close(): void {
    this.closed.emit();
  }

  private resetForm(): void {
    this.error.set(null);
    this.submitted.set(false);
    if (this.table) {
      this.form.reset({
        name: this.table.name,
        shape: this.table.shape,
        seatCount: this.table.seatCount,
        bulkCount: 1,
      });
    } else {
      this.form.reset({ name: '', shape: 'Round', seatCount: 8, bulkCount: 1 });
    }
  }
}
