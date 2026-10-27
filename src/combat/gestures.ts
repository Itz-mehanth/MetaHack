export type Vec3 = readonly [number, number, number];

/**
 * Pure hand-pose classification from WebXR joint positions (metres, any
 * consistent space). Ratios rather than absolute distances keep it working
 * across hand sizes.
 */

export interface HandJoints {
  wrist: Vec3;
  thumbTip: Vec3;
  indexMeta: Vec3;
  pinkyMeta: Vec3;
  /** Proximal knuckle and tip for index, middle, ring, pinky. */
  knuckles: readonly [Vec3, Vec3, Vec3, Vec3];
  tips: readonly [Vec3, Vec3, Vec3, Vec3];
}

const sub = (a: Vec3, b: Vec3): [number, number, number] => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (v: Vec3) => Math.hypot(v[0], v[1], v[2]);
const dist = (a: Vec3, b: Vec3) => len(sub(a, b));

/**
 * How straight each finger is: tip-to-wrist over knuckle-to-wrist. Roughly
 * 1.9+ when extended, under 1.4 when curled into a fist.
 */
export function fingerExtension(hand: HandJoints): [number, number, number, number] {
  const out: [number, number, number, number] = [0, 0, 0, 0];
  for (let i = 0; i < 4; i += 1) {
    out[i] = dist(hand.tips[i], hand.wrist) / Math.max(1e-4, dist(hand.knuckles[i], hand.wrist));
  }
  return out;
}

/** Unit vector out of the palm. */
export function palmNormal(hand: HandJoints, handedness: 'left' | 'right'): [number, number, number] {
  const a = sub(hand.indexMeta, hand.wrist);
  const b = sub(hand.pinkyMeta, hand.wrist);
  const sign = handedness === 'right' ? 1 : -1;
  const n: [number, number, number] = [
    sign * (a[1] * b[2] - a[2] * b[1]),
    sign * (a[2] * b[0] - a[0] * b[2]),
    sign * (a[0] * b[1] - a[1] * b[0]),
  ];
  const l = Math.max(1e-6, len(n));
  return [n[0] / l, n[1] / l, n[2] / l];
}

/** Centre of the palm: midway between wrist and the middle knuckle. */
export function palmCenter(hand: HandJoints): [number, number, number] {
  const k = hand.knuckles[1];
  return [(hand.wrist[0] + k[0]) / 2, (hand.wrist[1] + k[1]) / 2, (hand.wrist[2] + k[2]) / 2];
}

export const OPEN_RATIO = 1.65;
export const FIST_RATIO = 1.4;

/**
 * Live thresholds, adjustable in Settings because hand sizes and tracking
 * vary: finger ratios for a fist and an open palm, and a multiplier on the
 * swing and throw speeds the powers need.
 */
export const tuning = { fist: FIST_RATIO, open: OPEN_RATIO, swing: 1 };

export type Sensitivity = 'low' | 'normal' | 'high';

export function setSensitivity(level: Sensitivity): void {
  tuning.fist = level === 'high' ? 1.5 : level === 'low' ? 1.32 : FIST_RATIO;
  tuning.open = level === 'high' ? 1.55 : level === 'low' ? 1.72 : OPEN_RATIO;
  tuning.swing = level === 'high' ? 0.8 : level === 'low' ? 1.15 : 1;
}

export function isOpenPalm(hand: HandJoints): boolean {
  const e = fingerExtension(hand);
  return e[0] > tuning.open && e[1] > tuning.open && e[2] > tuning.open;
}

export function isFist(hand: HandJoints): boolean {
  const e = fingerExtension(hand);
  return e[0] < tuning.fist && e[1] < tuning.fist && e[2] < tuning.fist && e[3] < tuning.fist;
}

/**
 * True when the palm is open and faces away from the head, i.e. the
 * "repulsor" pose. `minFacing` is the cosine between the palm normal and the
 * head-to-palm direction.
 */
export function isBlastPose(
  hand: HandJoints,
  handedness: 'left' | 'right',
  head: Vec3,
  minFacing = 0.45,
): boolean {
  if (!isOpenPalm(hand)) return false;
  const n = palmNormal(hand, handedness);
  const c = palmCenter(hand);
  const d = sub(c, head);
  const l = Math.max(1e-6, len(d));
  return (n[0] * d[0] + n[1] * d[1] + n[2] * d[2]) / l > minFacing;
}

/**
 * Sorcerer's sigil pose: index and middle fingers out together, ring and
 * pinky curled (the thumb is ignored). Fires VESPER's runic darts.
 */
export function isSigilPose(hand: HandJoints): boolean {
  const e = fingerExtension(hand);
  return e[0] > tuning.open && e[1] > tuning.open && e[2] < tuning.fist && e[3] < tuning.fist;
}

/**
 * Web-shooter pose: index and pinky extended, middle and ring curled into
 * the palm (thumb is ignored, so both "horns" and the classic flick count).
 */
export function isWebPose(hand: HandJoints): boolean {
  const e = fingerExtension(hand);
  return e[0] > tuning.open && e[3] > tuning.open - 0.1 && e[1] < tuning.fist && e[2] < tuning.fist;
}
