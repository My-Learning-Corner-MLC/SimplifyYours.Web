import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';

import { EventApiClient } from '../../core/events/event-api-client';
import { EventDetail } from '../../core/events/event-detail.model';
import { EventDetailError } from '../../core/events/event-detail-error.model';
import { GuestApiClient } from '../../core/guests/guest-api-client';
import { Guest } from '../../core/guests/guest.model';
import { ListGuestsError } from '../../core/guests/guest-error.model';
import { InvitationSettingsApiClient } from '../../core/invitations/invitation-settings-api-client';
import { InvitationSettings } from '../../core/invitations/invitation-settings.model';
import { TemplateCatalogApiClient } from '../../core/invitations/template-catalog-api-client';
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
  deliveryStatus: 'NotSent',
  rsvpStatus: 'NoResponse',
  respondedAt: null,
  plusOnesConfirmed: null,
  createdAt: '2026-06-02T10:00:00+00:00',
  ...overrides,
});

class ApiStub {
  getEventDetails = vi.fn(() => of(makeDetail()));
}

const UNCONFIGURED_INVITATION_SETTINGS: InvitationSettings = {
  eventId: 'e1',
  eventType: 'wedding',
  templateId: null,
  templateName: null,
  fieldValues: {},
  isConfigured: false,
  requiredFields: [],
  publicLinkEnabled: false,
  publicEventToken: null,
};

class InvitationSettingsApiStub {
  getSettings = vi.fn(() => of(UNCONFIGURED_INVITATION_SETTINGS));
  saveSettings = vi.fn();
  rotatePublicToken = vi.fn();
  issuePreviewToken = vi.fn(() => of({ token: 'preview-tok', expiresAt: '2026-01-01T00:00:00Z' }));
}

class TemplateCatalogApiStub {
  listTemplates = vi.fn(() => of([]));
}

class GuestApiStub {
  listGuests = vi.fn(() => of<Guest[]>([makeGuest()]));
  addGuest = vi.fn(() => of(makeGuest()));
  getInvitationLink = vi.fn(() =>
    of({ guestId: 'g1', invitationToken: 'tok-abc', invitationUrl: 'https://app.test/invitation/tok-abc' }),
  );
}

