// Mirrors GuestManagementService.Contracts.Guests.GuestListItemResponse and the
// guestInfo of AddGuestResponse. `relationship`/`side` are wedding metadata and
// may be null for non-wedding events; the backend stores them in an opaque
// metadata JSON column.
export type GuestRelationship = 'Family' | 'Friend' | 'Colleague';
export type GuestSide = 'Bride' | 'Groom';

export interface Guest {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly emailAddress: string | null;
  readonly phoneNumber: string;
  readonly relationship: GuestRelationship | null;
  readonly side: GuestSide | null;
  readonly plusOnes: number;
  readonly dietaryNotes: string | null;
  readonly createdAt: string;
}
