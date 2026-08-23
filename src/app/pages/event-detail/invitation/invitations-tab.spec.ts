import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

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
  // eventDate/eventTime mirror what the real backend pre-fills from the event record — shown as a
  // placeholder in the date/time pickers and submitted as-is unless the organiser picks their own.
  fieldValues: { eventDate: 'Saturday, 12 September 2026', eventTime: '4:00 PM' },
  isConfigured: false,
  requiredFields: ['brideName', 'groomName', 'eventDate', 'eventTime', 'venueName', 'venueAddress'],
  publicLinkEnabled: false,
  publicEventToken: null,
};

describe('InvitationsTab', () => {
  let fixture: ComponentFixture<InvitationsTab>;
  let settingsApi: {
    saveSettings: ReturnType<typeof vi.fn>;
    getSettings: ReturnType<typeof vi.fn>;
  };
  let catalog: {
    listTemplates: ReturnType<typeof vi.fn>;
    issuePreviewToken: ReturnType<typeof vi.fn>;
    previewRenderUrl: ReturnType<typeof vi.fn>;
  };

  async function render(settings: InvitationSettings = UNCONFIGURED_SETTINGS) {
    settingsApi.getSettings.mockReturnValue(of(settings));

    await TestBed.configureTestingModule({
      imports: [InvitationsTab],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: InvitationSettingsApiClient, useValue: settingsApi },
        { provide: TemplateCatalogApiClient, useValue: catalog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InvitationsTab);
    fixture.componentRef.setInput('eventId', 'event-1');
    fixture.componentRef.setInput('eventType', 'wedding');
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

  // eventDate/eventTime are excluded: they're rendered as PrimeNG date/time pickers now, and
  // UNCONFIGURED_SETTINGS already gives them a default that submits untouched (see BasicInfoForm's
  // effectiveValue/placeholder-default fallback) — there's nothing to simulate typing into here.
  const REQUIRED_FIELDS = ['brideName', 'groomName', 'venueName', 'venueAddress'];

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

  it('navigates to the detail view when a template is chosen', async () => {
    await render();

    (fixture.nativeElement.querySelector('app-template-card button') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-template-detail')).not.toBeNull();
  });

  it('"Use this template" on the detail view goes straight to basic info, without saving anything yet', async () => {
    await render();

    await goToDetailAndProceed();

    expect(fixture.nativeElement.querySelector('app-basic-info-form')).not.toBeNull();
    expect(settingsApi.saveSettings).not.toHaveBeenCalled();
  });

  it('shows the drawer header (title, template subtitle) in the p-drawer header slot', async () => {
    await render();
    await goToDetailAndProceed();

    expect(fixture.nativeElement.querySelector('.basic-info-drawer__title')?.textContent).toContain('Basic info');
    const subtitle = fixture.nativeElement.querySelector('.basic-info-drawer__subtitle')?.textContent;
    expect(subtitle).toContain('Verona');
    expect(subtitle).toContain('Wedding');
  });

  it('the drawer\'s × close button discards immediately, same as Cancel', async () => {
    await render();
    await goToDetailAndProceed();
    fillRequiredFields();

    (fixture.nativeElement.querySelector('.basic-info-drawer__close') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-basic-info-form')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-template-detail')).not.toBeNull();
  });

  it('Save persists immediately — no confirmation dialog', async () => {
    settingsApi.saveSettings.mockReturnValue(
      of({ ...UNCONFIGURED_SETTINGS, templateId: 'tmpl-1', templateName: 'Verona', isConfigured: true }),
    );
    await render();
    await goToDetailAndProceed();

    fillRequiredFields();
    submitBasicInfo();

    expect(settingsApi.saveSettings).toHaveBeenCalledWith('event-1', {
      templateId: 'tmpl-1',
      fieldValues: expect.objectContaining({ brideName: 'brideName-value' }),
      publicLinkEnabled: false,
    });
  });

  it('returns to the gallery once the save succeeds', async () => {
    settingsApi.saveSettings.mockReturnValue(
      of({ ...UNCONFIGURED_SETTINGS, templateId: 'tmpl-1', templateName: 'Verona', isConfigured: true }),
    );
    await render();
    await goToDetailAndProceed();

    fillRequiredFields();
    submitBasicInfo();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-template-gallery')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-basic-info-form')).toBeNull();
  });

  it('shows an inline error and keeps the drawer open when saving fails', async () => {
    settingsApi.saveSettings.mockReturnValue(throwError(() => ({ reason: 'network', fieldErrors: {} })));
    await render();
    await goToDetailAndProceed();

    fillRequiredFields();
    submitBasicInfo();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-basic-info-form')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.basic-info__form-error')?.textContent).toContain(
      "couldn't save your changes",
    );
  });

  it('clears the stale form-error banner once the basic-info drawer is dismissed and reopened', async () => {
    settingsApi.saveSettings.mockReturnValue(throwError(() => ({ reason: 'network', fieldErrors: {} })));
    await render();
    await goToDetailAndProceed();

    fillRequiredFields();
    submitBasicInfo();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.basic-info__form-error')).not.toBeNull();

    // Cancel discards immediately — no confirmation asked.
    (fixture.nativeElement.querySelector('.basic-info__secondary') as HTMLButtonElement).click();
    fixture.detectChanges();

    // Reopen via "Edit basic info" on the still-mounted detail view.
    (fixture.nativeElement.querySelector('.template-detail__primary') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.basic-info__form-error')).toBeNull();
  });

  it('returns to the gallery from the detail view without saving anything', async () => {
    await render();
    (fixture.nativeElement.querySelector('app-template-card button') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.template-detail__secondary') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-template-gallery')).not.toBeNull();
    expect(settingsApi.saveSettings).not.toHaveBeenCalled();
  });

  it('Cancel on the basic-info form discards immediately and returns to the detail view, not the gallery', async () => {
    await render();
    await goToDetailAndProceed();
    fillRequiredFields();

    (fixture.nativeElement.querySelector('.basic-info__secondary') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(settingsApi.saveSettings).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-basic-info-form')).toBeNull();
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
    await render(configured);

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

  it('saving "Edit basic info" on an already-selected template closes the drawer onto the detail view, not the gallery', async () => {
    const configured: InvitationSettings = {
      ...UNCONFIGURED_SETTINGS,
      templateId: 'tmpl-1',
      templateName: 'Verona',
      isConfigured: true,
      fieldValues: { ...UNCONFIGURED_SETTINGS.fieldValues, brideName: 'Amara' },
    };
    settingsApi.saveSettings.mockReturnValue(of({ ...configured, fieldValues: { brideName: 'Amara V2' } }));
    await render(configured);

    (fixture.nativeElement.querySelector('[data-testid="gallery-summary"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.template-detail__primary') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    fillRequiredFields();
    submitBasicInfo();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(settingsApi.saveSettings).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-basic-info-form')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-template-detail')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-template-gallery')).toBeNull();
  });
});
