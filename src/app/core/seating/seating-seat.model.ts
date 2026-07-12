// Mirrors GuestManagementService.Contracts.Seating.SeatingSeatResponse.
export interface SeatingSeat {
  seatIndex: number;
  guestId: string | null;
  guestName: string | null;
  // True for an anonymous seat reserved for one of partyOwnerGuestId's accompanying
  // attendees — no guestId/guestName of its own. Optional (rather than defaulted at
  // every call site) since most seats and most tests never touch party reservations;
  // treat a missing value the same as false/null.
  isReservedForParty?: boolean;
  partyOwnerGuestId?: string | null;
}
