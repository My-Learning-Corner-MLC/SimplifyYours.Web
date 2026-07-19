import { SeatingArea } from './seating-area.model';
import { SeatingSummary } from './seating-summary.model';
import { SeatingTable } from './seating-table.model';

// Mirrors GuestManagementService.Contracts.Seating.SeatingLayoutResponse.
export interface SeatingLayout {
  eventId: string;
  tables: SeatingTable[];
  areas: SeatingArea[];
  summary: SeatingSummary;
}
