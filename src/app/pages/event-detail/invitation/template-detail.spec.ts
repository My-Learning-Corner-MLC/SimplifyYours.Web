import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { InvitationApiClient } from '../../../core/invitations/invitation-api-client';
import { InvitationSettingsApiClient } from '../../../core/invitations/invitation-settings-api-client';
import { TemplateCatalogItem } from '../../../core/invitations/template-catalog.model';
import { TemplateDetail } from './template-detail';

const TEMPLATE: TemplateCatalogItem = {
  id: 't1',
  name: 'Verona',
  tone: 'Classic',
  palette: ['#111', '#222'],
  eventType: 'wedding',
  currentVersion: 1,
};

describe('TemplateDetail', () => {
  let fixture: ComponentFixture<TemplateDetail>;
  let settingsApi: { issuePreviewToken: ReturnType<typeof vi.fn> };
  let invitationApi: { previewRenderUrl: ReturnType<typeof vi.fn> };

  async function render(isPublicLinkEnabled = false) {
    await TestBed.configureTestingModule({
      imports: [TemplateDetail],
      providers: [
        { provide: InvitationSettingsApiClient, useValue: settingsApi },
        { provide: InvitationApiClient, useValue: invitationApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TemplateDetail);
    fixture.componentRef.setInput('template', TEMPLATE);
    fixture.componentRef.setInput('eventId', 'event-1');
    fixture.componentRef.setInput('eventType', 'wedding');
    fixture.componentRef.setInput('isPublicLinkEnabled', isPublicLinkEnabled);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    settingsApi = {
      issuePreviewToken: vi.fn(() => of({ token: 'preview-tok', expiresAt: '2026-01-01T00:00:00Z' })),
    };
    invitationApi = {
      previewRenderUrl: vi.fn((token: string, type: string) => `https://api.example.test/${token}?type=${type}`),
    };
  });

  it('shows the template name and event type/tone subtext', async () => {
    await render();

    expect(fixture.nativeElement.querySelector('.template-detail__title').textContent).toContain('Verona');
    expect(fixture.nativeElement.querySelector('.template-detail__subtitle').textContent).toContain('Wedding');
    expect(fixture.nativeElement.querySelector('.template-detail__subtitle').textContent).toContain('Classic');
  });

  it('issues a preview token on mount and builds the private preview URL by default', async () => {
    await render();

    expect(settingsApi.issuePreviewToken).toHaveBeenCalledWith('event-1');
    expect(invitationApi.previewRenderUrl).toHaveBeenCalledWith('preview-tok', 'private');
  });

  it('disables the public switch and shows the lock note when public sharing is off', async () => {
    await render(false);

    const publicBtn = fixture.nativeElement.querySelectorAll('.template-detail__switch-btn')[1] as HTMLButtonElement;
    expect(publicBtn.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      "Public link off — organizer hasn't enabled it for this event.",
    );
  });

  it('switches to the public preview URL when public sharing is enabled', async () => {
    await render(true);

    const buttons = fixture.nativeElement.querySelectorAll('.template-detail__switch-btn');
    (buttons[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(invitationApi.previewRenderUrl).toHaveBeenLastCalledWith('preview-tok', 'public');
  });

  it('does not switch to public when disabled', async () => {
    await render(false);

    const buttons = fixture.nativeElement.querySelectorAll('.template-detail__switch-btn');
    (buttons[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(invitationApi.previewRenderUrl).not.toHaveBeenCalledWith('preview-tok', 'public');
  });

  it('describes the RSVP button as present but inert, not hidden', async () => {
    // The actual rendered preview reuses the guest markup, RSVP button included — it is inert here
    // only because this app never wires its bridge message to anything in a preview.
    await render();

    expect(fixture.nativeElement.textContent).toContain('RSVP button is inert in this preview');
    expect(fixture.nativeElement.textContent).not.toContain('No RSVP button');
  });

  it('shows a retry option when the preview token fails to issue', async () => {
    settingsApi.issuePreviewToken.mockReturnValue(throwError(() => ({ reason: 'network' })));

    await render();

    expect(fixture.nativeElement.textContent).toContain("couldn't prepare a preview");
  });

  it('emits back when the breadcrumb link is clicked', async () => {
    const emitted = vi.fn();
    await render();
    fixture.componentInstance.back.subscribe(emitted);

    (fixture.nativeElement.querySelector('.template-detail__back-link') as HTMLButtonElement).click();

    expect(emitted).toHaveBeenCalledTimes(1);
  });

  it('emits useTemplate when the primary footer button is clicked', async () => {
    const emitted = vi.fn();
    await render();
    fixture.componentInstance.useTemplate.subscribe(emitted);

    (fixture.nativeElement.querySelector('.template-detail__primary') as HTMLButtonElement).click();

    expect(emitted).toHaveBeenCalledTimes(1);
  });
});
