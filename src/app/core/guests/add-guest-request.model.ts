import { WeddingGuestMetadata } from './wedding/wedding-guest-metadata.model';

// Mirrors GuestManagementService.Contracts.Guests.AddGuestRequest. eventMetadata's
// concrete shape depends on the event's type — see
// core/guests/wedding/wedding-guest-metadata.model.ts for the wedding shape.
export interface AddGuestRequest {
  readonly eventId: string;
  readonly guestInfo: {
    readonly firstName: string;
    readonly lastName: string;
    readonly phoneNumber: string;
    readonly emailAddress: string;
    readonly eventMetadata?: WeddingGuestMetadata | null;
  };
}
