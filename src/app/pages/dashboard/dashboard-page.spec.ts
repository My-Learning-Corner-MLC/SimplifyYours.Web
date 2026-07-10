import { Signal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthSessionService } from '../../core/auth/auth-session.service';
import { UserSession } from '../../core/auth/user-session.model';
import { EventApiClient } from '../../core/events/event-api-client';
import { EventSummary } from '../../core/events/event-summary.model';
import { QueryEventsResponse } from '../../core/events/query-events-response.model';
import { DashboardPage } from './dashboard-page';

const daysFromNow = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const makeEvent = (overrides: Partial<EventSummary> = {}): EventSummary => ({
  id: crypto.randomUUID(),
  eventName: 'Mateo turns five',
  eventDate: daysFromNow(10),
  eventType: 'birthday',
  eventDescription: 'Backyard party',
  createdAt: daysFromNow(-20),
  updatedAt: daysFromNow(-20),
  location: null,
  eventStartTime: null,
  eventEndTime: null,
  ...overrides,
});

const makeSession = (fullName: string): UserSession => ({
  userId: 'user-1',
  fullName,
  email: 'organizer@example.com',
  hasUnreadNotifications: false,
});

const makeResponse = (items: EventSummary[], totalCount = items.length): QueryEventsResponse => ({
  items,
  pageNumber: 1,
  pageSize: 100,
  totalCount,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: totalCount > items.length,
});

class ApiStub {
  queryEvents = vi.fn(() => of(makeResponse([])));
}

class AuthStub {
  readonly session: Signal<UserSession | null>;
  readonly clearSession = vi.fn();
  constructor(session: UserSession | null) {
    this.session = signal(session);
  }
}

function setup(api: ApiStub, session: UserSession | null = null) {
  TestBed.configureTestingModule({
    imports: [DashboardPage],
    providers: [
      provideRouter([]),
      { provide: EventApiClient, useValue: api },
      { provide: AuthSessionService, useValue: new AuthStub(session) },
    ],
  });
  const fixture = TestBed.createComponent(DashboardPage);
  fixture.detectChanges();
  return fixture;
}

