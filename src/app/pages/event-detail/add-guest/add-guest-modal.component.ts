import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { AddGuestRequest } from '../../../core/guests/add-guest-request.model';
import { AddGuestError } from '../../../core/guests/guest-error.model';
import {
  GuestMetadataFieldKey,
  guestMetadataFieldsFor,
} from '../../../core/guests/guest-metadata-field-config';
import { Guest } from '../../../core/guests/guest.model';
import { GuestApiClient } from '../../../core/guests/guest-api-client';
import { Relationship, GuestSide } from '../../../core/guests/wedding/wedding-guest-metadata.model';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { SegmentedControlComponent } from '../../../shared/segmented-control/segmented-control.component';

type ModalStatus = 'editing' | 'submitting';

const RELATIONSHIPS: readonly Relationship[] = ['Family', 'Friend', 'Colleague'];
const SIDES: readonly GuestSide[] = ['Bride', 'Groom'];
const MAX_PLUS_ONES = 20;

// Stricter than Angular's built-in email check: requires a dotted domain so
// "name@gmail" is rejected, matching the design's invalid-email state.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function trimmedRequired(control: AbstractControl): ValidationErrors | null {
  return (control.value ?? '').toString().trim().length > 0 ? null : { required: true };
}

function phoneValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '').toString().trim();
  if (value.length === 0) {
    return { required: true };
  }
  const digits = value.replace(/[^0-9]/g, '');
  return digits.length >= 7 ? null : { phone: true };
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, SegmentedControlComponent],
  selector: 'app-add-guest-modal',
  templateUrl: './add-guest-modal.component.html',
  styleUrl: './add-guest-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddGuestModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(GuestApiClient);

  @ViewChild(ModalComponent) private modalRef!: ModalComponent;

  @Input({ required: true }) eventId = '';
  @Input() eventType = '';

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly added = new EventEmitter<Guest>();

  readonly relationships = RELATIONSHIPS;
  readonly sides = SIDES;

  readonly status = signal<ModalStatus>('editing');
  readonly submitted = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly duplicate = signal(false);

  /** Delegates to the shared modal shell, which owns the close animation. */
  get closing() {
    return this.modalRef.closing;
  }

  // Bumped on every form edit so `invalidCount` (which reads non-signal control
  // validity) recomputes live as the guest fixes fields.
  private readonly formRevision = signal(0);

  readonly form: FormGroup = this.fb.group({
    firstName: ['', [trimmedRequired, Validators.maxLength(100)]],
    lastName: ['', [trimmedRequired, Validators.maxLength(100)]],
    email: ['', [trimmedRequired, Validators.pattern(EMAIL_PATTERN), Validators.maxLength(254)]],
    phone: ['', [phoneValidator, Validators.maxLength(40)]],
    relationship: ['Family' as Relationship],
    side: ['Bride' as GuestSide],
    plusOnes: [0],
    dietaryNotes: ['', [Validators.maxLength(500)]],
  });

  // How many required fields are still invalid — drives the footer message.
  readonly invalidCount = computed(() => {
    // Depend on both signals so the count refreshes on submit and on every edit.
    this.submitted();
    this.formRevision();
    return ['firstName', 'lastName', 'email', 'phone'].filter(
      (name) => this.form.get(name)?.invalid,
    ).length;
  });

  ngOnInit(): void {
    this.form.valueChanges.subscribe(() => {
      this.formRevision.update((revision) => revision + 1);
      // Clear a stale duplicate/server banner as soon as the guest starts editing again.
      if (this.duplicate()) {
        this.duplicate.set(false);
      }
      if (this.serverError()) {
        this.serverError.set(null);
      }
    });
  }

  get plusOnes(): number {
    return this.form.get('plusOnes')?.value ?? 0;
  }

  showError(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || this.submitted());
  }

  /** Which optional guest-metadata fields apply to this event's type — see guestMetadataFieldsFor. */
  hasField(key: GuestMetadataFieldKey): boolean {
    return guestMetadataFieldsFor(this.eventType).includes(key);
  }

  /** "Bride" -> "Bride's side" for the segmented control's option labels. */
  readonly sideLabel = (side: GuestSide): string => `${side}'s side`;

  setRelationship(value: Relationship): void {
    this.form.get('relationship')?.setValue(value);
  }

  setSide(value: GuestSide): void {
    this.form.get('side')?.setValue(value);
  }

  changePlusOnes(delta: number): void {
    if (this.status() === 'submitting') {
      return;
    }
    const next = Math.min(MAX_PLUS_ONES, Math.max(0, this.plusOnes + delta));
    this.form.get('plusOnes')?.setValue(next);
  }

  /** Delegates to the shared modal shell: plays the exit animation, then emits `closed`. */
  cancel(): void {
    this.modalRef.requestClose();
  }

  submit(): void {
    if (this.status() === 'submitting') {
      return;
    }
    this.submitted.set(true);
    this.serverError.set(null);
    this.duplicate.set(false);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const eventMetadata: Record<string, unknown> = {};
    if (this.hasField('relationship')) {
      eventMetadata['relationship'] = value.relationship ?? null;
    }
    if (this.hasField('side')) {
      eventMetadata['side'] = value.side ?? null;
    }
    if (this.hasField('plusOnes')) {
      eventMetadata['plusOnes'] = value.plusOnes ?? 0;
    }
    if (this.hasField('dietaryNotes')) {
      eventMetadata['dietaryNotes'] = (value.dietaryNotes ?? '').trim() || null;
    }

    const request: AddGuestRequest = {
      eventId: this.eventId,
      guestInfo: {
        firstName: (value.firstName ?? '').trim(),
        lastName: (value.lastName ?? '').trim(),
        phoneNumber: (value.phone ?? '').trim(),
        emailAddress: (value.email ?? '').trim(),
        eventMetadata: Object.keys(eventMetadata).length > 0 ? eventMetadata : null,
      },
    };

    this.status.set('submitting');
    this.api.addGuest(request).subscribe({
      next: (guest) => {
        this.status.set('editing');
        this.added.emit(guest);
      },
      error: (error: AddGuestError) => {
        this.status.set('editing');
        if (error.kind === 'duplicate') {
          this.duplicate.set(true);
          return;
        }
        this.serverError.set(error.message);
      },
    });
  }
}
