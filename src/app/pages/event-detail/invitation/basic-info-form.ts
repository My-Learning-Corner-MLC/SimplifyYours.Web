import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  QueryList,
  ViewChildren,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  INVITATION_FIELD_LABELS,
  INVITATION_FIELD_MAX_LENGTHS,
  InvitationField,
  InvitationFieldValues,
  InvitationSettings,
  fieldsFor,
} from '../../../core/invitations/invitation-settings.model';
import { ConfirmDialog } from './confirm-dialog';

/** Fields the organiser may leave blank. Everything else blocks the save. */
const OPTIONAL_FIELDS: readonly InvitationField[] = ['venueNotes'];

/** Rendered as a textarea rather than a single line. */
const MULTILINE_FIELDS: readonly InvitationField[] = ['venueAddress', 'venueNotes'];

export interface BasicInfoSaveEvent {
  readonly fieldValues: InvitationFieldValues;
  readonly publicLinkEnabled: boolean;
}

/**
 * The full "Basic info" page: content that fills the chosen invitation template, plus the public
 * invitation link toggle. Reached via "Use this template" (new selection) or "Edit basic info"
 * (already selected) on {@link TemplateDetail} — there is no separate modal step anymore.
 *
 * Event-derived fields arrive pre-filled and stay editable; couple names have no event-record
 * source and start empty, which is the reason this form exists at all.
 *
 * Edits here change the invitation only — never the event. An organiser may legitimately want a
 * friendly venue line on the invitation and a precise postal address on the event, so the form says
 * so rather than letting the divergence come as a surprise.
 *
 * Saving does not call the API directly — {@link save} hands the validated values up to
 * `InvitationsTab`, which runs the actual save from behind the "Use this template?"/"Change
 * template?" confirm dialog, same as choosing a template does.
 */
@Component({
  selector: 'app-basic-info-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ConfirmDialog],
  templateUrl: './basic-info-form.html',
  styleUrl: './basic-info-form.scss',
})
export class BasicInfoForm {
  readonly settings = input.required<InvitationSettings>();
  readonly eventName = input.required<string>();
  readonly templateName = input.required<string>();
  readonly saving = input<boolean>(false);
  /** Server-side messages keyed by field, merged over local validation. */
  readonly serverErrors = input<Readonly<Record<string, readonly string[]>>>({});

  readonly save = output<BasicInfoSaveEvent>();
  /** Fired once leaving is confirmed — either nothing was dirty, or Discard was chosen. */
  readonly dismissed = output<void>();

  @ViewChildren('fieldInput') private readonly fieldInputs!: QueryList<ElementRef<HTMLElement>>;

  protected readonly values = signal<InvitationFieldValues>({});
  protected readonly publicLinkEnabled = signal(false);
  protected readonly touched = signal<ReadonlySet<InvitationField>>(new Set());
  protected readonly submitAttempted = signal(false);
  protected readonly showDiscardDialog = signal(false);

  private readonly initialValues = signal<InvitationFieldValues>({});
  private readonly initialPublicLinkEnabled = signal(false);

  /**
   * Errors keyed against something other than one of this event type's fields — chiefly
   * `templateId`, the key `SaveInvitationSettingsCommandHandler` uses for every snapshot failure
   * (unreachable catalog, unknown template, a template that fails to parse). There is no field on
   * screen for that key, so it renders as a form-level banner instead of being silently dropped.
   */
  protected readonly formLevelErrors = computed(() => {
    const known = new Set<string>(this.fields());
    const errors = this.serverErrors();

    return Object.entries(errors)
      .filter(([key]) => !known.has(key))
      .flatMap(([, messages]) => messages);
  });

  protected readonly fields = computed(() => fieldsFor(this.settings().eventType));

  protected readonly labels = INVITATION_FIELD_LABELS;
  protected readonly maxLengths = INVITATION_FIELD_MAX_LENGTHS;

  /** Gates the Discard-changes dialog on Cancel / "Back to preview" — untouched forms exit immediately. */
  protected readonly isDirty = computed(() => {
    const current = this.values();
    const initial = this.initialValues();
    const fieldsChanged = this.fields().some((field) => (current[field] ?? '') !== (initial[field] ?? ''));

    return fieldsChanged || this.publicLinkEnabled() !== this.initialPublicLinkEnabled();
  });

  constructor() {
    // Seeding from an effect rather than the template keeps re-opening honest: whatever the API
    // returned — saved values, or pre-fill defaults — is what the organiser sees.
    effect(() => {
      const settings = this.settings();
      this.values.set({ ...settings.fieldValues });
      this.initialValues.set({ ...settings.fieldValues });
      this.publicLinkEnabled.set(settings.publicLinkEnabled);
      this.initialPublicLinkEnabled.set(settings.publicLinkEnabled);
      this.touched.set(new Set());
      this.submitAttempted.set(false);
      this.showDiscardDialog.set(false);
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

  protected onTogglePublicLink(): void {
    this.publicLinkEnabled.update((enabled) => !enabled);
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
      this.focusFirstInvalidField();
      return;
    }

    this.save.emit({ fieldValues: { ...this.values() }, publicLinkEnabled: this.publicLinkEnabled() });
  }

  /** Moves focus to the first field that fails validation, in field order. */
  private focusFirstInvalidField(): void {
    const invalidIndex = this.fields().findIndex((field) => this.localError(field) !== null);

    if (invalidIndex === -1) {
      return;
    }

    queueMicrotask(() => this.fieldInputs?.get(invalidIndex)?.nativeElement.focus());
  }

  protected onCancel(): void {
    this.requestDismiss();
  }

  protected onBackToPreview(): void {
    this.requestDismiss();
  }

  /** Untouched forms leave immediately; dirty ones are gated behind the Discard-changes dialog. */
  private requestDismiss(): void {
    if (this.isDirty()) {
      this.showDiscardDialog.set(true);
      return;
    }

    this.dismissed.emit();
  }

  protected onKeepEditing(): void {
    this.showDiscardDialog.set(false);
  }

  protected onDiscard(): void {
    this.showDiscardDialog.set(false);
    this.dismissed.emit();
  }
}
