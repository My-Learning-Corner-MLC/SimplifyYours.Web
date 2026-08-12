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
  // Two independent axes: a guest can respond through a link the organiser copied by hand, with
  // no invitation ever sent, so delivery and response cannot collapse into one value.
  readonly deliveryStatus: 'NotSent' | 'Queued' | 'Sent' | 'Failed';
  readonly rsvpStatus: 'NoResponse' | 'Accepted' | 'Declined' | 'Maybe';
  readonly respondedAt: string | null;
  readonly plusOnesConfirmed: number | null;
  readonly createdAt: string;
}
