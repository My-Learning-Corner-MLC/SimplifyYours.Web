import { EventLocation } from './event-location.model';

// Mirrors EventService.Contracts.Events.GetEventDetailsResponse.
// eventDate is a "yyyy-MM-dd" date-only string; eventStartTime/eventEndTime are
// "HH:mm:ss" time-of-day-only strings (no date component). createdAt/updatedAt
// remain full ISO-8601 timestamps as serialized by the API.
export interface EventDetail {
  id: string;
  eventName: string;
  eventDate: string;
  eventType: string;
  eventDescription: string | null;
  createdAt: string;
  updatedAt: string;
  concurrencyToken: string;
  location: EventLocation | null;
  timeZoneId: string | null;
  eventStartTime: string | null;
  eventEndTime: string | null;
}
