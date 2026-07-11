// Batch write DTOs — the primary persistence path for high-frequency drag
// interactions (seat assignment, table/area position drags). See
// SeatingStore's pending-changes queue for how ops get coalesced before flush.

export type SeatingBatchOpType = 'Assign' | 'Unassign';

export interface SeatingBatchOp {
  op: SeatingBatchOpType;
  guestId: string;
  tableId: string | null;
  seatIndex: number | null;
}

export type SeatingBatchOpStatus =
  | 'Applied'
  | 'Conflict'
  | 'TableNotFound'
  | 'GuestNotFound'
  | 'SeatIndexOutOfRange';

export interface SeatingBatchOpResult {
  guestId: string;
  status: SeatingBatchOpStatus;
}

export interface TablePositionInput {
  tableId: string;
  positionX: number;
  positionY: number;
  rotation: number;
}

export type PositionOpStatus = 'Applied' | 'TableNotFound' | 'AreaNotFound';

export interface TablePositionResult {
  tableId: string;
  status: PositionOpStatus;
}

export interface AreaPositionInput {
  areaId: string;
  positionX: number;
  positionY: number;
  rotation: number;
}

export interface AreaPositionResult {
  areaId: string;
  status: PositionOpStatus;
}
