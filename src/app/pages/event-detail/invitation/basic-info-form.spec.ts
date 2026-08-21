import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TemplateCatalogItem } from '../../../core/invitations/template-catalog.model';
import { InvitationSettings } from '../../../core/invitations/invitation-settings.model';
import { BasicInfoForm } from './basic-info-form';

const TEMPLATE: TemplateCatalogItem = {
  id: 'marigold',
  name: 'Marigold',
  tone: 'Classic',
  palette: ['#111', '#222'],
  eventType: 'wedding',
  currentVersion: 1,
};

function settings(overrides: Partial<InvitationSettings> = {}): InvitationSettings {
  return {
    eventId: '6f9b3c2a-6d1e-4f5b-9c3a-2e7d8b1f4a55',
    eventType: 'wedding',
    templateId: 'marigold',
    templateName: 'Marigold',
    fieldValues: {
      brideName: 'Amara',
      groomName: 'Julian',
      eventDate: 'Saturday, September 12, 2026',
      eventTime: '4:00 PM',
      venueName: 'Villa Astoria',
      venueAddress: 'Lake Como',
      venueNotes: null,
    },
    isConfigured: true,
    requiredFields: ['brideName', 'groomName', 'eventDate', 'eventTime', 'venueName', 'venueAddress'],
    publicLinkEnabled: false,
    publicEventToken: null,
    ...overrides,
  };
}

