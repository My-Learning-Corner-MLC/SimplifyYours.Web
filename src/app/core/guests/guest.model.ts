// Mirrors GuestManagementService.Contracts.Guests.GuestListItemResponse and the
// guestInfo of AddGuestResponse. `eventMetadata`'s concrete shape depends on the
// event's type (see core/guests/wedding/wedding-guest-metadata.model.ts for the
// wedding shape) — null for event types with no registered mapper. `tags` applies
// to every event type; it comes back as an empty array when nothing was set.
export interface Guest {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly emailAddress: string | null;
  readonly phoneNumber: string;
  readonly eventMetadata: unknown;
  readonly tags: readonly string[];
  readonly createdAt: string;
}
