import { TestBed } from '@angular/core/testing';

import { SeatingTable } from '../../../../core/seating/seating-table.model';
import { SeatingTableCardComponent } from './seating-table-card.component';

function makeTable(overrides: Partial<SeatingTable> = {}): SeatingTable {
  return {
    id: 't1',
    name: 'Table 1',
    shape: 'Round',
    seatCount: 4,
    isFull: false,
    positionX: null,
    positionY: null,
    rotation: 0,
    seats: [
      { seatIndex: 0, guestId: 'g1', guestName: 'Amara Okoye' },
      { seatIndex: 1, guestId: null, guestName: null },
      { seatIndex: 2, guestId: null, guestName: null },
      { seatIndex: 3, guestId: null, guestName: null },
    ],
    ...overrides,
  };
}

function setup(table: SeatingTable) {
  TestBed.configureTestingModule({ imports: [SeatingTableCardComponent] });
  const fixture = TestBed.createComponent(SeatingTableCardComponent);
  fixture.componentRef.setInput('table', table);
  fixture.detectChanges();
  return fixture;
}

describe('SeatingTableCardComponent', () => {
  it('renders the table name and seated/total footer', () => {
    const fixture = setup(makeTable());

    expect(fixture.nativeElement.textContent).toContain('Table 1');
    expect(fixture.nativeElement.textContent).toContain('1 / 4 seated');
  });

  it('renders one seat element per seat, marking filled vs empty', () => {
    const fixture = setup(makeTable());

    const seats = fixture.nativeElement.querySelectorAll('.table-card__seat');
    expect(seats.length).toBe(4);
    const filled = fixture.nativeElement.querySelectorAll('.table-card__seat--filled');
    expect(filled.length).toBe(1);
    expect(filled[0].textContent.trim()).toBe('A');
  });

  it('only makes filled seats a cdkDrag source — empty/reserved seats carry no cdkDrag, so CDK cannot transform them out of place while a guest chip drags over their drop list', () => {
    const fixture = setup(
      makeTable({
        seats: [
          { seatIndex: 0, guestId: 'g1', guestName: 'Amara Okoye' },
          { seatIndex: 1, guestId: null, guestName: null },
          { seatIndex: 2, guestId: null, guestName: null, isReservedForParty: true, partyOwnerGuestId: 'g1' },
          { seatIndex: 3, guestId: null, guestName: null },
        ],
      }),
    );

    const seats = fixture.nativeElement.querySelectorAll('.table-card__seat');
    expect(seats[0].classList.contains('cdk-drag')).toBe(true);
    expect(seats[1].classList.contains('cdk-drag')).toBe(false);
    expect(seats[2].classList.contains('cdk-drag')).toBe(false);
    expect(seats[3].classList.contains('cdk-drag')).toBe(false);
  });

  it('re-renders seats and the footer when the table input changes', () => {
    const fixture = setup(makeTable());
    expect(fixture.nativeElement.textContent).toContain('1 / 4 seated');

    fixture.componentRef.setInput(
      'table',
      makeTable({
        seats: [
          { seatIndex: 0, guestId: 'g1', guestName: 'Amara Okoye' },
          { seatIndex: 1, guestId: 'g2', guestName: 'Ben Ilori' },
          { seatIndex: 2, guestId: null, guestName: null },
          { seatIndex: 3, guestId: null, guestName: null },
        ],
      }),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('2 / 4 seated');
    expect(fixture.nativeElement.querySelectorAll('.table-card__seat--filled').length).toBe(2);
  });

  it('renders a seat reserved for a party as filled but distinct from a named guest', () => {
    const fixture = setup(
      makeTable({
        seats: [
          { seatIndex: 0, guestId: 'g1', guestName: 'Amara Okoye' },
          { seatIndex: 1, guestId: null, guestName: null, isReservedForParty: true, partyOwnerGuestId: 'g1' },
          { seatIndex: 2, guestId: null, guestName: null },
          { seatIndex: 3, guestId: null, guestName: null },
        ],
      }),
    );

    expect(fixture.nativeElement.textContent).toContain('2 / 4 seated');
    const filled = fixture.nativeElement.querySelectorAll('.table-card__seat--filled');
    expect(filled.length).toBe(2);
    const reserved = fixture.nativeElement.querySelectorAll('.table-card__seat--reserved');
    expect(reserved.length).toBe(1);
    expect(reserved[0].textContent.trim()).not.toBe('+');
    expect(reserved[0].textContent.trim()).not.toBe('');
  });

  it('does not let a reserved seat be targeted by the click-to-assign fallback', () => {
    const fixture = setup(
      makeTable({
        seats: [
          { seatIndex: 0, guestId: 'g1', guestName: 'Amara Okoye' },
          { seatIndex: 1, guestId: null, guestName: null, isReservedForParty: true, partyOwnerGuestId: 'g1' },
          { seatIndex: 2, guestId: null, guestName: null },
          { seatIndex: 3, guestId: null, guestName: null },
        ],
      }),
    );
    fixture.componentRef.setInput('assigningGuestId', 'g2');
    const spy = vi.fn();
    fixture.componentInstance.seatDrop.subscribe(spy);

    const seats = fixture.nativeElement.querySelectorAll('.table-card__seat');
    seats[1].click(); // reserved seat

    expect(spy).not.toHaveBeenCalled();

    seats[2].click(); // genuinely empty seat
    expect(spy).toHaveBeenCalledWith({ seatIndex: 2, guestId: 'g2' });
  });

  it('shows a Full badge when the table is marked full', () => {
    const fixture = setup(makeTable({ isFull: true }));

    expect(fixture.nativeElement.querySelector('.table-card__full-badge')).toBeTruthy();
  });

  it('emits editTable when the edit action button is clicked', () => {
    const fixture = setup(makeTable());
    const editSpy = vi.fn();
    fixture.componentInstance.editTable.subscribe(editSpy);

    fixture.nativeElement.querySelector('[title="Edit table"]').click();

    expect(editSpy).toHaveBeenCalledOnce();
  });

  it('emits deleteTable when the delete action button is clicked', () => {
    const fixture = setup(makeTable());
    const deleteSpy = vi.fn();
    fixture.componentInstance.deleteTable.subscribe(deleteSpy);

    fixture.nativeElement.querySelector('[title="Delete table"]').click();

    expect(deleteSpy).toHaveBeenCalledOnce();
  });

  it.each(['Round', 'Long', 'Square'] as const)('renders %s tables without error', (shape) => {
    const fixture = setup(makeTable({ shape, seatCount: 6, seats: Array.from({ length: 6 }, (_, i) => ({ seatIndex: i, guestId: null, guestName: null })) }));

    expect(fixture.nativeElement.querySelectorAll('.table-card__seat').length).toBe(6);
  });

  it('emits seatDrop with the seat index and dropped guest id', () => {
    const fixture = setup(makeTable());
    const spy = vi.fn();
    fixture.componentInstance.seatDrop.subscribe(spy);

    fixture.componentInstance.onSeatDropped(
      { item: { data: 'g2' }, previousContainer: {}, container: {}, isPointerOverContainer: true } as never,
      1,
    );

    expect(spy).toHaveBeenCalledWith({ seatIndex: 1, guestId: 'g2' });
  });

  it('ignores a drop with no guest id', () => {
    const fixture = setup(makeTable());
    const spy = vi.fn();
    fixture.componentInstance.seatDrop.subscribe(spy);

    fixture.componentInstance.onSeatDropped(
      { item: { data: '' }, previousContainer: {}, container: {}, isPointerOverContainer: true } as never,
      1,
    );

    expect(spy).not.toHaveBeenCalled();
  });

  it('ignores a drop that falls back to its own origin list (no valid target under the pointer)', () => {
    // CDK does this when a drag is released somewhere no drop list accepts it
    // (e.g. over the floating-guests panel, which deliberately rejects entries
    // so the unseat gesture is detected by hit-testing on drag end instead).
    // Treating it as a real assign would silently re-seat the guest at their
    // own seat and consume the gesture before the hit-test fallback can run.
    const fixture = setup(makeTable());
    const spy = vi.fn();
    fixture.componentInstance.seatDrop.subscribe(spy);
    const sameContainer = {};

    fixture.componentInstance.onSeatDropped(
      { item: { data: 'g1' }, previousContainer: sameContainer, container: sameContainer } as never,
      0,
    );

    expect(spy).not.toHaveBeenCalled();
  });

  it('clears the hover highlight and DROP TO SEAT hint once a drop lands, even though CDK never fires a matching exit event', () => {
    const fixture = setup(makeTable());
    fixture.componentInstance.onSeatEnter(1);
    expect(fixture.componentInstance.hoveredSeatIndex()).toBe(1);
    expect(fixture.componentInstance.receivingDrop()).toBe(true);

    fixture.componentInstance.onSeatDropped(
      { item: { data: 'g2' }, previousContainer: {}, container: {}, isPointerOverContainer: true } as never,
      1,
    );

    expect(fixture.componentInstance.hoveredSeatIndex()).toBeNull();
    expect(fixture.componentInstance.receivingDrop()).toBe(false);
  });

  it('clears the hover highlight even when the drop is rejected (falls back to its own origin list)', () => {
    const fixture = setup(makeTable());
    fixture.componentInstance.onSeatEnter(0);
    const sameContainer = {};

    fixture.componentInstance.onSeatDropped(
      { item: { data: 'g1' }, previousContainer: sameContainer, container: sameContainer, isPointerOverContainer: true } as never,
      0,
    );

    expect(fixture.componentInstance.hoveredSeatIndex()).toBeNull();
    expect(fixture.componentInstance.receivingDrop()).toBe(false);
  });

  it('ignores a drop fired on a seat the pointer already moved off of (CDK reports the last accepting container, not the release point)', () => {
    // Reproduces BUG-004: hover an empty seat (accepted), slide to an
    // adjacent occupied seat without a clean exit event firing, then
    // release. CDK still fires `dropped` on the empty seat but marks
    // isPointerOverContainer: false since the pointer isn't actually there.
    const fixture = setup(makeTable());
    const spy = vi.fn();
    fixture.componentInstance.seatDrop.subscribe(spy);

    fixture.componentInstance.onSeatDropped(
      { item: { data: 'g2' }, previousContainer: {}, container: {}, isPointerOverContainer: false } as never,
      1,
    );

    expect(spy).not.toHaveBeenCalled();
  });

  it('clears the hover highlight on a document pointerup even when no seat drop fires at all', () => {
    // Reproduces BUG-005: hover an empty seat (accepted), then move onto an
    // adjacent occupied (rejected) seat whose bounding box overlaps the first
    // without a clean exit event firing. CDK then routes the release back to
    // the drag's origin list (the floating panel) instead of any seat, so
    // this component's onSeatDropped never runs — the only remaining signal
    // is the browser's own pointerup, which this component listens for on
    // the document as a fallback.
    const fixture = setup(makeTable());
    fixture.componentInstance.onSeatEnter(0);
    expect(fixture.componentInstance.hoveredSeatIndex()).toBe(0);
    expect(fixture.componentInstance.receivingDrop()).toBe(true);

    document.dispatchEvent(new PointerEvent('pointerup'));

    expect(fixture.componentInstance.hoveredSeatIndex()).toBeNull();
    expect(fixture.componentInstance.receivingDrop()).toBe(false);
  });

  it('clears the hover highlight on a document pointercancel', () => {
    const fixture = setup(makeTable());
    fixture.componentInstance.onSeatEnter(0);

    document.dispatchEvent(new PointerEvent('pointercancel'));

    expect(fixture.componentInstance.hoveredSeatIndex()).toBeNull();
    expect(fixture.componentInstance.receivingDrop()).toBe(false);
  });

  describe('drag-out reporting', () => {
    it('emits seatDragStarted when a seat drag begins', () => {
      const fixture = setup(makeTable());
      const spy = vi.fn();
      fixture.componentInstance.seatDragStarted.subscribe(spy);

      fixture.componentInstance.onSeatDragStarted();

      expect(spy).toHaveBeenCalledOnce();
    });

    it('emits seatDragEndedOutside with the guest id and drop point for a filled seat', () => {
      const fixture = setup(makeTable());
      const spy = vi.fn();
      fixture.componentInstance.seatDragEndedOutside.subscribe(spy);

      fixture.componentInstance.onSeatDragEnded(
        { seatIndex: 0, guestId: 'g1', guestName: 'Amara Okoye' },
        { dropPoint: { x: 42, y: 99 } } as never,
      );

      expect(spy).toHaveBeenCalledWith({ guestId: 'g1', dropPoint: { x: 42, y: 99 } });
    });

    it('does not emit seatDragEndedOutside for an empty seat', () => {
      const fixture = setup(makeTable());
      const spy = vi.fn();
      fixture.componentInstance.seatDragEndedOutside.subscribe(spy);

      fixture.componentInstance.onSeatDragEnded(
        { seatIndex: 1, guestId: null, guestName: null },
        { dropPoint: { x: 42, y: 99 } } as never,
      );

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('per-seat hover highlight', () => {
    it('tracks the hovered seat index on enter and clears it on exit', () => {
      const fixture = setup(makeTable());

      fixture.componentInstance.onSeatEnter(2);
      expect(fixture.componentInstance.hoveredSeatIndex()).toBe(2);

      fixture.componentInstance.onSeatExit(2);
      expect(fixture.componentInstance.hoveredSeatIndex()).toBeNull();
    });

    it('does not clear the hovered index when a different seat exits (adjacent-seat handoff)', () => {
      const fixture = setup(makeTable());

      fixture.componentInstance.onSeatEnter(1);
      fixture.componentInstance.onSeatEnter(2);
      fixture.componentInstance.onSeatExit(1);

      expect(fixture.componentInstance.hoveredSeatIndex()).toBe(2);
    });

    it('keeps receivingDrop true while any seat on the card is still being entered (adjacent-seat handoff)', () => {
      const fixture = setup(makeTable());

      fixture.componentInstance.onSeatEnter(1);
      fixture.componentInstance.onSeatEnter(2);
      fixture.componentInstance.onSeatExit(1);

      expect(fixture.componentInstance.receivingDrop()).toBe(true);

      fixture.componentInstance.onSeatExit(2);

      expect(fixture.componentInstance.receivingDrop()).toBe(false);
    });
  });

  describe('click-to-assign fallback', () => {
    it('emits seatDrop when an empty seat is clicked while a guest is being assigned', () => {
      const fixture = setup(makeTable());
      fixture.componentRef.setInput('assigningGuestId', 'g2');
      const spy = vi.fn();
      fixture.componentInstance.seatDrop.subscribe(spy);

      fixture.componentInstance.onSeatClick({ seatIndex: 1, guestId: null, guestName: null });

      expect(spy).toHaveBeenCalledWith({ seatIndex: 1, guestId: 'g2' });
    });

    it('does nothing when clicking a seat with no guest being assigned', () => {
      const fixture = setup(makeTable());
      const spy = vi.fn();
      fixture.componentInstance.seatDrop.subscribe(spy);

      fixture.componentInstance.onSeatClick({ seatIndex: 1, guestId: null, guestName: null });

      expect(spy).not.toHaveBeenCalled();
    });

    it('does nothing when clicking an already-occupied seat', () => {
      const fixture = setup(makeTable());
      fixture.componentRef.setInput('assigningGuestId', 'g2');
      const spy = vi.fn();
      fixture.componentInstance.seatDrop.subscribe(spy);

      fixture.componentInstance.onSeatClick({ seatIndex: 0, guestId: 'g1', guestName: 'Amara Okoye' });

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('seatEnterPredicate', () => {
    it('allows dropping onto an empty seat', () => {
      const fixture = setup(makeTable());
      const drop = { data: { seatIndex: 1, guestId: null, guestName: null } } as never;

      expect(fixture.componentInstance.seatEnterPredicate({ data: 'g2' } as never, drop)).toBe(true);
    });

    it('rejects dropping onto a seat occupied by someone else', () => {
      const fixture = setup(makeTable());
      const drop = { data: { seatIndex: 0, guestId: 'g1', guestName: 'Amara Okoye' } } as never;

      expect(fixture.componentInstance.seatEnterPredicate({ data: 'g2' } as never, drop)).toBe(false);
    });

    it('allows a guest to re-enter the seat they already occupy', () => {
      const fixture = setup(makeTable());
      const drop = { data: { seatIndex: 0, guestId: 'g1', guestName: 'Amara Okoye' } } as never;

      expect(fixture.componentInstance.seatEnterPredicate({ data: 'g1' } as never, drop)).toBe(true);
    });

    it('clears the stale hover ring left on a seat when the drag moves directly onto an occupied seat mid-drag (BUG-006)', () => {
      // CDK only fires cdkDropListExited on the previously active container
      // when the pointer enters a *different accepting* container. Moving
      // straight from an accepted empty seat into a rejected occupied one
      // never triggers that exit, so onSeatEnter's ring/hint would otherwise
      // stay stuck on the seat left behind for the rest of the drag (not just
      // after it ends, which BUG-005's pointerup fallback already covers).
      const fixture = setup(makeTable());
      fixture.componentInstance.onSeatEnter(1);
      expect(fixture.componentInstance.hoveredSeatIndex()).toBe(1);
      expect(fixture.componentInstance.receivingDrop()).toBe(true);

      const occupiedDrop = { data: { seatIndex: 0, guestId: 'g1', guestName: 'Amara Okoye' } } as never;
      const result = fixture.componentInstance.seatEnterPredicate({ data: 'g2' } as never, occupiedDrop);

      expect(result).toBe(false);
      expect(fixture.componentInstance.hoveredSeatIndex()).toBeNull();
      expect(fixture.componentInstance.receivingDrop()).toBe(false);
    });

    it('does not clear hover state when evaluating a seat the dragged guest already occupies', () => {
      const fixture = setup(makeTable());
      fixture.componentInstance.onSeatEnter(1);

      const ownSeatDrop = { data: { seatIndex: 0, guestId: 'g1', guestName: 'Amara Okoye' } } as never;
      fixture.componentInstance.seatEnterPredicate({ data: 'g1' } as never, ownSeatDrop);

      expect(fixture.componentInstance.hoveredSeatIndex()).toBe(1);
      expect(fixture.componentInstance.receivingDrop()).toBe(true);
    });

    it('rejects every seat on a full table, even an empty one', () => {
      const fixture = setup(makeTable({ isFull: true }));
      const drop = { data: { seatIndex: 1, guestId: null, guestName: null } } as never;

      expect(fixture.componentInstance.seatEnterPredicate({ data: 'g2' } as never, drop)).toBe(false);
    });

    it('still allows a guest to re-enter their own seat on a full table (no-op reassignment)', () => {
      const fixture = setup(makeTable({ isFull: true }));
      const ownSeatDrop = { data: { seatIndex: 0, guestId: 'g1', guestName: 'Amara Okoye' } } as never;

      expect(fixture.componentInstance.seatEnterPredicate({ data: 'g1' } as never, ownSeatDrop)).toBe(true);
    });

    it('clears any stale hover ring when a full table rejects a drop (BUG-005)', () => {
      const fixture = setup(makeTable({ isFull: true }));
      fixture.componentInstance.onSeatEnter(1);
      expect(fixture.componentInstance.hoveredSeatIndex()).toBe(1);

      const drop = { data: { seatIndex: 1, guestId: null, guestName: null } } as never;
      fixture.componentInstance.seatEnterPredicate({ data: 'g2' } as never, drop);

      expect(fixture.componentInstance.hoveredSeatIndex()).toBeNull();
      expect(fixture.componentInstance.receivingDrop()).toBe(false);
    });
  });

  describe('hover ring cleanup (BUG-003)', () => {
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

    it('clears the hover ring once the pointer has left every seat, even if the final exit event reports a different seat than the current hover', () => {
      const fixture = setup(makeTable());

      fixture.componentInstance.onSeatEnter(1);
      fixture.componentInstance.onSeatEnter(2);
      // Overlapping seat hit-boxes can fire a duplicate/mismatched exit for the
      // seat left behind rather than the currently hovered one.
      fixture.componentInstance.onSeatExit(1);
      fixture.componentInstance.onSeatExit(1);

      expect(fixture.componentInstance.hoveredSeatIndex()).toBeNull();
      expect(fixture.componentInstance.receivingDrop()).toBe(false);
    });

    it('clears the hover ring on pointermove once the pointer drags off the card into open space, even though CDK never fires a matching exit there', () => {
      // Reproduces the real bug: CDK's DragRef only calls `exit()` when the
      // pointer enters a *different accepting* drop list. Moving to blank page
      // area with no connected drop list underneath skips the exit call
      // entirely, so onSeatExit never runs — this pointermove fallback is the
      // only thing that can catch it.
      const fixture = setup(makeTable());
      fixture.componentInstance.onSeatEnter(1);
      expect(fixture.componentInstance.hoveredSeatIndex()).toBe(1);

      vi.spyOn(document, 'elementFromPoint').mockReturnValue(null);
      document.dispatchEvent(new PointerEvent('pointermove', { clientX: 999, clientY: 999 }));

      expect(fixture.componentInstance.hoveredSeatIndex()).toBeNull();
      expect(fixture.componentInstance.receivingDrop()).toBe(false);
    });

    it('keeps the hover ring while the pointer is still over the same seat slot on pointermove', () => {
      const fixture = setup(makeTable());
      fixture.componentInstance.onSeatEnter(1);

      const seatSlots = fixture.nativeElement.querySelectorAll('.table-card__seat-slot');
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(seatSlots[1] as Element);
      document.dispatchEvent(new PointerEvent('pointermove', { clientX: 10, clientY: 10 }));

      expect(fixture.componentInstance.hoveredSeatIndex()).toBe(1);
      expect(fixture.componentInstance.receivingDrop()).toBe(true);
    });

    it('clears the hover ring on pointermove when the point lands on a seat slot belonging to a different table card', () => {
      const fixture = setup(makeTable());
      fixture.componentInstance.onSeatEnter(1);

      const foreignSlot = document.createElement('span');
      foreignSlot.className = 'table-card__seat-slot';
      document.body.appendChild(foreignSlot);
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(foreignSlot);
      document.dispatchEvent(new PointerEvent('pointermove', { clientX: 1, clientY: 1 }));

      expect(fixture.componentInstance.hoveredSeatIndex()).toBeNull();
      document.body.removeChild(foreignSlot);
    });

    it('stays unhovered on pointermove over open space when nothing was hovered to begin with', () => {
      const fixture = setup(makeTable());
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(null);

      document.dispatchEvent(new PointerEvent('pointermove', { clientX: 5, clientY: 5 }));

      expect(fixture.componentInstance.hoveredSeatIndex()).toBeNull();
      expect(fixture.componentInstance.receivingDrop()).toBe(false);
    });

    describe('re-entering a seat after CDK loses track of the drag (the actual regression)', () => {
      let dragMarker: HTMLElement;

      beforeEach(() => {
        // Stand-in for the class Angular CDK stamps on the element being
        // dragged for the duration of a real drag gesture.
        dragMarker = document.createElement('div');
        dragMarker.className = 'cdk-drag-dragging';
        document.body.appendChild(dragMarker);
      });

      afterEach(() => {
        document.body.removeChild(dragMarker);
      });

      it('re-lights the ring when the pointer comes back to the same empty seat after leaving to open space', () => {
        const fixture = setup(makeTable());
        const seatSlot = fixture.nativeElement.querySelector('[data-seat-index="1"]') as Element;
        const elementFromPoint = vi.spyOn(document, 'elementFromPoint');

        // 1. Drag onto seat 1 (real CDK entered event).
        fixture.componentInstance.onSeatEnter(1);
        expect(fixture.componentInstance.hoveredSeatIndex()).toBe(1);

        // 2. Drag out to open space — CDK skips its own exit call here (per
        // BUG-003's root cause), so only the pointermove fallback clears this.
        elementFromPoint.mockReturnValue(null);
        document.dispatchEvent(new PointerEvent('pointermove', { clientX: 500, clientY: 500 }));
        expect(fixture.componentInstance.hoveredSeatIndex()).toBeNull();

        // 3. Drag back onto seat 1. Because CDK's own internal container
        // reference never actually left seat 1 in step 2, its real
        // `cdkDropListEntered` will not fire again here — only the
        // pointermove fallback's own DOM hit-test can re-light the ring.
        elementFromPoint.mockReturnValue(seatSlot);
        document.dispatchEvent(new PointerEvent('pointermove', { clientX: 10, clientY: 10 }));

        expect(fixture.componentInstance.hoveredSeatIndex()).toBe(1);
        expect(fixture.componentInstance.receivingDrop()).toBe(true);
      });

      it('does not light the ring over an occupied seat', () => {
        const fixture = setup(makeTable());
        const seatSlot = fixture.nativeElement.querySelector('[data-seat-index="0"]') as Element; // seat 0 is filled (g1)
        vi.spyOn(document, 'elementFromPoint').mockReturnValue(seatSlot);

        document.dispatchEvent(new PointerEvent('pointermove', { clientX: 10, clientY: 10 }));

        expect(fixture.componentInstance.hoveredSeatIndex()).toBeNull();
      });

      it('does not light the ring over any seat on a full table', () => {
        const fixture = setup(makeTable({ isFull: true }));
        const seatSlot = fixture.nativeElement.querySelector('[data-seat-index="1"]') as Element;
        vi.spyOn(document, 'elementFromPoint').mockReturnValue(seatSlot);

        document.dispatchEvent(new PointerEvent('pointermove', { clientX: 10, clientY: 10 }));

        expect(fixture.componentInstance.hoveredSeatIndex()).toBeNull();
      });
    });

    it('does not light the ring merely from ordinary mouse movement with no drag in progress', () => {
      const fixture = setup(makeTable());
      const seatSlot = fixture.nativeElement.querySelector('[data-seat-index="1"]') as Element;
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(seatSlot);

      document.dispatchEvent(new PointerEvent('pointermove', { clientX: 10, clientY: 10 }));

      expect(fixture.componentInstance.hoveredSeatIndex()).toBeNull();
    });
  });
});
