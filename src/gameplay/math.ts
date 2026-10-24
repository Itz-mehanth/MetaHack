import type { Quat, Vec3 } from '../puzzles/types.js';

/** Minimal pure vector/quaternion helpers; quaternions are [x, y, z, w]. */

export const IDENTITY: Quat = [0, 0, 0, 1];

export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function multiply(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

export function fromAxisAngle(axis: Vec3, degrees: number): Quat {
  const half = (degrees * Math.PI) / 360;
  const length = Math.hypot(axis[0], axis[1], axis[2]);
  const s = Math.sin(half) / length;
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(half)];
}

/** Smallest rotation angle (degrees) between two orientations. */
export function angleBetween(a: Quat, b: Quat): number {
  const dot = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return (2 * Math.acos(Math.min(1, dot)) * 180) / Math.PI;
}

/** Quaternion of an orthonormal rotation matrix given as rows. */
function fromMatrix(m: number[][]): Quat {
  const trace = m[0][0] + m[1][1] + m[2][2];
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    return [(m[2][1] - m[1][2]) * s, (m[0][2] - m[2][0]) * s, (m[1][0] - m[0][1]) * s, 0.25 / s];
  }
  if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) {
    const s = 2 * Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]);
    return [0.25 * s, (m[0][1] + m[1][0]) / s, (m[0][2] + m[2][0]) / s, (m[2][1] - m[1][2]) / s];
  }
  if (m[1][1] > m[2][2]) {
    const s = 2 * Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]);
    return [(m[0][1] + m[1][0]) / s, 0.25 * s, (m[1][2] + m[2][1]) / s, (m[0][2] - m[2][0]) / s];
  }
  const s = 2 * Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]);
  return [(m[0][2] + m[2][0]) / s, (m[1][2] + m[2][1]) / s, 0.25 * s, (m[1][0] - m[0][1]) / s];
}

const PERMUTATIONS = [
  [0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0],
];

/**
 * Non-identity rotations that map an axis-aligned box of the given extents
 * onto itself: the subset of the 24 cube rotations that only swap equal
 * extents. A cube yields 23, a square prism 7, a plain box 3.
 */
export function boxSymmetries(extents: Vec3, epsilon = 1e-6): Quat[] {
  const result: Quat[] = [];
  for (const p of PERMUTATIONS) {
    for (let signs = 0; signs < 8; signs += 1) {
      const m = [0, 1, 2].map((row) =>
        [0, 1, 2].map((col) =>
          col === p[row] ? ((signs >> row) & 1 ? -1 : 1) : 0,
        ),
      );
      const det =
        m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
        m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
        m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
      const identity = p[0] === 0 && p[1] === 1 && p[2] === 2 && signs === 0;
      const preserves = [0, 1, 2].every(
        (row) => Math.abs(extents[row] - extents[p[row]]) < epsilon,
      );
      if (det > 0 && !identity && preserves) {
        result.push(fromMatrix(m));
      }
    }
  }
  return result;
}
