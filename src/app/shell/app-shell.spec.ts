import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MessageService } from 'primeng/api';
import { AppShell } from './app-shell';
import { OidcRedirectService } from '../core/auth/oidc-redirect.service';

describe('AppShell', () => {
  let startAuthorization: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    startAuthorization = vi.fn().mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [AppShell],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        MessageService,
        { provide: OidcRedirectService, useValue: { startAuthorization } },
      ],
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(AppShell);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should contain a router-outlet', () => {
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('router-outlet')).not.toBeNull();
  });

  it('shows a Sign In action and starts authorization when a session-expired toast is added', () => {
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();

    const messages = TestBed.inject(MessageService);
    messages.add({
      key: 'session-expired',
      severity: 'warn',
      summary: 'Session expired',
      detail: 'Please sign in again to continue.',
      sticky: true,
      data: { action: 'sign-in' },
    });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const button = el.querySelector<HTMLButtonElement>('.sy-session-expired-toast__action');
    expect(button).not.toBeNull();

    button!.click();
    expect(startAuthorization).toHaveBeenCalledTimes(1);
  });
});
