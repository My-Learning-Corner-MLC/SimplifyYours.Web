import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TemplateGallery } from './template-gallery';

describe('TemplateGallery', () => {
  let fixture: ComponentFixture<TemplateGallery>;

  async function render(eventType: string, selectedTemplateId: string | null = null) {
    await TestBed.configureTestingModule({ imports: [TemplateGallery] }).compileComponents();

    fixture = TestBed.createComponent(TemplateGallery);
    // Zoneless: inputs go through componentRef so change detection actually runs.
    fixture.componentRef.setInput('eventType', eventType);
    fixture.componentRef.setInput('selectedTemplateId', selectedTemplateId);
    fixture.detectChanges();
  }

  const cards = () => fixture.nativeElement.querySelectorAll('.gallery__card');
  const chooseButtons = () =>
    Array.from(fixture.nativeElement.querySelectorAll('.gallery__choose')) as HTMLButtonElement[];

  it('lists the templates for a wedding', async () => {
    await render('wedding');

    expect(cards().length).toBeGreaterThan(0);
    expect(fixture.nativeElement.textContent).toContain('Marigold');
  });

  it('offers nothing for an event type with no designs yet', async () => {
    // Better an explicit message than an empty panel that looks broken.
    await render('launch');

    expect(cards()).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain("aren't available");
  });

  it('does not offer wedding designs for a birthday', async () => {
    await render('birthday');

    expect(fixture.nativeElement.textContent).not.toContain('Marigold');
  });

  it('marks the saved template as in use', async () => {
    await render('wedding', 'marigold');

    expect(fixture.nativeElement.textContent).toContain('Currently in use');
    expect(chooseButtons()[0].textContent?.trim()).toBe('Edit details');
  });

  it('reads as a fresh choice when nothing is saved', async () => {
    await render('wedding');

    expect(fixture.nativeElement.textContent).not.toContain('Currently in use');
    expect(chooseButtons()[0].textContent?.trim()).toBe('Choose this design');
  });

  it('emits the chosen template rather than saving on its own', async () => {
    // Choosing opens the basic-info form; template and content are committed together, because a
    // template with no content renders an invitation full of gaps.
    const chosen = vi.fn();
    await render('wedding');
    fixture.componentInstance.templateChosen.subscribe(chosen);

    chooseButtons()[0].click();

    expect(chosen).toHaveBeenCalledTimes(1);
    expect(chosen.mock.calls[0][0]).toMatchObject({ id: 'marigold', eventType: 'wedding' });
  });

  it('highlights a card when it is focused for preview', async () => {
    await render('wedding');

    const previewButton = fixture.nativeElement.querySelector('.gallery__preview-button') as HTMLButtonElement;
    previewButton.click();
    fixture.detectChanges();

    expect(previewButton.getAttribute('aria-pressed')).toBe('true');
    expect(cards()[0].classList).toContain('gallery__card--active');
  });
});
