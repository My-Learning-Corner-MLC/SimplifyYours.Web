import { ActivatedRoute } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { StaticPage } from './static-page';

async function setup(data: Record<string, string>) {
  await TestBed.configureTestingModule({
    imports: [StaticPage],
    providers: [{ provide: ActivatedRoute, useValue: { snapshot: { data } } }],
  }).compileComponents();
  const fixture = TestBed.createComponent(StaticPage);
  fixture.detectChanges();
  return fixture;
}

describe('StaticPage', () => {
  it('should render the title and text from route data', async () => {
    const fixture = await setup({ title: 'Pricing', text: 'Simple, transparent plans.' });
    const title = fixture.nativeElement.querySelector('.static-page__title') as HTMLElement;
    const text = fixture.nativeElement.querySelector('.static-page__text') as HTMLElement;
    expect(title.textContent?.trim()).toBe('Pricing');
    expect(text.textContent?.trim()).toBe('Simple, transparent plans.');
  });

  it('should render empty strings when no route data is provided', async () => {
    const fixture = await setup({});
    const title = fixture.nativeElement.querySelector('.static-page__title') as HTMLElement;
    const text = fixture.nativeElement.querySelector('.static-page__text') as HTMLElement;
    expect(title.textContent?.trim()).toBe('');
    expect(text.textContent?.trim()).toBe('');
  });
});
