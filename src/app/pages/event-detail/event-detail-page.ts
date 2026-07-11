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
import { EventEmptyTabComponent } from './empty-tab/event-empty-tab.component';
import { EventTablesTabComponent } from './tables/event-tables-tab.component';
import {
  BUDGET_SUGGESTIONS_MOCK,
  BUDGET_SUMMARY_MOCK,
  DAY_OF_MOMENTS_MOCK,
  DETAIL_ROWS_MOCK,
  GUEST_FILTERS_MOCK,
  GUEST_STATUS_LABEL,
  GUESTS_MOCK,
  NOTE_ON_THE_DAY_MOCK,
  RSVP_SUMMARY_MOCK,
} from './event-detail-mocks';

type DetailState = 'loading' | 'error' | 'not-found' | 'ready';
export type DetailTab = 'overview' | 'guests' | 'tables' | 'budget';

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
  imports: [RouterLink, EventEmptyTabComponent, EventTablesTabComponent],
  selector: 'app-event-detail-page',
  templateUrl: './event-detail-page.html',
  styleUrl: './event-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDetailPage implements OnInit {
  private readonly api = inject(EventApiClient);
  private readonly route = inject(ActivatedRoute);

  // Captured once so the countdown stays stable across change detection.
  private readonly now = new Date();

  protected eventId = '';

  readonly state = signal<DetailState>('loading');
  readonly loadError = signal<EventDetailError | null>(null);
  readonly activeTab = signal<DetailTab>('overview');

  private readonly event = signal<EventDetail | null>(null);

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
  readonly guests = GUESTS_MOCK;
  readonly guestFilters = GUEST_FILTERS_MOCK;
  readonly guestStatusLabel = GUEST_STATUS_LABEL;
  readonly budgetSuggestions = BUDGET_SUGGESTIONS_MOCK;

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
