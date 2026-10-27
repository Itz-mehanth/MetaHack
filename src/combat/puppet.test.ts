import { describe, expect, it } from 'vitest';
import { type HandJoints, fingerExtension, isBlastPose, isFist, isOpenPalm, isSigilPose, isWebPose, palmNormal } from './gestures.js';
import { type HandShape, type Quat, type Vec, handFrame, handPoint, qrot, SHAPES, writeHand } from './puppet.js';

function pose() {
  return { positions: new Float32Array(75), quaternions: new Float32Array(100), radii: new Float32Array(25) };
}

function at(p: ReturnType<typeof pose>, j: number): Vec {
  return [p.positions[j * 3], p.positions[j * 3 + 1], p.positions[j * 3 + 2]];
}

function joints(p: ReturnType<typeof pose>): HandJoints {
  return {
    wrist: at(p, 0),
    thumbTip: at(p, 4),
    indexMeta: at(p, 5),
    pinkyMeta: at(p, 20),
    knuckles: [at(p, 6), at(p, 11), at(p, 16), at(p, 21)],
    tips: [at(p, 9), at(p, 14), at(p, 19), at(p, 24)],
  };
}

const dist = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** A few hand placements: palm down, palm forward (blast), thumb up, tilted. */
const FRAMES: Array<[Vec, Vec]> = [
  [[0, 0, -1], [0, -1, 0]],
  [[0, 1, 0], [0, 0, -1]],
  [[0, 0.3, -1], [-1, 0, 0]],
  [[0.4, 0.5, -0.7], [0.3, -0.8, 0.2]],
];

function build(left: boolean, shape: HandShape, frame: [Vec, Vec], wrist: Vec = [0.2, 1.3, -0.4]) {
  const p = pose();
  const q: Quat = [0, 0, 0, 1];
  handFrame(frame[0], frame[1], q);
  writeHand(p, left, wrist, q, shape);
  return { p, q, j: joints(p) };
}

describe('puppet hands', () => {
  for (const left of [false, true]) {
    const side = left ? 'left' : 'right';
    it(`${side}: shapes read as the right gestures in any orientation`, () => {
      for (const frame of FRAMES) {
        expect(isOpenPalm(build(left, SHAPES.open, frame).j)).toBe(true);
        expect(isFist(build(left, SHAPES.open, frame).j)).toBe(false);
        expect(isFist(build(left, SHAPES.fist, frame).j)).toBe(true);
        expect(isOpenPalm(build(left, SHAPES.fist, frame).j)).toBe(false);
        expect(isWebPose(build(left, SHAPES.web, frame).j)).toBe(true);
        expect(isSigilPose(build(left, SHAPES.sigil, frame).j)).toBe(true);
        expect(isSigilPose(build(left, SHAPES.web, frame).j)).toBe(false);
        expect(isSigilPose(build(left, SHAPES.open, frame).j)).toBe(false);
        const relaxed = build(left, SHAPES.relaxed, frame).j;
        expect(isOpenPalm(relaxed)).toBe(false);
        expect(isFist(relaxed)).toBe(false);
        // Pistol grip: index straight (armed), middle and ring stay closed.
        const e = fingerExtension(build(left, SHAPES.point, frame).j);
        expect(e[0]).toBeGreaterThan(1.6);
        expect(e[1]).toBeLessThan(1.4);
        expect(e[2]).toBeLessThan(1.4);
      }
    });

    it(`${side}: the palm faces -Y of the hand frame`, () => {
      for (const frame of FRAMES) {
        const { q, j } = build(left, SHAPES.open, frame);
        const n = palmNormal(j, side);
        const down = qrot(q, [0, -1, 0], [0, 0, 0]);
        expect(n[0] * down[0] + n[1] * down[1] + n[2] * down[2]).toBeGreaterThan(0.95);
      }
    });

    it(`${side}: a pinch closes and opens past the draw thresholds`, () => {
      const closed = build(left, SHAPES.pinch, FRAMES[0]).j;
      expect(dist(closed.thumbTip, closed.tips[0])).toBeLessThan(0.03);
      const open = build(left, { curl: [0.35, 0.55, 0.6, 0.65], thumb: 0, pinch: 0 }, FRAMES[0]).j;
      expect(dist(open.thumbTip, open.tips[0])).toBeGreaterThan(0.065);
    });

    it(`${side}: bones point from each joint toward the next`, () => {
      const { p } = build(left, SHAPES.relaxed, FRAMES[3]);
      for (const [from, to] of [[6, 7], [7, 8], [8, 9], [11, 12], [21, 22], [2, 3], [3, 4]]) {
        const q: Quat = [p.quaternions[from * 4], p.quaternions[from * 4 + 1], p.quaternions[from * 4 + 2], p.quaternions[from * 4 + 3]];
        expect(Math.hypot(...q)).toBeCloseTo(1, 4);
        const bone = qrot(q, [0, 0, -1], [0, 0, 0]);
        const a = at(p, from);
        const b = at(p, to);
        const d = dist(a, b);
        const dot = (bone[0] * (b[0] - a[0]) + bone[1] * (b[1] - a[1]) + bone[2] * (b[2] - a[2])) / d;
        expect(dot).toBeGreaterThan(0.99);
      }
    });

    it(`${side}: handPoint matches the written pose`, () => {
      const { p } = build(left, SHAPES.pinch, [[0, 0, -1], [0, -1, 0]], [0, 0, 0]);
      const local = handPoint('pinch', SHAPES.pinch, left, [0, 0, 0]);
      const mid: Vec = [0, 1, 2].map((k) => (p.positions[4 * 3 + k] + p.positions[9 * 3 + k]) / 2) as Vec;
      expect(dist(local, mid)).toBeLessThan(1e-6);
    });
  }

  it('an open palm held out and facing away is the blast pose', () => {
    const head: Vec = [0, 1.6, 0];
    const out = build(false, SHAPES.open, [[0, 1, 0], [0, 0, -1]], [0.2, 1.4, -0.42]).j;
    expect(isBlastPose(out, 'right', head)).toBe(true);
    const back = build(false, SHAPES.open, [[0, 1, 0], [0, 0, 1]], [0.2, 1.4, -0.42]).j;
    expect(isBlastPose(back, 'right', head)).toBe(false);
  });
});
