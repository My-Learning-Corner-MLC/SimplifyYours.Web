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
import { DatePickerModule } from 'primeng/datepicker';

import { eventTypeLabel as formatEventTypeLabel } from '../../../core/events/event-type-display';
import { TemplateCatalogItem } from '../../../core/invitations/template-catalog.model';
import {
  INVITATION_FIELD_LABELS,
  INVITATION_FIELD_MAX_LENGTHS,
  InvitationField,
  InvitationFieldValues,
  InvitationSettings,
  fieldsFor,
} from '../../../core/invitations/invitation-settings.model';
import { ConfirmDialog } from './confirm-dialog';
import {
  templateThumbnailAccent,
  templateThumbnailBackground,
  templateThumbnailMotif,
} from './template-thumbnail-tokens';

/** Fields the organiser may leave blank. Everything else blocks the save. */
const OPTIONAL_FIELDS: readonly InvitationField[] = ['venueNotes'];

/** Rendered as a textarea rather than a single line. */
const MULTILINE_FIELDS: readonly InvitationField[] = ['venueAddress', 'venueNotes'];

/** Rendered with the same date-picker create-event uses, instead of a plain text input. */
const DATE_FIELDS: readonly InvitationField[] = ['eventDate'];

/** Rendered with the same time-picker create-event uses, instead of a plain text input. */
const TIME_FIELDS: readonly InvitationField[] = ['eventTime'];

/** Fields short enough to share a row, paired the way create-event's own Date/Starts/Ends row does. */
const FIELD_PAIRS: readonly (readonly [InvitationField, InvitationField])[] = [
  ['brideName', 'groomName'],
  ['eventDate', 'eventTime'],
];

const STEP_MINUTES = 15;

/**
 * Rounds up to the next 15-minute mark, matching the time picker's own `stepMinute` — so opening a
 * fresh picker anchors on an actually-selectable time (9:30) instead of the exact current minute
 * (9:27), which isn't one of the options.
 */
function roundUpToQuarterHour(date: Date): Date {
  const ms = STEP_MINUTES * 60 * 1000;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

/** Groups `fields` into rows of one or two, pairing adjacent fields listed in {@link FIELD_PAIRS}. */
function groupFieldsIntoRows(fields: readonly InvitationField[]): readonly (readonly InvitationField[])[] {
  const remaining = new Set(fields);
  const rows: InvitationField[][] = [];

  for (const field of fields) {
    if (!remaining.has(field)) {
      continue;
    }
    remaining.delete(field);

    const pair = FIELD_PAIRS.find(([first]) => first === field);
    const partner = pair?.[1];

    if (partner && remaining.has(partner)) {
      remaining.delete(partner);
      rows.push([field, partner]);
    } else {
      rows.push([field]);
    }
  }

  return rows;
}

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
  imports: [FormsModule, ConfirmDialog, DatePickerModule],
  templateUrl: './basic-info-form.html',
  styleUrl: './basic-info-form.scss',
})
export class BasicInfoForm {
  readonly settings = input.required<InvitationSettings>();
  readonly template = input.required<TemplateCatalogItem>();
  readonly saving = input<boolean>(false);
  /** Server-side messages keyed by field, merged over local validation. */
  readonly serverErrors = input<Readonly<Record<string, readonly string[]>>>({});

  protected readonly templateName = computed(() => this.template().name);
  protected readonly eventTypeLabel = computed(() => formatEventTypeLabel(this.template().eventType));
  protected readonly accent = computed(() => templateThumbnailAccent(this.template()));
  protected readonly faceBackground = computed(() => templateThumbnailBackground(this.template()));
  protected readonly motif = computed(() => templateThumbnailMotif(this.template()));
  /** Same facts panel as the detail view — `settings` already carries the selection, no separate service needed. */
  protected readonly isSelected = computed(() => this.settings().templateId === this.template().id);

  readonly save = output<BasicInfoSaveEvent>();
  /** Fired once leaving is confirmed — either nothing was dirty, or Discard was chosen. */
  readonly dismissed = output<void>();

  // `read: ElementRef` so a `#fieldInput` placed on a `p-datepicker` (a component, whose default
  // export is its own instance) resolves to its host element too, matching the plain input/textarea
  // fields in the same query.
  @ViewChildren('fieldInput', { read: ElementRef }) private readonly fieldInputs!: QueryList<
    ElementRef<HTMLElement>
  >;

  protected readonly values = signal<InvitationFieldValues>({});
  /**
   * Event-derived pre-fill text, shown as `placeholder` rather than a committed `value` — so the
   * organiser sees "here's what we'd use" without it reading as something they already confirmed.
   * Falls back into the submitted value (see {@link effectiveValue}) if left untouched. Empty once
   * `settings.isConfigured` — those `fieldValues` are the organiser's own saved answers, not
   * suggestions, so they render as real values instead (see the seeding effect below).
   */
  protected readonly defaults = signal<InvitationFieldValues>({});
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
  protected readonly fieldRows = computed(() => groupFieldsIntoRows(this.fields()));

  protected readonly labels = INVITATION_FIELD_LABELS;
  protected readonly maxLengths = INVITATION_FIELD_MAX_LENGTHS;

  /** The event date can't be picked in the past — same rule create-event's own date field uses. */
  protected readonly minEventDate = new Date(new Date().setHours(0, 0, 0, 0));
  /** Anchors a freshly opened time picker on the next selectable 15-minute mark, not the raw minute. */
  protected readonly defaultTime = roundUpToQuarterHour(new Date());

  /** Gates the Discard-changes dialog on Cancel — untouched forms exit immediately. */
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
      // Unconfigured settings' fieldValues are event-derived guesses, never confirmed by anyone —
      // they start life as placeholder hints (see `defaults`), not real input state. Once
      // configured, fieldValues are the organiser's own saved answers, so they seed real values.
      const seeded = settings.isConfigured ? { ...settings.fieldValues } : {};
      this.values.set(seeded);
      this.initialValues.set(seeded);
      this.defaults.set(settings.isConfigured ? {} : { ...settings.fieldValues });
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

  protected isDateField(field: InvitationField): boolean {
    return DATE_FIELDS.includes(field);
  }

  protected isTimeField(field: InvitationField): boolean {
    return TIME_FIELDS.includes(field);
  }

  protected valueOf(field: InvitationField): string {
    return this.values()[field] ?? '';
  }

  protected defaultFor(field: InvitationField): string {
    return this.defaults()[field] ?? '';
  }

  /** What actually gets validated and submitted: the organiser's own typing, or the default if they left it as shown. */
  protected effectiveValue(field: InvitationField): string {
    const typed = (this.values()[field] ?? '').trim();
    return typed || this.defaultFor(field).trim();
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
    const value = this.effectiveValue(field);

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
      const value = this.effectiveValue(field);

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

    // A field left showing its placeholder default (never typed into) submits that default
    // rather than an empty string — accepting what was shown is a legitimate choice, not a no-op.
    const fieldValues: InvitationFieldValues = {};
    for (const field of this.fields()) {
      fieldValues[field] = this.effectiveValue(field) || null;
    }

    this.save.emit({ fieldValues, publicLinkEnabled: this.publicLinkEnabled() });
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
