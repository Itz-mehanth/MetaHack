/**
 * Lightweight physics for the things players see and feel: room-aware
 * collisions (the floor plus the real tables and walls MR detects), and a
 * time-corrected Verlet solver for ragdolls, ropes and debris. Pure
 * TypeScript on typed arrays: no Three.js, no allocation per step, a fixed
 * cost per body, so it stays cheap at 72 fps on Quest. (IWSDK's Havok
 * physics has no joints, and these are pooled non-ECS objects.)
 */

export interface Vec {
  x: number;
  y: number;
  z: number;
}

/** Floats per surface: normal, origin, u axis, v axis (3 each), half extents. */
const STRIDE = 14;
/** Points further than this behind a surface are outside the room, not colliding. */
const MAX_DEPTH = 0.35;

/**
 * Collision surfaces of the player's room. Each is a bounded rectangle with
 * a unit normal pointing into the room (MR plane detection), plus an
 * infinite floor at `floor`.
 */
export class Room {
  floor = 0;
  count = 0;
  private readonly data: Float32Array;
  /** Contact normal of the last `collide` (x, y, z). */
  readonly normal = new Float32Array(3);

  constructor(private readonly capacity = 32) {
    this.data = new Float32Array(capacity * STRIDE);
  }

  clear(): void {
    this.count = 0;
  }

  /** Adds a rectangle: normal n, centre o, in-plane unit axes u and v, half extents hu, hv. */
  add(n: Vec, o: Vec, u: Vec, v: Vec, hu: number, hv: number): void {
    if (this.count >= this.capacity) return;
    const d = this.data;
    const k = this.count * STRIDE;
    d[k] = n.x;
    d[k + 1] = n.y;
    d[k + 2] = n.z;
    d[k + 3] = o.x;
    d[k + 4] = o.y;
    d[k + 5] = o.z;
    d[k + 6] = u.x;
    d[k + 7] = u.y;
    d[k + 8] = u.z;
    d[k + 9] = v.x;
    d[k + 10] = v.y;
    d[k + 11] = v.z;
    d[k + 12] = hu;
    d[k + 13] = hv;
    this.count += 1;
  }

  /**
   * Pushes a sphere at `p` (array, offset `i`) with radius `r` out of every
   * surface it overlaps. Returns true on contact; `normal` holds the last
   * contact normal.
   */
  collideAt(p: Float32Array, i: number, r: number): boolean {
    let hit = false;
    if (p[i + 1] < this.floor + r) {
      p[i + 1] = this.floor + r;
      this.normal[0] = 0;
      this.normal[1] = 1;
      this.normal[2] = 0;
      hit = true;
    }
    const d = this.data;
    for (let s = 0; s < this.count; s += 1) {
      const k = s * STRIDE;
      const rx = p[i] - d[k + 3];
      const ry = p[i + 1] - d[k + 4];
      const rz = p[i + 2] - d[k + 5];
      const depth = rx * d[k] + ry * d[k + 1] + rz * d[k + 2];
      if (depth >= r || depth < -MAX_DEPTH) continue;
      const a = rx * d[k + 6] + ry * d[k + 7] + rz * d[k + 8];
      const b = rx * d[k + 9] + ry * d[k + 10] + rz * d[k + 11];
      if (Math.abs(a) > d[k + 12] + r || Math.abs(b) > d[k + 13] + r) continue;
      const push = r - depth;
      p[i] += d[k] * push;
      p[i + 1] += d[k + 1] * push;
      p[i + 2] += d[k + 2] * push;
      this.normal[0] = d[k];
      this.normal[1] = d[k + 1];
      this.normal[2] = d[k + 2];
      hit = true;
    }
    return hit;
  }

  private readonly scratch = new Float32Array(3);

  /** `collideAt` for an {x, y, z} point (a Three.js Vector3 works). */
  collide(p: Vec, r: number): boolean {
    const s = this.scratch;
    s[0] = p.x;
    s[1] = p.y;
    s[2] = p.z;
    const hit = this.collideAt(s, 0, r);
    p.x = s[0];
    p.y = s[1];
    p.z = s[2];
    return hit;
  }

  /**
   * Bounces a velocity off the last contact: the normal part reverses
   * (scaled by `bounce`), the tangential part loses `friction`.
   */
  bounce(velocity: Vec, bounce: number, friction: number): void {
    const n = this.normal;
    const vn = velocity.x * n[0] + velocity.y * n[1] + velocity.z * n[2];
    if (vn >= 0) return;
    const tx = velocity.x - vn * n[0];
    const ty = velocity.y - vn * n[1];
    const tz = velocity.z - vn * n[2];
    velocity.x = tx * (1 - friction) - vn * bounce * n[0];
    velocity.y = ty * (1 - friction) - vn * bounce * n[1];
    velocity.z = tz * (1 - friction) - vn * bounce * n[2];
  }
}

