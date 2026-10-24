import { describe, expect, it } from 'vitest';
import { level1 } from '../puzzles/level1.js';
import type { Quat, Vec3 } from '../puzzles/types.js';
import { angleBetween, boxSymmetries, fromAxisAngle, IDENTITY } from './math.js';
import { validatePlacement } from './placement.js';
import { PuzzleProgress } from './progress.js';

const at = (position: Vec3, rotation: Quat = IDENTITY) => ({ position, rotation });

function withPillars(): PuzzleProgress {
  const progress = new PuzzleProgress(level1);
  progress.place('pillar-a', 'pillar-left', 0);
  progress.place('pillar-b', 'pillar-right', 0);
  return progress;
}

describe('boxSymmetries', () => {
  it('counts symmetries by shape', () => {
    expect(boxSymmetries([1, 1, 1])).toHaveLength(23);
    expect(boxSymmetries([0.05, 0.18, 0.05])).toHaveLength(7);
    expect(boxSymmetries([0.24, 0.05, 0.06])).toHaveLength(3);
  });
});

describe('validatePlacement', () => {
  it('accepts an exact placement into the nearest matching slot', () => {
    const progress = new PuzzleProgress(level1);
    const result = validatePlacement(level1, progress, 'pillar-a', at([0.08, 0.09, 0]));
    expect(result).toMatchObject({ ok: true, slotId: 'pillar-right' });
  });

  it('accepts within tolerance and snaps to the exact slot pose', () => {
    const progress = new PuzzleProgress(level1);
    const tilt = fromAxisAngle([1, 0, 0], 20);
    const result = validatePlacement(level1, progress, 'pillar-a', at([-0.06, 0.1, 0.02], tilt));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.slotId).toBe('pillar-left');
      expect(result.snapPose.position).toEqual([-0.08, 0.09, 0]);
      expect(angleBetween(result.snapPose.rotation, IDENTITY)).toBeLessThan(1e-4);
    }
  });

  it('rejects a placement beyond the position tolerance', () => {
    const progress = new PuzzleProgress(level1);
    const result = validatePlacement(level1, progress, 'pillar-a', at([-0.08, 0.09, 0.05]));
    expect(result).toMatchObject({ ok: false, reason: 'too-far', slotId: 'pillar-left' });
  });

  it('rejects a wrong rotation', () => {
    const progress = new PuzzleProgress(level1);
    const lying = fromAxisAngle([0, 0, 1], 90);
    expect(validatePlacement(level1, progress, 'pillar-a', at([-0.08, 0.09, 0], lying))).toMatchObject({
      ok: false,
      reason: 'wrong-rotation',
    });
  });

  it('accepts symmetric rotations and snaps to the nearest equivalent', () => {
    const progress = withPillars();
    const flipped = fromAxisAngle([0, 1, 0], 175);
    const result = validatePlacement(level1, progress, 'lintel', at([0, 0.205, 0], flipped));
    expect(result.ok).toBe(true);
    if (result.ok) expect(angleBetween(result.snapPose.rotation, flipped)).toBeCloseTo(5, 3);
    const quarter = fromAxisAngle([0, 1, 0], 90);
    expect(validatePlacement(level1, progress, 'lintel', at([0, 0.205, 0], quarter))).toMatchObject({
      ok: false,
      reason: 'wrong-rotation',
    });
  });

  it('rejects slots whose supports are not placed yet', () => {
    const progress = new PuzzleProgress(level1);
    progress.place('pillar-a', 'pillar-left', 0);
    expect(validatePlacement(level1, progress, 'lintel', at([0, 0.205, 0]))).toMatchObject({
      ok: false,
      reason: 'locked',
      slotId: 'lintel',
    });
  });

  it('never targets an occupied slot', () => {
    const progress = new PuzzleProgress(level1);
    progress.place('pillar-a', 'pillar-left', 0);
    expect(validatePlacement(level1, progress, 'pillar-b', at([-0.08, 0.09, 0]))).toMatchObject({
      ok: false,
      reason: 'too-far',
      slotId: 'pillar-right',
    });
    expect(validatePlacement(level1, progress, 'pillar-a', at([0.08, 0.09, 0]))).toMatchObject({
      ok: false,
      reason: 'already-placed',
    });
  });

  it('accepts any capstone rotation and settles it upright', () => {
    const progress = withPillars();
    progress.place('lintel', 'lintel', 0);
    const odd = fromAxisAngle([1, 1, 0], 40);
    const result = validatePlacement(level1, progress, 'capstone', at([0, 0.27, 0.01], odd));
    expect(result.ok).toBe(true);
    if (result.ok) {
      const rotation = result.snapPose.rotation;
      const upright = [IDENTITY, ...boxSymmetries([1, 1, 1])].some((q) => angleBetween(rotation, q) < 1e-4);
      expect(upright).toBe(true);
    }
  });
});
