import {
  AdditiveBlending,
  type Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  type Sprite,
  TorusGeometry,
  Vector3,
} from '@iwsdk/core';
import { createGlowSprite } from './vfx.js';

/** Glow motes in the psychic stream from palm to held object. */
const MOTES = 12;

/**
 * PSION's per-hand telekinesis visuals: a lock-on reticle around whatever
 * the open palm points at, then, once gripped, a flowing stream of light
 * from the palm to the object along a curve, and a pulsing aura with an
 * orbiting ring around the object itself. Purely visual; the combat system
 * owns the physics.
 */
export class PsiLink {
  readonly group = new Group();
  private readonly reticle = new Group();
  private readonly reticleMaterial: MeshBasicMaterial;
  private readonly outer: Mesh;
  private readonly inner: Mesh;
  private readonly motes: Sprite[] = [];
  private readonly aura: Sprite;
  private readonly orbit: Mesh;
  private readonly orbitMaterial: MeshBasicMaterial;
  private readonly control = new Vector3();
  private readonly p = new Vector3();

  constructor(color: Color) {
    this.group.name = 'PsiLink';
    this.reticleMaterial = new MeshBasicMaterial({
      color: color.clone(),
      transparent: true,
      opacity: 0.85,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
    });
    // Outer ring and a counter-rotating diamond frame inside it.
    this.outer = new Mesh(new RingGeometry(0.92, 1, 40, 1, 0, Math.PI * 2), this.reticleMaterial);
    this.inner = new Mesh(new TorusGeometry(0.62, 0.025, 4, 4), this.reticleMaterial);
    this.reticle.add(this.outer, this.inner);
    this.reticle.visible = false;
    for (let i = 0; i < MOTES; i += 1) {
      const mote = createGlowSprite(color, 0.9);
      mote.visible = false;
      this.motes.push(mote);
      this.group.add(mote);
    }
    this.aura = createGlowSprite(color, 0);
    this.aura.visible = false;
    this.orbitMaterial = new MeshBasicMaterial({
      color: color.clone(),
      transparent: true,
      opacity: 0.8,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.orbit = new Mesh(new TorusGeometry(1, 0.03, 4, 40), this.orbitMaterial);
    this.orbit.visible = false;
    this.group.add(this.reticle, this.aura, this.orbit);
  }

  setColor(color: Color): void {
    this.reticleMaterial.color.copy(color);
    this.orbitMaterial.color.copy(color);
    this.aura.material.color.copy(color);
    for (const mote of this.motes) mote.material.color.copy(color);
  }

  /** Lock-on reticle around `target` (radius `radius`), facing `head`; null hides it. */
  aim(target: Vector3 | null, radius: number, head: Vector3, time: number): void {
    this.reticle.visible = target != null;
    if (target == null) return;
    this.reticle.position.copy(target);
    this.reticle.lookAt(head);
    const pulse = 1 + Math.sin(time * 10) * 0.06;
    this.reticle.scale.setScalar(radius * 1.5 * pulse);
    this.outer.rotation.z = time * 1.5;
    this.inner.rotation.z = -time * 3;
    this.reticleMaterial.opacity = 0.6 + Math.sin(time * 20) * 0.2;
  }

  /** Stream from `palm` (pushing out along `normal`) to the held `target`. */
  link(palm: Vector3, normal: Vector3, target: Vector3 | null, radius: number, time: number): void {
    const on = target != null;
    this.aura.visible = on;
    this.orbit.visible = on;
    for (const mote of this.motes) mote.visible = on;
    if (target == null) return;
    const distance = palm.distanceTo(target);
    this.control.copy(palm).addScaledVector(normal, distance * 0.45);
    for (let i = 0; i < MOTES; i += 1) {
      // Motes flow from the palm to the object, wobbling around the curve.
      const t = (i / MOTES + time * 1.6) % 1;
      const u = 1 - t;
      this.p.copy(palm).multiplyScalar(u * u).addScaledVector(this.control, 2 * u * t).addScaledVector(target, t * t);
      const wobble = 0.03 + distance * 0.015;
      this.p.x += Math.sin(time * 9 + i * 2.1) * wobble;
      this.p.y += Math.cos(time * 7 + i * 1.7) * wobble;
      const mote = this.motes[i];
      mote.position.copy(this.p);
      mote.scale.setScalar(0.05 + 0.05 * Math.sin(t * Math.PI));
    }
    this.aura.position.copy(target);
    this.aura.scale.setScalar(radius * 4.5 * (1 + Math.sin(time * 8) * 0.12));
    this.aura.material.opacity = 0.55;
    this.orbit.position.copy(target);
    this.orbit.scale.setScalar(radius * 1.45);
    this.orbit.rotation.set(time * 2.3, time * 1.7, 0);
  }

  hide(): void {
    this.reticle.visible = false;
    this.aura.visible = false;
    this.orbit.visible = false;
    for (const mote of this.motes) mote.visible = false;
  }
}
