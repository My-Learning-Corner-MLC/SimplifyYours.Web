import { computeSeatPositions } from './seat-geometry';

describe('computeSeatPositions', () => {
  it('returns an empty array for a zero seat count', () => {
    expect(computeSeatPositions('Round', 0)).toEqual([]);
  });

  it.each(['Round', 'Long', 'Square'] as const)('returns one position per seat for %s', (shape) => {
    const positions = computeSeatPositions(shape, 8);
    expect(positions.length).toBe(8);
  });

  it.each(['Round', 'Long', 'Square'] as const)('keeps every %s seat within the card bounds', (shape) => {
    const positions = computeSeatPositions(shape, 12);
    for (const position of positions) {
      expect(position.xPercent).toBeGreaterThanOrEqual(0);
      expect(position.xPercent).toBeLessThanOrEqual(100);
      expect(position.yPercent).toBeGreaterThanOrEqual(0);
      expect(position.yPercent).toBeLessThanOrEqual(100);
    }
  });

  it('spaces round seats evenly around the center', () => {
    const positions = computeSeatPositions('Round', 4);
    const center = { x: 50, y: 50 };
    const distances = positions.map((p) =>
      Math.hypot(p.xPercent - center.x, p.yPercent - center.y),
    );
    expect(distances[0]).toBeCloseTo(distances[1], 5);
    expect(distances[0]).toBeCloseTo(distances[2], 5);
    expect(distances[0]).toBeCloseTo(distances[3], 5);
  });

  it('splits long-table seats across a top and bottom row', () => {
    const positions = computeSeatPositions('Long', 6);
    const topRow = positions.filter((p) => p.yPercent < 50);
    const bottomRow = positions.filter((p) => p.yPercent > 50);
    expect(topRow.length).toBe(3);
    expect(bottomRow.length).toBe(3);
  });

  it('handles a single seat without dividing by zero', () => {
    expect(() => computeSeatPositions('Long', 1)).not.toThrow();
    expect(() => computeSeatPositions('Round', 1)).not.toThrow();
    expect(() => computeSeatPositions('Square', 1)).not.toThrow();
  });
});
