import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
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
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';

import { CreateEventError } from '../../core/events/create-event-error.model';
import { CreateEventRequest } from '../../core/events/create-event-request.model';
import { CreateEventResponse } from '../../core/events/create-event-response.model';
import { EventApiClient } from '../../core/events/event-api-client';
// Canonical maps live in core/events/event-type-display.ts and are shared with
// the dashboard; imported for local use and re-exported for existing consumers.
import { EVENT_TYPE_EMOJI, EVENT_TYPE_LABELS } from '../../core/events/event-type-display';
import { CREATABLE_EVENT_TYPES, EventType } from '../../core/events/event-type.model';

export { EVENT_TYPE_EMOJI, EVENT_TYPE_LABELS };

interface WizardStep {
  readonly index: 1 | 2;
  readonly title: string;
  readonly subtitle: string;
}

export const WIZARD_STEPS: readonly WizardStep[] = [
  { index: 1, title: 'The basics', subtitle: 'Name, type, date' },
  { index: 2, title: 'Where and when', subtitle: 'Venue, schedule, link' },
];

const STEP_1_CONTROLS = ['eventName', 'eventType', 'eventDate', 'startTime', 'endTime', 'eventDescription'];

const CONTROL_IDS: Record<string, string> = {
  eventName: 'ce-event-name',
  eventType: 'ce-event-type',
  eventDate: 'ce-event-date',
  startTime: 'ce-start-time',
  endTime: 'ce-end-time',
  eventDescription: 'ce-description',
  timeZoneId: 'ce-time-zone',
  'location.venueName': 'ce-venue-name',
  'location.address': 'ce-address',
  'location.notes': 'ce-location-notes',
};

function trimmedMinLength(min: number) {
  return (ctl: AbstractControl): ValidationErrors | null => {
    const v = (ctl.value ?? '').toString().trim();
    if (v.length === 0) {
      return null;
    }
    return v.length >= min ? null : { trimmedMinLength: { requiredLength: min } };
  };
}

