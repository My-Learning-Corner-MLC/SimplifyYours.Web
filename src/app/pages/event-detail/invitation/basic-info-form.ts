import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  INVITATION_FIELD_LABELS,
  INVITATION_FIELD_MAX_LENGTHS,
  InvitationField,
  InvitationFieldValues,
  InvitationSettings,
  fieldsFor,
} from '../../../core/invitations/invitation-settings.model';

/** Fields the organiser may leave blank. Everything else blocks the save. */
const OPTIONAL_FIELDS: readonly InvitationField[] = ['venueNotes'];

/** Rendered as a textarea rather than a single line. */
const MULTILINE_FIELDS: readonly InvitationField[] = ['venueAddress', 'venueNotes'];

/**
 * Collects the content that fills the chosen invitation template.
 *
 * Opens when the organiser confirms a template in the preview. Event-derived fields arrive
 * pre-filled and stay editable; couple names have no event-record source and start empty, which is
 * the reason this form exists at all.
 *
 * Edits here change the invitation only — never the event. An organiser may legitimately want a
 * friendly venue line on the invitation and a precise postal address on the event, so the form says
 * so rather than letting the divergence come as a surprise.
 */
@Component({
  selector: 'app-basic-info-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './basic-info-form.html',
  styleUrl: './basic-info-form.scss',
})
export class BasicInfoForm {
  readonly settings = input.required<InvitationSettings>();
  readonly templateId = input.required<string>();
  /** Set when invitations have already gone out — changes are live on every issued link. */
  readonly sentInvitationCount = input<number>(0);
  readonly saving = input<boolean>(false);
  /** Server-side messages keyed by field, merged over local validation. */
  readonly serverErrors = input<Readonly<Record<string, readonly string[]>>>({});

  readonly save = output<InvitationFieldValues>();
  readonly dismissed = output<void>();

  protected readonly values = signal<InvitationFieldValues>({});
  protected readonly touched = signal<ReadonlySet<InvitationField>>(new Set());
  protected readonly submitAttempted = signal(false);

  protected readonly fields = computed(() => fieldsFor(this.settings().eventType));

  protected readonly labels = INVITATION_FIELD_LABELS;
  protected readonly maxLengths = INVITATION_FIELD_MAX_LENGTHS;

  constructor() {
    // Seeding from an effect rather than the template keeps re-opening honest: whatever the API
    // returned — saved values, or pre-fill defaults — is what the organiser sees.
    effect(() => {
      const incoming = this.settings().fieldValues;
      this.values.set({ ...incoming });
      this.touched.set(new Set());
      this.submitAttempted.set(false);
    });
  }

  protected isOptional(field: InvitationField): boolean {
    return OPTIONAL_FIELDS.includes(field);
  }

  protected isMultiline(field: InvitationField): boolean {
    return MULTILINE_FIELDS.includes(field);
  }

  protected valueOf(field: InvitationField): string {
    return this.values()[field] ?? '';
  }

  protected onInput(field: InvitationField, value: string): void {
    this.values.update((current) => ({ ...current, [field]: value }));
    this.touched.update((current) => new Set(current).add(field));
  }

  /** Local errors only; server messages are merged in by {@link errorsFor}. */
  protected localError(field: InvitationField): string | null {
    const value = (this.values()[field] ?? '').trim();

    if (!this.isOptional(field) && value.length === 0) {
      return 'This field is required.';
    }

    const max = this.maxLengths[field];

    if (value.length > max) {
      return `Must be ${max} characters or fewer.`;
    }

    return null;
  }

  protected errorsFor(field: InvitationField): readonly string[] {
    const server = this.serverErrors()[field] ?? [];

    // A field is only marked wrong once the organiser has touched it or tried to submit —
    // showing "required" on every empty field the moment the form opens is just noise.
    if (!this.touched().has(field) && !this.submitAttempted()) {
      return server;
    }

    const local = this.localError(field);

    return local ? [local, ...server] : server;
  }

  protected readonly isValid = computed(() =>
    this.fields().every((field) => {
      const value = (this.values()[field] ?? '').trim();

      if (!OPTIONAL_FIELDS.includes(field) && value.length === 0) {
        return false;
      }

      return value.length <= INVITATION_FIELD_MAX_LENGTHS[field];
    }),
  );

  protected onSubmit(): void {
    this.submitAttempted.set(true);

    if (!this.isValid() || this.saving()) {
      return;
    }

    this.save.emit({ ...this.values() });
  }

  protected onDismiss(): void {
    this.dismissed.emit();
  }
}
