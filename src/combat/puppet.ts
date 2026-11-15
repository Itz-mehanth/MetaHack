/**
 * Synthetic hands for screen play and the attract reel: a full WebXR joint
 * pose (25 joints with positions, orientations and radii) built from a
 * simple hand shape and a wrist placement. The real gesture code, gauntlets
 * and weapons then work without hand tracking. Pure maths on plain arrays.
 *
 * Hand frame, as in WebXR: -Z runs from the wrist toward the fingertips and
 * +Y out of the back of the hand, so the palm faces -Y. The tables below are
 * a right hand (thumb on -X); a left hand is their mirror image.
 */

export type Vec = [number, number, number];
/** x, y, z, w */
export type Quat = [number, number, number, number];

export interface HandShape {
  /** Index, middle, ring and pinky: 0 straight, 1 curled into a fist. */
  curl: [number, number, number, number];
  /** Thumb: 0 relaxed out to the side, 1 wrapped over the curled fingers. */
  thumb: number;
  /** 0..1: brings the thumb tip onto the index tip. */
  pinch: number;
}

/** Where `writeHand` puts a pose: the same arrays as `HandPose`. */
export interface PoseArrays {
  positions: Float32Array;
  quaternions: Float32Array;
  radii: Float32Array;
}

export const SHAPES = {
  open: { curl: [0, 0, 0, 0], thumb: 0, pinch: 0 },
  /** Loosely curled: reads as neither an open palm nor a tight fist. */
  relaxed: { curl: [0.45, 0.5, 0.55, 0.6], thumb: 0.35, pinch: 0 },
  fist: { curl: [1, 1, 1, 1], thumb: 1, pinch: 0 },
  /** Index and pinky out, middle and ring in: WEAVER's web shooter. */
  web: { curl: [0, 1, 1, 0], thumb: 0.4, pinch: 0 },
  pinch: { curl: [0.35, 0.55, 0.6, 0.65], thumb: 0, pinch: 1 },
  /** A pistol grip with the index finger off the trigger. */
  point: { curl: [0, 1, 1, 1], thumb: 0.8, pinch: 0 },
} satisfies Record<string, HandShape>;

/** Copies `from` into `out` (shapes are reused, never reallocated per frame). */
export function copyShape(out: HandShape, from: HandShape): HandShape {
  for (let i = 0; i < 4; i += 1) out.curl[i] = from.curl[i];
  out.thumb = from.thumb;
  out.pinch = from.pinch;
  return out;
}

/** Moves `out` toward `to` by `t` (0..1). */
export function blendShape(out: HandShape, to: HandShape, t: number): HandShape {
  for (let i = 0; i < 4; i += 1) out.curl[i] += (to.curl[i] - out.curl[i]) * t;
  out.thumb += (to.thumb - out.thumb) * t;
  out.pinch += (to.pinch - out.pinch) * t;
  return out;
}

export function newShape(from: HandShape = SHAPES.relaxed): HandShape {
  return copyShape({ curl: [0, 0, 0, 0], thumb: 0, pinch: 0 }, from);
}

interface Finger {
  meta: Vec;
  prox: Vec;
  /** Proximal, intermediate and distal phalanx lengths. */
  len: Vec;
  /** Spread when open, radians toward the pinky side. */
  splay: number;
}

const FINGERS: readonly Finger[] = [
  { meta: [-0.012, 0.004, -0.022], prox: [-0.024, 0.002, -0.09], len: [0.04, 0.024, 0.022], splay: -0.1 },
  { meta: [0, 0.004, -0.024], prox: [-0.003, 0.003, -0.093], len: [0.045, 0.028, 0.024], splay: -0.02 },
  { meta: [0.012, 0.003, -0.022], prox: [0.016, 0.001, -0.087], len: [0.042, 0.026, 0.023], splay: 0.06 },
  { meta: [0.022, 0, -0.02], prox: [0.034, -0.003, -0.076], len: [0.033, 0.019, 0.02], splay: 0.16 },
];
/** Joint bend at full curl: knuckle, middle joint, last joint. */
const CURL: Vec = [1.45, 1.75, 1.1];
const THUMB_OPEN: readonly Vec[] = [
  [-0.02, -0.01, -0.025],
  [-0.044, -0.017, -0.048],
  [-0.06, -0.02, -0.076],
  [-0.068, -0.021, -0.1],
];
const THUMB_FIST: readonly Vec[] = [
  [-0.02, -0.012, -0.025],
  [-0.04, -0.028, -0.05],
  [-0.03, -0.048, -0.072],
  [-0.01, -0.052, -0.082],
];
/** The thumbnail faces out and up. */
const THUMB_UP: Vec = [-0.55, 0.83, 0];
const RADII = [0.02, 0.015, 0.012, 0.01, 0.009];
for (let f = 0; f < 4; f += 1) RADII.push(0.012, 0.0105, 0.0095, 0.0085, 0.0075);

