// Mirrors GuestManagementService.Contracts.Guests.GuestListItemResponse and the
// guestInfo of AddGuestResponse. `eventMetadata`'s concrete shape depends on the
// event's type (see core/guests/wedding/wedding-guest-metadata.model.ts for the
// wedding shape) — null for event types with no registered mapper.
export interface Guest {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly emailAddress: string | null;
  readonly phoneNumber: string;
  readonly eventMetadata: unknown;
  readonly createdAt: string;
}

export function guestFullName(guest: Pick<Guest, 'firstName' | 'lastName'>): string {
  return `${guest.firstName} ${guest.lastName}`.trim();
}
