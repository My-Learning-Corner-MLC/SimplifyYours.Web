import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthSessionService } from '../../core/auth/auth-session.service';
import { Countdown, describeCountdown, formatEventWhen } from '../../core/events/event-countdown';
import { EventApiClient } from '../../core/events/event-api-client';
import { EventSummary } from '../../core/events/event-summary.model';
import { eventTypeEmoji, eventTypeLabel } from '../../core/events/event-type-display';
import { QueryEventsError } from '../../core/events/query-events-error.model';

type DashboardState = 'loading' | 'error' | 'empty' | 'ready';
type EventFilter = 'upcoming' | 'past' | 'all';

// How many events we load for the dashboard in one call. The API caps page size
// at 100; for the MVP pilot cohort this bounds the list without pagination UI.
const DASHBOARD_PAGE_SIZE = 100;

export interface EventCardVm {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly emoji: string;
  readonly typeLabel: string;
  readonly whenLabel: string;
  readonly venue: string | null;
  readonly countdown: Countdown;
  readonly isUpcoming: boolean;
}

interface FilterTab {
  readonly key: EventFilter;
  readonly label: string;
}

interface QuickType {
  readonly type: string;
  readonly emoji: string;
  readonly label: string;
}

export const EMPTY_STATE_QUICK_TYPES: readonly QuickType[] = [
  { type: 'birthday', emoji: '🎂', label: 'Birthday party' },
  { type: 'wedding', emoji: '💍', label: 'Wedding' },
  { type: 'anniversary', emoji: '🥂', label: 'Anniversary' },
  { type: 'launch', emoji: '🚀', label: 'Launch event' },
  { type: 'dinner', emoji: '🍽️', label: 'Dinner party' },
  { type: 'other', emoji: '✨', label: 'Something else' },
];

@Component({
  standalone: true,
  imports: [RouterLink],
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage implements OnInit {
  private readonly api = inject(EventApiClient);
  private readonly auth = inject(AuthSessionService);

  // Captured once so countdown chips stay stable across change detection.
  private readonly now = new Date();

  readonly state = signal<DashboardState>('loading');
  readonly loadError = signal<QueryEventsError | null>(null);
  readonly totalCount = signal(0);
  readonly activeFilter = signal<EventFilter>('upcoming');

  private readonly events = signal<readonly EventSummary[]>([]);

  readonly quickTypes = EMPTY_STATE_QUICK_TYPES;
  readonly filterTabs: readonly FilterTab[] = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
    { key: 'all', label: 'All' },
  ];

  readonly firstName = computed(() => {
    const session = this.auth.session();
    if (!session) {
      return '';
    }
    const [first] = session.fullName.trim().split(/\s+/);
    return first ?? '';
  });

  readonly greeting = computed(() => {
    const name = this.firstName();
    const salutation = `Good ${this.partOfDay()}`;
    return name ? `${salutation}, ${name}.` : `${salutation}.`;
  });

  readonly todayLabel = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(this.now);

  private readonly cards = computed<readonly EventCardVm[]>(() =>
    this.events().map((event) => this.toCard(event)),
  );

  readonly upcomingEvents = computed(() =>
    this.cards()
      .filter((card) => card.isUpcoming)
      .sort((a, b) => this.byEventTime(a, b, 'asc')),
  );

  readonly pastEvents = computed(() =>
    this.cards()
      .filter((card) => !card.isUpcoming)
      .sort((a, b) => this.byEventTime(a, b, 'desc')),
  );

  readonly allEvents = computed(() => [...this.upcomingEvents(), ...this.pastEvents()]);

  readonly upcomingCount = computed(() => this.upcomingEvents().length);
  readonly pastCount = computed(() => this.pastEvents().length);
  readonly allCount = computed(() => this.cards().length);

  readonly visibleEvents = computed<readonly EventCardVm[]>(() => {
    switch (this.activeFilter()) {
      case 'past':
        return this.pastEvents();
      case 'all':
        return this.allEvents();
      default:
        return this.upcomingEvents();
    }
  });

  readonly loadedCount = computed(() => this.events().length);
  readonly hasMore = computed(() => this.totalCount() > this.loadedCount());

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.loadError.set(null);
    this.api
      .queryEvents({
        timeFilter: 'all',
        pageSize: DASHBOARD_PAGE_SIZE,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      })
      .subscribe({
        next: (response) => {
          this.events.set(response.items);
          this.totalCount.set(response.totalCount);
          this.state.set(response.totalCount === 0 ? 'empty' : 'ready');
        },
        error: (error: QueryEventsError) => {
          this.loadError.set(error);
          this.state.set('error');
        },
      });
  }

  retry(): void {
    this.load();
  }

  setFilter(filter: EventFilter): void {
    this.activeFilter.set(filter);
  }

  countFor(filter: EventFilter): number {
    switch (filter) {
      case 'past':
        return this.pastCount();
      case 'all':
        return this.allCount();
      default:
        return this.upcomingCount();
    }
  }

  private toCard(event: EventSummary): EventCardVm {
    const countdown = describeCountdown(event.eventTime, this.now);
    return {
      id: event.id,
      name: event.eventName,
      description: event.eventDescription,
      emoji: eventTypeEmoji(event.eventType),
      typeLabel: eventTypeLabel(event.eventType),
      whenLabel: formatEventWhen(event.eventTime, event.eventStartTime, event.eventEndTime),
      venue: this.resolveVenue(event),
      countdown,
      isUpcoming: countdown.dayOffset >= 0,
    };
  }

  private resolveVenue(event: EventSummary): string | null {
    const venueName = event.location?.venueName?.trim();
    const address = event.location?.address?.trim();
    return venueName || address || null;
  }

  private byEventTime(a: EventCardVm, b: EventCardVm, direction: 'asc' | 'desc'): number {
    const delta = a.countdown.dayOffset - b.countdown.dayOffset;
    return direction === 'asc' ? delta : -delta;
  }

  private partOfDay(): 'morning' | 'afternoon' | 'evening' {
    const hour = this.now.getHours();
    if (hour < 12) {
      return 'morning';
    }
    if (hour < 18) {
      return 'afternoon';
    }
    return 'evening';
  }
}
