/**
 * Where the menu stands in the room. The panel and its 3D props (hero carousel,
 * war map, galaxy, armory) are measured from one "rig": an origin point and the
 * way it faces. The rig is set once when a menu opens fresh and then stays put, so
 * a button press or a change of screen never moves it (before, every screen was
 * placed again from wherever the head happened to be). The player can pinch a
 * handle and drag the whole menu anywhere, and the spot they choose is remembered.
 *
 * Pure (plain numbers, no Three.js) so it is unit-tested.
 */

/** Where the menu's reference point sits in front of the head by default (m). It is the middle of the panel's range of distances. */
export const RIG_REF = 0.55;
/** Closest and farthest the reference point may be from the head (m). */
export const RIG_MIN_REACH = 0.3;
export const RIG_MAX_REACH = 2.2;
/** Lowest and highest the reference point may be above the floor (m). */
export const RIG_MIN_Y = 0.7;
export const RIG_MAX_Y = 2.2;
/** Farther than this from the menu (m) and it counts as left behind: it comes to the player. */
export const RIG_LOST = 2.8;
/** The side and height a remembered spot may be at, relative to the head (m). */
const SIDE_MAX = 1.2;
const UP_MAX = 0.8;

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

/** A heading on the floor plane (need not be unit length). */
export interface Heading {
  x: number;
  z: number;
}

/** The menu's origin (what the panel and props are measured from) and the way it faces. */
export interface MenuRig {
  x: number;
  y: number;
  z: number;
  /** Unit heading from the player toward the menu. */
  dx: number;
  dz: number;
}

/** The spot a player likes their menu at, relative to their head and gaze. */
export interface RigPrefs {
  /** Distance of the reference point in front of the head (m). */
  forward: number;
  /** Metres to the right of the gaze (negative: left). */
  side: number;
  /** Metres above the head (negative: below). */
  up: number;
  /** The "pinch and drag" hint has been shown. */
  hinted: boolean;
}

export const DEFAULT_PREFS: Readonly<RigPrefs> = { forward: RIG_REF, side: 0, up: 0, hinted: false };

