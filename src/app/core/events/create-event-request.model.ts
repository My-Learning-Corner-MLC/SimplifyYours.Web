import { EventLocation } from './event-location.model';

export interface CreateEventRequest {
  eventName: string;
  eventTime?: string | null;
  eventType: string;
  eventDescription?: string | null;
  location?: EventLocation | null;
  timeZoneId?: string | null;
}
