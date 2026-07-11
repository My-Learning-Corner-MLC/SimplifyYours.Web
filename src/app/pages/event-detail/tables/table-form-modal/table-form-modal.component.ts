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

import { SeatingStore } from '../../../../core/seating/seating-store';
import { TABLE_SHAPES, TableShape } from '../../../../core/seating/table-shape.model';
import { SeatingTable } from '../../../../core/seating/seating-table.model';

/**
 * Add / edit table modal. `table === null` means "create" mode, which also
 * exposes bulk-create (N numbered tables, "Name · 1" .. "Name · N"); a
 * non-null `table` switches to "edit" mode (no bulk count, adds Delete).
 * Mirrors the p-dialog pattern from create-event-page (custom header, no
 * PrimeNG chrome) for visual consistency with the rest of the app.
 */
@Component({
  standalone: true,
  selector: 'app-table-form-modal',
  imports: [ReactiveFormsModule, DialogModule],
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
  readonly confirmingDelete = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    shape: this.fb.nonNullable.control<TableShape>('Round', Validators.required),
    seatCount: [8, [Validators.required, Validators.min(1), Validators.max(20)]],
    bulkCount: [1, [Validators.required, Validators.min(1), Validators.max(20)]],
  });

  get isEditMode(): boolean {
    return this.table !== null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.resetForm();
    }
  }

  previewNames(): string[] {
    const name = this.form.controls.name.value.trim();
    if (!name) {
      return [];
    }
    const count = this.isEditMode ? 1 : this.form.controls.bulkCount.value;
    if (count <= 1) {
      return [name];
    }
    return Array.from({ length: count }, (_, i) => `${name} · ${i + 1}`);
  }

  submit(): void {
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

  requestDelete(): void {
    if (!this.confirmingDelete()) {
      this.confirmingDelete.set(true);
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.store.deleteTable(this.table!.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.close();
      },
      error: (err: { message?: string }) => {
        this.saving.set(false);
        this.confirmingDelete.set(false);
        this.error.set(err.message ?? 'Something went wrong. Please try again.');
      },
    });
  }

  cancelDelete(): void {
    this.confirmingDelete.set(false);
  }

  close(): void {
    this.closed.emit();
  }

  private resetForm(): void {
    this.error.set(null);
    this.confirmingDelete.set(false);
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