describe('DashboardPage', () => {
  it('creates', () => {
    const fixture = setup(new ApiStub());
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the first-occasion empty state when the account has no events', () => {
    const api = new ApiStub();
    api.queryEvents.mockReturnValue(of(makeResponse([], 0)));
    const fixture = setup(api, makeSession('Amara Okoye'));

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="dashboard-empty"]')).not.toBeNull();
    expect(host.textContent).toContain('A blank page');
    expect(host.textContent).toContain('Welcome');
    expect(host.textContent).toContain('Amara');
    const cta = host.querySelector('.empty-state__cta') as HTMLAnchorElement | null;
    expect(cta?.getAttribute('href')).toBe('/create-event');
    // Six familiar-shape quick chips.
    expect(host.querySelectorAll('.empty-state__shape').length).toBe(6);
  });

  it('renders the populated dashboard with a greeting and event cards', () => {
    const api = new ApiStub();
    api.queryEvents.mockReturnValue(
      of(makeResponse([makeEvent({ eventName: 'Mateo turns five', eventDate: daysFromNow(10) })])),
    );
    const fixture = setup(api, makeSession('Eleanor Whitmore'));

    const host = fixture.nativeElement as HTMLElement;
    const heading = host.querySelector('h1.dashboard__greeting');
    expect(heading?.textContent).toContain('Eleanor');
    expect(host.querySelectorAll('[data-testid="event-card"]').length).toBe(1);
    expect(host.textContent).toContain('Mateo turns five');
    // The header no longer carries a redundant "+ New occasion" CTA — the
    // trailing "Begin another occasion" card is the single create affordance.
    expect(host.querySelector('.dashboard__new-cta')).toBeNull();
    const beginAnother = host.querySelector('.event-card__new-link') as HTMLAnchorElement | null;
    expect(beginAnother?.getAttribute('href')).toBe('/create-event');
  });

  it('defaults to the Upcoming filter and hides past events until Past is selected', () => {
    const api = new ApiStub();
    api.queryEvents.mockReturnValue(
      of(
        makeResponse([
          makeEvent({ eventName: 'Future gala', eventDate: daysFromNow(30) }),
          makeEvent({ eventName: 'Old dinner', eventDate: daysFromNow(-30) }),
        ]),
      ),
    );
    const fixture = setup(api);
    const component = fixture.componentInstance;

    expect(component.activeFilter()).toBe('upcoming');
    expect(component.upcomingCount()).toBe(1);
    expect(component.pastCount()).toBe(1);
    expect(component.allCount()).toBe(2);
    expect(component.visibleEvents().map((e) => e.name)).toEqual(['Future gala']);

    component.setFilter('past');
    fixture.detectChanges();
    expect(component.visibleEvents().map((e) => e.name)).toEqual(['Old dinner']);

    component.setFilter('all');
    fixture.detectChanges();
    expect(component.visibleEvents().length).toBe(2);
  });

  it('orders upcoming soonest-first and past most-recent-first', () => {
    const api = new ApiStub();
    api.queryEvents.mockReturnValue(
      of(
        makeResponse([
          makeEvent({ eventName: 'Later', eventDate: daysFromNow(40) }),
          makeEvent({ eventName: 'Sooner', eventDate: daysFromNow(5) }),
          makeEvent({ eventName: 'Recent past', eventDate: daysFromNow(-2) }),
          makeEvent({ eventName: 'Distant past', eventDate: daysFromNow(-40) }),
        ]),
      ),
    );
    const fixture = setup(api);
    const component = fixture.componentInstance;

    expect(component.upcomingEvents().map((e) => e.name)).toEqual(['Sooner', 'Later']);
    expect(component.pastEvents().map((e) => e.name)).toEqual(['Recent past', 'Distant past']);
  });

  it('shows an inline message when the active filter has no events', () => {
    const api = new ApiStub();
    api.queryEvents.mockReturnValue(of(makeResponse([makeEvent({ eventDate: daysFromNow(-10) })])));
    const fixture = setup(api);
    // Only a past event exists; default Upcoming tab is empty but account is not.
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="dashboard-empty"]')).toBeNull();
    expect(host.querySelector('[data-testid="dashboard-filter-empty"]')?.textContent).toContain(
      'Nothing upcoming',
    );
  });

  it('renders a "showing first N of M" note when more events exist than loaded', () => {
    const api = new ApiStub();
    api.queryEvents.mockReturnValue(of(makeResponse([makeEvent()], 120)));
    const fixture = setup(api);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.dashboard__more-note')?.textContent).toContain('120');
  });

  it('renders the venue and a time range when present on an event', () => {
    const api = new ApiStub();
    api.queryEvents.mockReturnValue(
      of(
        makeResponse([
          makeEvent({
            eventName: 'Garden party',
            eventDate: daysFromNow(12),
            eventStartTime: '18:00',
            eventEndTime: '22:00',
            location: { venueName: 'The Orchard House', address: null, notes: null },
          }),
        ]),
      ),
    );
    const fixture = setup(api);
    const card = fixture.nativeElement.querySelector(
      '[data-testid="event-card"]',
    ) as HTMLElement;
    expect(card.textContent).toContain('The Orchard House');
    // A time range renders an en-dash between start and end.
    expect(card.querySelector('.event-card__when')?.textContent).toContain('–');
  });

  it('renders an unknown event type without crashing', () => {
    const api = new ApiStub();
    api.queryEvents.mockReturnValue(
      of(makeResponse([makeEvent({ eventType: 'gala', eventName: 'Mystery gala' })])),
    );
    const fixture = setup(api);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Mystery gala');
    expect(host.textContent).toContain('Gala');
  });

  it('shows the error state and retries the query on Try again', () => {
    const api = new ApiStub();
    api.queryEvents
      .mockReturnValueOnce(throwError(() => ({ kind: 'server', message: 'Boom' })))
      .mockReturnValueOnce(of(makeResponse([makeEvent()])));
    const fixture = setup(api);
    const host = fixture.nativeElement as HTMLElement;

    const errorPanel = host.querySelector('[data-testid="dashboard-error"]');
    expect(errorPanel).not.toBeNull();
    expect(errorPanel?.textContent).toContain('Boom');

    (host.querySelector('.dashboard__retry') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(api.queryEvents).toHaveBeenCalledTimes(2);
    expect(host.querySelector('[data-testid="dashboard-error"]')).toBeNull();
    expect(host.querySelectorAll('[data-testid="event-card"]').length).toBe(1);
  });

  it('clears the session and redirects to /home on an unauthorized query error, without rendering an error state', () => {
    const api = new ApiStub();
    api.queryEvents.mockReturnValue(throwError(() => ({ kind: 'unauthorized' })));
    const auth = new AuthStub(null);
    TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideRouter([]),
        { provide: EventApiClient, useValue: api },
        { provide: AuthSessionService, useValue: auth },
      ],
    });
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="dashboard-error"]')).toBeNull();
    expect(auth.clearSession).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith('/home');
  });

  it('requests all events with a bounded page size', () => {
    const api = new ApiStub();
    setup(api);
    expect(api.queryEvents).toHaveBeenCalledWith(
      expect.objectContaining({ timeFilter: 'all', pageSize: 100 }),
    );
  });
});
