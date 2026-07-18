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
    eventMetadata: null,
    createdAt: '2026-07-01T10:00:00+00:00',
    ...overrides,
  };
}

function setup(guests: Guest[]) {
  TestBed.configureTestingModule({ imports: [FloatingGuestsPanelComponent] });
  const fixture = TestBed.createComponent(FloatingGuestsPanelComponent);
  fixture.componentRef.setInput('guests', guests);
  fixture.detectChanges();
  return fixture;
}

describe('FloatingGuestsPanelComponent', () => {
  it('shows the live count and one row per guest', () => {
    const fixture = setup([makeGuest({ id: 'g1' }), makeGuest({ id: 'g2', firstName: 'Ben', lastName: 'Ilori' })]);

    expect(fixture.nativeElement.querySelector('[data-testid="floating-guests-count"]').textContent).toBe('2 guests');
    expect(fixture.nativeElement.querySelectorAll('[data-testid="floating-guest-row"]').length).toBe(2);
  });

  it('re-renders the list and count when the guests input changes', () => {
    const fixture = setup([makeGuest({ id: 'g1' }), makeGuest({ id: 'g2', firstName: 'Ben', lastName: 'Ilori' })]);
    expect(fixture.nativeElement.querySelectorAll('[data-testid="floating-guest-row"]').length).toBe(2);

    fixture.componentRef.setInput('guests', [makeGuest({ id: 'g2', firstName: 'Ben', lastName: 'Ilori' })]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="floating-guests-count"]').textContent).toBe('1 guest');
    const rows = fixture.nativeElement.querySelectorAll('[data-testid="floating-guest-row"]');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Ben Ilori');
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

  it('emits guestSelected when a row is clicked', () => {
    const fixture = setup([makeGuest({ id: 'g1' })]);
    const spy = vi.fn();
    fixture.componentInstance.guestSelected.subscribe(spy);

    fixture.nativeElement.querySelector('[data-testid="floating-guest-row"]').click();

    expect(spy).toHaveBeenCalledWith('g1');
  });

  it('marks the row selected when it matches assigningGuestId', () => {
    const fixture = setup([makeGuest({ id: 'g1' })]);
    fixture.componentRef.setInput('assigningGuestId', 'g1');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.floating-panel__row--selected')).toBeTruthy();
  });

  describe('drop hint while dragging a seated guest (enhancement)', () => {
    beforeEach(() => {
      // jsdom does not implement elementFromPoint at all — stub it so vi.spyOn
      // has a real property to replace.
      if (!document.elementFromPoint) {
        document.elementFromPoint = () => null;
      }
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('does not show the receiving highlight when showDropHint is false, even while the pointer is over the panel', () => {
      const fixture = setup([makeGuest()]);
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(fixture.nativeElement);

      document.dispatchEvent(new PointerEvent('pointermove', { clientX: 5, clientY: 5 }));

      expect(fixture.nativeElement.querySelector('.floating-panel').classList.contains('floating-panel--receiving')).toBe(false);
      expect(fixture.componentInstance.receivingDrop()).toBe(false);
    });

    it('shows the receiving highlight and DROP TO UNSEAT hint when showDropHint is true and the pointer is over the panel', () => {
      const fixture = setup([makeGuest()]);
      fixture.componentRef.setInput('showDropHint', true);
      fixture.detectChanges();
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(fixture.nativeElement.querySelector('.floating-panel__title'));

      document.dispatchEvent(new PointerEvent('pointermove', { clientX: 5, clientY: 5 }));
      fixture.detectChanges();

      expect(fixture.componentInstance.receivingDrop()).toBe(true);
      expect(fixture.nativeElement.querySelector('.floating-panel').classList.contains('floating-panel--receiving')).toBe(true);
      expect(fixture.nativeElement.textContent).toContain('DROP TO UNSEAT');
    });

    it('clears the receiving highlight once the pointer leaves the panel', () => {
      const fixture = setup([makeGuest()]);
      fixture.componentRef.setInput('showDropHint', true);
      fixture.detectChanges();
      const elementFromPoint = vi.spyOn(document, 'elementFromPoint');

      elementFromPoint.mockReturnValue(fixture.nativeElement.querySelector('.floating-panel__title'));
      document.dispatchEvent(new PointerEvent('pointermove', { clientX: 5, clientY: 5 }));
      expect(fixture.componentInstance.receivingDrop()).toBe(true);

      elementFromPoint.mockReturnValue(document.body);
      document.dispatchEvent(new PointerEvent('pointermove', { clientX: 999, clientY: 999 }));

      expect(fixture.componentInstance.receivingDrop()).toBe(false);
    });

    it('clears the receiving highlight once showDropHint flips back to false, even if the pointer never left the panel', () => {
      const fixture = setup([makeGuest()]);
      fixture.componentRef.setInput('showDropHint', true);
      fixture.detectChanges();
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(fixture.nativeElement.querySelector('.floating-panel__title'));
      document.dispatchEvent(new PointerEvent('pointermove', { clientX: 5, clientY: 5 }));
      expect(fixture.componentInstance.receivingDrop()).toBe(true);

      fixture.componentRef.setInput('showDropHint', false);
      fixture.detectChanges();
      document.dispatchEvent(new PointerEvent('pointermove', { clientX: 5, clientY: 5 }));

      expect(fixture.componentInstance.receivingDrop()).toBe(false);
    });
  });
});