/**
 * A Verlet body: points joined by links. Rigid links hold their length;
 * "apart" links only stop two points coming closer than their rest length
 * (joint limits). Time-corrected, so slow motion and hit-stop keep momentum.
 */
export class Verlet {
  readonly pos: Float32Array;
  readonly prev: Float32Array;
  readonly radius: Float32Array;
  private readonly contact: Uint8Array;
  private readonly contactNormal: Float32Array;
  private readonly la: Uint16Array;
  private readonly lb: Uint16Array;
  private readonly rest: Float32Array;
  private readonly apart: Uint8Array;
  linkCount = 0;
  private dtPrev = 1 / 72;
  /** Points touching a surface after the last step. */
  contacts = 0;

  constructor(
    readonly count: number,
    maxLinks: number,
  ) {
    this.pos = new Float32Array(count * 3);
    this.prev = new Float32Array(count * 3);
    this.radius = new Float32Array(count).fill(0.05);
    this.contact = new Uint8Array(count);
    this.contactNormal = new Float32Array(count * 3);
    this.la = new Uint16Array(maxLinks);
    this.lb = new Uint16Array(maxLinks);
    this.rest = new Float32Array(maxLinks);
    this.apart = new Uint8Array(maxLinks);
  }

  setPoint(i: number, x: number, y: number, z: number): void {
    const k = i * 3;
    this.pos[k] = x;
    this.pos[k + 1] = y;
    this.pos[k + 2] = z;
    this.prev[k] = x;
    this.prev[k + 1] = y;
    this.prev[k + 2] = z;
  }

  /** Gives point `i` a velocity (m/s). */
  setVelocity(i: number, vx: number, vy: number, vz: number): void {
    const k = i * 3;
    this.prev[k] = this.pos[k] - vx * this.dtPrev;
    this.prev[k + 1] = this.pos[k + 1] - vy * this.dtPrev;
    this.prev[k + 2] = this.pos[k + 2] - vz * this.dtPrev;
  }

  /** Adds to point `i`'s velocity (m/s). */
  push(i: number, vx: number, vy: number, vz: number): void {
    const k = i * 3;
    this.prev[k] -= vx * this.dtPrev;
    this.prev[k + 1] -= vy * this.dtPrev;
    this.prev[k + 2] -= vz * this.dtPrev;
  }

  /** Links `a` and `b` at their current distance. */
  link(a: number, b: number, apart = false): void {
    const n = this.linkCount++;
    this.la[n] = a;
    this.lb[n] = b;
    this.apart[n] = apart ? 1 : 0;
    this.rest[n] = this.distance(a, b) * (apart ? 0.55 : 1);
  }

  /** Re-measures every link from the current points (a new pose). */
  relink(): void {
    for (let n = 0; n < this.linkCount; n += 1) {
      this.rest[n] = this.distance(this.la[n], this.lb[n]) * (this.apart[n] ? 0.55 : 1);
    }
  }

  /** Scales every rest length (rope slack). */
  scaleRest(factor: number): void {
    for (let n = 0; n < this.linkCount; n += 1) this.rest[n] *= factor;
  }

