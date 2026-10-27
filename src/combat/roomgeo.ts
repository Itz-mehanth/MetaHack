/**
 * Pure geometry for the scanned room: the footprint of each wall on the
 * floor, how close a point is to the nearest wall, and spots spread across
 * the room (for hostages and props), so play uses the whole space.
 */

export type V3 = readonly [number, number, number];

export interface Segment {
  readonly a: V3;
  readonly b: V3;
}

/**
 * Footprint of a vertical plane: a segment on the floor along the wall.
 * `normal` points out of the wall; `rx`/`rz` are the plane's two in-plane
 * axes with half extents `hx`/`hz`; `centre` is the plane's middle.
 */
export function wallSegment(centre: V3, normal: V3, rx: V3, rz: V3, hx: number, hz: number): Segment | null {
  // Along the wall: up x normal.
  let tx = normal[2];
  let tz = -normal[0];
  const l = Math.hypot(tx, tz);
  if (l < 1e-4) return null;
  tx /= l;
  tz /= l;
  const half = Math.abs(rx[0] * tx + rx[2] * tz) * hx + Math.abs(rz[0] * tx + rz[2] * tz) * hz;
  if (half < 0.15) return null;
  return {
    a: [centre[0] - tx * half, 0, centre[2] - tz * half],
    b: [centre[0] + tx * half, 0, centre[2] + tz * half],
  };
}

/** Distance on the floor from (x, z) to the nearest segment (Infinity if none). */
export function distanceToWalls(segments: readonly Segment[], x: number, z: number): number {
  let best = Infinity;
  for (const s of segments) {
    const dx = s.b[0] - s.a[0];
    const dz = s.b[2] - s.a[2];
    const len2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - s.a[0]) * dx + (z - s.a[2]) * dz) / len2));
    best = Math.min(best, Math.hypot(x - (s.a[0] + dx * t), z - (s.a[2] + dz * t)));
  }
  return best;
}

/**
 * `count` floor points spread around the room: random spots along the walls
 * pulled `inset` metres toward the room's middle, kept at least `minFrom`
 * from (fromX, fromZ). Empty when there are no walls.
 */
export function roomSpots(segments: readonly Segment[], count: number, inset: number, fromX: number, fromZ: number, minFrom: number, random: () => number = Math.random): V3[] {
  if (segments.length === 0) return [];
  let cx = 0;
  let cz = 0;
  for (const s of segments) {
    cx += (s.a[0] + s.b[0]) / 2;
    cz += (s.a[2] + s.b[2]) / 2;
  }
  cx /= segments.length;
  cz /= segments.length;
  const spots: V3[] = [];
  for (let tries = 0; tries < count * 12 && spots.length < count; tries += 1) {
    const s = segments[Math.floor(random() * segments.length)];
    const t = 0.15 + random() * 0.7;
    const x = s.a[0] + (s.b[0] - s.a[0]) * t;
    const z = s.a[2] + (s.b[2] - s.a[2]) * t;
    const dx = cx - x;
    const dz = cz - z;
    const d = Math.hypot(dx, dz) || 1;
    const px = x + (dx / d) * inset;
    const pz = z + (dz / d) * inset;
    if (Math.hypot(px - fromX, pz - fromZ) < minFrom) continue;
    if (spots.some((p) => Math.hypot(p[0] - px, p[2] - pz) < 1.2)) continue;
    spots.push([px, 0, pz]);
  }
  return spots;
}
