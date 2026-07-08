import { EventSummary } from './event-summary.model';

// Mirrors EventService.Contracts.Events.QueryEventsResponse.
export interface QueryEventsResponse {
  items: EventSummary[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
