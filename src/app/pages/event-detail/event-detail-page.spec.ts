import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';

import { EventApiClient } from '../../core/events/event-api-client';
import { EventDetail } from '../../core/events/event-detail.model';
import { EventDetailError } from '../../core/events/event-detail-error.model';
import { GuestApiClient } from '../../core/guests/guest-api-client';
import { Guest } from '../../core/guests/guest.model';
import { ListGuestsError } from '../../core/guests/guest-error.model';
import { EventDetailPage } from './event-detail-page';

const makeDetail = (overrides: Partial<EventDetail> = {}): EventDetail => ({
  id: 'e1',
  eventName: 'The Whitmore – Hayes Wedding',
  eventDate: '2026-09-12',
  eventType: 'wedding',
  eventDescription: 'A late-summer ceremony at Villa Astoria.',
  createdAt: '2026-06-01T10:00:00+00:00',
  updatedAt: '2026-06-01T10:00:00+00:00',
  concurrencyToken: 'token',
  location: { venueName: 'Villa Astoria', address: 'Cernobbio, Lake Como', notes: null },
  timeZoneId: 'Europe/Rome',
  eventStartTime: '17:00:00',
  eventEndTime: '23:00:00',
  ...overrides,
});

const makeGuest = (overrides: Partial<Guest> = {}): Guest => ({
  id: 'g1',
  firstName: 'Ada',
  lastName: 'Tester',
  emailAddress: 'ada@example.com',
  phoneNumber: '+15551234567',
  eventMetadata: { relationship: 'Family', side: 'Bride', plusOnes: 1, dietaryNotes: 'Vegan' },
  createdAt: '2026-06-02T10:00:00+00:00',
  ...overrides,
});

class ApiStub {
  getEventDetails = vi.fn(() => of(makeDetail()));
}

class GuestApiStub {
  listGuests = vi.fn(() => of<Guest[]>([makeGuest()]));
  addGuest = vi.fn(() => of(makeGuest()));
}

function setup(api: ApiStub, guestApi: GuestApiStub = new GuestApiStub(), id: string | null = 'e1') {
  TestBed.configureTestingModule({
    imports: [EventDetailPage],
    providers: [
      { provide: EventApiClient, useValue: api },
      { provide: GuestApiClient, useValue: guestApi },
      {
        provide: ActivatedRoute,
        useValue: { paramMap: of(convertToParamMap(id === null ? {} : { id })) },
      },
    ],
  });
  const fixture = TestBed.createComponent(EventDetailPage);
  fixture.detectChanges();
  return fixture;
}

const html = (fixture: { nativeElement: HTMLElement }) => fixture.nativeElement as HTMLElement;
const testId = (root: HTMLElement, id: string) =>
  root.querySelector<HTMLElement>(`[data-testid="${id}"]`);

