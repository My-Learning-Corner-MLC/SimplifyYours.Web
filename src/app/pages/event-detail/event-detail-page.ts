import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { describeCountdown, formatEventWhen } from '../../core/events/event-countdown';
import { EventApiClient } from '../../core/events/event-api-client';
import { EventDetail } from '../../core/events/event-detail.model';
import { EventDetailError } from '../../core/events/event-detail-error.model';
import { EventTypeTint, eventTypeLabel, eventTypeTint } from '../../core/events/event-type-display';
import { GuestApiClient } from '../../core/guests/guest-api-client';
import { Guest } from '../../core/guests/guest.model';
import { ListGuestsError } from '../../core/guests/guest-error.model';
import { SeatingStore } from '../../core/seating/seating-store';
import { AddGuestModalComponent } from './add-guest/add-guest-modal.component';
import { EventEmptyTabComponent } from './empty-tab/event-empty-tab.component';
import { EventTablesTabComponent } from './tables/event-tables-tab.component';
import {
  BUDGET_SUGGESTIONS_MOCK,
  BUDGET_SUMMARY_MOCK,
  DAY_OF_MOMENTS_MOCK,
  DETAIL_ROWS_MOCK,
  NOTE_ON_THE_DAY_MOCK,
  RSVP_SUMMARY_MOCK,
} from './event-detail-mocks';

type DetailState = 'loading' | 'error' | 'not-found' | 'ready';
type GuestsState = 'idle' | 'loading' | 'ready' | 'error';
export type DetailTab = 'overview' | 'guests' | 'tables' | 'budget';

// New guests have no RSVP yet, so every guest shows as "Awaiting" until the RSVP
// feature ships. Avatar tints cycle through the design's warm palette.
const GUEST_STATUS_LABEL = '○ Awaiting';
const AVATAR_TINTS = ['#f0d9b8', '#e8c9d8', '#d8e0c4', '#e5d3c0', '#d9cbe0'];

interface GuestRowVm {
  readonly id: string;
  readonly initial: string;
  readonly name: string;
  readonly group: string;
  readonly email: string;
  readonly party: string;
  readonly meal: string;
  readonly avatarBg: string;
}

interface GuestFilterVm {
  readonly label: string;
  readonly count: number;
}

interface DetailTabDef {
  readonly key: DetailTab;
  readonly label: string;
}

interface EventHeaderVm {
  readonly name: string;
  readonly description: string | null;
  readonly typeLabel: string;
  readonly tint: EventTypeTint;
  readonly dateLine: string;
  readonly venue: string | null;
  readonly venueAddress: string | null;
}

const DATE_LINE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const WEEKS_THRESHOLD_DAYS = 21;