const JOINTS = 25;
// Scratch: the pose in the canonical right-hand frame, then world output.
const lp = new Float64Array(JOINTS * 3);
const lq = new Float64Array(JOINTS * 4);
const qa: Quat = [0, 0, 0, 1];
const qb: Quat = [0, 0, 0, 1];
const qc: Quat = [0, 0, 0, 1];
const va: Vec = [0, 0, 0];
const vb: Vec = [0, 0, 0];
const vc: Vec = [0, 0, 0];
const vd: Vec = [0, 0, 0];
const pinchTip: Vec = [0, 0, 0];
const pinchMid: Vec = [0, 0, 0];
const thumb: Vec[] = [
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
];

export function qmul(a: Quat, b: Quat, out: Quat): Quat {
  const ax = a[0];
  const ay = a[1];
  const az = a[2];
  const aw = a[3];
  const bx = b[0];
  const by = b[1];
  const bz = b[2];
  const bw = b[3];
  out[0] = aw * bx + ax * bw + ay * bz - az * by;
  out[1] = aw * by - ax * bz + ay * bw + az * bx;
  out[2] = aw * bz + ax * by - ay * bx + az * bw;
  out[3] = aw * bw - ax * bx - ay * by - az * bz;
  return out;
}

/** Rotates `v` by unit quaternion `q`. */
export function qrot(q: Quat, v: Vec, out: Vec): Vec {
  const x = v[0];
  const y = v[1];
  const z = v[2];
  const qx = q[0];
  const qy = q[1];
  const qz = q[2];
  const qw = q[3];
  // t = 2 * cross(q.xyz, v); v' = v + w * t + cross(q.xyz, t)
  const tx = 2 * (qy * z - qz * y);
  const ty = 2 * (qz * x - qx * z);
  const tz = 2 * (qx * y - qy * x);
  out[0] = x + qw * tx + (qy * tz - qz * ty);
  out[1] = y + qw * ty + (qz * tx - qx * tz);
  out[2] = z + qw * tz + (qx * ty - qy * tx);
  return out;
}

function axisAngle(x: number, y: number, z: number, angle: number, out: Quat): Quat {
  const s = Math.sin(angle / 2);
  out[0] = x * s;
  out[1] = y * s;
  out[2] = z * s;
  out[3] = Math.cos(angle / 2);
  return out;
}

/** Quaternion of the rotation whose columns are the unit axes x, y, z. */
export function qFromAxes(x: Vec, y: Vec, z: Vec, out: Quat): Quat {
  const m00 = x[0];
  const m10 = x[1];
  const m20 = x[2];
  const m01 = y[0];
  const m11 = y[1];
  const m21 = y[2];
  const m02 = z[0];
  const m12 = z[1];
  const m22 = z[2];
  const trace = m00 + m11 + m22;
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    out[3] = 0.25 / s;
    out[0] = (m21 - m12) * s;
    out[1] = (m02 - m20) * s;
    out[2] = (m10 - m01) * s;
  } else if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    out[3] = (m21 - m12) / s;
    out[0] = 0.25 * s;
    out[1] = (m01 + m10) / s;
    out[2] = (m02 + m20) / s;
  } else if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    out[3] = (m02 - m20) / s;
    out[0] = (m01 + m10) / s;
    out[1] = 0.25 * s;
    out[2] = (m12 + m21) / s;
  } else {
    const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
    out[3] = (m10 - m01) / s;
    out[0] = (m02 + m20) / s;
    out[1] = (m12 + m21) / s;
    out[2] = 0.25 * s;
  }
  return out;
}

