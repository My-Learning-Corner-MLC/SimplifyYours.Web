import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { InvitationSelectionService } from '../../../core/invitations/invitation-selection.service';
import { TemplateCatalogApiClient } from '../../../core/invitations/template-catalog-api-client';
import { TemplateCatalogItem } from '../../../core/invitations/template-catalog.model';
import { TemplateGallery } from './template-gallery';

const TEMPLATES: TemplateCatalogItem[] = [
  { id: 't1', name: 'Verona', tone: 'Classic', palette: ['#111', '#222'], eventType: 'wedding', currentVersion: 1 },
  { id: 't2', name: 'Marigold', tone: 'Warm', palette: ['#333', '#444'], eventType: 'wedding', currentVersion: 1 },
  { id: 't3', name: 'Noir', tone: 'Bold', palette: ['#000', '#555'], eventType: 'wedding', currentVersion: 1 },
];

describe('TemplateGallery', () => {
  let fixture: ComponentFixture<TemplateGallery>;
  let catalog: { listTemplates: ReturnType<typeof vi.fn> };
  let selection: {
    hasTemplate: ReturnType<typeof vi.fn>;
    settings: ReturnType<typeof vi.fn>;
    setTemplateName: ReturnType<typeof vi.fn>;
  };

  async function render(eventType = 'wedding') {
    await TestBed.configureTestingModule({
      imports: [TemplateGallery],
      providers: [
        { provide: TemplateCatalogApiClient, useValue: catalog },
        { provide: InvitationSelectionService, useValue: selection },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TemplateGallery);
    fixture.componentRef.setInput('eventType', eventType);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    catalog = { listTemplates: vi.fn() };
    selection = { hasTemplate: vi.fn(() => false), settings: vi.fn(() => null), setTemplateName: vi.fn() };
  });

  it('shows skeleton cards while loading', async () => {
    // Never emits, so the component stays in the loading state.
    catalog.listTemplates.mockReturnValue(new Subject<readonly TemplateCatalogItem[]>());

    await render();

    expect(fixture.nativeElement.querySelector('[data-testid="gallery-loading"]')).not.toBeNull();
  });

  it('shows a retry option on error', async () => {
    catalog.listTemplates.mockReturnValue(throwError(() => ({ reason: 'network' })));

    await render();

    const notice = fixture.nativeElement.querySelector('[data-testid="gallery-error"]');
    expect(notice?.textContent).toContain("We couldn't load the templates");
    expect(notice?.querySelector('button')?.textContent).toContain('Retry');
  });

  it('retries the fetch when Retry is clicked', async () => {
    catalog.listTemplates.mockReturnValue(throwError(() => ({ reason: 'network' })));
    await render();

    catalog.listTemplates.mockReturnValue(of(TEMPLATES));
    (fixture.nativeElement.querySelector('[data-testid="gallery-error"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="gallery-grid"]')).not.toBeNull();
  });

  it('shows an empty state with no call to action when there are no templates', async () => {
    catalog.listTemplates.mockReturnValue(of([]));

    await render();

    const empty = fixture.nativeElement.querySelector('[data-testid="gallery-empty"]');
    expect(empty?.textContent).toContain('No templates for Wedding events — yet');
    expect(empty?.querySelector('button')).toBeNull();
  });

  it('shows the populated grid with a count and 3 columns for 3 templates', async () => {
    catalog.listTemplates.mockReturnValue(of(TEMPLATES));

    await render();

    expect(fixture.nativeElement.textContent).toContain('3 templates for Wedding events');
    const grid = fixture.nativeElement.querySelector('[data-testid="gallery-grid"]') as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe('repeat(3, minmax(0, 300px))');
    expect(fixture.nativeElement.querySelectorAll('app-template-card')).toHaveLength(3);
  });

  it('uses a 2-column layout for two templates', async () => {
    catalog.listTemplates.mockReturnValue(of(TEMPLATES.slice(0, 2)));

    await render();

    const grid = fixture.nativeElement.querySelector('[data-testid="gallery-grid"]') as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 300px))');
  });

  it('shows the currently-selected summary bar once a template is chosen', async () => {
    catalog.listTemplates.mockReturnValue(of(TEMPLATES));
    selection.hasTemplate.mockReturnValue(true);
    selection.settings.mockReturnValue({
      eventId: 'e1',
      eventType: 'wedding',
      templateId: 't2',
      fieldValues: {},
      isConfigured: true,
      requiredFields: [],
    });

    await render();

    const summary = fixture.nativeElement.querySelector('[data-testid="gallery-summary"]');
    expect(summary?.textContent).toContain('Marigold');
    expect(summary?.textContent).toContain('View detail');
    expect(summary?.textContent).toContain('Edit basic info');
  });

  it('emits the resolved template when "View detail" is clicked', async () => {
    catalog.listTemplates.mockReturnValue(of(TEMPLATES));
    selection.hasTemplate.mockReturnValue(true);
    selection.settings.mockReturnValue({
      eventId: 'e1',
      eventType: 'wedding',
      templateId: 't2',
      fieldValues: {},
      isConfigured: true,
      requiredFields: [],
    });
    const emitted = vi.fn();
    await render();
    fixture.componentInstance.viewDetail.subscribe(emitted);

    (fixture.nativeElement.querySelector('.template-gallery__summary-btn') as HTMLButtonElement).click();

    expect(emitted).toHaveBeenCalledWith(TEMPLATES[1]);
  });

  it('does not show the summary bar when nothing is selected', async () => {
    catalog.listTemplates.mockReturnValue(of(TEMPLATES));

    await render();

    expect(fixture.nativeElement.querySelector('[data-testid="gallery-summary"]')).toBeNull();
  });

  it('emits templateChosen when a card is clicked', async () => {
    catalog.listTemplates.mockReturnValue(of(TEMPLATES));
    const emitted = vi.fn();
    await render();
    fixture.componentInstance.templateChosen.subscribe(emitted);

    (fixture.nativeElement.querySelector('app-template-card button') as HTMLButtonElement).click();

    expect(emitted).toHaveBeenCalledWith(TEMPLATES[0]);
  });
});
