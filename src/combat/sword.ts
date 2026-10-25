import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  TorusGeometry,
  Vector3,
} from '@iwsdk/core';
import { type HandPose, J } from './gauntlet.js';

/** Blade length in metres at full extension (before upgrades). */
export const SWORD_LENGTH = 0.85;
const IGNITE_RATE = 7;
/** Samples kept for the swing trail ribbon. */
const TRAIL = 16;
const GUARD = 0.09;

/**
 * Curved katana blade along local +Y (0..1), edge toward +Z, spine curving
 * back toward -Z and tapering to a point.
 */
function bladeGeometry(width: number, thickness: number): BoxGeometry {
  const geometry = new BoxGeometry(1, 1, 1, 1, 24, 1);
  const p = geometry.attributes.position as BufferAttribute;
  for (let i = 0; i < p.count; i += 1) {
    const t = p.getY(i) + 0.5;
    let w = width * (1 - 0.3 * t);
    if (t > 0.9) w *= Math.max(0.02, (1 - t) / 0.1);
    const edge = p.getZ(i) > 0;
    // The point slopes from the edge up to the spine.
    const z = edge ? w * 0.5 : -w * 0.5;
    p.setXYZ(i, p.getX(i) * thickness, t, z - 0.04 * t * t);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * RONIN's energy katana, ignited from a fist: a wrapped hilt and gold guard
 * held where the fingers curl, a white-hot blade core inside a coloured
 * plasma sheath, and a world-space swing trail that flares with speed.
 * Exposes the blade segment (base to tip) and tip speed for hit tests.
 */
export class Sword {
  readonly group = new Group();
  /** World-space ribbon; add it to the scene root, not to the hand. */
  readonly trail: Mesh;
  readonly base = new Vector3();
  readonly tip = new Vector3();
  readonly direction = new Vector3(0, 1, 0);
  /** Blade edge direction (perpendicular to the blade). */
  readonly edge = new Vector3(0, 0, 1);
  extension = 0;
  /** Upgrade multiplier on blade length. */
  lengthScale = 1;
  /** Tip speed in m/s, smoothed. */
  speed = 0;

  private readonly blade = new Group();
  private readonly sheath: MeshBasicMaterial;
  private readonly guardGlow: MeshBasicMaterial;
  private readonly trailMaterial: MeshBasicMaterial;
  private readonly trailPositions: Float32Array;
  private readonly trailColors: Float32Array;
  private readonly history = new Float32Array(TRAIL * 6);
  private readonly color = new Color();
  private historyCount = 0;
  private flare = 0;
  private readonly prevTip = new Vector3();
  private hasPrev = false;
  private readonly raw = new Vector3();
  private readonly fwd = new Vector3();
  private readonly a = new Vector3();
  private readonly b = new Vector3();
  private readonly side = new Vector3();
  private readonly basis = new Matrix4();
  private readonly q = new Quaternion();

  constructor(handedness: 'left' | 'right', color: Color) {
    this.group.name = `Sword-${handedness}`;
    this.color.copy(color);
    const wrap = new MeshStandardMaterial({ color: '#15151C', roughness: 0.85, metalness: 0.1 });
    const gold = new MeshStandardMaterial({ color: '#C9973A', roughness: 0.3, metalness: 1 });
    const hilt = new Mesh(new CylinderGeometry(0.014, 0.016, 0.24, 10), wrap);
    hilt.position.y = -0.03;
    const pommel = new Mesh(new CylinderGeometry(0.018, 0.016, 0.02, 10), gold);
    pommel.position.y = -0.155;
    const guard = new Mesh(new CylinderGeometry(0.042, 0.042, 0.01, 18), gold);
    guard.position.y = GUARD;
    guard.scale.z = 0.75;
    this.guardGlow = new MeshBasicMaterial({ color: color.clone(), transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
    const rim = new Mesh(new TorusGeometry(0.042, 0.004, 6, 24), this.guardGlow);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = GUARD;
    rim.scale.y = 0.75;
    // Diamond wrap pattern on the hilt.
    for (let k = 0; k < 5; k += 1) {
      const band = new Mesh(new TorusGeometry(0.0155, 0.0025, 4, 12), gold);
      band.rotation.x = Math.PI / 2;
      band.position.y = -0.13 + k * 0.045;
      this.group.add(band);
    }
    const core = new MeshBasicMaterial({ color: '#FFFFFF', toneMapped: false });
    this.sheath = new MeshBasicMaterial({
      color: color.clone(),
      transparent: true,
      opacity: 0.7,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.blade.add(new Mesh(bladeGeometry(0.022, 0.004), core), new Mesh(bladeGeometry(0.05, 0.016), this.sheath));
    this.blade.position.y = GUARD + 0.005;
    this.group.add(hilt, pommel, guard, rim, this.blade);
    this.group.visible = false;

    // Trail ribbon: TRAIL pairs of (base, tip) vertices, newest first.
    const geometry = new BufferGeometry();
    this.trailPositions = new Float32Array(TRAIL * 2 * 3);
    this.trailColors = new Float32Array(TRAIL * 2 * 3);
    geometry.setAttribute('position', new BufferAttribute(this.trailPositions, 3));
    geometry.setAttribute('color', new BufferAttribute(this.trailColors, 3));
    const index: number[] = [];
    for (let i = 0; i < TRAIL - 1; i += 1) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geometry.setIndex(index);
    this.trailMaterial = new MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
    });
    this.trail = new Mesh(geometry, this.trailMaterial);
    this.trail.name = `SwordTrail-${handedness}`;
    this.trail.frustumCulled = false;
    this.trail.visible = false;
  }

  setColor(color: Color): void {
    this.color.copy(color);
    this.sheath.color.copy(color);
    this.guardGlow.color.copy(color);
  }

  /**
   * Ignites toward `out` (fist held) and poses the sword in the fist:
   * `grip` is the centre of the curled fingers.
   */
  update(pose: HandPose, grip: Vector3, out: boolean, dt: number, time: number): void {
    const target = out && pose.tracked ? 1 : 0;
    this.extension += Math.sign(target - this.extension) * Math.min(Math.abs(target - this.extension), IGNITE_RATE * dt);
    this.group.visible = pose.tracked && this.extension > 0.01;
    if (!this.group.visible) {
      this.hasPrev = false;
      this.historyCount = 0;
      this.trail.visible = false;
      this.speed = 0;
      return;
    }
    // A gripped blade leaves the fist on the thumb side, across the knuckle
    // line (pinky to index), leaning forward with the back of the hand.
    pose.position(6, this.a);
    pose.position(21, this.b);
    this.raw.subVectors(this.a, this.b).normalize();
    pose.position(J.wrist, this.a);
    pose.position(J.middleProx, this.fwd);
    this.fwd.sub(this.a).normalize();
    this.raw.addScaledVector(this.fwd, 0.6).normalize();
    if (this.hasPrev) this.direction.lerp(this.raw, 0.55).normalize();
    else this.direction.copy(this.raw);
    // Edge faces forward: the back-of-hand direction made perpendicular.
    this.edge.copy(this.fwd).addScaledVector(this.direction, -this.fwd.dot(this.direction)).normalize();
    this.side.crossVectors(this.direction, this.edge);
    this.basis.makeBasis(this.side, this.direction, this.edge);
    this.q.setFromRotationMatrix(this.basis);
    this.group.position.copy(grip);
    this.group.quaternion.copy(this.q);
    const length = SWORD_LENGTH * this.extension * this.lengthScale;
    const flicker = 1 + Math.sin(time * 47) * 0.05 + Math.sin(time * 13) * 0.03;
    this.blade.scale.set(flicker, length, flicker);
    this.sheath.opacity = 0.55 + 0.25 * Math.min(1, this.flare + 0.3);
    this.base.copy(grip).addScaledVector(this.direction, GUARD);
    this.tip.copy(this.base).addScaledVector(this.direction, length);

    if (this.hasPrev && dt > 0) {
      const instant = this.a.subVectors(this.tip, this.prevTip).length() / dt;
      this.speed += (instant - this.speed) * Math.min(1, dt * 20);
    }
    this.prevTip.copy(this.tip);
    this.hasPrev = true;
    this.updateTrail(dt);
  }

  private updateTrail(dt: number): void {
    // Flare with swing speed; a slow blade leaves almost nothing behind.
    const want = Math.min(1, Math.max(0, (this.speed - 0.8) / 3));
    this.flare += (want - this.flare) * Math.min(1, dt * (want > this.flare ? 30 : 6));
    this.history.copyWithin(6, 0, (TRAIL - 1) * 6);
    // Trail runs from mid-blade to the tip so the hilt stays clean.
    this.a.copy(this.base).lerp(this.tip, 0.25);
    this.a.toArray(this.history, 0);
    this.tip.toArray(this.history, 3);
    this.historyCount = Math.min(TRAIL, this.historyCount + 1);
    for (let i = 0; i < TRAIL; i += 1) {
      const src = Math.min(i, this.historyCount - 1) * 6;
      for (let k = 0; k < 6; k += 1) this.trailPositions[i * 6 + k] = this.history[src + k];
      const fade = Math.pow(1 - i / (TRAIL - 1), 1.6) * this.flare * (this.extension > 0.9 ? 1 : 0);
      const r = this.color.r * fade;
      const g = this.color.g * fade;
      const b = this.color.b * fade;
      // Inner edge dimmer, tip edge bright and whiter.
      this.trailColors[i * 6] = r * 0.35;
      this.trailColors[i * 6 + 1] = g * 0.35;
      this.trailColors[i * 6 + 2] = b * 0.35;
      this.trailColors[i * 6 + 3] = Math.min(1, r + fade * 0.35);
      this.trailColors[i * 6 + 4] = Math.min(1, g + fade * 0.35);
      this.trailColors[i * 6 + 5] = Math.min(1, b + fade * 0.35);
    }
    const geometry = this.trail.geometry;
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    this.trail.visible = this.flare > 0.02;
  }
}

/**
 * Closest distance between segments p1-q1 and p2-q2, with the midpoint of
 * the closest pair written to `out`. Allocation-free.
 */
export function segmentDistance(p1: Vector3, q1: Vector3, p2: Vector3, q2: Vector3, out: Vector3, d1: Vector3, d2: Vector3, r: Vector3): number {
  d1.subVectors(q1, p1);
  d2.subVectors(q2, p2);
  r.subVectors(p1, p2);
  const a = d1.dot(d1);
  const e = d2.dot(d2);
  const f = d2.dot(r);
  let s = 0;
  let t = 0;
  if (a <= 1e-8 && e <= 1e-8) {
    out.copy(p1).add(p2).multiplyScalar(0.5);
    return p1.distanceTo(p2);
  }
  if (a <= 1e-8) t = Math.min(1, Math.max(0, f / e));
  else {
    const c = d1.dot(r);
    if (e <= 1e-8) s = Math.min(1, Math.max(0, -c / a));
    else {
      const b = d1.dot(d2);
      const denom = a * e - b * b;
      s = denom > 1e-8 ? Math.min(1, Math.max(0, (b * f - c * e) / denom)) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = Math.min(1, Math.max(0, -c / a));
      } else if (t > 1) {
        t = 1;
        s = Math.min(1, Math.max(0, (b - c) / a));
      }
    }
  }
  d1.multiplyScalar(s).add(p1);
  d2.multiplyScalar(t).add(p2);
  out.addVectors(d1, d2).multiplyScalar(0.5);
  return d1.distanceTo(d2);
}