  distance(a: number, b: number): number {
    const p = this.pos;
    const dx = p[b * 3] - p[a * 3];
    const dy = p[b * 3 + 1] - p[a * 3 + 1];
    const dz = p[b * 3 + 2] - p[a * 3 + 2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /** Fastest point speed (m/s) over the last step. */
  maxSpeed(): number {
    let best = 0;
    for (let i = 0; i < this.count * 3; i += 3) {
      const dx = this.pos[i] - this.prev[i];
      const dy = this.pos[i + 1] - this.prev[i + 1];
      const dz = this.pos[i + 2] - this.prev[i + 2];
      best = Math.max(best, dx * dx + dy * dy + dz * dz);
    }
    return Math.sqrt(best) / this.dtPrev;
  }

  /**
   * One step: integrate with gravity and damping, satisfy the links and the
   * room in `iterations` passes, then apply friction and bounce at contacts.
   */
  step(dt: number, gravity: number, room: Room, iterations = 4, friction = 0.55, bounce = 0.15, damping = 0.995): void {
    if (dt < 1e-5) return;
    const ratio = dt / this.dtPrev;
    this.dtPrev = dt;
    const p = this.pos;
    const q = this.prev;
    const fall = gravity * dt * dt;
    for (let k = 0; k < this.count * 3; k += 3) {
      const vx = (p[k] - q[k]) * ratio * damping;
      const vy = (p[k + 1] - q[k + 1]) * ratio * damping;
      const vz = (p[k + 2] - q[k + 2]) * ratio * damping;
      q[k] = p[k];
      q[k + 1] = p[k + 1];
      q[k + 2] = p[k + 2];
      p[k] += vx;
      p[k + 1] += vy - fall;
      p[k + 2] += vz;
    }
    this.contact.fill(0);
    for (let it = 0; it < iterations; it += 1) {
      for (let n = 0; n < this.linkCount; n += 1) {
        const a = this.la[n] * 3;
        const b = this.lb[n] * 3;
        const dx = p[b] - p[a];
        const dy = p[b + 1] - p[a + 1];
        const dz = p[b + 2] - p[a + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
        const rest = this.rest[n];
        if (this.apart[n] && dist >= rest) continue;
        const f = ((dist - rest) / dist) * 0.5;
        p[a] += dx * f;
        p[a + 1] += dy * f;
        p[a + 2] += dz * f;
        p[b] -= dx * f;
        p[b + 1] -= dy * f;
        p[b + 2] -= dz * f;
      }
      for (let i = 0; i < this.count; i += 1) {
        if (!room.collideAt(p, i * 3, this.radius[i])) continue;
        this.contact[i] = 1;
        this.contactNormal[i * 3] = room.normal[0];
        this.contactNormal[i * 3 + 1] = room.normal[1];
        this.contactNormal[i * 3 + 2] = room.normal[2];
      }
    }
    // Friction and bounce at contacts, expressed through `prev`.
    this.contacts = 0;
    for (let i = 0; i < this.count; i += 1) {
      if (!this.contact[i]) continue;
      this.contacts += 1;
      const k = i * 3;
      const nx = this.contactNormal[k];
      const ny = this.contactNormal[k + 1];
      const nz = this.contactNormal[k + 2];
      const vx = p[k] - q[k];
      const vy = p[k + 1] - q[k + 1];
      const vz = p[k + 2] - q[k + 2];
      const vn = vx * nx + vy * ny + vz * nz;
      const tx = vx - vn * nx;
      const ty = vy - vn * ny;
      const tz = vz - vn * nz;
      const out = vn < 0 ? -vn * bounce : vn;
      q[k] = p[k] - (tx * (1 - friction) + out * nx);
      q[k + 1] = p[k + 1] - (ty * (1 - friction) + out * ny);
      q[k + 2] = p[k + 2] - (tz * (1 - friction) + out * nz);
    }
  }
}

/** Ragdoll points, in order. */
export const RAG = {
  pelvis: 0,
  chest: 1,
  head: 2,
  shoulderL: 3,
  elbowL: 4,
  handL: 5,
  shoulderR: 6,
  elbowR: 7,
  handR: 8,
  hipL: 9,
  kneeL: 10,
  footL: 11,
  hipR: 12,
  kneeR: 13,
  footR: 14,
} as const;
export const RAG_POINTS = 15;

/** Bones, then braces that keep the torso rigid, then joint limits. */
const BONES: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [1, 6], [6, 7], [7, 8], [0, 9], [9, 10], [10, 11], [0, 12], [12, 13], [13, 14],
];
const BRACES: ReadonlyArray<readonly [number, number]> = [
  [3, 6], [9, 12], [3, 9], [6, 12], [3, 12], [6, 9], [0, 3], [0, 6], [1, 9], [1, 12], [2, 3], [2, 6],
];
/** Elbows and knees can bend, but not fold flat. */
const LIMITS: ReadonlyArray<readonly [number, number]> = [
  [3, 5], [6, 8], [9, 11], [12, 14],
];

/** A humanoid ragdoll body: set its points from a pose, then `relink()`. */
export function createRagdoll(): Verlet {
  const body = new Verlet(RAG_POINTS, BONES.length + BRACES.length + LIMITS.length);
  for (const [a, b] of BONES) body.link(a, b);
  for (const [a, b] of BRACES) body.link(a, b);
  for (const [a, b] of LIMITS) body.link(a, b, true);
  body.radius.fill(0.06);
  body.radius[RAG.head] = 0.09;
  body.radius[RAG.chest] = 0.12;
  body.radius[RAG.pelvis] = 0.1;
  return body;
}

/** A rope of `segments` links (webs): pin the ends, step, read the points. */
export function createRope(segments: number, radius = 0.01): Verlet {
  const body = new Verlet(segments + 1, segments);
  body.radius.fill(radius);
  return body;
}

/** Lays a rope straight from (a) to (b) and links it at `slack` times that length. */
export function layRope(body: Verlet, a: Vec, b: Vec, slack: number): void {
  const n = body.count - 1;
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    body.setPoint(i, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
  }
  if (body.linkCount === 0) for (let i = 0; i < n; i += 1) body.link(i, i + 1);
  else body.relink();
  body.scaleRest(slack);
}
