import { AreaKind } from './area-kind.model';
import { AreaShape } from './area-shape.model';

export interface CreateAreaInput {
  name: string;
  kind: AreaKind;
  shape: AreaShape;
  width: number;
  height: number;
  color: string | null;
  capacity: number | null;
}

export type UpdateAreaInput = CreateAreaInput;