export function newRig(): MenuRig {
  return { x: 0, y: 1.5, z: 0, dx: 0, dz: -1 };
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

// Scratch points: these run every frame during a drag, so they allocate nothing.
const refA: Point3 = { x: 0, y: 0, z: 0 };
const refB: Point3 = { x: 0, y: 0, z: 0 };
const refC: Point3 = { x: 0, y: 0, z: 0 };

/** Saved preferences from storage (or anything else): numbers in range, else the defaults. */
export function sanitizePrefs(raw: unknown): RigPrefs {
  if (raw == null || typeof raw !== 'object') return { ...DEFAULT_PREFS };
  const r = raw as Partial<Record<keyof RigPrefs, unknown>>;
  const num = (v: unknown, fallback: number, lo: number, hi: number): number => (typeof v === 'number' && Number.isFinite(v) ? clamp(v, lo, hi) : fallback);
  return {
    forward: num(r.forward, DEFAULT_PREFS.forward, RIG_MIN_REACH, RIG_MAX_REACH),
    side: num(r.side, 0, -SIDE_MAX, SIDE_MAX),
    up: num(r.up, 0, -UP_MAX, UP_MAX),
    hinted: r.hinted === true,
  };
}

/** The reference point: the middle of the panel's range, on the line the menu faces. */
export function referenceOf(rig: MenuRig, out: Point3): Point3 {
  out.x = rig.x + rig.dx * RIG_REF;
  out.y = rig.y;
  out.z = rig.z + rig.dz * RIG_REF;
  return out;
}

/**
 * Puts the menu's reference point at `ref` (kept within reach and height) and
 * turns it to face `head`. If `ref` is straight above or below the head there is no
 * heading to take, so (`fallbackX`, `fallbackZ`) is used.
 */
export function placeRig(ref: Point3, head: Point3, fallbackX: number, fallbackZ: number, out: MenuRig): MenuRig {
  let vx = ref.x - head.x;
  let vz = ref.z - head.z;
  let reach = Math.hypot(vx, vz);
  if (reach < 1e-3) {
    const length = Math.hypot(fallbackX, fallbackZ);
    vx = length < 1e-4 ? 0 : fallbackX / length;
    vz = length < 1e-4 ? -1 : fallbackZ / length;
    reach = RIG_MIN_REACH;
  } else {
    vx /= reach;
    vz /= reach;
  }
  reach = clamp(reach, RIG_MIN_REACH, RIG_MAX_REACH);
  out.dx = vx;
  out.dz = vz;
  out.x = head.x + vx * (reach - RIG_REF);
  out.z = head.z + vz * (reach - RIG_REF);
  out.y = clamp(ref.y, RIG_MIN_Y, RIG_MAX_Y);
  return out;
}

/** A menu that has just opened (or been brought back): where the player likes it, in front of them. */
export function freshRig(head: Point3, forward: Heading, prefs: RigPrefs, out: MenuRig): MenuRig {
  let fx = forward.x;
  let fz = forward.z;
  const length = Math.hypot(fx, fz);
  if (length < 1e-4) {
    fx = 0;
    fz = -1;
  } else {
    fx /= length;
    fz /= length;
  }
  // Right of the gaze on the floor plane.
  const rx = -fz;
  const rz = fx;
  refA.x = head.x + fx * prefs.forward + rx * prefs.side;
  refA.y = head.y + prefs.up;
  refA.z = head.z + fz * prefs.forward + rz * prefs.side;
  return placeRig(refA, head, fx, fz, out);
}

/** The menu as it was when a grab started, moved by how far the hand has moved since. */
export function dragRig(start: MenuRig, handStart: Point3, hand: Point3, head: Point3, out: MenuRig): MenuRig {
  const ref = referenceOf(start, refA);
  ref.x += hand.x - handStart.x;
  ref.y += hand.y - handStart.y;
  ref.z += hand.z - handStart.z;
  return placeRig(ref, head, start.dx, start.dz, out);
}

/** The preference a rig stands for, in the frame of the player's head and gaze (what gets remembered when a drag ends). */
export function prefsFrom(rig: MenuRig, head: Point3, forward: Heading, hinted: boolean): RigPrefs {
  let fx = forward.x;
  let fz = forward.z;
  const length = Math.hypot(fx, fz);
  if (length < 1e-4) {
    fx = 0;
    fz = -1;
  } else {
    fx /= length;
    fz /= length;
  }
  const ref = referenceOf(rig, refA);
  const vx = ref.x - head.x;
  const vz = ref.z - head.z;
  return {
    forward: clamp(vx * fx + vz * fz, RIG_MIN_REACH, RIG_MAX_REACH),
    side: clamp(vx * -fz + vz * fx, -SIDE_MAX, SIDE_MAX),
    up: clamp(ref.y - head.y, -UP_MAX, UP_MAX),
    hinted,
  };
}

/** True when the player has walked too far from the menu to reach it. */
export function isLost(rig: MenuRig, head: Point3): boolean {
  const ref = referenceOf(rig, refA);
  return Math.hypot(ref.x - head.x, ref.z - head.z) > RIG_LOST;
}

/** `t` (0 to 1) of the way from `from` to `to`, sliding the reference point and turning with it. */
export function glideRig(from: MenuRig, to: MenuRig, t: number, head: Point3, out: MenuRig): MenuRig {
  const a = referenceOf(from, refA);
  const b = referenceOf(to, refB);
  const k = clamp(t, 0, 1);
  refC.x = a.x + (b.x - a.x) * k;
  refC.y = a.y + (b.y - a.y) * k;
  refC.z = a.z + (b.z - a.z) * k;
  return placeRig(refC, head, to.dx, to.dz, out);
}

export function copyRig(to: MenuRig, from: MenuRig): MenuRig {
  to.x = from.x;
  to.y = from.y;
  to.z = from.z;
  to.dx = from.dx;
  to.dz = from.dz;
  return to;
}

/** How far apart two rigs' reference points are (m). */
export function rigGap(a: MenuRig, b: MenuRig): number {
  const p = referenceOf(a, refA);
  const q = referenceOf(b, refB);
  return Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
}
