import { TableShape } from './table-shape.model';

// Percentage-based (0-100) position within a square card, plus the rotation
// (deg) a seat glyph should carry so it reads "outward" from the table.
export interface SeatPosition {
  readonly xPercent: number;
  readonly yPercent: number;
  readonly rotationDeg: number;
}

const CENTER = 50;

/** Pure, presentational: where each of `seatCount` seats sits around a table card. */
export function computeSeatPositions(shape: TableShape, seatCount: number): SeatPosition[] {
  if (seatCount <= 0) {
    return [];
  }
  switch (shape) {
    case 'Long':
      return computeLongPositions(seatCount);
    case 'Square':
      return computeSquarePositions(seatCount);
    case 'Round':
    default:
      return computeRoundPositions(seatCount);
  }
}

function computeRoundPositions(seatCount: number): SeatPosition[] {
  const radius = 42;
  return Array.from({ length: seatCount }, (_, index) => {
    const angleDeg = (360 / seatCount) * index - 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
      xPercent: CENTER + radius * Math.cos(angleRad),
      yPercent: CENTER + radius * Math.sin(angleRad),
      rotationDeg: angleDeg + 90,
    };
  });
}

function computeLongPositions(seatCount: number): SeatPosition[] {
  const topCount = Math.ceil(seatCount / 2);
  const bottomCount = seatCount - topCount;
  const positions: SeatPosition[] = [];
  for (let i = 0; i < topCount; i++) {
    positions.push({ xPercent: columnX(i, topCount), yPercent: 10, rotationDeg: 180 });
  }
  for (let i = 0; i < bottomCount; i++) {
    positions.push({ xPercent: columnX(i, bottomCount), yPercent: 90, rotationDeg: 0 });
  }
  return positions;
}

function computeSquarePositions(seatCount: number): SeatPosition[] {
  const perimeter = 4;
  const positions: SeatPosition[] = [];
  for (let index = 0; index < seatCount; index++) {
    const t = (index / seatCount) * perimeter;
    const side = Math.floor(t);
    const sideProgress = t - side;
    positions.push(pointOnSquare(side, sideProgress));
  }
  return positions;
}

function pointOnSquare(side: number, progress: number): SeatPosition {
  const inset = 8;
  const low = inset;
  const high = 100 - inset;
  switch (side) {
    case 0: // top edge, left -> right
      return { xPercent: low + progress * (high - low), yPercent: low, rotationDeg: 180 };
    case 1: // right edge, top -> bottom
      return { xPercent: high, yPercent: low + progress * (high - low), rotationDeg: 270 };
    case 2: // bottom edge, right -> left
      return { xPercent: high - progress * (high - low), yPercent: high, rotationDeg: 0 };
    case 3: // left edge, bottom -> top
    default:
      return { xPercent: low, yPercent: high - progress * (high - low), rotationDeg: 90 };
  }
}

function columnX(index: number, count: number): number {
  if (count <= 1) {
    return CENTER;
  }
  const inset = 12;
  return inset + (index / (count - 1)) * (100 - inset * 2);
}
