// Mirrors GuestManagementService.Contracts.Guests.Birthday.BirthdayGuestMetadataResponse and the
// shape GuestManagementService.Application.Guests.Birthday.BirthdayGuestMetadataMapper accepts as
// AddGuestRequest.guestInfo.eventMetadata. Birthday-specific — narrower than wedding: just
// plus-ones and dietary notes, no relationship/side.
export const BIRTHDAY_EVENT_TYPE = 'birthday';

export interface BirthdayGuestMetadata {
  readonly plusOnes: number;
  readonly dietaryNotes: string | null;
}

/** Narrows a Guest's opaque `eventMetadata` to the birthday shape; null when absent/malformed. */
export function asBirthdayGuestMetadata(eventMetadata: unknown): BirthdayGuestMetadata | null {
  if (!eventMetadata || typeof eventMetadata !== 'object') {
    return null;
  }

  const value = eventMetadata as Partial<BirthdayGuestMetadata>;
  return {
    plusOnes: value.plusOnes ?? 0,
    dietaryNotes: value.dietaryNotes ?? null,
  };
}