describe('BasicInfoForm', () => {
  let fixture: ComponentFixture<BasicInfoForm>;

  async function render(value: InvitationSettings = settings(), extra: Record<string, unknown> = {}) {
    await TestBed.configureTestingModule({ imports: [BasicInfoForm] }).compileComponents();

    fixture = TestBed.createComponent(BasicInfoForm);
    // Zoneless app: inputs must go through componentRef to trigger change detection.
    fixture.componentRef.setInput('settings', value);
    fixture.componentRef.setInput('template', TEMPLATE);

    for (const [key, val] of Object.entries(extra)) {
      fixture.componentRef.setInput(key, val);
    }

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const labels = () =>
    Array.from(fixture.nativeElement.querySelectorAll('label')).map((l) => (l as HTMLElement).textContent?.trim());

  const inputFor = (field: string) =>
    fixture.nativeElement.querySelector(`#field-${field}`) as HTMLInputElement | HTMLTextAreaElement;

  it('collects the wedding fields, including couple names', async () => {
    await render();

    const text = labels().join(' | ');
    expect(text).toContain("Bride's name");
    expect(text).toContain("Groom's name");
    expect(text).not.toContain('Event name');
  });

  it('collects the birthday fields instead for a birthday event', async () => {
    await render(settings({ eventType: 'birthday', fieldValues: { eventName: "Maya's 10th" } }));

    const text = labels().join(' | ');
    expect(text).toContain('Event name');
    expect(text).not.toContain("Bride's name");
  });

  it('pairs Bride\'s/Groom\'s name and Date/Time on the same row, like create-event does', async () => {
    await render();

    const rows = Array.from(fixture.nativeElement.querySelectorAll('.basic-info__row')) as HTMLElement[];
    const rowLabels = rows.map((row) =>
      Array.from(row.querySelectorAll('.basic-info__label')).map((l) => (l as HTMLElement).textContent?.trim()),
    );

    expect(rowLabels[0]).toEqual(["Bride's name", "Groom's name"]);
    expect(rowLabels[1]).toEqual(['Date', 'Time']);
    // Venue/Address/Venue notes each stay on their own row.
    expect(rows[2].querySelectorAll('.basic-info__label')).toHaveLength(1);
  });

  it('never asks for the guest name', async () => {
    // It is not typed — it belongs to whichever guest's link is being opened.
    await render();

    expect(inputFor('guestName')).toBeNull();
  });

  it('pre-fills from the settings it is given', async () => {
    await render();

    expect(inputFor('venueName').value).toBe('Villa Astoria');
    expect(inputFor('brideName').value).toBe('Amara');
  });

  it('shows event-derived defaults as a placeholder, not a committed value, before anything is saved', async () => {
    // Couple names have no event-record source — a realistic unconfigured settings response
    // never includes them (see GetInvitationSettingsQueryHandler.BuildDefaults).
    await render(
      settings({ isConfigured: false, fieldValues: { venueName: 'Villa Astoria', venueAddress: 'Lake Como' } }),
    );

    // Shown as a hint, not something the organiser already confirmed.
    expect(inputFor('venueName').value).toBe('');
    expect(inputFor('venueName').placeholder).toBe('Villa Astoria');
    // Couple names have no event-record source, so there's nothing to show as a placeholder either.
    expect(inputFor('brideName').value).toBe('');
    expect(inputFor('brideName').placeholder).toBe('');
  });

  it('submits the shown default when a placeholder field is left untouched', async () => {
    const emitted = vi.fn();
    await render(settings({ isConfigured: false }));
    fixture.componentInstance.save.subscribe(emitted);

    // Couple names have no default, so they still need to be typed for the submit to be valid.
    const bride = inputFor('brideName');
    bride.value = 'Amara';
    bride.dispatchEvent(new Event('input'));
    const groom = inputFor('groomName');
    groom.value = 'Julian';
    groom.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));

    expect(emitted).toHaveBeenCalledTimes(1);
    // venueName was never typed into — only ever shown as a placeholder — yet the default is what
    // gets submitted, since leaving it as shown is accepting it, not leaving it blank.
    expect(emitted.mock.calls[0][0]).toMatchObject({
      fieldValues: expect.objectContaining({ venueName: 'Villa Astoria' }),
    });
  });

  it('still blocks submit when a required field has neither a typed value nor a default', async () => {
    const emitted = vi.fn();
    await render(settings({ isConfigured: false, fieldValues: { venueName: 'Villa Astoria' } }));
    fixture.componentInstance.save.subscribe(emitted);

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(emitted).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelectorAll('.basic-info__error').length).toBeGreaterThan(0);
  });

  it('renders Date and Time with the same date/time-picker create-event uses', async () => {
    await render();

    expect(inputFor('eventDate')?.closest('p-datepicker')).not.toBeNull();
    expect(inputFor('eventTime')?.closest('p-datepicker')).not.toBeNull();
  });

  it("won't let the event date be picked in the past", async () => {
    await render();

    const instance = fixture.componentInstance as unknown as { minEventDate: Date };
    const today = new Date(new Date().setHours(0, 0, 0, 0));
    expect(instance.minEventDate.getTime()).toBe(today.getTime());
  });

  it('anchors a freshly opened time picker on the next 15-minute mark, not the exact current minute', async () => {
    await render();

    const instance = fixture.componentInstance as unknown as { defaultTime: Date };
    const anchor = instance.defaultTime;
    expect(anchor.getMinutes() % 15).toBe(0);
    expect(anchor.getTime()).toBeGreaterThanOrEqual(Date.now());
    // Never more than one step ahead of "now".
    expect(anchor.getTime() - Date.now()).toBeLessThanOrEqual(15 * 60 * 1000);
  });

  it('shows the same facts panel (event type, selection status) as the template detail view', async () => {
    await render();

    const facts = fixture.nativeElement.querySelector('.template-detail__facts').textContent;
    expect(facts).toContain('Event type');
    expect(facts).toContain('Wedding');
    // The default fixture's templateId matches TEMPLATE.id.
    expect(fixture.nativeElement.querySelector('.template-detail__fact-status')?.textContent?.trim()).toBe(
      'Selected',
    );
  });

  it('shows "Not selected" in the facts panel when this isn\'t the event\'s chosen template', async () => {
    await render(settings({ templateId: 'some-other-template' }));

    expect(fixture.nativeElement.querySelector('.template-detail__fact-status')?.textContent?.trim()).toBe(
      'Not selected',
    );
  });

  it('marks only venueNotes optional', async () => {
    await render();

    const optional = labels().filter((l) => l?.includes('(optional)'));
    expect(optional).toHaveLength(1);
    expect(optional[0]).toContain('Venue notes');
  });

  it('says edits apply to the invitation and not the event', async () => {
    // The organiser may want a friendly venue line here and a postal address on the event; the
    // divergence should be a choice, not a surprise.
    await render();

    expect(fixture.nativeElement.textContent).toContain('this invitation only');
  });

  it('does not shout "required" at fields the organiser has not touched', async () => {
    await render(settings({ fieldValues: {} }));

    expect(fixture.nativeElement.querySelectorAll('.basic-info__error')).toHaveLength(0);
  });

  it('blocks submit and shows errors when a required field is empty', async () => {
    const emitted = vi.fn();
    await render(settings({ fieldValues: { brideName: 'Amara' } }));
    fixture.componentInstance.save.subscribe(emitted);

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(emitted).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelectorAll('.basic-info__error').length).toBeGreaterThan(0);
  });

  it('submits the values when everything required is present', async () => {
    const emitted = vi.fn();
    await render();
    fixture.componentInstance.save.subscribe(emitted);

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));

    expect(emitted).toHaveBeenCalledTimes(1);
    expect(emitted.mock.calls[0][0]).toMatchObject({
      fieldValues: { brideName: 'Amara', venueName: 'Villa Astoria' },
      publicLinkEnabled: false,
    });
  });

  it('submits with venueNotes left blank', async () => {
    const emitted = vi.fn();
    await render();
    fixture.componentInstance.save.subscribe(emitted);

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));

    expect(emitted).toHaveBeenCalledTimes(1);
  });

  it('shows server-side field errors inline', async () => {
    await render(settings(), { serverErrors: { groomName: ['That name is not allowed.'] } });

    expect(fixture.nativeElement.textContent).toContain('That name is not allowed.');
  });

  it('disables the form while saving', async () => {
    await render(settings(), { saving: true });

    expect(inputFor('brideName').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.basic-info__primary').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.basic-info__primary').textContent).toContain('Saving');
  });

  it('emits dismissed on cancel without saving', async () => {
    const saved = vi.fn();
    const dismissed = vi.fn();
    await render();
    fixture.componentInstance.save.subscribe(saved);
    fixture.componentInstance.dismissed.subscribe(dismissed);

    (fixture.nativeElement.querySelector('.basic-info__secondary') as HTMLButtonElement).click();

    expect(dismissed).toHaveBeenCalledTimes(1);
    expect(saved).not.toHaveBeenCalled();
  });

  it('links each error to its input for screen readers', async () => {
    await render(settings({ fieldValues: {} }));

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const input = inputFor('brideName');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('error-brideName');
  });

  it('shows a snapshot failure (keyed on templateId, not a form field) as a form-level banner', async () => {
    await render(settings(), {
      serverErrors: { templateId: ['That template failed to parse and cannot be used.'] },
    });

    const banner = fixture.nativeElement.querySelector('.basic-info__form-error');
    expect(banner?.textContent).toContain('That template failed to parse');
  });

  it('moves focus to the first invalid field on a failed submit', async () => {
    await render(settings({ fieldValues: { brideName: 'Amara' } }));

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();

    // groomName is the first empty required field after brideName.
    expect(document.activeElement).toBe(inputFor('groomName'));
  });

  it('shows the same identity panel as the template detail view, with the page title and template subtitle', async () => {
    await render();

    expect(fixture.nativeElement.querySelector('.template-detail__title')?.textContent).toContain('Basic info');
    const subtitle = fixture.nativeElement.querySelector('.template-detail__subtitle')?.textContent;
    expect(subtitle).toContain('Marigold');
    expect(subtitle).toContain('Wedding');
    expect(fixture.nativeElement.querySelector('.template-detail__thumb-motif svg')).not.toBeNull();
  });

  it('defaults the public link toggle off when the event has none enabled', async () => {
    await render();

    const toggle = fixture.nativeElement.querySelector('.basic-info__toggle-switch');
    expect(toggle.getAttribute('aria-checked')).toBe('false');
  });

  it('seeds the public link toggle from settings when already enabled', async () => {
    await render(settings({ publicLinkEnabled: true }));

    const toggle = fixture.nativeElement.querySelector('.basic-info__toggle-switch');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('flips the public link toggle and includes it in the save payload', async () => {
    const emitted = vi.fn();
    await render();
    fixture.componentInstance.save.subscribe(emitted);

    (fixture.nativeElement.querySelector('.basic-info__toggle-switch') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));

    expect(emitted.mock.calls[0][0]).toMatchObject({ publicLinkEnabled: true });
  });

  it('exits immediately on Cancel when nothing has changed', async () => {
    const dismissed = vi.fn();
    await render();
    fixture.componentInstance.dismissed.subscribe(dismissed);

    (fixture.nativeElement.querySelector('.basic-info__secondary') as HTMLButtonElement).click();

    expect(dismissed).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('app-confirm-dialog')).toBeNull();
  });

  it('shows the discard-changes dialog on Cancel once a field has been edited, rather than exiting', async () => {
    const dismissed = vi.fn();
    await render();
    fixture.componentInstance.dismissed.subscribe(dismissed);

    const input = inputFor('brideName');
    input.value = 'Edited';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.basic-info__secondary') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(dismissed).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-confirm-dialog')).not.toBeNull();
  });

  it('"Keep editing" dismisses the discard dialog without leaving', async () => {
    const dismissed = vi.fn();
    await render();
    fixture.componentInstance.dismissed.subscribe(dismissed);

    const input = inputFor('brideName');
    input.value = 'Edited';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.basic-info__secondary') as HTMLButtonElement).click();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.confirm-dialog__secondary') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(dismissed).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-confirm-dialog')).toBeNull();
  });

  it('"Discard" on the dialog emits dismissed', async () => {
    const dismissed = vi.fn();
    await render();
    fixture.componentInstance.dismissed.subscribe(dismissed);

    const input = inputFor('brideName');
    input.value = 'Edited';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.basic-info__secondary') as HTMLButtonElement).click();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.confirm-dialog__primary') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(dismissed).toHaveBeenCalledTimes(1);
  });
});