describe('EventDetailPage', () => {
  it('requests the event by the route id and shows the ready state', () => {
    const api = new ApiStub();
    const fixture = setup(api);

    expect(api.getEventDetails).toHaveBeenCalledWith('e1');
    const root = html(fixture);
    expect(testId(root, 'event-detail-overview')).not.toBeNull();
    expect(root.textContent).toContain('The Whitmore – Hayes Wedding');
  });

  it('renders the header with type badge, date and description from live data', () => {
    const fixture = setup(new ApiStub());
    const root = html(fixture);

    expect(root.textContent).toContain('Wedding');
    expect(root.textContent).toContain('Villa Astoria');
    expect(root.textContent).toContain('A late-summer ceremony');
  });

  it('shows Overview by default and switches to the Table management empty state', () => {
    const fixture = setup(new ApiStub());
    const root = html(fixture);
    expect(testId(root, 'event-detail-overview')).not.toBeNull();

    testId(root, 'event-detail-tab-tables')!.click();
    fixture.detectChanges();

    expect(testId(root, 'event-detail-overview')).toBeNull();
    expect(testId(root, 'event-detail-tables')).not.toBeNull();
    expect(root.textContent).toContain('Add first table');
  });

  it('renders a sliding tab indicator', () => {
    const fixture = setup(new ApiStub());
    const root = html(fixture);

    expect(testId(root, 'event-detail-tab-indicator')).not.toBeNull();
  });

  it('slides forward when moving to a later tab and backward when moving to an earlier one', () => {
    const fixture = setup(new ApiStub());
    const root = html(fixture);
    const body = () => root.querySelector<HTMLElement>('.detail__body')!;

    testId(root, 'event-detail-tab-tables')!.click();
    fixture.detectChanges();
    expect(body().getAttribute('data-slide')).toBe('forward');

    testId(root, 'event-detail-tab-guests')!.click();
    fixture.detectChanges();
    expect(body().getAttribute('data-slide')).toBe('backward');
  });

  it('loads and renders real guests when the Guests tab is opened', () => {
    const guestApi = new GuestApiStub();
    const fixture = setup(new ApiStub(), guestApi);
    const root = html(fixture);

    testId(root, 'event-detail-tab-guests')!.click();
    fixture.detectChanges();

    expect(guestApi.listGuests).toHaveBeenCalledWith('e1');
    const guests = testId(root, 'event-detail-guests')!;
    expect(guests.textContent).toContain('Ada Tester');
    expect(guests.textContent).toContain("Family · bride's side");
    expect(guests.textContent).toContain('Party of 2');
    expect(guests.textContent).toContain('Awaiting');
  });

  it('shows the empty state when the event has no guests', () => {
    const guestApi = new GuestApiStub();
    guestApi.listGuests = vi.fn(() => of<Guest[]>([]));
    const fixture = setup(new ApiStub(), guestApi);
    const root = html(fixture);

    testId(root, 'event-detail-tab-guests')!.click();
    fixture.detectChanges();

    expect(testId(root, 'guests-empty')).not.toBeNull();
  });

  it('shows the guest error state with retry', () => {
    const guestApi = new GuestApiStub();
    const err: ListGuestsError = { kind: 'server', message: 'Could not load the guest list.' };
    guestApi.listGuests = vi
      .fn()
      .mockReturnValueOnce(throwError(() => err))
      .mockReturnValueOnce(of<Guest[]>([makeGuest()]));
    const fixture = setup(new ApiStub(), guestApi);
    const root = html(fixture);

    testId(root, 'event-detail-tab-guests')!.click();
    fixture.detectChanges();

    expect(testId(root, 'guests-error')).not.toBeNull();
    testId(root, 'guests-error')!.querySelector('button')!.click();
    fixture.detectChanges();

    expect(guestApi.listGuests).toHaveBeenCalledTimes(2);
    expect(html(fixture).textContent).toContain('Ada Tester');
  });

  it('opens the Add Guest modal from the Guests tab', () => {
    const fixture = setup(new ApiStub());
    const root = html(fixture);

    testId(root, 'event-detail-tab-guests')!.click();
    fixture.detectChanges();

    expect(testId(root, 'add-guest-modal')).toBeNull();
    testId(root, 'event-detail-add-guest')!.click();
    fixture.detectChanges();

    expect(testId(root, 'add-guest-modal')).not.toBeNull();
  });

  it('renders the empty state on the Budget tab', () => {
    const fixture = setup(new ApiStub());
    const root = html(fixture);

    testId(root, 'event-detail-tab-budget')!.click();
    fixture.detectChanges();
    expect(testId(root, 'event-detail-budget')).not.toBeNull();
    expect(root.textContent).toContain('Set a budget to get started');
  });

  it('renders the Share invite and Edit event header actions', () => {
    const fixture = setup(new ApiStub());
    const root = html(fixture);

    const share = testId(root, 'event-detail-share') as HTMLButtonElement;
    const edit = testId(root, 'event-detail-edit') as HTMLButtonElement;
    expect(share.textContent).toContain('Share invite');
    expect(edit.textContent).toContain('Edit event');
  });

  it('shows the not-found state on a 404', () => {
    const api = new ApiStub();
    api.getEventDetails = vi.fn(() =>
      throwError((): EventDetailError => ({ kind: 'notFound', message: 'No such event.' })),
    );
    const fixture = setup(api);
    const root = html(fixture);

    expect(testId(root, 'event-detail-not-found')).not.toBeNull();
    expect(testId(root, 'event-detail-overview')).toBeNull();
  });

  it('shows the error state (with retry) on a server error and retries', () => {
    const api = new ApiStub();
    const error: EventDetailError = { kind: 'server', message: 'Try again in a moment.' };
    api.getEventDetails = vi
      .fn()
      .mockReturnValueOnce(throwError(() => error))
      .mockReturnValueOnce(of(makeDetail()));
    const fixture = setup(api);
    const root = html(fixture);

    const errorEl = testId(root, 'event-detail-error');
    expect(errorEl).not.toBeNull();

    errorEl!.querySelector('button')!.click();
    fixture.detectChanges();

    expect(api.getEventDetails).toHaveBeenCalledTimes(2);
    expect(testId(root, 'event-detail-overview')).not.toBeNull();
  });

  it('shows the not-found state when the route has no id', () => {
    const api = new ApiStub();
    const fixture = setup(api, new GuestApiStub(), null);
    const root = html(fixture);

    expect(api.getEventDetails).not.toHaveBeenCalled();
    expect(testId(root, 'event-detail-not-found')).not.toBeNull();
  });
});
