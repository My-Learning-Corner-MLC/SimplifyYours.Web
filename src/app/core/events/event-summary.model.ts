import { EventLocation } from './event-location.model';

// Mirrors EventService.Contracts.Events.EventSummaryResponse.
// eventDate is a "yyyy-MM-dd" date-only string; eventStartTime/eventEndTime are
// "HH:mm:ss" time-of-day-only strings (no date component). createdAt/updatedAt
// remain full ISO-8601 timestamps as serialized by the API.
export interface EventSummary {
  id: string;
  eventName: string;
  eventDate: string;
  eventType: string;
  eventDescription: string | null;
  createdAt: string;
  updatedAt: string;
  location: EventLocation | null;
  eventStartTime: string | null;
  eventEndTime: string | null;
}
