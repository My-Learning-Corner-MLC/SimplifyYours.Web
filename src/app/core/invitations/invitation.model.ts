/** The guest's answer. Mirrors the backend's RsvpStatus. */
export type RsvpStatus = 'NoResponse' | 'Accepted' | 'Declined' | 'Maybe';

/** The three answers a guest can actually give — `NoResponse` is a starting state, not a choice. */
export const RSVP_CHOICES = ['Accepted', 'Maybe', 'Declined'] as const;

export type RsvpChoice = (typeof RSVP_CHOICES)[number];

export interface InvitationRsvp {
  readonly status: RsvpStatus;
  /** The organiser's allowance. The guest can confirm up to this, never more. */
  readonly plusOnesAllowed: number;
  readonly plusOnesConfirmed: number | null;
  readonly dietaryNotes: string | null;
  readonly deadline: string | null;
  /** When the guest first responded, if they have. Drives the "you responded" chip. */
  readonly respondedAt?: string | null;
  /** False once the deadline has passed — governs edits as well as first responses. */
  readonly isOpen: boolean;
}

export interface Invitation {
  readonly guestName: string;
  readonly rsvp: InvitationRsvp;
}

export interface SubmitRsvpRequest {
  readonly rsvpStatus: RsvpChoice;
  readonly plusOnesConfirmed: number;
  readonly dietaryNotes: string | null;
}

/** Why an invitation could not be loaded or a response could not be recorded. */
export type InvitationErrorReason = 'not-found' | 'closed' | 'validation' | 'network';

export interface InvitationError {
  readonly reason: InvitationErrorReason;
  /** Field-keyed messages from a 400, so the form can show them inline. */
  readonly fieldErrors: Readonly<Record<string, readonly string[]>>;
}
