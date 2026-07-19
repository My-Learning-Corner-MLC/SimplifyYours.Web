import { Guest, guestFullName } from '../guests/guest.model';
import { SeatingLayout } from './seating-layout.model';

// Pure, immutable local-state mutations used for optimistic UI updates before
// the debounced batch write confirms (or fails) server-side. Never touch
// `summary` — SeatingStore derives it reactively from the live tables/guests
// signals instead, so it always stays consistent with whatever these produce.

const emptySeat = (seatIndex: number) => ({
  seatIndex,
  guestId: null,
  guestName: null,
  isReservedForParty: false,
  partyOwnerGuestId: null,
});

export function withGuestUnassigned(layout: SeatingLayout, guestId: string): SeatingLayout {
  return {
    ...layout,
    tables: layout.tables.map((table) => ({
      ...table,
      // Releases the guest's own seat and any seats reserved for their party's
      // accompanying attendees (guestId null, partyOwnerGuestId === guestId).
      seats: table.seats.map((seat) =>
        seat.guestId === guestId || seat.partyOwnerGuestId === guestId ? emptySeat(seat.seatIndex) : seat,
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
                ? {
                    seatIndex,
                    guestId: guest.id,
                    guestName: guestFullName(guest),
                    isReservedForParty: false,
                    partyOwnerGuestId: guest.id,
                  }
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

export function withAreaMoved(
  layout: SeatingLayout,
  areaId: string,
  positionX: number,
  positionY: number,
  rotation: number,
): SeatingLayout {
  return {
    ...layout,
    areas: layout.areas.map((area) => (area.id !== areaId ? area : { ...area, positionX, positionY, rotation })),
  };
}
