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
      { item: { data: 'g2' }, previousContainer: {}, container: {} } as never,
      1,
    );

    expect(spy).toHaveBeenCalledWith({ seatIndex: 1, guestId: 'g2' });
  });

  it('ignores a drop with no guest id', () => {
    const fixture = setup(makeTable());
    const spy = vi.fn();
    fixture.componentInstance.seatDrop.subscribe(spy);

    fixture.componentInstance.onSeatDropped(
      { item: { data: '' }, previousContainer: {}, container: {} } as never,
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
  });
});
