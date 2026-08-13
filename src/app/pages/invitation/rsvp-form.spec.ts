import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Invitation, RsvpStatus } from '../../core/invitations/invitation.model';
import { RsvpForm, formatDeadline } from './rsvp-form';

function invitation(overrides: Partial<Invitation['rsvp']> = {}): Invitation {
  return {
    guestName: 'Priya',
    content: { brideName: 'Amara', groomName: 'Julian' },
    rsvp: {
      status: 'NoResponse' as RsvpStatus,
      plusOnesAllowed: 2,
      plusOnesConfirmed: null,
      dietaryNotes: null,
      deadline: '2026-05-01T16:59:59Z',
      isOpen: true,
      ...overrides,
    },
  };
}

describe('RsvpForm', () => {
  let fixture: ComponentFixture<RsvpForm>;

  async function render(value: Invitation = invitation(), extra: Record<string, unknown> = {}) {
    await TestBed.configureTestingModule({ imports: [RsvpForm] }).compileComponents();

    fixture = TestBed.createComponent(RsvpForm);
    // Zoneless: inputs must go through componentRef.
    fixture.componentRef.setInput('invitation', value);

    for (const [key, val] of Object.entries(extra)) {
      fixture.componentRef.setInput(key, val);
    }

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const text = () => fixture.nativeElement.textContent as string;
  const byClass = (cls: string) => fixture.nativeElement.querySelector(`.${cls}`);
  const choose = (label: string) => {
    const button = Array.from(fixture.nativeElement.querySelectorAll('.rsvp__choice')).find(
      (b) => (b as HTMLElement).textContent?.trim() === label,
    ) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
  };

  // ---------- date format ----------

  it('renders a deadline as "May 1, 2026"', () => {
    expect(formatDeadline('2026-05-01T16:59:59Z')).toBe('May 1, 2026');
    expect(formatDeadline('2026-12-25T00:00:00Z')).toBe('December 25, 2026');
  });

  it('renders nothing for a missing or unparseable date', () => {
    expect(formatDeadline(null)).toBe('');
    expect(formatDeadline('not a date')).toBe('');
  });

  // ---------- 01 empty ----------

  it('starts with nothing selected and no dead fields', async () => {
    await render();

    expect(byClass('rsvp__choice--selected')).toBeNull();
    expect(byClass('rsvp__stepper')).toBeNull();
    expect(byClass('rsvp__textarea')).toBeNull();
    expect(text()).toContain('appear once you choose');
    expect((byClass('rsvp__submit') as HTMLButtonElement).disabled).toBe(true);
  });

  // ---------- 02a/b/c by choice ----------

  it('shows the guest stepper and dietary notes only for Attending', async () => {
    await render();
    choose('Attending');

    expect(byClass('rsvp__stepper')).not.toBeNull();
    expect(text()).toContain('Dietary notes');
  });

  it('shows a dated deadline note instead of a stepper for Maybe', async () => {
    await render();
    choose('Maybe');

    expect(byClass('rsvp__stepper')).toBeNull();
    expect(text()).toContain('May 1, 2026');
  });

  it('shows neither stepper nor dietary prompt for Declined', async () => {
    await render();
    choose('Declined');

    expect(byClass('rsvp__stepper')).toBeNull();
    expect(text()).toContain('Message for the hosts');
  });

  it('clears any guest count when switching away from Attending', async () => {
    // The payload must never disagree with what the guest can see.
    const saved = vi.fn();
    await render();
    fixture.componentInstance.save.subscribe(saved);

    choose('Attending');
    (fixture.nativeElement.querySelectorAll('.rsvp__step')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    choose('Maybe');

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));

    expect(saved.mock.calls[0][0]).toMatchObject({ rsvpStatus: 'Maybe', plusOnesConfirmed: 0 });
  });

  it('stops the stepper at the organiser allowance', async () => {
    await render(invitation({ plusOnesAllowed: 1 }));
    choose('Attending');

    const [minus, plus] = Array.from(fixture.nativeElement.querySelectorAll('.rsvp__step')) as HTMLButtonElement[];
    expect(minus.disabled).toBe(true);

    plus.click();
    fixture.detectChanges();

    // At the cap the control disables, so the guest cannot reach the error at all.
    expect((fixture.nativeElement.querySelectorAll('.rsvp__step')[1] as HTMLButtonElement).disabled).toBe(true);
    expect(byClass('rsvp__count').textContent.trim()).toBe('1');
  });

  // ---------- 03 editing ----------

  it('reframes as an update when an answer already exists', async () => {
    await render(invitation({ status: 'Maybe', plusOnesConfirmed: 0 }));

    expect(text()).toContain('You responded');
    expect(text()).toContain('Update your response');
    expect(byClass('rsvp__submit').textContent).toContain('Update response');
  });

  it('pre-fills the existing answer', async () => {
    await render(invitation({ status: 'Accepted', plusOnesConfirmed: 2, dietaryNotes: 'No nuts' }));

    expect(byClass('rsvp__count').textContent.trim()).toBe('2');
    expect((byClass('rsvp__textarea') as HTMLTextAreaElement).value).toBe('No nuts');
  });

  // ---------- 04 submitting ----------

  it('locks the form and shows a spinner while sending', async () => {
    await render(invitation({ status: 'Accepted' }), { submitting: true });

    expect(byClass('rsvp__submit').textContent).toContain('Sending');
    expect((byClass('rsvp__submit') as HTMLButtonElement).disabled).toBe(true);
    expect((fixture.nativeElement.querySelector('.rsvp__choice') as HTMLButtonElement).disabled).toBe(true);
  });

  // ---------- 05 success ----------

  it('confirms the recorded answer in words, not just a tick', async () => {
    await render(invitation({ status: 'Accepted', plusOnesConfirmed: 1 }), { submitted: true });

    expect(text()).toContain('attending · 1 guest');
    expect(text()).toContain('May 1, 2026');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  // ---------- 06 closed ----------

  it('renders no inputs at all once responses are closed', async () => {
    // Not disabled ones — a guest should not be able to tab into a form that cannot submit.
    await render(invitation({ isOpen: false, status: 'Accepted', plusOnesConfirmed: 1, dietaryNotes: 'No nuts' }));

    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.rsvp__choice')).toHaveLength(0);
    expect(text()).toContain('Responses closed on May 1, 2026');
    expect(text()).toContain('Attending · 1 guest');
    expect(text()).toContain('No nuts');
  });

  it('announces the closed state to assistive technology, not by colour alone', async () => {
    await render(invitation({ isOpen: false }));

    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
  });

  // ---------- 07/08 errors ----------

  it('keeps the answers filled in after a failed submit and offers a retry', async () => {
    await render(invitation({ status: 'Accepted', plusOnesConfirmed: 2 }), { submitFailed: true });

    expect(text()).toContain("Couldn't send your response");
    expect(byClass('rsvp__submit').textContent).toContain('Try again');
    expect(byClass('rsvp__count').textContent.trim()).toBe('2');
  });

  it('shows a server-side plus-ones error against the field', async () => {
    await render(invitation({ status: 'Accepted' }), {
      serverErrors: { plusOnesConfirmed: ["You're invited with up to 2 guests."] },
    });

    expect(text()).toContain("You're invited with up to 2 guests.");
  });

  // ---------- submit payload ----------

  it('submits the chosen answer', async () => {
    const saved = vi.fn();
    await render();
    fixture.componentInstance.save.subscribe(saved);

    choose('Attending');
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));

    expect(saved).toHaveBeenCalledTimes(1);
    expect(saved.mock.calls[0][0]).toMatchObject({ rsvpStatus: 'Accepted', plusOnesConfirmed: 0 });
  });

  it('sends null rather than an empty string for blank notes', async () => {
    const saved = vi.fn();
    await render();
    fixture.componentInstance.save.subscribe(saved);

    choose('Declined');
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));

    expect(saved.mock.calls[0][0].dietaryNotes).toBeNull();
  });

  it('emits closed from the dismiss control', async () => {
    const closed = vi.fn();
    await render();
    fixture.componentInstance.closed.subscribe(closed);

    (byClass('rsvp__close') as HTMLButtonElement).click();

    expect(closed).toHaveBeenCalledTimes(1);
  });

  describe('design conformance', () => {
    const selectedClassOf = (label: string) => {
      const button = Array.from(fixture.nativeElement.querySelectorAll('.rsvp__choice')).find(
        (b) => (b as HTMLElement).textContent?.trim() === label,
      ) as HTMLElement;
      return button.className;
    };

    it('gives all three answers the same selected treatment', async () => {
      // Colour-coding the answers differently editorialises about which one is the good answer.
      await render();

      const classes: string[] = [];

      for (const label of ['Attending', 'Maybe', 'Declined']) {
        choose(label);
        classes.push(selectedClassOf(label));
      }

      expect(new Set(classes).size).toBe(1);
      expect(classes[0]).toContain('rsvp__choice--selected');
    });

    it('keeps one width whichever answer is chosen', async () => {
      await render();

      const widths = new Set<string>();

      for (const label of ['Attending', 'Maybe', 'Declined']) {
        choose(label);
        widths.add(getComputedStyle(byClass('rsvp')).width);
      }

      // Height may differ with what each answer shows; width must not, or the modal jumps
      // sideways as the guest changes their mind.
      expect(widths.size).toBe(1);
    });

    it('shows a carried-over answer exactly as a freshly picked one', async () => {
      // Re-opening the link must look like the answer is still selected, not like a faded record
      // of it — so the pre-filled choice gets the same treatment as one picked in this sitting.
      await render(invitation({ status: 'Maybe' }));

      const carriedOver = selectedClassOf('Maybe');

      expect(carriedOver).toContain('rsvp__choice--selected');

      choose('Maybe');

      expect(selectedClassOf('Maybe')).toBe(carriedOver);
    });

    it('words the Maybe note as a deadline reminder', async () => {
      await render();
      choose('Maybe');

      const note = byClass('rsvp__deadline-note').textContent.replace(/\s+/g, ' ').trim();

      expect(note).toBe('No problem — just let us know before the deadline on May 1, 2026.');
    });
  });
});