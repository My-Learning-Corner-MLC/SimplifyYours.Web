// Mirrors GuestManagementService.Contracts.Guests.AddGuestRequest. eventMetadata's concrete
// shape depends on the event's type — the server resolves it dynamically per event type (see
// GuestMetadataMapperFactory), so the client sends only the fields relevant to that type; see
// core/guests/guest-metadata-field-config.ts for which fields apply to which event type.
export interface AddGuestRequest {
  readonly eventId: string;
  readonly guestInfo: {
    readonly firstName: string;
    readonly lastName: string;
    readonly phoneNumber: string;
    readonly emailAddress: string;
    // Free-text seating labels (e.g. "College friends"). Applies to every event type.
    readonly tags?: readonly string[];
    readonly eventMetadata?: Record<string, unknown> | null;
  };
}
