// Which optional guest-metadata fields the Add Guest modal renders for a given event type.
// Mirrors guest-management-service's per-event-type IGuestMetadataMapper registration on the
// backend — add a new event type's fields here when it gets a backend mapper too. Tags are
// NOT listed here — they apply to every event type and live at the top level of guestInfo,
// not inside eventMetadata (see core/guests/guest.model.ts).
export type GuestMetadataFieldKey = 'relationship' | 'side' | 'plusOnes' | 'dietaryNotes';

const GUEST_METADATA_FIELDS_BY_EVENT_TYPE: Readonly<Record<string, readonly GuestMetadataFieldKey[]>> = {
  wedding: ['relationship', 'side', 'plusOnes', 'dietaryNotes'],
  birthday: ['plusOnes', 'dietaryNotes'],
};

/** Fields with no registered backend mapper for `eventType` render nothing — never assumed. */
export function guestMetadataFieldsFor(eventType: string): readonly GuestMetadataFieldKey[] {
  return GUEST_METADATA_FIELDS_BY_EVENT_TYPE[eventType] ?? [];
}
