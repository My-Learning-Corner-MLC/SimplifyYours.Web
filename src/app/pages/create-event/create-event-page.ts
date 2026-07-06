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
import { CREATABLE_EVENT_TYPES, EventType } from '../../core/events/event-type.model';

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  birthday: 'Birthday',
  wedding: 'Wedding',
  event: 'Event',
  anniversary: 'Anniversary',
  launch: 'Launch',
  dinner: 'Dinner',
  other: 'Other',
};

const STEP_1_CONTROLS = ['eventName', 'eventType', 'eventDate', 'startTime', 'eventDescription'];

const CONTROL_IDS: Record<string, string> = {
  eventName: 'ce-event-name',
  eventType: 'ce-event-type',
  eventDate: 'ce-event-date',
  startTime: 'ce-start-time',
  eventDescription: 'ce-description',
  timeZoneId: 'ce-time-zone',
  'location.venueName': 'ce-venue-name',
  'location.address': 'ce-address',
  'location.onlineUrl': 'ce-online-url',
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

function absoluteHttpUrl(ctl: AbstractControl): ValidationErrors | null {
  const v = (ctl.value ?? '').toString().trim();
  if (v.length === 0) {
    return null;
  }
  try {
    const url = new URL(v);
    return url.protocol === 'http:' || url.protocol === 'https:' ? null : { absoluteHttpUrl: true };
  } catch {
    return { absoluteHttpUrl: true };
  }
}

function futureEventTime(group: AbstractControl): ValidationErrors | null {
  const date = (group.get('eventDate')?.value ?? '').toString();
  const time = (group.get('startTime')?.value ?? '').toString();
  if (!date) {
    return null;
  }
  const combined = new Date(`${date}T${time || '00:00'}`);
  if (Number.isNaN(combined.getTime())) {
    return { invalidEventTime: true };
  }
  return combined.getTime() >= Date.now() ? null : { pastEventTime: true };
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
  imports: [ReactiveFormsModule, DialogModule],
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
  readonly timeZones = supportedTimeZones();

  readonly form: FormGroup = this.fb.group(
    {
      eventName: ['', [Validators.required, trimmedMinLength(3), Validators.maxLength(200)]],
      eventType: ['', [Validators.required]],
      eventDate: [''],
      startTime: [''],
      eventDescription: ['', [Validators.maxLength(5000)]],
      timeZoneId: [''],
      location: this.fb.group({
        venueName: ['', [Validators.maxLength(200)]],
        address: ['', [Validators.maxLength(500)]],
        onlineUrl: ['', [Validators.maxLength(2048), absoluteHttpUrl]],
        notes: ['', [Validators.maxLength(2000)]],
      }),
    },
    { validators: futureEventTime },
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
      type: EVENT_TYPE_LABELS[created.eventType as EventType] ?? created.eventType,
      when: this.formatEventTime(created.eventTime, created.timeZoneId),
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
    return controlsValid && !this.form.hasError('pastEventTime') && !this.form.hasError('invalidEventTime');
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
      this.form.hasError('pastEventTime') || this.form.hasError('invalidEventTime');
    return hasError && (this.stepAttempted() || this.submitted() || !!this.form.get('eventDate')?.touched);
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
            detail: `“${response.eventName}” is saved — you can finish the details any time.`,
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
      eventDescription: '',
      timeZoneId: '',
      location: { venueName: '', address: '', onlineUrl: '', notes: '' },
    });
    this.step.set(1);
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
    this.resolveLeave?.(leave);
    this.resolveLeave = null;
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
      eventDescription: string;
      timeZoneId: string;
      location: { venueName: string; address: string; onlineUrl: string; notes: string };
    };

    const request: CreateEventRequest = {
      eventName: raw.eventName.trim(),
      eventType: raw.eventType,
    };

    const eventTime = this.toEventTimeIso(raw.eventDate, raw.startTime);
    if (eventTime !== null) {
      request.eventTime = eventTime;
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
      onlineUrl: raw.location.onlineUrl.trim(),
      notes: raw.location.notes.trim(),
    };
    if (Object.values(location).some((value) => value.length > 0)) {
      request.location = {
        venueName: location.venueName || null,
        address: location.address || null,
        onlineUrl: location.onlineUrl || null,
        notes: location.notes || null,
      };
    }

    return request;
  }

  private toEventTimeIso(date: string, time: string): string | null {
    if (!date) {
      return null;
    }
    const combined = new Date(`${date}T${time || '00:00'}`);
    return Number.isNaN(combined.getTime()) ? null : combined.toISOString();
  }

  private formatEventTime(eventTime: string, timeZoneId: string | null): string {
    const date = new Date(eventTime);
    if (Number.isNaN(date.getTime())) {
      return eventTime;
    }
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: timeZoneId ?? undefined,
      }).format(date);
    } catch {
      return date.toLocaleString();
    }
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
    if (this.form.hasError('pastEventTime') || this.form.hasError('invalidEventTime')) {
      const nameCtl = this.form.get('eventName');
      if (!nameCtl?.invalid && !this.form.get('eventType')?.invalid) {
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