function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function toMinutesOfDay(value: string): number | null {
  const match = /^(\d{2}):(\d{2})/.exec(value);
  if (!match) {
    return null;
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

// The event date is required and date-only; "future" is a calendar-day
// comparison against today, independent of the (optional) time-of-day.
function futureEventDate(group: AbstractControl): ValidationErrors | null {
  const date = (group.get('eventDate')?.value ?? '').toString();
  if (!date) {
    return null;
  }
  const eventDate = parseDateOnly(date);
  if (!eventDate) {
    return { invalidEventDate: true };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return eventDate.getTime() >= today.getTime() ? null : { pastEventDate: true };
}

// Start/end are time-of-day only (no date component), so this is a pure
// minutes-of-day comparison.
function endAfterStart(group: AbstractControl): ValidationErrors | null {
  const start = (group.get('startTime')?.value ?? '').toString();
  const end = (group.get('endTime')?.value ?? '').toString();
  if (!end) {
    return null;
  }
  const startMinutes = toMinutesOfDay(start || '00:00');
  const endMinutes = toMinutesOfDay(end);
  if (startMinutes === null || endMinutes === null) {
    return null;
  }
  return endMinutes >= startMinutes ? null : { endBeforeStart: true };
}

function supportedTimeZones(): readonly string[] {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return ['UTC'];
  }
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, NgTemplateOutlet],
  selector: 'app-create-event-page',
  templateUrl: './create-event-page.html',
  styleUrl: './create-event-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateEventPage {
  private readonly fb = inject(FormBuilder);
  private readonly eventApi = inject(EventApiClient);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);

  readonly eventTypes = CREATABLE_EVENT_TYPES;
  readonly eventTypeLabels = EVENT_TYPE_LABELS;
  readonly eventTypeEmoji = EVENT_TYPE_EMOJI;
  readonly steps = WIZARD_STEPS;
  readonly timeZones = supportedTimeZones();

  readonly form: FormGroup = this.fb.group(
    {
      eventName: ['', [Validators.required, trimmedMinLength(3), Validators.maxLength(200)]],
      eventType: ['', [Validators.required]],
      eventDate: [''],
      startTime: [''],
      endTime: [''],
      eventDescription: ['', [Validators.maxLength(5000)]],
      timeZoneId: [''],
      location: this.fb.group({
        venueName: ['', [Validators.maxLength(200)]],
        address: ['', [Validators.maxLength(500)]],
        notes: ['', [Validators.maxLength(2000)]],
      }),
    },
    { validators: [futureEventDate, endAfterStart] },
  );

  readonly step = signal<1 | 2>(1);
  readonly stepAttempted = signal(false);
  readonly submitted = signal(false);
  readonly submitting = signal(false);
  readonly pageError = signal('');
  readonly backendErrors = signal<Record<string, string[]>>({});
  readonly successEvent = signal<CreateEventResponse | null>(null);
  readonly finishedLater = signal(false);
  readonly leaveDialogVisible = signal(false);

  readonly successRecap = computed(() => {
    const created = this.successEvent();
    if (created === null) {
      return null;
    }
    return {
      name: created.eventName,
      typeEmoji: EVENT_TYPE_EMOJI[created.eventType as EventType] ?? '🎉',
      typeLabel: EVENT_TYPE_LABELS[created.eventType as EventType] ?? created.eventType,
      when: this.formatEventWindow(
        created.eventDate,
        created.eventStartTime,
        created.eventEndTime,
        created.timeZoneId,
      ),
    };
  });

  private resolveLeave: ((leave: boolean) => void) | null = null;

  selectType(type: EventType): void {
    this.form.get('eventType')?.setValue(type);
    this.form.get('eventType')?.markAsDirty();
  }

  isTypeSelected(type: EventType): boolean {
    return this.form.get('eventType')?.value === type;
  }

  isStepDone(index: 1 | 2): boolean {
    return this.step() > index;
  }

  isStepActive(index: 1 | 2): boolean {
    return this.step() === index;
  }

  nextStep(): void {
    this.stepAttempted.set(true);
    if (!this.isStepOneValid()) {
      this.focusFirstInvalid(STEP_1_CONTROLS);
      return;
    }
    this.stepAttempted.set(false);
    this.step.set(2);
  }

  backStep(): void {
    this.step.set(1);
  }

  isStepOneValid(): boolean {
    const controlsValid = STEP_1_CONTROLS.every((name) => !this.form.get(name)?.invalid);
    return (
      controlsValid &&
      !this.form.hasError('pastEventDate') &&
      !this.form.hasError('invalidEventDate') &&
      !this.form.hasError('endBeforeStart')
    );
  }

  shouldShowError(path: string): boolean {
    const ctl = this.form.get(path);
    if (!ctl) {
      return false;
    }
    return ctl.invalid && (ctl.touched || this.stepAttempted() || this.submitted());
  }

  shouldShowTimeError(): boolean {
    const hasError =
      this.form.hasError('pastEventDate') ||
      this.form.hasError('invalidEventDate') ||
      this.form.hasError('endBeforeStart');
    return hasError && (this.stepAttempted() || this.submitted() || !!this.form.get('eventDate')?.touched);
  }

  timeErrorMessage(): string {
    if (this.form.hasError('endBeforeStart')) {
      return 'The end time needs to be after the start time.';
    }
    return 'The occasion needs to be today or in the future.';
  }

  hasBackendError(path: string): boolean {
    return !this.shouldShowError(path) && !!this.backendErrors()[path]?.length;
  }

  backendErrorMessage(path: string): string {
    return this.backendErrors()[path]?.[0] ?? '';
  }

  onSubmit(finishLater = false): void {
    if (this.submitting() || this.successEvent() !== null) {
      return;
    }
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid(Object.keys(CONTROL_IDS));
      return;
    }

    this.pageError.set('');
    this.backendErrors.set({});
    this.submitting.set(true);
    this.form.disable({ emitEvent: false });

    this.eventApi.createEvent(this.buildRequest()).subscribe({
      next: (response: CreateEventResponse) => {
        this.submitting.set(false);
        this.form.markAsPristine();
        if (finishLater) {
          this.finishedLater.set(true);
          this.messages.add({
            severity: 'success',
            summary: 'Occasion created',
            detail: `“${response.eventName}” created — view it anytime from your dashboard.`,
          });
          void this.router.navigate(['/dashboard']);
          return;
        }
        this.successEvent.set(response);
      },
      error: (error: CreateEventError) => {
        this.submitting.set(false);
        this.form.enable({ emitEvent: false });
        this.applyBackendError(error);
      },
    });
  }

  goToDashboard(): void {
    void this.router.navigate(['/dashboard']);
  }

  createAnother(): void {
    this.successEvent.set(null);
    this.submitted.set(false);
    this.stepAttempted.set(false);
    this.form.enable({ emitEvent: false });
    this.form.reset({
      eventName: '',
      eventType: '',
      eventDate: '',
      startTime: '',
      endTime: '',
      eventDescription: '',
      timeZoneId: '',
      location: { venueName: '', address: '', onlineUrl: '', notes: '' },
    });
    this.step.set(1);
  }

  requestCancel(): void {
    if (!this.form.dirty || this.successEvent() !== null || this.finishedLater()) {
      void this.router.navigate(['/dashboard']);
      return;
    }
    this.leaveDialogVisible.set(true);
  }

  confirmLeave(): Promise<boolean> | boolean {
    if (!this.form.dirty || this.successEvent() !== null || this.finishedLater()) {
      return true;
    }
    this.leaveDialogVisible.set(true);
    return new Promise<boolean>((resolve) => {
      this.resolveLeave = resolve;
    });
  }

  onLeaveChoice(leave: boolean): void {
    this.leaveDialogVisible.set(false);
    if (this.resolveLeave !== null) {
      this.resolveLeave(leave);
      this.resolveLeave = null;
      return;
    }
    // Triggered from the in-form Cancel affordance (no pending navigation).
    if (leave) {
      void this.router.navigate(['/dashboard']);
    }
  }

  controlId(path: string): string {
    return CONTROL_IDS[path] ?? '';
  }

  private buildRequest(): CreateEventRequest {
    const raw = this.form.getRawValue() as {
      eventName: string;
      eventType: string;
      eventDate: string;
      startTime: string;
      endTime: string;
      eventDescription: string;
      timeZoneId: string;
      location: { venueName: string; address: string; notes: string };
    };

    const request: CreateEventRequest = {
      eventName: raw.eventName.trim(),
      eventType: raw.eventType,
    };

    if (raw.eventDate) {
      request.eventDate = raw.eventDate;
    }
    if (raw.startTime) {
      request.eventStartTime = raw.startTime;
    }
    if (raw.endTime) {
      request.eventEndTime = raw.endTime;
    }
    const description = raw.eventDescription.trim();
    if (description.length > 0) {
      request.eventDescription = description;
    }
    const timeZoneId = raw.timeZoneId.trim();
    if (timeZoneId.length > 0) {
      request.timeZoneId = timeZoneId;
    }

    const location = {
      venueName: raw.location.venueName.trim(),
      address: raw.location.address.trim(),
      notes: raw.location.notes.trim(),
    };
    if (Object.values(location).some((value) => value.length > 0)) {
      request.location = {
        venueName: location.venueName || null,
        address: location.address || null,
        notes: location.notes || null,
      };
    }

    return request;
  }

  // Start/end are wall-clock time-of-day only (no timezone conversion applies
  // to a bare clock reading) — timeZoneId is shown as a label, not used to
  // shift the displayed time.
  private formatEventWindow(
    eventDate: string,
    startTimeOfDay: string | null,
    endTimeOfDay: string | null,
    timeZoneId: string | null,
  ): string {
    const date = parseDateOnly(eventDate);
    if (!date) {
      return eventDate;
    }
    const day = new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(date);

    const start = this.parseTimeOfDay(startTimeOfDay);
    const zoneSuffix = timeZoneId ? ` (${timeZoneId})` : '';
    if (!start) {
      return `${day}${zoneSuffix}`;
    }
    const end = this.parseTimeOfDay(endTimeOfDay);
    const timeLabel = end
      ? `${this.formatTimeOfDay(start)} – ${this.formatTimeOfDay(end)}`
      : this.formatTimeOfDay(start);
    return `${day} · ${timeLabel}${zoneSuffix}`;
  }

  private parseTimeOfDay(value: string | null): { hour: number; minute: number } | null {
    if (!value) {
      return null;
    }
    const match = /^(\d{2}):(\d{2})/.exec(value);
    if (!match) {
      return null;
    }
    return { hour: Number(match[1]), minute: Number(match[2]) };
  }

  private formatTimeOfDay(time: { hour: number; minute: number }): string {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
      new Date(2000, 0, 1, time.hour, time.minute),
    );
  }

  private applyBackendError(error: CreateEventError): void {
    if (error.pageError) {
      this.pageError.set(error.pageError);
      this.messages.add({
        severity: 'error',
        summary: 'Could not create your occasion',
        detail: error.pageError,
      });
      return;
    }
    const fields = error.fieldErrors ?? {};
    this.backendErrors.set({ ...fields });
    const keys = Object.keys(fields);
    const hasStepOneError = keys.some((key) => STEP_1_CONTROLS.includes(key));
    if (hasStepOneError) {
      this.step.set(1);
    }
    this.focusFirstBackendOffender(keys);
  }

  private focusFirstBackendOffender(keys: string[]): void {
    for (const path of Object.keys(CONTROL_IDS)) {
      if (keys.includes(path)) {
        queueMicrotask(() => document.getElementById(CONTROL_IDS[path])?.focus());
        return;
      }
    }
  }

  private focusFirstInvalid(paths: string[]): void {
    if (
      this.form.hasError('pastEventDate') ||
      this.form.hasError('invalidEventDate') ||
      this.form.hasError('endBeforeStart')
    ) {
      if (!this.form.get('eventName')?.invalid && !this.form.get('eventType')?.invalid) {
        document.getElementById(CONTROL_IDS['eventDate'])?.focus();
        return;
      }
    }
    for (const path of paths) {
      const ctl = this.form.get(path);
      if (ctl?.invalid) {
        document.getElementById(CONTROL_IDS[path])?.focus();
        return;
      }
    }
  }
}
