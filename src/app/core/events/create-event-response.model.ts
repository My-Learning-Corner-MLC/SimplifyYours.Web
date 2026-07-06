import { EventLocation } from './event-location.model';

export interface CreateEventResponse {
  id: string;
  eventName: string;
  eventTime: string;
  eventType: string;
  eventDescription: string | null;
  createdAt: string;
  updatedAt: string;
  concurrencyToken: string;
  location: EventLocation | null;
  timeZoneId: string | null;
}
