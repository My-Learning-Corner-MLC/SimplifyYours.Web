import { TestBed } from '@angular/core/testing';

import { EventEmptyTabComponent } from './event-empty-tab.component';

function setup(configure: (c: EventEmptyTabComponent) => void) {
  TestBed.configureTestingModule({ imports: [EventEmptyTabComponent] });
  const fixture = TestBed.createComponent(EventEmptyTabComponent);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  return fixture;
}

describe('EventEmptyTabComponent', () => {
  it('renders the guests empty state', () => {
    const fixture = setup((c) => {
      c.variant = 'guests';
    });
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('[data-testid="event-detail-guests"]')).not.toBeNull();
    expect(root.textContent).toContain('on the list');
    expect(root.textContent).toContain('Add first guest');
  });

  it('emits addGuest when "Add first guest" is clicked', () => {
    const fixture = setup((c) => {
      c.variant = 'guests';
    });
    const spy = vi.fn();
    fixture.componentInstance.addGuest.subscribe(spy);

    fixture.nativeElement.querySelector('[data-testid="event-detail-add-first-guest"]').click();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('renders the tables empty state with the confirmed count', () => {
    const fixture = setup((c) => {
      c.variant = 'tables';
      c.confirmedCount = 96;
    });
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('[data-testid="event-detail-tables"]')).not.toBeNull();
    expect(root.textContent).toContain('Add first table');
    expect(root.textContent).toContain('96 confirmed guests are waiting on a seat');
    // Eight dashed seats around the illustration.
    expect(root.querySelectorAll('.blank__seat').length).toBe(8);
  });

  it('emits seeGuestList when the guest-list link is clicked', () => {
    const fixture = setup((c) => {
      c.variant = 'tables';
    });
    const spy = vi.fn();
    fixture.componentInstance.seeGuestList.subscribe(spy);

    fixture.nativeElement.querySelector('.blank__link').click();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('renders the budget empty state with suggestion chips', () => {
    const fixture = setup((c) => {
      c.variant = 'budget';
      c.guestCount = 45;
      c.suggestions = ['Modest · $2,500', 'Comfortable · $5,000'];
    });
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('[data-testid="event-detail-budget"]')).not.toBeNull();
    expect(root.textContent).toContain('Set a budget to get started');
    expect(root.textContent).toContain('Common starting points for 45 guests');
    expect(root.querySelectorAll('.blank__suggest-chip').length).toBe(2);
  });
});
