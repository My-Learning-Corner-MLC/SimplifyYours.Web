import { EventLocation } from './event-location.model';

// Mirrors EventService.Contracts.Events.EventSummaryResponse.
// Date fields are ISO-8601 strings as serialized by the API.
export interface EventSummary {
  id: string;
  eventName: string;
  eventTime: string;
  eventType: string;
  eventDescription: string | null;
  createdAt: string;
  updatedAt: string;
  location: EventLocation | null;
  eventStartTime: string | null;
  eventEndTime: string | null;
}
