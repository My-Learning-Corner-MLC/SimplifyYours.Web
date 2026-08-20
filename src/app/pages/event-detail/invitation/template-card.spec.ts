import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TemplateCatalogItem } from '../../../core/invitations/template-catalog.model';
import { TemplateCard } from './template-card';

function template(overrides: Partial<TemplateCatalogItem> = {}): TemplateCatalogItem {
  return {
    id: 't1',
    name: 'Verona',
    tone: 'Classic',
    palette: ['#8a3a25', '#f4e2dd'],
    eventType: 'wedding',
    currentVersion: 1,
    ...overrides,
  };
}

describe('TemplateCard', () => {
  let fixture: ComponentFixture<TemplateCard>;

  async function render(overrides: Partial<TemplateCatalogItem> = {}, selected = false) {
    await TestBed.configureTestingModule({ imports: [TemplateCard] }).compileComponents();
    fixture = TestBed.createComponent(TemplateCard);
    fixture.componentRef.setInput('template', template(overrides));
    fixture.componentRef.setInput('selected', selected);
    fixture.detectChanges();
  }

  it('renders the template name', async () => {
    await render();
    expect(fixture.nativeElement.textContent).toContain('Verona');
  });

  it('builds the card face background from the second palette color', async () => {
    await render({ palette: ['#111111', '#222222'] });

    const face = fixture.nativeElement.querySelector('.template-card__face') as HTMLElement;
    expect(face.style.background).toContain('rgb(34, 34, 34)');
  });

  it('falls back to a neutral face background when the catalog gives only one palette color', async () => {
    await render({ palette: ['#111111'] });

    const face = fixture.nativeElement.querySelector('.template-card__face') as HTMLElement;
    expect(face.style.background).toContain('rgb(247, 240, 230)');
  });

  it('falls back to the default palette when the catalog gives none', async () => {
    await render({ palette: null });

    const face = fixture.nativeElement.querySelector('.template-card__face') as HTMLElement;
    expect(face.style.background).not.toBe('');
  });

  it('shows the event type label and a matching motif icon', async () => {
    await render({ eventType: 'wedding' });

    expect(fixture.nativeElement.querySelector('.template-card__face-label').textContent.trim()).toBe('WEDDING');
    expect(fixture.nativeElement.querySelector('.template-card__face-motif svg')).not.toBeNull();
  });

  it('shows an arrow and no badge when not selected', async () => {
    await render({}, false);

    expect(fixture.nativeElement.querySelector('.template-card__arrow')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.template-card__badge')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Selected');
  });

  it('shows a checkmark badge and "Selected" label instead of an arrow when selected', async () => {
    await render({}, true);

    expect(fixture.nativeElement.querySelector('.template-card__badge')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.template-card__arrow')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Selected');
  });

  it('emits chosen with the template on click', async () => {
    const emitted = vi.fn();
    await render();
    fixture.componentInstance.chosen.subscribe(emitted);

    (fixture.nativeElement.querySelector('.template-card') as HTMLButtonElement).click();

    expect(emitted).toHaveBeenCalledWith(template());
  });
});
