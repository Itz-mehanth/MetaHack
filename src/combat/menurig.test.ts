import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFS,
  dragRig,
  freshRig,
  glideRig,
  isLost,
  newRig,
  placeRig,
  prefsFrom,
  referenceOf,
  RIG_LOST,
  RIG_MAX_REACH,
  RIG_MAX_Y,
  RIG_MIN_REACH,
  RIG_MIN_Y,
  RIG_REF,
  rigGap,
  sanitizePrefs,
} from './menurig.js';

const head = { x: 1, y: 1.6, z: 2 };
const ahead = { x: 0, z: -1 };

describe('fresh menu', () => {
  it('opens at the head, facing where the player looks, as menus always did', () => {
    const rig = freshRig(head, ahead, DEFAULT_PREFS, newRig());
    expect(rig.x).toBeCloseTo(head.x);
    expect(rig.z).toBeCloseTo(head.z);
    expect(rig.y).toBeCloseTo(head.y);
    expect(rig.dx).toBeCloseTo(0);
    expect(rig.dz).toBeCloseTo(-1);
  });

  it('ignores up and down in the gaze, and copes with looking straight up', () => {
    const tilted = freshRig(head, { x: 3, z: 0 }, DEFAULT_PREFS, newRig());
    expect(tilted.dx).toBeCloseTo(1);
    const up = freshRig(head, { x: 0, z: 0 }, DEFAULT_PREFS, newRig());
    expect(Math.hypot(up.dx, up.dz)).toBeCloseTo(1);
  });

  it('puts the menu where the player left it, relative to their gaze', () => {
    const prefs = { forward: 0.9, side: -0.4, up: -0.2, hinted: true };
    const rig = freshRig(head, ahead, prefs, newRig());
    const ref = referenceOf(rig, { x: 0, y: 0, z: 0 });
    expect(ref.x).toBeCloseTo(head.x - 0.4);
    expect(ref.z).toBeCloseTo(head.z - 0.9);
    expect(ref.y).toBeCloseTo(head.y - 0.2);
    // And it faces the player from there.
    const turned = freshRig(head, { x: 1, z: 0 }, prefs, newRig());
    const ref2 = referenceOf(turned, { x: 0, y: 0, z: 0 });
    expect(ref2.x).toBeCloseTo(head.x + 0.9);
    expect(ref2.z).toBeCloseTo(head.z - 0.4);
  });
});

describe('dragging', () => {
  const start = freshRig(head, ahead, DEFAULT_PREFS, newRig());
  const grab = { x: 0, y: 1.2, z: 0 };

  it('moves the menu by exactly how far the hand moved', () => {
    const out = dragRig(start, grab, { x: 0.1, y: 1.3, z: -0.2 }, head, newRig());
    const from = referenceOf(start, { x: 0, y: 0, z: 0 });
    const to = referenceOf(out, { x: 0, y: 0, z: 0 });
    expect(to.x - from.x).toBeCloseTo(0.1);
    expect(to.y - from.y).toBeCloseTo(0.1);
    expect(to.z - from.z).toBeCloseTo(-0.2);
  });

  it('is a no-op when the hand has not moved', () => {
    const out = dragRig(start, grab, grab, head, newRig());
    expect(rigGap(out, start)).toBeCloseTo(0);
    expect(out.dz).toBeCloseTo(-1);
  });

  it('keeps facing the player as it is dragged round to the side', () => {
    const out = dragRig(start, grab, { x: -0.55, y: 1.2, z: 0.55 }, head, newRig());
    const ref = referenceOf(out, { x: 0, y: 0, z: 0 });
    // The heading points from the head at the reference point.
    const vx = ref.x - head.x;
    const vz = ref.z - head.z;
    const length = Math.hypot(vx, vz);
    expect(out.dx).toBeCloseTo(vx / length);
    expect(out.dz).toBeCloseTo(vz / length);
    expect(out.dx).toBeLessThan(-0.9);
  });

  it('cannot be pushed out of reach, through the head, or off the top or bottom', () => {
    const far = dragRig(start, grab, { x: 0, y: 1.2, z: -9 }, head, newRig());
    const farRef = referenceOf(far, { x: 0, y: 0, z: 0 });
    expect(Math.hypot(farRef.x - head.x, farRef.z - head.z)).toBeCloseTo(RIG_MAX_REACH);
    const near = dragRig(start, grab, { x: 0, y: 1.2, z: 0.45 }, head, newRig());
    const nearRef = referenceOf(near, { x: 0, y: 0, z: 0 });
    expect(Math.hypot(nearRef.x - head.x, nearRef.z - head.z)).toBeGreaterThanOrEqual(RIG_MIN_REACH - 1e-6);
    expect(dragRig(start, grab, { x: 0, y: 9, z: 0 }, head, newRig()).y).toBe(RIG_MAX_Y);
    expect(dragRig(start, grab, { x: 0, y: -9, z: 0 }, head, newRig()).y).toBe(RIG_MIN_Y);
  });

  it('holds a heading when the reference point ends up exactly over the head', () => {
    const out = placeRig({ x: head.x, y: 1.5, z: head.z }, head, 1, 0, newRig());
    expect(out.dx).toBeCloseTo(1);
    expect(Math.hypot(out.dx, out.dz)).toBeCloseTo(1);
    expect(Number.isFinite(out.x) && Number.isFinite(out.z)).toBe(true);
  });
});

