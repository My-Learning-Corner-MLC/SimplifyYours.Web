import { TableShape } from './table-shape.model';

export interface CreateTablesInput {
  name: string;
  shape: TableShape;
  seatCount: number;
  count: number;
}

export interface UpdateTableInput {
  name: string;
  shape: TableShape;
  seatCount: number;
  isFull: boolean;
}