function normalize(v: Vec): Vec {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  v[0] /= l;
  v[1] /= l;
  v[2] /= l;
  return v;
}

function cross(a: Vec, b: Vec, out: Vec): Vec {
  const x = a[1] * b[2] - a[2] * b[1];
  const y = a[2] * b[0] - a[0] * b[2];
  const z = a[0] * b[1] - a[1] * b[0];
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}

/**
 * Hand orientation (WebXR convention) from where the fingers point and the
 * direction out of the palm. Neither needs to be unit or exactly square;
 * the finger direction wins.
 */
export function handFrame(fingers: Vec, palm: Vec, out: Quat): Quat {
  // z = -fingers; y = -palm made perpendicular to z; x = y cross z.
  vc[0] = -fingers[0];
  vc[1] = -fingers[1];
  vc[2] = -fingers[2];
  normalize(vc);
  const d = -palm[0] * vc[0] - palm[1] * vc[1] - palm[2] * vc[2];
  vb[0] = -palm[0] - d * vc[0];
  vb[1] = -palm[1] - d * vc[1];
  vb[2] = -palm[2] - d * vc[2];
  normalize(vb);
  cross(vb, vc, va);
  return qFromAxes(va, vb, vc, out);
}

/** Orientation of a bone pointing along `dir` with its back toward `up`. */
function boneFrame(dir: Vec, up: Vec, out: Quat): Quat {
  vc[0] = -dir[0];
  vc[1] = -dir[1];
  vc[2] = -dir[2];
  normalize(vc);
  cross(up, vc, va);
  normalize(va);
  cross(vc, va, vb);
  return qFromAxes(va, vb, vc, out);
}

function setLocal(j: number, p: Vec, q: Quat): void {
  lp[j * 3] = p[0];
  lp[j * 3 + 1] = p[1];
  lp[j * 3 + 2] = p[2];
  lq[j * 4] = q[0];
  lq[j * 4 + 1] = q[1];
  lq[j * 4 + 2] = q[2];
  lq[j * 4 + 3] = q[3];
}

/** Builds the pose in the canonical right-hand frame (wrist at the origin). */
function buildLocal(shape: HandShape): void {
  setLocal(0, [0, 0, 0], [0, 0, 0, 1]);
  for (let f = 0; f < 4; f += 1) {
    const finger = FINGERS[f];
    const base = 5 + f * 5;
    const c = Math.min(1, Math.max(0, shape.curl[f]));
    // Metacarpal: from its base toward the knuckle.
    const dx = finger.prox[0] - finger.meta[0];
    const dz = finger.prox[2] - finger.meta[2];
    axisAngle(0, 1, 0, -Math.atan2(dx, -dz), qa);
    setLocal(base, finger.meta, qa);
    // Phalanges: splay (narrowing as the hand closes), then the curl.
    const splay = finger.splay * (1 - 0.7 * c);
    axisAngle(0, 1, 0, -splay, qa);
    vd[0] = finger.prox[0];
    vd[1] = finger.prox[1];
    vd[2] = finger.prox[2];
    let bend = 0;
    for (let k = 0; k < 3; k += 1) {
      bend += CURL[k] * c;
      axisAngle(1, 0, 0, -bend, qb);
      qmul(qa, qb, qc);
      setLocal(base + 1 + k, vd, qc);
      vb[0] = 0;
      vb[1] = 0;
      vb[2] = -finger.len[k];
      qrot(qc, vb, va);
      vd[0] += va[0];
      vd[1] += va[1];
      vd[2] += va[2];
    }
    setLocal(base + 4, vd, qc);
  }
  // Thumb: blend the open and wrapped poses, then pull the tip to the index tip.
  const t = Math.min(1, Math.max(0, shape.thumb));
  const pinch = Math.min(1, Math.max(0, shape.pinch));
  for (let j = 0; j < 4; j += 1) {
    for (let k = 0; k < 3; k += 1) thumb[j][k] = THUMB_OPEN[j][k] + (THUMB_FIST[j][k] - THUMB_OPEN[j][k]) * t;
  }
  if (pinch > 0) {
    // Tip just beside the index tip; the last joint bows out between them.
    pinchTip[0] = lp[9 * 3] - 0.002;
    pinchTip[1] = lp[9 * 3 + 1] - 0.012;
    pinchTip[2] = lp[9 * 3 + 2] + 0.002;
    const prox = thumb[1];
    pinchMid[0] = (prox[0] + pinchTip[0]) / 2 - 0.012;
    pinchMid[1] = (prox[1] + pinchTip[1]) / 2 - 0.004;
    pinchMid[2] = (prox[2] + pinchTip[2]) / 2;
    for (let k = 0; k < 3; k += 1) {
      thumb[2][k] += (pinchMid[k] - thumb[2][k]) * pinch;
      thumb[3][k] += (pinchTip[k] - thumb[3][k]) * pinch;
    }
  }
  for (let j = 0; j < 3; j += 1) {
    vd[0] = thumb[j + 1][0] - thumb[j][0];
    vd[1] = thumb[j + 1][1] - thumb[j][1];
    vd[2] = thumb[j + 1][2] - thumb[j][2];
    boneFrame(vd, THUMB_UP, qa);
    setLocal(1 + j, thumb[j], qa);
  }
  setLocal(4, thumb[3], qa);
}

