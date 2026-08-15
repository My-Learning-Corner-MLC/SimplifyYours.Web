import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { GuestApiClient } from '../../../core/guests/guest-api-client';
import { Guest } from '../../../core/guests/guest.model';
import { InvitationSettingsApiClient } from '../../../core/invitations/invitation-settings-api-client';
import { InvitationSettings } from '../../../core/invitations/invitation-settings.model';
import { TemplateCatalogApiClient } from '../../../core/invitations/template-catalog-api-client';
import { TemplateCatalogItem } from '../../../core/invitations/template-catalog.model';
import { InvitationsTab } from './invitations-tab';

const TEMPLATE: TemplateCatalogItem = {
  id: 'tmpl-1',
  name: 'Verona',
  tone: 'Classic',
  palette: ['#111', '#222'],
  eventType: 'wedding',
  currentVersion: 1,
};

const UNCONFIGURED_SETTINGS: InvitationSettings = {
  eventId: 'event-1',
  eventType: 'wedding',
  templateId: null,
  fieldValues: {},
  isConfigured: false,
  requiredFields: ['brideName', 'groomName', 'eventDate', 'eventTime', 'venueName', 'venueAddress'],
};

function guest(id: string): Guest {
  return {
    id,
    firstName: 'A',
    lastName: 'B',
    emailAddress: null,
    phoneNumber: '555',
    eventMetadata: null,
    deliveryStatus: 'NotSent',
    rsvpStatus: 'NoResponse',
    respondedAt: null,
    plusOnesConfirmed: null,
    createdAt: '2026-01-01T00:00:00Z',
  };
}

describe('InvitationsTab', () => {
  let fixture: ComponentFixture<InvitationsTab>;
  let guestApi: { listGuests: ReturnType<typeof vi.fn> };
  let settingsApi: {
    saveSettings: ReturnType<typeof vi.fn>;
    getSettings: ReturnType<typeof vi.fn>;
    issuePreviewToken: ReturnType<typeof vi.fn>;
  };
  let catalog: { listTemplates: ReturnType<typeof vi.fn> };

  async function render(guests: Guest[] = [], settings: InvitationSettings = UNCONFIGURED_SETTINGS) {
    guestApi.listGuests.mockReturnValue(of(guests));
    settingsApi.getSettings.mockReturnValue(of(settings));

    await TestBed.configureTestingModule({
      imports: [InvitationsTab],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GuestApiClient, useValue: guestApi },
        { provide: InvitationSettingsApiClient, useValue: settingsApi },
        { provide: TemplateCatalogApiClient, useValue: catalog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InvitationsTab);
    fixture.componentRef.setInput('eventId', 'event-1');
    fixture.componentRef.setInput('eventType', 'wedding');
    fixture.componentRef.setInput('eventName', "Amara & Julian's Wedding");
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    guestApi = { listGuests: vi.fn(() => of([])) };
    settingsApi = {
      saveSettings: vi.fn(),
      getSettings: vi.fn(() => of(UNCONFIGURED_SETTINGS)),
      issuePreviewToken: vi.fn(() => of({ token: 'preview-tok', expiresAt: '2026-01-01T00:00:00Z' })),
    };
    catalog = { listTemplates: vi.fn(() => of([TEMPLATE])) };
  });

  it('starts on the gallery', async () => {
    await render();

    expect(fixture.nativeElement.querySelector('app-template-gallery')).not.toBeNull();
  });

  it('navigates to the detail view when a template is chosen', async () => {
    await render();

    (fixture.nativeElement.querySelector('app-template-card button') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-template-detail')).not.toBeNull();
  });

  it('shows the simple "use template" dialog when no guest has a link yet', async () => {
    await render([]);
    (fixture.nativeElement.querySelector('app-template-card button') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.template-detail__primary') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-use-template-confirm-dialog')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-change-template-confirm-dialog')).toBeNull();
  });

  it('shows the change-template warning dialog once a guest already has a link', async () => {
    await render([guest('g1')]);
    (fixture.nativeElement.querySelector('app-template-card button') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.template-detail__primary') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-change-template-confirm-dialog')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-use-template-confirm-dialog')).toBeNull();
  });

  it('saves the template and opens the basic-info form on confirm', async () => {
    settingsApi.saveSettings.mockReturnValue(
      of({ ...UNCONFIGURED_SETTINGS, templateId: 'tmpl-1', isConfigured: true }),
    );
    await render([]);
    (fixture.nativeElement.querySelector('app-template-card button') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.template-detail__primary') as HTMLButtonElement).click();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.confirm-dialog__primary') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(settingsApi.saveSettings).toHaveBeenCalledWith('event-1', { templateId: 'tmpl-1', fieldValues: {} });
    expect(fixture.nativeElement.querySelector('app-basic-info-form')).not.toBeNull();
  });

  it('shows an inline error and keeps the gallery flow usable when saving the template fails', async () => {
    settingsApi.saveSettings.mockReturnValue(throwError(() => ({ reason: 'network', fieldErrors: {} })));
    await render([]);
    (fixture.nativeElement.querySelector('app-template-card button') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.template-detail__primary') as HTMLButtonElement).click();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.confirm-dialog__primary') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.invitations-tab__error')?.textContent).toContain(
      "couldn't set that template",
    );
    expect(fixture.nativeElement.querySelector('app-template-detail')).not.toBeNull();
  });

  it('returns to the gallery from the detail view without saving anything', async () => {
    await render([]);
    (fixture.nativeElement.querySelector('app-template-card button') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.template-detail__back-link') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-template-gallery')).not.toBeNull();
    expect(settingsApi.saveSettings).not.toHaveBeenCalled();
  });

  it('opens the basic-info form directly from the gallery summary\'s "Edit basic info"', async () => {
    const configured: InvitationSettings = {
      ...UNCONFIGURED_SETTINGS,
      templateId: 'tmpl-1',
      isConfigured: true,
      fieldValues: { brideName: 'Amara' },
    };
    await render([], configured);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.template-gallery__summary-btn:last-child') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-basic-info-form')).not.toBeNull();
  });
});
