import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Invitation, RsvpChoice, SubmitRsvpRequest } from '../../core/invitations/invitation.model';

/** What the modal is showing. Mirrors the designed states. */
export type RsvpFormMode = 'form' | 'submitting' | 'success' | 'closed';

const NOTES_MAX_LENGTH = 500;

/**
 * The guest-facing RSVP form: public, unauthenticated, and app-owned.
 *
 * It lives outside the invitation frame, so it is the same component on every template — the
 * decorative HTML never needs to know it exists beyond carrying a trigger.
 */
@Component({
  selector: 'app-rsvp-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './rsvp-form.html',
  styleUrl: './rsvp-form.scss',
})
export class RsvpForm {
  readonly invitation = input.required<Invitation>();
  readonly submitting = input<boolean>(false);
  /** Set when a submit failed — values stay put so a retry re-sends rather than re-types. */
  readonly submitFailed = input<boolean>(false);
  readonly serverErrors = input<Readonly<Record<string, readonly string[]>>>({});
  readonly submitted = input<boolean>(false);

  readonly save = output<SubmitRsvpRequest>();
  readonly closed = output<void>();

  protected readonly choice = signal<RsvpChoice | null>(null);
  protected readonly plusOnes = signal(0);
  protected readonly notes = signal('');

  protected readonly notesMaxLength = NOTES_MAX_LENGTH;

  protected readonly mode = computed<RsvpFormMode>(() => {
    // Closed wins over everything: past the deadline there is nothing to submit, so no inputs
    // render at all rather than disabled ones the guest can still tab into.
    if (!this.invitation().rsvp.isOpen) {
      return 'closed';
    }

    if (this.submitted()) {
      return 'success';
    }

    return this.submitting() ? 'submitting' : 'form';
  });

  /** An existing answer changes the framing from "submit" to "update". */
  protected readonly isEditing = computed(() => this.invitation().rsvp.status !== 'NoResponse');

  protected readonly plusOnesAllowed = computed(() => this.invitation().rsvp.plusOnesAllowed);

  /** Only Attending plans for extra people — Maybe has nothing to plan for yet. */
  protected readonly showsPlusOnes = computed(() => this.choice() === 'Accepted');

  protected readonly canSubmit = computed(() => this.choice() !== null && !this.submitting());

  /** The deadline, as "May 1, 2026". */
  protected readonly deadlineLabel = computed(() => formatDeadline(this.invitation().rsvp.deadline));

  protected readonly respondedLabel = computed(() => formatDeadline(this.invitation().rsvp.respondedAt ?? null));

  protected readonly summary = computed(() => {
    const rsvp = this.invitation().rsvp;
    const guests = rsvp.plusOnesConfirmed ?? 0;

    if (rsvp.status === 'Accepted') {
      return guests > 0 ? `Attending · ${guests} guest${guests === 1 ? '' : 's'}` : 'Attending';
    }

    return rsvp.status === 'Declined' ? 'Not attending' : 'Might attend';
  });

  constructor() {
    // Seed from whatever the guest last told us, so re-opening the link shows their own answer
    // rather than a blank form that looks like it was never submitted.
    effect(() => {
      const rsvp = this.invitation().rsvp;

      this.choice.set(rsvp.status === 'NoResponse' ? null : (rsvp.status as RsvpChoice));
      this.plusOnes.set(rsvp.plusOnesConfirmed ?? 0);
      this.notes.set(rsvp.dietaryNotes ?? '');
    });
  }

  protected chooseAttendance(choice: RsvpChoice): void {
    this.choice.set(choice);

    // Anything other than Attending carries no guest count; clearing it here means the payload
    // can never disagree with what the guest sees.
    if (choice !== 'Accepted') {
      this.plusOnes.set(0);
    }
  }

  protected adjustPlusOnes(delta: number): void {
    const next = this.plusOnes() + delta;

    if (next < 0 || next > this.plusOnesAllowed()) {
      return;
    }

    this.plusOnes.set(next);
  }

  protected onNotesInput(value: string): void {
    this.notes.set(value.slice(0, NOTES_MAX_LENGTH));
  }

  protected errorsFor(field: string): readonly string[] {
    return this.serverErrors()[field] ?? [];
  }

  /** Fields that currently have somewhere on screen to show an error. */
  private visibleFields(): readonly string[] {
    const fields: string[] = [];

    if (this.showsPlusOnes()) {
      fields.push('plusOnesConfirmed');
    }

    if (this.choice() !== null) {
      fields.push('dietaryNotes');
    }

    return fields;
  }

  /**
   * Server messages for fields that are not on screen — a plus-ones error while the stepper is
   * hidden, say. Without this they would be silently dropped and the guest would watch submit fail
   * with no explanation at all.
   */
  protected readonly unattachedErrors = computed(() => {
    const visible = this.visibleFields();

    return Object.entries(this.serverErrors())
      .filter(([field]) => !visible.includes(field))
      .flatMap(([, messages]) => messages);
  });

  protected onSubmit(): void {
    const choice = this.choice();

    if (choice === null || this.submitting()) {
      return;
    }

    this.save.emit({
      rsvpStatus: choice,
      plusOnesConfirmed: choice === 'Accepted' ? this.plusOnes() : 0,
      dietaryNotes: this.notes().trim() === '' ? null : this.notes().trim(),
    });
  }

  protected onClose(): void {
    this.closed.emit();
  }
}

/**
 * Renders a date as "May 1, 2026" — month name, day, comma, year.
 * Built from parts rather than a locale format so the order is the same everywhere.
 */
export function formatDeadline(iso: string | null): string {
  if (!iso) {
    return '';
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const month = date.toLocaleDateString('en-US', { month: 'long' });

  return `${month} ${date.getDate()}, ${date.getFullYear()}`;
}
