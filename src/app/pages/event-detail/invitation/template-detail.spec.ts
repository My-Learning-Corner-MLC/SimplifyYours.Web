import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { InvitationSelectionService } from '../../../core/invitations/invitation-selection.service';
import { TemplateCatalogApiClient } from '../../../core/invitations/template-catalog-api-client';
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
  let catalogApi: { issuePreviewToken: ReturnType<typeof vi.fn>; previewRenderUrl: ReturnType<typeof vi.fn> };
  let selection: { settings: ReturnType<typeof vi.fn> };

  async function render() {
    await TestBed.configureTestingModule({
      imports: [TemplateDetail],
      providers: [
        { provide: TemplateCatalogApiClient, useValue: catalogApi },
        { provide: InvitationSelectionService, useValue: selection },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TemplateDetail);
    fixture.componentRef.setInput('template', TEMPLATE);
    fixture.componentRef.setInput('eventName', "Amara & Julian's Wedding");
    fixture.componentRef.setInput('eventType', 'wedding');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    catalogApi = {
      issuePreviewToken: vi.fn(() => of({ token: 'preview-tok', expiresAt: '2026-01-01T00:00:00Z' })),
      previewRenderUrl: vi.fn((token: string, type: string) => `https://api.example.test/${token}?type=${type}`),
    };
    selection = { settings: vi.fn(() => null) };
  });

  it('shows the breadcrumb, event name, and template name', async () => {
    await render();

    const breadcrumb = fixture.nativeElement.querySelector('.template-detail__breadcrumb');
    expect(breadcrumb?.textContent).toContain("Amara & Julian's Wedding");
    expect(breadcrumb?.textContent).toContain('Verona');
  });

  it('shows the template name and event type/tone subtext', async () => {
    await render();

    expect(fixture.nativeElement.querySelector('.template-detail__title').textContent).toContain('Verona');
    expect(fixture.nativeElement.querySelector('.template-detail__subtitle').textContent).toContain('Wedding');
    expect(fixture.nativeElement.querySelector('.template-detail__subtitle').textContent).toContain('Classic');
  });

  it('issues a preview token for this template on mount and builds the private preview URL by default', async () => {
    await render();

    expect(catalogApi.issuePreviewToken).toHaveBeenCalledWith('t1');
    expect(catalogApi.previewRenderUrl).toHaveBeenCalledWith('preview-tok', 'private');
  });

  it('re-issues the preview token when the template input changes to a different one', async () => {
    await render();
    catalogApi.issuePreviewToken.mockClear();

    fixture.componentRef.setInput('template', { ...TEMPLATE, id: 't2', name: 'Noir' });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(catalogApi.issuePreviewToken).toHaveBeenCalledWith('t2');
  });

  it('the public event link switch is always available, regardless of the real event\'s public-link status', async () => {
    // Preview is entirely template-management-service's concern now, decoupled from any event —
    // gating this on the real event's publicLinkEnabled would be a leftover from when it wasn't.
    await render();

    const publicBtn = fixture.nativeElement.querySelectorAll('.template-detail__switch-btn')[1] as HTMLButtonElement;
    expect(publicBtn.disabled).toBe(false);
  });

  it('switches to the public preview URL when the switch is clicked', async () => {
    await render();

    const buttons = fixture.nativeElement.querySelectorAll('.template-detail__switch-btn');
    (buttons[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(catalogApi.previewRenderUrl).toHaveBeenLastCalledWith('preview-tok', 'public');
  });

  it('describes the RSVP button as present but inert, not hidden', async () => {
    // The actual rendered preview reuses the guest markup, RSVP button included — it is inert here
    // only because this app never wires its bridge message to anything in a preview.
    await render();

    expect(fixture.nativeElement.textContent).toContain('RSVP button is inert in this preview');
    expect(fixture.nativeElement.textContent).not.toContain('No RSVP button');
  });

  it('shows a retry option when the preview token fails to issue', async () => {
    catalogApi.issuePreviewToken.mockReturnValue(throwError(() => ({ reason: 'network' })));

    await render();

    expect(fixture.nativeElement.textContent).toContain("couldn't prepare a preview");
  });

  it('emits back when "Back to gallery" is clicked', async () => {
    const emitted = vi.fn();
    await render();
    fixture.componentInstance.back.subscribe(emitted);

    (fixture.nativeElement.querySelector('.template-detail__secondary') as HTMLButtonElement).click();

    expect(emitted).toHaveBeenCalledTimes(1);
  });

  it('emits useTemplate when the primary footer button is clicked', async () => {
    const emitted = vi.fn();
    await render();
    fixture.componentInstance.useTemplate.subscribe(emitted);

    (fixture.nativeElement.querySelector('.template-detail__primary') as HTMLButtonElement).click();

    expect(emitted).toHaveBeenCalledTimes(1);
  });

  it('shows "Use this template" and no badge when this template is not the event\'s selection', async () => {
    selection.settings.mockReturnValue({ templateId: 'some-other-template' });

    await render();

    expect(fixture.nativeElement.querySelector('.template-detail__badge')).toBeNull();
    expect(fixture.nativeElement.querySelector('.template-detail__primary').textContent.trim()).toBe(
      'Use this template',
    );
  });

  it('shows the SELECTED badge and "Edit basic info" when this template is already the event\'s selection', async () => {
    selection.settings.mockReturnValue({ templateId: TEMPLATE.id });

    await render();

    expect(fixture.nativeElement.querySelector('.template-detail__badge')?.textContent).toContain('SELECTED');
    expect(fixture.nativeElement.querySelector('.template-detail__primary').textContent.trim()).toBe(
      'Edit basic info',
    );
  });

  it('still emits useTemplate when "Edit basic info" is clicked on an already-selected template', async () => {
    selection.settings.mockReturnValue({ templateId: TEMPLATE.id });
    const emitted = vi.fn();
    await render();
    fixture.componentInstance.useTemplate.subscribe(emitted);

    (fixture.nativeElement.querySelector('.template-detail__primary') as HTMLButtonElement).click();

    expect(emitted).toHaveBeenCalledTimes(1);
  });
});
