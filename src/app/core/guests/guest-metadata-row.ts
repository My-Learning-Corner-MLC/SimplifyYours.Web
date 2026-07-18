import { asBirthdayGuestMetadata } from './birthday/birthday-guest-metadata.model';
import { asWeddingGuestMetadata } from './wedding/wedding-guest-metadata.model';

export interface GuestMetadataRowInfo {
  readonly group: string;
  readonly plusOnes: number;
  readonly dietaryNotes: string | null;
}

const EMPTY_ROW_INFO: GuestMetadataRowInfo = { group: '', plusOnes: 0, dietaryNotes: null };

/**
 * Narrows a Guest's opaque `eventMetadata` based on the owning event's actual type — mirrors the
 * backend's per-event-type IGuestMetadataMapper resolution (GuestMetadataMapperFactory); never
 * assumes a shape. Add a case here when a new event type gets a backend mapper. Tags are NOT
 * included here — they live at the guest's top level (`guest.tags`), not inside eventMetadata.
 */
export function describeGuestMetadata(eventType: string, eventMetadata: unknown): GuestMetadataRowInfo {
  switch (eventType) {
    case 'wedding': {
      const metadata = asWeddingGuestMetadata(eventMetadata);
      const groupParts = [
        metadata?.relationship ?? null,
        metadata?.side ? `${metadata.side.toLowerCase()}'s side` : null,
      ].filter((part): part is string => !!part);
      return {
        group: groupParts.join(' · '),
        plusOnes: metadata?.plusOnes ?? 0,
        dietaryNotes: metadata?.dietaryNotes ?? null,
      };
    }
    case 'birthday': {
      const metadata = asBirthdayGuestMetadata(eventMetadata);
      return {
        group: '',
        plusOnes: metadata?.plusOnes ?? 0,
        dietaryNotes: metadata?.dietaryNotes ?? null,
      };
    }
    default:
      return EMPTY_ROW_INFO;
  }
}
