import { Guest, guestFullName } from '../guests/guest.model';
import { SeatingLayout } from './seating-layout.model';

// Pure, immutable local-state mutations used for optimistic UI updates before
// the debounced batch write confirms (or fails) server-side. Never touch
// `summary` — SeatingStore derives it reactively from the live tables/guests
// signals instead, so it always stays consistent with whatever these produce.

export function withGuestUnassigned(layout: SeatingLayout, guestId: string): SeatingLayout {
  return {
    ...layout,
    tables: layout.tables.map((table) => ({
      ...table,
      seats: table.seats.map((seat) =>
        seat.guestId === guestId ? { seatIndex: seat.seatIndex, guestId: null, guestName: null } : seat,
      ),
    })),
  };
}

export function withGuestAssigned(
  layout: SeatingLayout,
  guest: Guest,
  tableId: string,
  seatIndex: number,
): SeatingLayout {
  const cleared = withGuestUnassigned(layout, guest.id);
  return {
    ...cleared,
    tables: cleared.tables.map((table) =>
      table.id !== tableId
        ? table
        : {
            ...table,
            seats: table.seats.map((seat) =>
              seat.seatIndex === seatIndex
                ? { seatIndex, guestId: guest.id, guestName: guestFullName(guest) }
                : seat,
            ),
          },
    ),
  };
}

export function withTableMoved(
  layout: SeatingLayout,
  tableId: string,
  positionX: number,
  positionY: number,
  rotation: number,
): SeatingLayout {
  return {
    ...layout,
    tables: layout.tables.map((table) => (table.id !== tableId ? table : { ...table, positionX, positionY, rotation })),
  };
}