/**
 * Writes a full joint pose for one hand into `out`. `orientation` is the
 * hand frame in world space (see `handFrame`); a left hand is mirrored
 * across its own YZ plane, so the same frame means the same gesture.
 */
export function writeHand(out: PoseArrays, left: boolean, wrist: Vec, orientation: Quat, shape: HandShape): void {
  buildLocal(shape);
  const m = left ? -1 : 1;
  for (let j = 0; j < JOINTS; j += 1) {
    va[0] = lp[j * 3] * m;
    va[1] = lp[j * 3 + 1];
    va[2] = lp[j * 3 + 2];
    qrot(orientation, va, vb);
    out.positions[j * 3] = wrist[0] + vb[0];
    out.positions[j * 3 + 1] = wrist[1] + vb[1];
    out.positions[j * 3 + 2] = wrist[2] + vb[2];
    // Mirroring a rotation across x = 0 flips the y and z of its quaternion.
    qa[0] = lq[j * 4];
    qa[1] = lq[j * 4 + 1] * m;
    qa[2] = lq[j * 4 + 2] * m;
    qa[3] = lq[j * 4 + 3];
    qmul(orientation, qa, qb);
    out.quaternions[j * 4] = qb[0];
    out.quaternions[j * 4 + 1] = qb[1];
    out.quaternions[j * 4 + 2] = qb[2];
    out.quaternions[j * 4 + 3] = qb[3];
    out.radii[j] = RADII[j];
  }
}

/** Joint `j`'s position in the hand's own frame for `shape` (mirrored for a left hand). */
export function handJoint(j: number, shape: HandShape, left: boolean, out: Vec): Vec {
  buildLocal(shape);
  out[0] = lp[j * 3] * (left ? -1 : 1);
  out[1] = lp[j * 3 + 1];
  out[2] = lp[j * 3 + 2];
  return out;
}

/**
 * A point of the hand in its own frame for `shape`, mirrored for a left
 * hand: the pinch point (thumb tip and index tip midway), the palm point the
 * gauntlet aims from, or the grip a held weapon sits in.
 */
export function handPoint(kind: 'pinch' | 'palm' | 'grip', shape: HandShape, left: boolean, out: Vec): Vec {
  buildLocal(shape);
  for (let k = 0; k < 3; k += 1) {
    if (kind === 'pinch') out[k] = (lp[4 * 3 + k] + lp[9 * 3 + k]) / 2;
    else {
      // Palm: halfway from the wrist to the middle knuckle, just off the palm.
      const palm = lp[11 * 3 + k] / 2 + (k === 1 ? -0.022 : 0);
      if (kind === 'palm') out[k] = palm;
      else out[k] = ((lp[7 * 3 + k] + lp[22 * 3 + k] + lp[12 * 3 + k] + lp[17 * 3 + k]) / 4) * 0.65 + palm * 0.35;
    }
  }
  if (left) out[0] = -out[0];
  return out;
}
