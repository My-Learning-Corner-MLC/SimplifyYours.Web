import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { AddGuestRequest } from '../../../core/guests/add-guest-request.model';
import { AddGuestError } from '../../../core/guests/guest-error.model';
import { Guest } from '../../../core/guests/guest.model';
import { GuestApiClient } from '../../../core/guests/guest-api-client';
import { AddGuestModalComponent } from './add-guest-modal.component';

const makeGuest = (overrides: Partial<Guest> = {}): Guest => ({
  id: 'g1',
  firstName: 'Ada',
  lastName: 'Tester',
  emailAddress: 'ada@example.com',
  phoneNumber: '+15551234567',
  relationship: 'Family',
  side: 'Bride',
  plusOnes: 1,
  dietaryNotes: null,
  createdAt: '2026-06-02T10:00:00+00:00',
  ...overrides,
});

class GuestApiStub {
  addGuest = vi.fn<(request: AddGuestRequest) => Observable<Guest>>(() => of(makeGuest()));
}

function setup(isWedding = true, guestApi: GuestApiStub = new GuestApiStub()) {
  TestBed.configureTestingModule({
    imports: [AddGuestModalComponent],
    providers: [{ provide: GuestApiClient, useValue: guestApi }],
  });
  const fixture = TestBed.createComponent(AddGuestModalComponent);
  fixture.componentRef.setInput('eventId', 'e1');
  fixture.componentRef.setInput('isWedding', isWedding);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, guestApi };
}

const fill = (component: AddGuestModalComponent, values: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(values)) {
    component.form.get(key)!.setValue(value);
  }
};

const validValues = {
  firstName: 'Ada',
  lastName: 'Tester',
  email: 'ada@example.com',
  phone: '+15551234567',
};

describe('AddGuestModalComponent', () => {
  it('shows the "Whose side?" field for wedding events', () => {
    const { fixture } = setup(true);
    expect(
      fixture.nativeElement.querySelector('[data-testid="add-guest-side"]'),
    ).not.toBeNull();
  });

  it('hides the "Whose side?" field for non-wedding events', () => {
    const { fixture } = setup(false);
    expect(
      fixture.nativeElement.querySelector('[data-testid="add-guest-side"]'),
    ).toBeNull();
  });

  it('does not submit when required fields are missing', () => {
    const { component, guestApi } = setup();

    component.submit();

    expect(guestApi.addGuest).not.toHaveBeenCalled();
    expect(component.invalidCount()).toBeGreaterThan(0);
  });

  it('rejects a malformed email', () => {
    const { component, guestApi } = setup();
    fill(component, { ...validValues, email: 'ada@example' });

    component.submit();

    expect(guestApi.addGuest).not.toHaveBeenCalled();
  });

  it('submits a valid guest and emits the added guest', () => {
    const { component, guestApi } = setup(true);
    let added: Guest | undefined;
    component.added.subscribe((g) => (added = g));
    fill(component, validValues);

    component.submit();

    expect(guestApi.addGuest).toHaveBeenCalledTimes(1);
    const request = guestApi.addGuest.mock.calls[0][0];
    expect(request.guestInfo.side).toBe('Bride');
    expect(added?.id).toBe('g1');
  });

  it('omits the side for non-wedding events', () => {
    const { component, guestApi } = setup(false);
    fill(component, validValues);

    component.submit();

    const request = guestApi.addGuest.mock.calls[0][0];
    expect(request.guestInfo.side).toBeNull();
  });

  it('shows the duplicate banner on a 409', () => {
    const guestApi = new GuestApiStub();
    guestApi.addGuest = vi.fn(() =>
      throwError((): AddGuestError => ({ kind: 'duplicate', message: 'already on this list.' })),
    );
    const { component, fixture } = setup(true, guestApi);
    fill(component, validValues);

    component.submit();
    fixture.detectChanges();

    expect(component.duplicate()).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-testid="add-guest-duplicate"]')).not.toBeNull();
  });

  it('shows the server-error banner on a 500 and preserves the form', () => {
    const guestApi = new GuestApiStub();
    guestApi.addGuest = vi.fn(() =>
      throwError((): AddGuestError => ({ kind: 'server', message: 'Something went wrong.' })),
    );
    const { component, fixture } = setup(true, guestApi);
    fill(component, validValues);

    component.submit();
    fixture.detectChanges();

    expect(component.serverError()).toBe('Something went wrong.');
    expect(fixture.nativeElement.querySelector('[data-testid="add-guest-server-error"]')).not.toBeNull();
    expect(component.form.get('firstName')!.value).toBe('Ada');
  });

  it('marks closing immediately and emits closed after the fade-out animation', async () => {
    vi.useFakeTimers();
    try {
      const { component } = setup();
      let closed = false;
      component.closed.subscribe(() => (closed = true));

      component.cancel();

      expect(component.closing()).toBe(true);
      expect(closed).toBe(false);

      await vi.advanceTimersByTimeAsync(300);

      expect(closed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignores a second cancel while already closing', () => {
    vi.useFakeTimers();
    try {
      const { component } = setup();
      let closedCount = 0;
      component.closed.subscribe(() => closedCount++);

      component.cancel();
      component.cancel();
      vi.advanceTimersByTime(300);

      expect(closedCount).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('updates the relationship and side form controls via the segmented control', () => {
    const { component } = setup(true);

    component.setRelationship('Colleague');
    component.setSide('Groom');

    expect(component.form.get('relationship')!.value).toBe('Colleague');
    expect(component.form.get('side')!.value).toBe('Groom');
  });

  it('formats side options with a possessive label', () => {
    const { component } = setup(true);
    expect(component.sideLabel('Bride')).toBe("Bride's side");
  });

  it('clamps plus-ones at zero and increments', () => {
    const { component } = setup();
    expect(component.plusOnes).toBe(0);
    component.changePlusOnes(-1);
    expect(component.plusOnes).toBe(0);
    component.changePlusOnes(1);
    expect(component.plusOnes).toBe(1);
  });
});
