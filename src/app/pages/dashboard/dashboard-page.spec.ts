import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DashboardPage } from './dashboard-page';

describe('DashboardPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(DashboardPage);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the literal text "Dashboard Page" in an h1', async () => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    await fixture.whenStable();
    const heading = fixture.nativeElement.querySelector('h1') as HTMLElement | null;
    expect(heading).not.toBeNull();
    expect(heading?.textContent).toContain('Dashboard Page');
  });

  it('links to the create-event page', async () => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    await fixture.whenStable();
    const link = fixture.nativeElement.querySelector(
      'a[href="/create-event"]',
    ) as HTMLAnchorElement | null;
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain('Create occasion');
  });

  it('should render a PrimeNG check icon', async () => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    await fixture.whenStable();
    const icon = fixture.nativeElement.querySelector('i.pi.pi-check') as HTMLElement | null;
    expect(icon).not.toBeNull();
  });
});
