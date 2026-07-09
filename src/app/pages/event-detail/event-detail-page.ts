import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Countdown, describeCountdown, formatEventWhen } from '../../core/events/event-countdown';
import { EventApiClient } from '../../core/events/event-api-client';
import { EventDetail } from '../../core/events/event-detail.model';
import { EventDetailError } from '../../core/events/event-detail-error.model';
import {
  EventTypeTint,
  eventTypeEmoji,
  eventTypeLabel,
  eventTypeTint,
} from '../../core/events/event-type-display';
import {
  BUDGET_SUMMARY_MOCK,
  DAY_OF_MOMENTS_MOCK,
  DETAIL_ROWS_MOCK,
  RSVP_SUMMARY_MOCK,
  SAMPLE_DATA_NOTE,
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
  readonly emoji: string;
  readonly tint: EventTypeTint;
  readonly whenLabel: string;
  readonly countdown: Countdown;
  readonly venue: string | null;
}

@Component({
  standalone: true,
  imports: [RouterLink],
  selector: 'app-event-detail-page',
  templateUrl: './event-detail-page.html',
  styleUrl: './event-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDetailPage implements OnInit {
  private readonly api = inject(EventApiClient);
  private readonly route = inject(ActivatedRoute);

  // Captured once so the countdown chip stays stable across change detection.
  private readonly now = new Date();

  private eventId = '';

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

  // Sample/mock data for panels not yet backed by a service (see event-detail-mocks.ts).
  readonly sampleNote = SAMPLE_DATA_NOTE;
  readonly rsvp = RSVP_SUMMARY_MOCK;
  readonly dayOfMoments = DAY_OF_MOMENTS_MOCK;
  readonly detailRows = DETAIL_ROWS_MOCK;
  readonly rsvpPercent = Math.round((RSVP_SUMMARY_MOCK.confirmed / RSVP_SUMMARY_MOCK.invited) * 100);
  readonly budget = {
    spent: this.formatMoney(BUDGET_SUMMARY_MOCK.spent, BUDGET_SUMMARY_MOCK.currency),
    total: this.formatMoney(BUDGET_SUMMARY_MOCK.total, BUDGET_SUMMARY_MOCK.currency),
    percent: Math.round((BUDGET_SUMMARY_MOCK.spent / BUDGET_SUMMARY_MOCK.total) * 100),
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
      emoji: eventTypeEmoji(event.eventType),
      tint: eventTypeTint(event.eventType),
      whenLabel: formatEventWhen(event.eventDate, event.eventStartTime, event.eventEndTime),
      countdown: describeCountdown(event.eventDate, this.now),
      venue: this.resolveVenue(event),
    };
  });

  readonly venueAddress = computed(() => this.event()?.location?.address?.trim() || null);

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
