import { Guest } from '../guests/guest.model';
import { SeatingLayout } from './seating-layout.model';
import { withGuestAssigned, withGuestUnassigned, withTableMoved } from './seating-layout-mutations';

const guest = (id: string): Guest => ({
  id,
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
});

const layout = (): SeatingLayout => ({
  eventId: 'e1',
  areas: [],
  summary: { tableCount: 2, seatCount: 8, seatedCount: 1, floatingCount: 1 },
  tables: [
    {
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
      ],
    },
    {
      id: 't2',
      name: 'Table 2',
      shape: 'Long',
      seatCount: 4,
      isFull: false,
      positionX: 10,
      positionY: 20,
      rotation: 0,
      seats: [{ seatIndex: 0, guestId: null, guestName: null }],
    },
  ],
});

describe('withGuestAssigned', () => {
  it('places the guest in the target seat', () => {
    const result = withGuestAssigned(layout(), guest('g2'), 't1', 1);

    expect(result.tables[0].seats[1]).toEqual({ seatIndex: 1, guestId: 'g2', guestName: 'Amara Okoye' });
  });

  it('removes the guest from any previous seat first (move semantics)', () => {
    const result = withGuestAssigned(layout(), guest('g1'), 't2', 0);

    expect(result.tables[0].seats[0].guestId).toBeNull();
    expect(result.tables[1].seats[0].guestId).toBe('g1');
  });

  it('does not mutate the original layout', () => {
    const original = layout();
    withGuestAssigned(original, guest('g2'), 't1', 1);

    expect(original.tables[0].seats[1].guestId).toBeNull();
  });
});

describe('withGuestUnassigned', () => {
  it('clears the seat the guest was in', () => {
    const result = withGuestUnassigned(layout(), 'g1');

    expect(result.tables[0].seats[0]).toEqual({ seatIndex: 0, guestId: null, guestName: null });
  });

  it('is a no-op when the guest is not seated anywhere', () => {
    const result = withGuestUnassigned(layout(), 'nonexistent');

    expect(result).toEqual(layout());
  });
});

describe('withTableMoved', () => {
  it('updates the target table position and rotation', () => {
    const result = withTableMoved(layout(), 't2', 100, 200, 45);

    expect(result.tables[1]).toMatchObject({ positionX: 100, positionY: 200, rotation: 45 });
  });

  it('leaves other tables untouched', () => {
    const result = withTableMoved(layout(), 't2', 100, 200, 45);

    expect(result.tables[0]).toEqual(layout().tables[0]);
  });
});
