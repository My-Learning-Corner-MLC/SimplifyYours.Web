// Mirrors EventService.Contracts.Events.QueryEventsRequest.
// All fields optional; the server applies defaults (pageNumber 1, pageSize 20).
export type EventTimeFilter = 'all' | 'upcoming' | 'past';
export type EventSortField = 'createdAt' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';

export interface QueryEventsRequest {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  eventType?: string;
  timeFilter?: EventTimeFilter;
  sortBy?: EventSortField;
  sortDirection?: SortDirection;
}