@Component({
  standalone: true,
  imports: [RouterLink, EventEmptyTabComponent, EventTablesTabComponent, AddGuestModalComponent],
  providers: [SeatingStore],
  selector: 'app-event-detail-page',
  templateUrl: './event-detail-page.html',
  styleUrl: './event-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDetailPage implements OnInit {
  private readonly api = inject(EventApiClient);
  private readonly guestApi = inject(GuestApiClient);
  private readonly route = inject(ActivatedRoute);

  // Captured once so the countdown stays stable across change detection.
  private readonly now = new Date();

  protected eventId = '';

  readonly state = signal<DetailState>('loading');
  readonly loadError = signal<EventDetailError | null>(null);
  readonly activeTab = signal<DetailTab>('overview');

  // Guests tab: real data loaded lazily the first time the tab is opened.
  readonly guestsState = signal<GuestsState>('idle');
  readonly guestLoadError = signal<string | null>(null);
  readonly addGuestOpen = signal(false);
  private readonly guestList = signal<readonly Guest[]>([]);

  private readonly event = signal<EventDetail | null>(null);

  readonly isWedding = computed(() => this.event()?.eventType === 'wedding');

  readonly tabs: readonly DetailTabDef[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'guests', label: 'Guests' },
    { key: 'tables', label: 'Table management' },
    { key: 'budget', label: 'Budget' },
  ];

  // Mock data for panels not yet backed by a service (see event-detail-mocks.ts).
  readonly noteOnTheDay = NOTE_ON_THE_DAY_MOCK;
  readonly rsvp = RSVP_SUMMARY_MOCK;
  readonly dayOfMoments = DAY_OF_MOMENTS_MOCK;
  readonly detailRows = DETAIL_ROWS_MOCK;
  readonly budgetSuggestions = BUDGET_SUGGESTIONS_MOCK;

  // Guests tab view models, derived from the real guest list.
  readonly guestStatusLabel = GUEST_STATUS_LABEL;

  readonly guestRows = computed<GuestRowVm[]>(() =>
    this.guestList().map((guest, index) => this.toGuestRow(guest, index)),
  );

  readonly guestFilters = computed<GuestFilterVm[]>(() => {
    const total = this.guestList().length;
    // No RSVP data yet, so every guest is Awaiting; confirmed/declined are zero.
    return [
      { label: 'All', count: total },
      { label: 'Confirmed', count: 0 },
      { label: 'Awaiting', count: total },
      { label: 'Declined', count: 0 },
    ];
  });

  // Conic-gradient stops for the RSVP donut: champagne (confirmed) → coral
  // (declined) → translucent (awaiting), matching the design.
  readonly rsvpDonut = (() => {
    const confirmedEnd = (this.rsvp.confirmed / this.rsvp.invited) * 100;
    const declinedEnd = ((this.rsvp.confirmed + this.rsvp.declined) / this.rsvp.invited) * 100;
    return (
      `conic-gradient(#c8a876 0 ${confirmedEnd}%, ` +
      `#e07b5a ${confirmedEnd}% ${declinedEnd}%, ` +
      `rgba(255,255,255,0.18) ${declinedEnd}% 100%)`
    );
  })();

  readonly budget = {
    spent: this.formatMoney(BUDGET_SUMMARY_MOCK.spent, BUDGET_SUMMARY_MOCK.currency),
    total: this.formatMoney(BUDGET_SUMMARY_MOCK.total, BUDGET_SUMMARY_MOCK.currency),
    percent: Math.floor((BUDGET_SUMMARY_MOCK.spent / BUDGET_SUMMARY_MOCK.total) * 100),
  };

  readonly header = computed<EventHeaderVm | null>(() => {
    const event = this.event();
    if (!event) {
      return null;
    }
    return {
      name: event.eventName,
      description: event.eventDescription,
      typeLabel: eventTypeLabel(event.eventType),
      tint: eventTypeTint(event.eventType),
      dateLine: this.buildDateLine(event.eventDate),
      venue: this.resolveVenue(event),
      venueAddress: event.location?.address?.trim() || null,
    };
  });

  ngOnInit(): void {
    // Subscribe to the param map (not the one-shot snapshot) so navigating
    // straight from one event to another — same route, different :id — reloads
    // the detail instead of reusing the stale component instance.
    this.route.paramMap.subscribe((params) => {
      this.eventId = params.get('id') ?? '';
      this.load();
    });
  }

  load(): void {
    if (!this.eventId) {
      this.state.set('not-found');
      return;
    }
    this.state.set('loading');
    this.loadError.set(null);
    // Reset guest state so switching between events reloads the correct list.
    this.guestsState.set('idle');
    this.guestList.set([]);
    this.guestLoadError.set(null);
    this.addGuestOpen.set(false);
    this.api.getEventDetails(this.eventId).subscribe({
      next: (event) => {
        this.event.set(event);
        this.state.set('ready');
      },
      error: (error: EventDetailError) => {
        this.loadError.set(error);
        this.state.set(error.kind === 'notFound' ? 'not-found' : 'error');
      },
    });
  }

  retry(): void {
    this.load();
  }

  setTab(tab: DetailTab): void {
    this.activeTab.set(tab);
    if (tab === 'guests' && this.guestsState() === 'idle') {
      this.loadGuests();
    }
  }

  loadGuests(): void {
    if (!this.eventId) {
      return;
    }
    this.guestsState.set('loading');
    this.guestLoadError.set(null);
    this.guestApi.listGuests(this.eventId).subscribe({
      next: (guests) => {
        this.guestList.set(guests);
        this.guestsState.set('ready');
      },
      error: (error: ListGuestsError) => {
        this.guestLoadError.set(error.message);
        this.guestsState.set('error');
      },
    });
  }

  retryGuests(): void {
    this.loadGuests();
  }

  openAddGuest(): void {
    this.addGuestOpen.set(true);
  }

  closeAddGuest(): void {
    this.addGuestOpen.set(false);
  }

  // No success popup: append the created guest to the list and close the modal.
  onGuestAdded(guest: Guest): void {
    this.guestList.update((guests) => [...guests, guest]);
    if (this.guestsState() !== 'ready') {
      this.guestsState.set('ready');
    }
    this.addGuestOpen.set(false);
  }

  private toGuestRow(guest: Guest, index: number): GuestRowVm {
    const name = `${guest.firstName} ${guest.lastName}`.trim();
    const groupParts = [
      guest.relationship ?? null,
      guest.side ? `${guest.side.toLowerCase()}'s side` : null,
    ].filter((part): part is string => !!part);
    return {
      id: guest.id,
      initial: (guest.firstName.charAt(0) || '?').toUpperCase(),
      name,
      group: groupParts.join(' · '),
      email: guest.emailAddress ?? '—',
      party: guest.plusOnes > 0 ? `Party of ${guest.plusOnes + 1}` : 'Solo',
      meal: guest.dietaryNotes?.trim() || '—',
      avatarBg: AVATAR_TINTS[index % AVATAR_TINTS.length],
    };
  }

  /** "Saturday · 12 September 2026 · in 9 weeks" — matches the design's hero. */
  private buildDateLine(eventDateIso: string): string {
    const parts: string[] = [];
    const parsed = this.parseDateOnly(eventDateIso);
    if (parsed) {
      const formatted = DATE_LINE_FORMAT.format(parsed); // "Saturday, 12 September 2026"
      const [weekday, rest] = formatted.split(', ');
      parts.push(weekday, rest);
    } else {
      parts.push(formatEventWhen(eventDateIso));
    }
    parts.push(this.countdownPhrase(eventDateIso));
    return parts.filter(Boolean).join(' · ');
  }

  private countdownPhrase(eventDateIso: string): string {
    const { dayOffset } = describeCountdown(eventDateIso, this.now);
    if (dayOffset === 0) {
      return 'today';
    }
    const magnitude = Math.abs(dayOffset);
    const unit =
      magnitude > WEEKS_THRESHOLD_DAYS
        ? this.pluralize(Math.round(magnitude / 7), 'week')
        : this.pluralize(magnitude, 'day');
    return dayOffset > 0 ? `in ${unit}` : `${unit} ago`;
  }

  private pluralize(count: number, noun: string): string {
    return `${count} ${noun}${count === 1 ? '' : 's'}`;
  }

  private parseDateOnly(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!match) {
      return null;
    }
    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private resolveVenue(event: EventDetail): string | null {
    const venueName = event.location?.venueName?.trim();
    const address = event.location?.address?.trim();
    return venueName || address || null;
  }

  private formatMoney(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  }
}
