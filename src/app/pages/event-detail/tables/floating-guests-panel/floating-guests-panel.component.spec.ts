import { TestBed } from '@angular/core/testing';

import { Guest } from '../../../../core/guests/guest.model';
import { FloatingGuestsPanelComponent } from './floating-guests-panel.component';

function makeGuest(overrides: Partial<Guest> = {}): Guest {
  return {
    id: 'g1',
    firstName: 'Amara',
    lastName: 'Okoye',
    phoneNumber: '+1 555 0100',
    emailAddress: null,
    gender: 'Female',
    relationship: null,
    side: null,
    plusOnes: 0,
    dietaryNotes: null,
    createdAt: '2026-07-01T10:00:00+00:00',
    ...overrides,
  };
}

function setup(guests: Guest[]) {
  TestBed.configureTestingModule({ imports: [FloatingGuestsPanelComponent] });
  const fixture = TestBed.createComponent(FloatingGuestsPanelComponent);
  fixture.componentInstance.guests = guests;
  fixture.detectChanges();
  return fixture;
}

describe('FloatingGuestsPanelComponent', () => {
  it('shows the live count and one row per guest', () => {
    const fixture = setup([makeGuest({ id: 'g1' }), makeGuest({ id: 'g2', firstName: 'Ben', lastName: 'Ilori' })]);

    expect(fixture.nativeElement.querySelector('[data-testid="floating-guests-count"]').textContent).toBe('2');
    expect(fixture.nativeElement.querySelectorAll('[data-testid="floating-guest-row"]').length).toBe(2);
  });

  it('shows an empty message when there are no floating guests', () => {
    const fixture = setup([]);

    expect(fixture.nativeElement.textContent).toContain('Everyone has a seat.');
  });

  it('filters rows by search text', () => {
    const fixture = setup([makeGuest({ id: 'g1' }), makeGuest({ id: 'g2', firstName: 'Ben', lastName: 'Ilori' })]);

    const input = fixture.nativeElement.querySelector('input[type="search"]');
    input.value = 'ben';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('[data-testid="floating-guest-row"]');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Ben Ilori');
  });

  it('shows a no-match message when the search filters everything out', () => {
    const fixture = setup([makeGuest()]);

    const input = fixture.nativeElement.querySelector('input[type="search"]');
    input.value = 'zzz';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No guests match your search.');
  });
});
