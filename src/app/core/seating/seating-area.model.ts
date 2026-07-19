import { AreaKind } from './area-kind.model';
import { AreaShape } from './area-shape.model';

// Mirrors GuestManagementService.Contracts.Seating.SeatingAreaResponse.
export interface SeatingArea {
  id: string;
  name: string;
  kind: AreaKind;
  shape: AreaShape;
  width: number;
  height: number;
  positionX: number | null;
  positionY: number | null;
  rotation: number;
  color: string | null;
  capacity: number | null;
}
