import { describe, expect, it } from 'vitest';
import { distanceToWalls, roomSpots, wallSegment } from './roomgeo.js';

describe('room geometry', () => {
  it('turns a wall plane into a floor segment along the wall', () => {
    // A wall at z = -3 facing +z, 4 m wide (x axis) and 2.5 m tall.
    const seg = wallSegment([0, 1.2, -3], [0, 0, 1], [1, 0, 0], [0, 1, 0], 2, 1.25)!;
    expect(seg.a[2]).toBeCloseTo(-3);
    expect(Math.abs(seg.b[0] - seg.a[0])).toBeCloseTo(4);
    expect(seg.a[1]).toBe(0);
    expect(wallSegment([0, 1, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1], 1, 1)).toBeNull();
  });

  it('measures distance to the nearest wall', () => {
    const segs = [wallSegment([0, 1, -3], [0, 0, 1], [1, 0, 0], [0, 1, 0], 2, 1)!];
    expect(distanceToWalls(segs, 0, 0)).toBeCloseTo(3);
    expect(distanceToWalls(segs, 5, -3)).toBeCloseTo(3);
    expect(distanceToWalls([], 0, 0)).toBe(Infinity);
  });

  it('spreads spots inside the room away from the player', () => {
    const w = (x: number, z: number, nx: number, nz: number) => wallSegment([x, 1, z], [nx, 0, nz], nz === 0 ? [0, 0, 1] : [1, 0, 0], [0, 1, 0], 2.5, 1)!;
    const room = [w(0, -3, 0, 1), w(0, 3, 0, -1), w(-3, 0, 1, 0), w(3, 0, -1, 0)];
    const spots = roomSpots(room, 4, 0.6, 0, 0, 1.5);
    expect(spots.length).toBeGreaterThan(1);
    for (const p of spots) {
      expect(Math.hypot(p[0], p[2])).toBeGreaterThanOrEqual(1.5);
      expect(Math.abs(p[0])).toBeLessThan(3);
      expect(Math.abs(p[2])).toBeLessThan(3);
    }
    expect(roomSpots([], 3, 0.5, 0, 0, 1)).toEqual([]);
  });
});
