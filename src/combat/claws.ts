import {
  AdditiveBlending,
  type Color,
  CylinderGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
} from '@iwsdk/core';
import { type HandPose, J } from './gauntlet.js';

/** Blade length in metres when fully extended. */
export const BLADE_LENGTH = 0.3;
const EXTEND_RATE = 9;
const BLADE_KNUCKLES = [6, 11, 16];

/** Flat diamond blade, base at the origin, tip at -Z (WebXR bone direction). */
function bladeGeometry(): CylinderGeometry {
  const geometry = new CylinderGeometry(0.0008, 0.009, 1, 4, 1);
  geometry.translate(0, 0.5, 0);
  geometry.rotateX(-Math.PI / 2);
  geometry.scale(0.35, 1, 1);
  return geometry;
}

/**
 * Three energy blades that slide out of the knuckle guards. Each blade has a
 * white-hot core and a coloured additive sheath. Exposes the middle blade's
 * base and tip so the combat system can test slashes.
 */
export class Claws {
  readonly group = new Group();
  readonly base = new Vector3();
  readonly tip = new Vector3();
  readonly direction = new Vector3(0, 0, -1);
  extension = 0;
  /** Upgrade multiplier on blade length. */
  lengthScale = 1;

  private readonly blades: Group[] = [];
  private readonly sheath: MeshBasicMaterial;
  private readonly q = new Quaternion();
  private readonly up = new Vector3();
  private readonly p = new Vector3();
  private readonly side = new Vector3();
  private readonly back = new Vector3();
  private readonly basis = new Matrix4();

  constructor(handedness: 'left' | 'right', color: Color) {
    this.group.name = `Claws-${handedness}`;
    const geometry = bladeGeometry();
    const core = new MeshBasicMaterial({ color: '#FFFFFF', toneMapped: false });
    this.sheath = new MeshBasicMaterial({
      color: color.clone(),
      transparent: true,
      opacity: 0.75,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    for (let i = 0; i < BLADE_KNUCKLES.length; i += 1) {
      const blade = new Group();
      blade.name = `Blade-${i}`;
      const inner = new Mesh(geometry, core);
      inner.scale.set(0.45, 0.45, 1);
      const outer = new Mesh(geometry, this.sheath);
      outer.scale.set(1.6, 1.6, 1.02);
      blade.add(inner, outer);
      this.blades.push(blade);
      this.group.add(blade);
    }
    this.group.visible = false;
  }

  setColor(color: Color): void {
    this.sheath.color.copy(color);
  }

  /** Extends toward `out` (true while the fist is held) and poses blades. */
  update(pose: HandPose, out: boolean, dt: number, time: number): void {
    const target = out && pose.tracked ? 1 : 0;
    this.extension += Math.sign(target - this.extension) * Math.min(Math.abs(target - this.extension), EXTEND_RATE * dt);
    this.group.visible = pose.tracked && this.extension > 0.01;
    if (!this.group.visible) return;

    // Blades run along the back-of-hand bone line (wrist to middle knuckle),
    // which matches where the fist actually points better than any single
    // joint's orientation.
    pose.position(J.wrist, this.p);
    pose.position(J.middleProx, this.direction);
    this.direction.sub(this.p).normalize();
    pose.quaternion(J.middleMeta, this.q);
    this.up.set(0, 1, 0).applyQuaternion(this.q);
    this.up.addScaledVector(this.direction, -this.up.dot(this.direction)).normalize();
    this.side.crossVectors(this.up, this.direction).negate();
    this.basis.makeBasis(this.side, this.up, this.back.copy(this.direction).negate());
    this.q.setFromRotationMatrix(this.basis);
    const length = BLADE_LENGTH * this.extension * this.lengthScale;
    const flicker = 1 + Math.sin(time * 40) * 0.04;
    for (let i = 0; i < this.blades.length; i += 1) {
      const blade = this.blades[i];
      pose.position(BLADE_KNUCKLES[i], this.p);
      this.p.addScaledVector(this.up, (pose.radii[BLADE_KNUCKLES[i]] || 0.01) * 1.4);
      blade.position.copy(this.p);
      blade.quaternion.copy(this.q);
      blade.scale.set(flicker, flicker, i === 1 ? length * 1.12 : length);
      if (i === 1) {
        this.base.copy(this.p);
        this.tip.copy(this.p).addScaledVector(this.direction, length * 1.12);
      }
    }
  }
}
