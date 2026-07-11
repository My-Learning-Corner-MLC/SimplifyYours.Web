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
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';

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
  { index: 1, title: 'The basics', subtitle: 'Name, type, date & time' },
  { index: 2, title: 'The details', subtitle: 'Venue, address, timezone' },
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

// Canonical IANA identifiers only (Status = "Canonical"), per
// https://en.wikipedia.org/wiki/List_of_tz_database_time_zones — deliberately
// not sourced from `Intl.supportedValuesOf('timeZone')`, whose "canonical" set
// varies by browser/ICU build (e.g. some builds fold Asia/Ho_Chi_Minh into
// Asia/Bangkok as an alias even though tzdata keeps them distinct).
const CANONICAL_TIME_ZONES: readonly string[] = [
  'Pacific/Niue',
  'Pacific/Pago_Pago',
  'Pacific/Honolulu',
  'Pacific/Rarotonga',
  'Pacific/Tahiti',
  'America/Adak',
  'Pacific/Marquesas',
  'Pacific/Gambier',
  'America/Anchorage',
  'America/Juneau',
  'America/Metlakatla',
  'America/Nome',
  'America/Sitka',
  'America/Yakutat',
  'Pacific/Pitcairn',
  'America/Los_Angeles',
  'America/Tijuana',
  'America/Dawson_Creek',
  'America/Dawson',
  'America/Fort_Nelson',
  'America/Hermosillo',
  'America/Mazatlan',
  'America/Phoenix',
  'America/Vancouver',
  'America/Whitehorse',
  'America/Boise',
  'America/Cambridge_Bay',
  'America/Ciudad_Juarez',
  'America/Denver',
  'America/Inuvik',
  'America/Bahia_Banderas',
  'America/Belize',
  'America/Chihuahua',
  'America/Costa_Rica',
  'America/Edmonton',
  'America/El_Salvador',
  'Pacific/Galapagos',
  'America/Guatemala',
  'America/Managua',
  'America/Merida',
  'America/Mexico_City',
  'America/Monterrey',
  'America/Regina',
  'America/Swift_Current',
  'America/Tegucigalpa',
  'America/North_Dakota/Beulah',
  'America/North_Dakota/Center',
  'America/Chicago',
  'Pacific/Easter',
  'America/Indiana/Knox',
  'America/Matamoros',
  'America/Menominee',
  'America/North_Dakota/New_Salem',
  'America/Ojinaga',
  'America/Rankin_Inlet',
  'America/Resolute',
  'America/Indiana/Tell_City',
  'America/Winnipeg',
  'America/Bogota',
  'America/Cancun',
  'America/Eirunepe',
  'America/Guayaquil',
  'America/Jamaica',
  'America/Lima',
  'America/Panama',
  'America/Rio_Branco',
  'America/Detroit',
  'America/Grand_Turk',
  'America/Havana',
  'America/Indiana/Indianapolis',
  'America/Iqaluit',
  'America/Kentucky/Louisville',
  'America/Indiana/Marengo',
  'America/Kentucky/Monticello',
  'America/New_York',
  'America/Indiana/Petersburg',
  'America/Port-au-Prince',
  'America/Toronto',
  'America/Indiana/Vevay',
  'America/Indiana/Vincennes',
  'America/Indiana/Winamac',
  'America/Barbados',
  'America/Boa_Vista',
  'America/Campo_Grande',
  'America/Caracas',
  'America/Cuiaba',
  'America/Guyana',
  'America/La_Paz',
  'America/Manaus',
  'America/Martinique',
  'America/Porto_Velho',
  'America/Puerto_Rico',
  'America/Santo_Domingo',
  'Atlantic/Bermuda',
  'America/Glace_Bay',
  'America/Goose_Bay',
  'America/Halifax',
  'America/Moncton',
  'America/Santiago',
  'America/Thule',
  'America/St_Johns',
  'America/Araguaina',
  'America/Asuncion',
  'America/Bahia',
  'America/Belem',
  'America/Argentina/Buenos_Aires',
  'America/Argentina/Catamarca',
  'America/Cayenne',
  'America/Argentina/Cordoba',
  'America/Coyhaique',
  'America/Fortaleza',
  'America/Argentina/Jujuy',
  'America/Argentina/La_Rioja',
  'America/Maceio',
  'America/Argentina/Mendoza',
  'America/Montevideo',
  'Antarctica/Palmer',
  'America/Paramaribo',
  'America/Punta_Arenas',
  'America/Recife',
  'America/Argentina/Rio_Gallegos',
  'Antarctica/Rothera',
  'America/Argentina/Salta',
  'America/Argentina/San_Juan',
  'America/Argentina/San_Luis',
  'America/Santarem',
  'America/Sao_Paulo',
  'Atlantic/Stanley',
  'America/Argentina/Tucuman',
  'America/Argentina/Ushuaia',
  'America/Miquelon',
  'America/Noronha',
  'Atlantic/South_Georgia',
  'America/Nuuk',
  'America/Scoresbysund',
  'Atlantic/Cape_Verde',
  'Atlantic/Azores',
  'Africa/Abidjan',
  'Africa/Bissau',
  'America/Danmarkshavn',
  'Africa/Monrovia',
  'Africa/Sao_Tome',
  'Atlantic/Canary',
  'Europe/Dublin',
  'Atlantic/Faroe',
  'Europe/Lisbon',
  'Europe/London',
  'Atlantic/Madeira',
  'Antarctica/Troll',
  'Africa/Algiers',
  'Africa/Casablanca',
  'Africa/El_Aaiun',
  'Africa/Lagos',
  'Africa/Malabo',
  'Africa/Ndjamena',
  'Africa/Niamey',
  'Europe/Amsterdam',
  'Europe/Andorra',
  'Europe/Belgrade',
  'Europe/Berlin',
  'Europe/Bratislava',
  'Europe/Brussels',
  'Europe/Budapest',
  'Europe/Busingen',
  'Europe/Chisinau',
  'Europe/Copenhagen',
  'Europe/Gibraltar',
  'Europe/Guernsey',
  'Europe/Helsinki',
  'Europe/Isle_of_Man',
  'Europe/Istanbul',
  'Europe/Jersey',
  'Europe/Kaliningrad',
  'Europe/Kyiv',
  'Europe/Ljubljana',
  'Europe/Luxembourg',
  'Europe/Madrid',
  'Europe/Malta',
  'Europe/Mariehamn',
  'Europe/Minsk',
  'Europe/Monaco',
  'Europe/Moscow',
  'Europe/Oslo',
  'Europe/Paris',
  'Europe/Prague',
  'Europe/Riga',
  'Europe/Rome',
  'Europe/Samara',
  'Europe/San_Marino',
  'Europe/Sarajevo',
  'Europe/Saratov',
  'Europe/Sofia',
  'Europe/Stockholm',
  'Europe/Tallinn',
  'Europe/Tirane',
  'Europe/Ulyanovsk',
  'Europe/Vaduz',
  'Europe/Vienna',
  'Europe/Vilnius',
  'Europe/Volgograd',
  'Europe/Warsaw',
  'Europe/Zagreb',
  'Europe/Zurich',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Khartoum',
  'Africa/Nairobi',
  'Asia/Aden',
  'Asia/Amman',
  'Asia/Anadyr',
  'Asia/Aqtau',
  'Asia/Aqtobe',
  'Asia/Ashgabat',
  'Asia/Atyrau',
  'Asia/Baghdad',
  'Asia/Bahrain',
  'Asia/Baku',
  'Asia/Bangkok',
  'Asia/Barnaul',
  'Asia/Beirut',
  'Asia/Bishkek',
  'Asia/Brunei',
  'Asia/Chita',
  'Asia/Choibalsan',
  'Asia/Colombo',
  'Asia/Damascus',
  'Asia/Dhaka',
  'Asia/Dili',
  'Asia/Dubai',
  'Asia/Dushanbe',
  'Asia/Famagusta',
  'Asia/Gaza',
  'Asia/Hebron',
  'Asia/Ho_Chi_Minh',
  'Asia/Hong_Kong',
  'Asia/Hovd',
  'Asia/Irkutsk',
  'Asia/Jakarta',
  'Asia/Jayapura',
  'Asia/Jerusalem',
  'Asia/Kabul',
  'Asia/Kamchatka',
  'Asia/Karachi',
  'Asia/Kathmandu',
  'Asia/Khandyga',
  'Asia/Kolkata',
  'Asia/Krasnoyarsk',
  'Asia/Kuala_Lumpur',
  'Asia/Kuching',
  'Asia/Kuwait',
  'Asia/Macau',
  'Asia/Magadan',
  'Asia/Makassar',
  'Asia/Manila',
  'Asia/Muscat',
  'Asia/Nicosia',
  'Asia/Novokuznetsk',
  'Asia/Novosibirsk',
  'Asia/Omsk',
  'Asia/Oral',
  'Asia/Phnom_Penh',
  'Asia/Pontianak',
  'Asia/Pyongyang',
  'Asia/Qatar',
  'Asia/Qostanay',
  'Asia/Qyzylorda',
  'Asia/Riyadh',
  'Asia/Sakhalin',
  'Asia/Samarkand',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Srednekolymsk',
  'Asia/Taipei',
  'Asia/Tashkent',
  'Asia/Tbilisi',
  'Asia/Tehran',
  'Asia/Thimphu',
  'Asia/Tokyo',
  'Asia/Tomsk',
  'Asia/Ulaanbaatar',
  'Asia/Urumqi',
  'Asia/Ust-Nera',
  'Asia/Vladivostok',
  'Asia/Yakutsk',
  'Asia/Yangon',
  'Asia/Yekaterinburg',
  'Asia/Yerevan',
  'Australia/Adelaide',
  'Australia/Brisbane',
  'Australia/Broken_Hill',
  'Australia/Currie',
  'Australia/Darwin',
  'Australia/Eucla',
  'Australia/Hobart',
  'Australia/Lindeman',
  'Australia/Lord_Howe',
  'Australia/Melbourne',
  'Australia/Perth',
  'Australia/Sydney',
  'Pacific/Apia',
  'Pacific/Auckland',
  'Pacific/Bougainville',
  'Pacific/Chatham',
  'Pacific/Chuuk',
  'Pacific/Efate',
  'Pacific/Enderbury',
  'Pacific/Fakaofo',
  'Pacific/Fiji',
  'Pacific/Funafuti',
  'Pacific/Guadalcanal',
  'Pacific/Guam',
  'Pacific/Kiritimati',
  'Pacific/Kosrae',
  'Pacific/Kwajalein',
  'Pacific/Majuro',
  'Pacific/Nauru',
  'Pacific/Norfolk',
  'Pacific/Noumea',
  'Pacific/Palau',
  'Pacific/Pohnpei',
  'Pacific/Port_Moresby',
  'Pacific/Saipan',
  'Pacific/Tarawa',
  'Pacific/Tongatapu',
  'Pacific/Wake',
  'Pacific/Wallis',
];