function setup(
  api: ApiStub,
  guestApi: GuestApiStub = new GuestApiStub(),
  id: string | null = 'e1',
  invitationSettingsApi: InvitationSettingsApiStub = new InvitationSettingsApiStub(),
) {
  TestBed.configureTestingModule({
    imports: [EventDetailPage],
    providers: [
      { provide: EventApiClient, useValue: api },
      { provide: GuestApiClient, useValue: guestApi },
      { provide: InvitationSettingsApiClient, useValue: invitationSettingsApi },
      { provide: TemplateCatalogApiClient, useValue: new TemplateCatalogApiStub() },
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

  it('maps birthday guest metadata (no relationship/side) for a birthday event', () => {
    const api = new ApiStub();
    api.getEventDetails = vi.fn(() => of(makeDetail({ eventType: 'birthday' })));
    const guestApi = new GuestApiStub();
    guestApi.listGuests = vi.fn(() =>
      of<Guest[]>([makeGuest({ eventMetadata: { plusOnes: 2, dietaryNotes: 'Nut allergy' } })]),
    );
    const fixture = setup(api, guestApi);
    const root = html(fixture);

    testId(root, 'event-detail-tab-guests')!.click();
    fixture.detectChanges();

    const guests = testId(root, 'event-detail-guests')!;
    expect(guests.textContent).toContain('Ada Tester');
    expect(guests.textContent).not.toContain("side");
    expect(guests.textContent).toContain('Party of 3');
    expect(guests.textContent).toContain('Nut allergy');
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

  describe('invitation columns and copy link', () => {
    async function renderGuests(guestApi = new GuestApiStub()) {
      const fixture = setup(new ApiStub(), guestApi);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.componentInstance.setTab('guests');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      return fixture;
    }

    it('shows the RSVP state rather than a hardcoded label', async () => {
      const guestApi = new GuestApiStub();
      guestApi.listGuests = vi.fn(() => of([makeGuest({ rsvpStatus: 'Accepted' })]));

      const fixture = await renderGuests(guestApi);

      expect(fixture.nativeElement.textContent).toContain('Attending');
    });

    it('shows delivery separately from the RSVP answer', async () => {
      // The two are independent: a copied link can produce a response with nothing ever sent.
      const guestApi = new GuestApiStub();
      guestApi.listGuests = vi.fn(() => of([makeGuest({ rsvpStatus: 'Accepted', deliveryStatus: 'NotSent' })]));

      const fixture = await renderGuests(guestApi);
      const text = fixture.nativeElement.textContent;

      expect(text).toContain('Attending');
      expect(text).toContain('Not sent');
    });

    it('fetches the link only when the organiser asks for it', async () => {
      // The token is credential-like, so it is never carried in the list payload.
      const guestApi = new GuestApiStub();
      const fixture = await renderGuests(guestApi);

      expect(guestApi.getInvitationLink).not.toHaveBeenCalled();

      fixture.componentInstance.copyInvitationLink('g1');

      expect(guestApi.getInvitationLink).toHaveBeenCalledWith('g1');
    });

    it('reports a clipboard refusal rather than failing silently', async () => {
      const guestApi = new GuestApiStub();
      const fixture = await renderGuests(guestApi);

      Object.assign(navigator, {
        clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      });

      fixture.componentInstance.copyInvitationLink('g1');
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(fixture.componentInstance.copyLinkError()).toContain('Copying failed');
    });

    it('surfaces a failed link fetch', async () => {
      const guestApi = new GuestApiStub();
      guestApi.getInvitationLink = vi.fn(() => throwError(() => new Error('boom')));

      const fixture = await renderGuests(guestApi);
      fixture.componentInstance.copyInvitationLink('g1');

      expect(fixture.componentInstance.copyLinkError()).toContain("couldn't get");
      expect(fixture.componentInstance.copyingLinkFor()).toBeNull();
    });
  });

  describe('Invitations tab and the Guests toolbar indicator', () => {
    it('adds Invitations as a fifth tab', () => {
      const fixture = setup(new ApiStub());
      const root = html(fixture);

      expect(testId(root, 'event-detail-tab-invitations')?.textContent).toContain('Invitations');
    });

    it('renders the invitations tab panel with the InvitationsTab component', () => {
      const fixture = setup(new ApiStub());
      const root = html(fixture);

      testId(root, 'event-detail-tab-invitations')!.click();
      fixture.detectChanges();

      expect(root.querySelector('app-invitations-tab')).not.toBeNull();
    });

    it('shows a compact "no template" note and a "Set up invitation" toolbar button', () => {
      const fixture = setup(new ApiStub());
      const root = html(fixture);

      testId(root, 'event-detail-tab-guests')!.click();
      fixture.detectChanges();

      const note = testId(root, 'event-detail-invite-note');
      expect(note?.textContent).toContain('No invitation template chosen yet.');
      expect(note?.closest('.detail__guests-toolbar')).toBeNull(); // not part of the toolbar/alert
      expect(testId(root, 'event-detail-setup-invitation')?.textContent).toContain('Set up invitation');
    });

    it('"Set up invitation" switches to the Invitations tab', () => {
      const fixture = setup(new ApiStub());
      const root = html(fixture);

      testId(root, 'event-detail-tab-guests')!.click();
      fixture.detectChanges();
      testId(root, 'event-detail-setup-invitation')!.click();
      fixture.detectChanges();

      expect(testId(root, 'event-detail-invitations')).not.toBeNull();
    });

    it('shows the template name and a Change link once a template is configured', () => {
      const invitationApi = new InvitationSettingsApiStub();
      invitationApi.getSettings = vi.fn(() =>
        of({ ...UNCONFIGURED_INVITATION_SETTINGS, templateId: 'tmpl-1', isConfigured: true }),
      );
      const fixture = setup(new ApiStub(), new GuestApiStub(), 'e1', invitationApi);
      const root = html(fixture);

      testId(root, 'event-detail-tab-guests')!.click();
      fixture.detectChanges();

      const note = testId(root, 'event-detail-invite-note');
      expect(note?.textContent).toContain('Invitation template selected');
      expect(note?.querySelector('.detail__invite-note-link')?.textContent).toContain('Change');
      // No "Set up invitation" once a template is already chosen.
      expect(testId(root, 'event-detail-setup-invitation')).toBeNull();
    });

    it('the note\'s Change link switches to the Invitations tab', () => {
      const invitationApi = new InvitationSettingsApiStub();
      invitationApi.getSettings = vi.fn(() =>
        of({ ...UNCONFIGURED_INVITATION_SETTINGS, templateId: 'tmpl-1', isConfigured: true }),
      );
      const fixture = setup(new ApiStub(), new GuestApiStub(), 'e1', invitationApi);
      const root = html(fixture);

      testId(root, 'event-detail-tab-guests')!.click();
      fixture.detectChanges();
      (root.querySelector('.detail__invite-note-link') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(testId(root, 'event-detail-invitations')).not.toBeNull();
    });

    it('announces the template choice once via aria-live, driven by InvitationsTab', () => {
      const fixture = setup(new ApiStub());
      const root = html(fixture);
      testId(root, 'event-detail-tab-guests')!.click();
      fixture.detectChanges();

      fixture.componentInstance.onInvitationTemplateSelected('Verona');
      fixture.detectChanges();

      const live = testId(root, 'event-detail-guests')!.querySelector('[role="status"][aria-live="polite"]');
      expect(live?.textContent).toContain('Invitation template set to Verona');
    });
  });
});