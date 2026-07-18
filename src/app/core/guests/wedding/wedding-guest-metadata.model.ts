// Mirrors GuestManagementService.Contracts.Guests.Wedding.WeddingGuestMetadataResponse and the
// shape GuestManagementService.Application.Guests.Wedding.WeddingGuestMetadataMapper accepts as
// AddGuestRequest.guestInfo.eventMetadata. Wedding-specific — other event types get their own
// metadata type under their own folder (see WEDDING_EVENT_TYPE / core/guests/<eventType>/).
export const WEDDING_EVENT_TYPE = 'wedding';

export type Relationship = 'Family' | 'Friend' | 'Colleague';
export type GuestSide = 'Bride' | 'Groom';

export interface WeddingGuestMetadata {
  readonly relationship: Relationship | null;
  readonly side: GuestSide | null;
  readonly plusOnes: number;
  readonly dietaryNotes: string | null;
  readonly tags: readonly string[];
}

/** Narrows a Guest's opaque `eventMetadata` to the wedding shape; null when absent/malformed. */
export function asWeddingGuestMetadata(eventMetadata: unknown): WeddingGuestMetadata | null {
  if (!eventMetadata || typeof eventMetadata !== 'object') {
    return null;
  }

  const value = eventMetadata as Partial<WeddingGuestMetadata>;
  return {
    relationship: value.relationship ?? null,
    side: value.side ?? null,
    plusOnes: value.plusOnes ?? 0,
    dietaryNotes: value.dietaryNotes ?? null,
    tags: value.tags ?? [],
  };
}
