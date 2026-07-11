import { SeatingSeat } from './seating-seat.model';
import { TableShape } from './table-shape.model';

// Mirrors GuestManagementService.Contracts.Seating.SeatingTableResponse.
// positionX/positionY are null until the table has been placed on the floor plan.
export interface SeatingTable {
  id: string;
  name: string;
  shape: TableShape;
  seatCount: number;
  isFull: boolean;
  positionX: number | null;
  positionY: number | null;
  rotation: number;
  seats: SeatingSeat[];
}
