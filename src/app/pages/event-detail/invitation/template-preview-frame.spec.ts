import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TemplatePreviewFrame } from './template-preview-frame';

describe('TemplatePreviewFrame', () => {
  let fixture: ComponentFixture<TemplatePreviewFrame>;

  async function render(src: string | null, linkType: 'private' | 'public' = 'private') {
    await TestBed.configureTestingModule({ imports: [TemplatePreviewFrame] }).compileComponents();
    fixture = TestBed.createComponent(TemplatePreviewFrame);
    fixture.componentRef.setInput('src', src);
    fixture.componentRef.setInput('apiOrigin', 'https://api.example.test');
    fixture.componentRef.setInput('linkType', linkType);
    fixture.detectChanges();
  }

  it('shows a preparing status and no frame until a src exists', async () => {
    await render(null);

    expect(fixture.nativeElement.querySelector('app-invitation-frame')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Preparing preview');
  });

  it('renders the sandboxed frame once a src is available', async () => {
    await render('https://api.example.test/api/v1/guests/invitations/tok/render?mode=preview&type=private');

    expect(fixture.nativeElement.querySelector('app-invitation-frame')).not.toBeNull();
  });

  it('labels the header with the link type and a sandboxed badge', async () => {
    await render('https://api.example.test/render', 'public');

    expect(fixture.nativeElement.textContent).toContain('PUBLIC');
    expect(fixture.nativeElement.textContent).toContain('SANDBOXED');
  });

  it('defaults to labeling as the guest link', async () => {
    await render('https://api.example.test/render');

    expect(fixture.nativeElement.textContent).toContain('GUEST LINK');
  });
});