describe('remembering the spot', () => {
  it('turns a dragged rig back into the same spot next time, wherever the player stands', () => {
    const dragged = dragRig(freshRig(head, ahead, DEFAULT_PREFS, newRig()), { x: 0, y: 1, z: 0 }, { x: 0.5, y: 1.2, z: -0.3 }, head, newRig());
    const prefs = prefsFrom(dragged, head, ahead, true);
    // Same head and gaze: the very same place.
    const again = freshRig(head, ahead, prefs, newRig());
    expect(rigGap(again, dragged)).toBeLessThan(1e-6);
    // A different head and gaze: the same place relative to them.
    const other = { x: -3, y: 1.4, z: 0.5 };
    const there = freshRig(other, { x: 1, z: 0 }, prefs, newRig());
    const fresh = referenceOf(there, { x: 0, y: 0, z: 0 });
    expect(fresh.x - other.x).toBeCloseTo(prefs.forward, 5);
    expect(fresh.y - other.y).toBeCloseTo(prefs.up, 5);
  });

  it('cleans up anything that comes out of storage', () => {
    expect(sanitizePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(sanitizePrefs('x')).toEqual(DEFAULT_PREFS);
    expect(sanitizePrefs({ forward: 'far', side: NaN, up: Infinity, hinted: 'yes' })).toEqual(DEFAULT_PREFS);
    const wild = sanitizePrefs({ forward: 99, side: -99, up: 99, hinted: true });
    expect(wild).toEqual({ forward: RIG_MAX_REACH, side: -1.2, up: 0.8, hinted: true });
  });
});

describe('a menu left behind', () => {
  it('is lost beyond reach and found again when the player comes back', () => {
    const rig = freshRig(head, ahead, DEFAULT_PREFS, newRig());
    expect(isLost(rig, head)).toBe(false);
    expect(isLost(rig, { x: head.x + RIG_LOST + RIG_REF + 0.2, y: 1.6, z: head.z })).toBe(true);
    expect(isLost(rig, { x: head.x + 1.5, y: 1.6, z: head.z })).toBe(false);
  });

  it('glides from one place to another and lands exactly', () => {
    const a = freshRig(head, ahead, DEFAULT_PREFS, newRig());
    const b = freshRig(head, { x: 1, z: 0 }, DEFAULT_PREFS, newRig());
    expect(rigGap(glideRig(a, b, 0, head, newRig()), a)).toBeLessThan(1e-9);
    expect(rigGap(glideRig(a, b, 1, head, newRig()), b)).toBeLessThan(1e-9);
    const mid = glideRig(a, b, 0.5, head, newRig());
    expect(rigGap(mid, a)).toBeGreaterThan(0.01);
    expect(rigGap(mid, b)).toBeGreaterThan(0.01);
  });
});
