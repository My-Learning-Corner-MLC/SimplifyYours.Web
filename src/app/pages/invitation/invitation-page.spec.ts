import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { environment } from '../../../environments/environment';
import { InvitationPage } from './invitation-page';

const TOKEN = 'tok-abc123';

const INVITATION = {
  guestName: 'Priya',
  content: { brideName: 'Amara', groomName: 'Julian' },
  rsvp: {
    status: 'NoResponse',
    plusOnesAllowed: 2,
    plusOnesConfirmed: null,
    dietaryNotes: null,
    deadline: '2026-09-12T16:59:59Z',
    isOpen: true,
  },
};

describe('InvitationPage', () => {
  let fixture: ComponentFixture<InvitationPage>;
  let httpMock: HttpTestingController;

  const jsonUrl = `${environment.apiBaseUrl}/api/v1/guests/invitations/${TOKEN}`;

  async function render(token: string | null = TOKEN) {
    await TestBed.configureTestingModule({
      imports: [InvitationPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(token ? { token } : {}) } },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(InvitationPage);
    fixture.detectChanges();
  }

  const frame = () => fixture.nativeElement.querySelector('app-invitation-frame');
  const text = () => fixture.nativeElement.textContent as string;

  it('shows a loading state before the invitation resolves', async () => {
    await render();

    expect(text()).toContain('Opening your invitation');
    // Crucially, no frame yet — a src set up front would render a 404 document inside it.
    expect(frame()).toBeNull();

    httpMock.expectOne(jsonUrl).flush(INVITATION);
  });

  it('mounts the frame only after the token resolves', async () => {
    await render();
    httpMock.expectOne(jsonUrl).flush(INVITATION);
    fixture.detectChanges();

    expect(frame()).not.toBeNull();
  });

  it('points the frame at the render endpoint', async () => {
    await render();
    httpMock.expectOne(jsonUrl).flush(INVITATION);
    fixture.detectChanges();

    expect(frame().getAttribute('ng-reflect-src') ?? '').toBeDefined();
    const iframe = fixture.nativeElement.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe.src).toContain(`/api/v1/guests/invitations/${TOKEN}/render`);
  });

  it('never mounts the frame for an unknown token', async () => {
    await render();
    httpMock.expectOne(jsonUrl).flush({}, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(frame()).toBeNull();
    expect(text()).toContain("isn't available");
  });

  it('distinguishes a broken connection from a missing invitation', async () => {
    // One is permanent, one is worth retrying — they should not read the same.
    await render();
    httpMock.expectOne(jsonUrl).flush({}, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(text()).toContain("couldn't load");
    expect(fixture.nativeElement.querySelector('.invitation__retry')).not.toBeNull();
  });

  it('retries on demand after a connection failure', async () => {
    await render();
    httpMock.expectOne(jsonUrl).flush({}, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.invitation__retry') as HTMLButtonElement).click();
    fixture.detectChanges();

    httpMock.expectOne(jsonUrl).flush(INVITATION);
    fixture.detectChanges();

    expect(frame()).not.toBeNull();
  });

  it('treats a missing token as not-found without calling the API', async () => {
    await render(null);

    expect(text()).toContain("isn't available");
    httpMock.expectNone(() => true);
  });

  it('announces its status regions to assistive technology', async () => {
    await render();

    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();

    httpMock.expectOne(jsonUrl).flush({}, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
  });
});