export interface TimeZoneOption {
  readonly value: string;
  readonly city: string;
  readonly offset: string;
}

// Short GMT-offset label for an IANA zone, e.g. "GMT+7" / "GMT-05:30".
function timeZoneOffsetLabel(zone: string, now: Date): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      timeZoneName: 'shortOffset',
    }).formatToParts(now);
    return parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
  } catch {
    return 'GMT';
  }
}

// Signed minutes-from-UTC parsed out of a "GMT±h[:mm]" label, for ordering.
function offsetToMinutes(offset: string): number {
  const match = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(offset);
  if (!match) {
    return 0;
  }
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? '0'));
}

// City/offset options for the timezone <p-select>, ordered west-to-east so the
// list reads predictably. City is the trailing IANA segment ("Ho Chi Minh").
function buildTimeZoneOptions(): TimeZoneOption[] {
  const now = new Date();
  return CANONICAL_TIME_ZONES
    .map((zone) => ({
      value: zone,
      city: zone.split('/').pop()?.replace(/_/g, ' ') ?? zone,
      offset: timeZoneOffsetLabel(zone, now),
    }))
    .sort(
      (a, b) => offsetToMinutes(a.offset) - offsetToMinutes(b.offset) || a.city.localeCompare(b.city),
    );
}

@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DialogModule,
    DatePickerModule,
    SelectModule,
    NgTemplateOutlet,
    RouterLink,
  ],
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
  readonly timeZoneOptions: TimeZoneOption[] = buildTimeZoneOptions();
  // Calendar floor for the event date picker — grays out and blocks selection
  // of any day before today, matching the "today or in the future" rule.
  readonly minEventDate = new Date(new Date().setHours(0, 0, 0, 0));

  readonly form: FormGroup = this.fb.group(
    {
      eventName: ['', [Validators.required, trimmedMinLength(3), Validators.maxLength(200)]],
      eventType: ['', [Validators.required]],
      eventDate: ['', [Validators.required]],
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
    const hasGroupError =
      this.form.hasError('pastEventDate') ||
      this.form.hasError('invalidEventDate') ||
      this.form.hasError('endBeforeStart');
    const attempted = this.stepAttempted() || this.submitted() || !!this.form.get('eventDate')?.touched;
    return this.shouldShowError('eventDate') || (hasGroupError && attempted);
  }

  timeErrorMessage(): string {
    if (this.form.get('eventDate')?.hasError('required')) {
      return 'Pick a date for your occasion.';
    }
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
        }
        // Both "Create occasion" and "Create now, finish later" land on the
        // same success dialog — it already covers the "created" feedback, so
        // no separate toast is shown.
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
      timeZoneId: string | null;
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
    const timeZoneId = (raw.timeZoneId ?? '').trim();
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
