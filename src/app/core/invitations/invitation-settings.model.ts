/** Event types that support invitations. Mirrors the backend's InvitationFieldSchema. */
export type InvitationEventType = 'wedding' | 'birthday';

/** A merge field the organiser fills in. `guestName` is absent — it is never typed. */
export type InvitationField =
  | 'brideName'
  | 'groomName'
  | 'eventName'
  | 'eventDate'
  | 'eventTime'
  | 'venueName'
  | 'venueAddress'
  | 'venueNotes';

export type InvitationFieldValues = Partial<Record<InvitationField, string | null>>;

export interface InvitationSettings {
  readonly eventId: string;
  readonly eventType: string;
  /** Null until the organiser has chosen one. */
  readonly templateId: string | null;
  readonly fieldValues: InvitationFieldValues;
  /**
   * False when nothing has been saved and `fieldValues` are pre-fill defaults derived from the
   * event. Lets the UI say "not yet configured" rather than implying the defaults were chosen.
   */
  readonly isConfigured: boolean;
  readonly requiredFields: readonly InvitationField[];
}

export interface SaveInvitationSettingsRequest {
  readonly templateId: string;
  readonly fieldValues: InvitationFieldValues;
}

/**
 * Field order as the form presents it. Declared here rather than derived from `requiredFields`
 * so the optional `venueNotes` still has a defined position.
 */
export const INVITATION_FIELD_ORDER: Readonly<Record<InvitationEventType, readonly InvitationField[]>> = {
  wedding: ['brideName', 'groomName', 'eventDate', 'eventTime', 'venueName', 'venueAddress', 'venueNotes'],
  birthday: ['eventName', 'eventDate', 'eventTime', 'venueName', 'venueAddress', 'venueNotes'],
};

export const INVITATION_FIELD_LABELS: Readonly<Record<InvitationField, string>> = {
  brideName: "Bride's name",
  groomName: "Groom's name",
  eventName: 'Event name',
  eventDate: 'Date',
  eventTime: 'Time',
  venueName: 'Venue',
  venueAddress: 'Address',
  venueNotes: 'Venue notes',
};

/** Maximum lengths, mirroring the backend so the form fails fast rather than round-tripping. */
export const INVITATION_FIELD_MAX_LENGTHS: Readonly<Record<InvitationField, number>> = {
  brideName: 200,
  groomName: 200,
  eventName: 200,
  eventDate: 100,
  eventTime: 100,
  venueName: 200,
  venueAddress: 500,
  venueNotes: 2000,
};

export function fieldsFor(eventType: string): readonly InvitationField[] {
  return INVITATION_FIELD_ORDER[eventType?.toLowerCase() as InvitationEventType] ?? [];
}

export function isSupportedEventType(eventType: string): boolean {
  return fieldsFor(eventType).length > 0;
}
