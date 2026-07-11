import { GuestRelationship, GuestSide } from './guest.model';

// Mirrors GuestManagementService.Contracts.Guests.AddGuestRequest. The event's
// wedding metadata (relationship/side) is only sent for wedding events; plusOnes
// defaults to 0 and dietaryNotes is optional.
export interface AddGuestRequest {
  readonly eventId: string;
  readonly guestInfo: {
    readonly firstName: string;
    readonly lastName: string;
    readonly phoneNumber: string;
    readonly emailAddress: string;
    readonly relationship?: GuestRelationship | null;
    readonly side?: GuestSide | null;
    readonly plusOnes?: number;
    readonly dietaryNotes?: string | null;
  };
}
