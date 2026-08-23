import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  QueryList,
  ViewChild,
  ViewChildren,
  afterNextRender,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';

import { TemplateCatalogItem } from '../../../core/invitations/template-catalog.model';
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

/** Rendered with the same date-picker create-event uses, instead of a plain text input. */
const DATE_FIELDS: readonly InvitationField[] = ['eventDate'];

/** Rendered with the same time-picker create-event uses, instead of a plain text input. */
const TIME_FIELDS: readonly InvitationField[] = ['eventTime'];

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

export interface BasicInfoSaveEvent {
  readonly fieldValues: InvitationFieldValues;
  readonly publicLinkEnabled: boolean;
}

/**
 * "Basic info": content that fills the chosen invitation template, plus the public invitation
 * link toggle. Rendered inside a right-side drawer (`InvitationsTab` hosts the `p-drawer`) that
 * opens over {@link TemplateDetail} — reached via "Use this template" (new selection) or "Edit
 * basic info" (already selected).
 *
 * Event-derived fields arrive pre-filled as committed, editable values; couple names have no
 * event-record source and start empty, which is the reason this form exists at all.
 *
 * Edits here change the invitation only — never the event. An organiser may legitimately want a
 * friendly venue line on the invitation and a precise postal address on the event, so the form says
 * so rather than letting the divergence come as a surprise.
 *
 * Saving does not call the API directly — {@link save} hands the validated values up to
 * `InvitationsTab`, which runs the actual save. Save persists immediately; Cancel (or the
 * drawer's × close button) discards immediately — neither asks for confirmation first.
 */
@Component({
  selector: 'app-basic-info-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DatePickerModule],
  templateUrl: './basic-info-form.html',
  styleUrl: './basic-info-form.scss',
})
export class BasicInfoForm {
  readonly settings = input.required<InvitationSettings>();
  readonly template = input.required<TemplateCatalogItem>();
  readonly saving = input<boolean>(false);
  /** Server-side messages keyed by field, merged over local validation. */
  readonly serverErrors = input<Readonly<Record<string, readonly string[]>>>({});

  readonly save = output<BasicInfoSaveEvent>();
  /** Fired immediately on Cancel/× — nothing is asked first, the drawer just closes. */
  readonly dismissed = output<void>();

  // `read: ElementRef` so a `#fieldInput` placed on a `p-datepicker` (a component, whose default
  // export is its own instance) resolves to its host element too, matching the plain input/textarea
  // fields in the same query.
  @ViewChildren('fieldInput', { read: ElementRef }) private readonly fieldInputs!: QueryList<
    ElementRef<HTMLElement>
  >;

  /**
   * The public-link toggle — the first control in the form that isn't a date/time field. Whatever
   * mechanism lands initial focus somewhere inside a freshly opened drawer (browser-native or
   * library-driven — nothing in this codebase requests it explicitly), it otherwise lands on the
   * `eventDate` field, the form's first control, and drops the organiser straight onto a date input
   * with no visual cue why. Redirecting focus here on open is deliberate and harmless either way.
   */
  @ViewChild('autofocusTarget', { read: ElementRef })
  private readonly autofocusTarget?: ElementRef<HTMLButtonElement>;

  protected readonly values = signal<InvitationFieldValues>({});
  protected readonly publicLinkEnabled = signal(false);
  protected readonly touched = signal<ReadonlySet<InvitationField>>(new Set());
  protected readonly submitAttempted = signal(false);

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

  /** The event date can't be picked in the past — same rule create-event's own date field uses. */
  protected readonly minEventDate = new Date(new Date().setHours(0, 0, 0, 0));
  /** Anchors a freshly opened time picker on the next selectable 15-minute mark, not the raw minute. */
  protected readonly defaultTime = roundUpToQuarterHour(new Date());

  constructor() {
    // Seeding from an effect rather than the template keeps re-opening honest: whatever the API
    // returned — saved values, or event-derived pre-fills — is what the organiser sees, and as a
    // real value they can edit or accept as-is, not a hint they have to retype to keep.
    effect(() => {
      const settings = this.settings();
      this.values.set({ ...settings.fieldValues });
      this.publicLinkEnabled.set(settings.publicLinkEnabled);
      this.touched.set(new Set());
      this.submitAttempted.set(false);
    });

    // Runs once after this fresh instance's first render — see autofocusTarget's doc comment.
    // The focus() call itself is deferred a further macrotask past that (setTimeout 0, not just
    // afterNextRender alone): the exact mechanism that lands focus on the date field was never
    // pinned down to a specific PrimeNG call site, so if it turns out to be async — a Drawer/
    // FocusTrap callback queued via its own timer — afterNextRender alone could still run and lose
    // to it. Landing after everything else in the macrotask queue is the closest thing to a
    // guarantee of running last without depending on knowing what we're racing.
    afterNextRender(() => setTimeout(() => this.autofocusTarget?.nativeElement.focus(), 0));
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

  /** What actually gets validated and submitted: the organiser's own typing/edits. */
  protected effectiveValue(field: InvitationField): string {
    return this.valueOf(field).trim();
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

  /**
   * Public (not `protected`) because the drawer's × close button lives in `InvitationsTab`'s own
   * template (`<p-drawer>`'s header slot, via `@ViewChild`) — a sibling component can only call a
   * member that isn't access-restricted. Discards immediately, no confirmation asked.
   */
  onCancel(): void {
    this.dismissed.emit();
  }
}
