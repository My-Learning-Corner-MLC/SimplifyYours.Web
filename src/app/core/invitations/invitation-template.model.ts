import { InvitationEventType } from './invitation-settings.model';

export interface InvitationTemplate {
  readonly id: string;
  readonly name: string;
  readonly eventType: InvitationEventType;
  /** One line describing the look, shown under the name in the gallery. */
  readonly tone: string;
  /** Swatches for the gallery card, so a template reads before it renders. */
  readonly palette: readonly string[];
}

/**
 * The gallery, held client-side while there is exactly one template per event type.
 *
 * Deliberately not fetched: slice 1 ships Marigold alone, and a catalog endpoint that returns one
 * hardcoded row is ceremony. When the remaining four templates land, this moves behind
 * `template-management-service` and only this file changes — the gallery component reads through
 * `templatesFor()` either way.
 */
const TEMPLATES: readonly InvitationTemplate[] = [
  {
    id: 'marigold',
    name: 'Marigold',
    eventType: 'wedding',
    tone: 'Warm and friendly, still formal · terracotta field, cream card',
    palette: ['#C98D6B', '#FBF3E8', '#B97A4E', '#3B2A24'],
  },
];

export function templatesFor(eventType: string): readonly InvitationTemplate[] {
  return TEMPLATES.filter(
    (template) => template.eventType === eventType?.toLowerCase(),
  );
}

export function templateById(id: string): InvitationTemplate | null {
  return TEMPLATES.find((template) => template.id === id) ?? null;
}
