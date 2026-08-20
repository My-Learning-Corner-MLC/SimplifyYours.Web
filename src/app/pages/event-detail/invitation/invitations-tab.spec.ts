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
  templateName: null,
  fieldValues: {},
  isConfigured: false,
  requiredFields: ['brideName', 'groomName', 'eventDate', 'eventTime', 'venueName', 'venueAddress'],
  publicLinkEnabled: false,
  publicEventToken: null,
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
  };
  let catalog: {
    listTemplates: ReturnType<typeof vi.fn>;
    issuePreviewToken: ReturnType<typeof vi.fn>;
    previewRenderUrl: ReturnType<typeof vi.fn>;
  };

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

  async function goToDetailAndProceed() {
    (fixture.nativeElement.querySelector('app-template-card button') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.template-detail__primary') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const REQUIRED_FIELDS = ['brideName', 'groomName', 'eventDate', 'eventTime', 'venueName', 'venueAddress'];

  function fillRequiredFields() {
    for (const field of REQUIRED_FIELDS) {
      const input = fixture.nativeElement.querySelector(`#field-${field}`) as HTMLInputElement;
      input.value = `${field}-value`;
      input.dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();
  }

  function submitBasicInfo() {
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  beforeEach(() => {
    guestApi = { listGuests: vi.fn(() => of([])) };
    settingsApi = {
      saveSettings: vi.fn(),
      getSettings: vi.fn(() => of(UNCONFIGURED_SETTINGS)),
    };
    catalog = {
      listTemplates: vi.fn(() => of([TEMPLATE])),
      issuePreviewToken: vi.fn(() => of({ token: 'preview-tok', expiresAt: '2026-01-01T00:00:00Z' })),
      previewRenderUrl: vi.fn((token: string, type: string) => `https://api.example.test/${token}?type=${type}`),
    };
  });

  it('starts on the gallery', async () => {
    await render();

    expect(fixture.nativeElement.querySelector('app-template-gallery')).not.toBeNull();
  });

  it('emits breadcrumb segments as the organiser moves through gallery, detail, and basic info', async () => {
    guestApi.listGuests.mockReturnValue(of([]));
    settingsApi.getSettings.mockReturnValue(of(UNCONFIGURED_SETTINGS));

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
    const emitted: (readonly string[])[] = [];
    fixture.componentInstance.breadcrumbChange.subscribe((segments) => emitted.push(segments));

    fixture.componentRef.setInput('eventId', 'event-1');
    fixture.componentRef.setInput('eventType', 'wedding');
    fixture.componentRef.setInput('eventName', "Amara & Julian's Wedding");
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(emitted.at(-1)).toEqual(['Invitations']);

    await goToDetailAndProceed();

    // goToDetailAndProceed passes through the detail view before basic info.
    expect(emitted).toContainEqual(['Invitations', 'Verona']);
    expect(emitted.at(-1)).toEqual(['Invitations', 'Verona', 'Basic info']);
  });

  it('navigates to the detail view when a template is chosen', async () => {
    await render();

    (fixture.nativeElement.querySelector('app-template-card button') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-template-detail')).not.toBeNull();
  });

  it('"Use this template" on the detail view goes straight to basic info, without saving anything yet', async () => {
    await render([]);

    await goToDetailAndProceed();

    expect(fixture.nativeElement.querySelector('app-basic-info-form')).not.toBeNull();
    expect(settingsApi.saveSettings).not.toHaveBeenCalled();
  });

  it('shows the simple "use template" dialog on Save when no guest has a link yet', async () => {
    await render([]);
    await goToDetailAndProceed();

    fillRequiredFields();
    submitBasicInfo();

    expect(fixture.nativeElement.querySelector('app-use-template-confirm-dialog')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-change-template-confirm-dialog')).toBeNull();
  });

  it('shows the change-template warning dialog on Save once a guest already has a link', async () => {
    await render([guest('g1')]);
    await goToDetailAndProceed();

    fillRequiredFields();
    submitBasicInfo();

    expect(fixture.nativeElement.querySelector('app-change-template-confirm-dialog')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-use-template-confirm-dialog')).toBeNull();
  });

  it('saves the template and field values together on dialog confirm, then returns to the gallery', async () => {
    settingsApi.saveSettings.mockReturnValue(
      of({ ...UNCONFIGURED_SETTINGS, templateId: 'tmpl-1', templateName: 'Verona', isConfigured: true }),
    );
    await render([]);
    await goToDetailAndProceed();

    fillRequiredFields();
    submitBasicInfo();

    (fixture.nativeElement.querySelector('.confirm-dialog__primary') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(settingsApi.saveSettings).toHaveBeenCalledWith('event-1', {
      templateId: 'tmpl-1',
      fieldValues: expect.objectContaining({ brideName: 'brideName-value' }),
      publicLinkEnabled: false,
    });
    expect(fixture.nativeElement.querySelector('app-template-gallery')).not.toBeNull();
  });

  it('shows an inline error and returns to basic info when saving fails', async () => {
    settingsApi.saveSettings.mockReturnValue(throwError(() => ({ reason: 'network', fieldErrors: {} })));
    await render([]);
    await goToDetailAndProceed();

    fillRequiredFields();
    submitBasicInfo();

    (fixture.nativeElement.querySelector('.confirm-dialog__primary') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-basic-info-form')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.basic-info__form-error')?.textContent).toContain(
      "couldn't save your changes",
    );
  });

  it('cancelling the confirm dialog returns to the basic-info form without saving', async () => {
    await render([]);
    await goToDetailAndProceed();

    fillRequiredFields();
    submitBasicInfo();

    (fixture.nativeElement.querySelector('.confirm-dialog__secondary') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(settingsApi.saveSettings).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-basic-info-form')).not.toBeNull();
  });

  it('returns to the gallery from the detail view without saving anything', async () => {
    await render([]);
    (fixture.nativeElement.querySelector('app-template-card button') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.template-detail__secondary') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-template-gallery')).not.toBeNull();
    expect(settingsApi.saveSettings).not.toHaveBeenCalled();
  });

  it('Cancel on the basic-info form returns to the detail view it was reached from, not the gallery', async () => {
    await render([]);
    await goToDetailAndProceed();

    (fixture.nativeElement.querySelector('.basic-info__secondary') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-template-detail')).not.toBeNull();
  });

  it('opens the basic-info form directly from an already-selected template\'s "Edit basic info"', async () => {
    const configured: InvitationSettings = {
      ...UNCONFIGURED_SETTINGS,
      templateId: 'tmpl-1',
      templateName: 'Verona',
      isConfigured: true,
      fieldValues: { brideName: 'Amara' },
    };
    await render([], configured);

    (fixture.nativeElement.querySelector('[data-testid="gallery-summary"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.template-detail__primary')?.textContent?.trim()).toBe(
      'Edit basic info',
    );

    (fixture.nativeElement.querySelector('.template-detail__primary') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-basic-info-form')).not.toBeNull();
  });
});
