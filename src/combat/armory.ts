import {
  AdditiveBlending,
  Box3,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  RingGeometry,
  type Sprite,
  TorusGeometry,
  Vector3,
} from '@iwsdk/core';
import { createGlowSprite } from './vfx.js';

function holo(color: Color, opacity: number, wireframe = false): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    wireframe,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
  });
}

/**
 * Orbiting energy rings and a glow that grow with a weapon's tier (0-5).
 * Attach `group` to a weapon; call `update` every frame.
 */
export class TierAura {
  readonly group = new Group();
  private readonly rings: Mesh[] = [];
  private readonly material: MeshBasicMaterial;
  private readonly glow: Sprite;
  private tier = 0;
  private readonly baseScale: number;

  constructor(radius: number, color: Color) {
    this.group.name = 'TierAura';
    this.material = holo(color, 0.75);
    for (let i = 0; i < 5; i += 1) {
      const ring = new Mesh(new TorusGeometry(radius * (1 + i * 0.12), radius * 0.025, 6, 48), this.material);
      ring.visible = false;
      this.rings.push(ring);
      this.group.add(ring);
    }
    this.glow = createGlowSprite(color, 0);
    this.baseScale = radius * 3;
    this.glow.scale.setScalar(this.baseScale);
    this.group.add(this.glow);
  }

  set(tier: number, color: Color): void {
    this.tier = tier;
    this.material.color.copy(color);
    this.glow.material.color.copy(color);
    this.rings.forEach((ring, i) => (ring.visible = i < tier));
    this.glow.material.opacity = tier === 0 ? 0 : 0.15 + tier * 0.08;
  }

  update(time: number): void {
    if (this.tier === 0) return;
    this.rings.forEach((ring, i) => {
      ring.rotation.set(time * (0.8 + i * 0.35), time * (1.1 - i * 0.2) + i, i * 0.7);
    });
    this.glow.scale.setScalar(this.baseScale * (0.8 + this.tier * 0.12) * (1 + Math.sin(time * 4) * 0.08));
  }
}

/**
 * Garage armory: the selected hero's weapon floats as a large hologram over
 * a projector, with a scan line, wireframe overlay and a tier aura.
 */
export class Armory {
  readonly group = new Group();
  visible = false;
  private display: Group | null = null;
  private readonly holder = new Group();
  private readonly beam: Mesh;
  private readonly pad: Mesh;
  private readonly scan: Mesh;
  private readonly beamMaterial: MeshBasicMaterial;
  private readonly padMaterial: MeshBasicMaterial;
  private readonly scanMaterial: MeshBasicMaterial;
  private aura: TierAura;
  private readonly color = new Color('#3DF5FF');
  private readonly flat = new Vector3();
  private readonly box = new Box3();
  private readonly size = new Vector3();
  private readonly center = new Vector3();
  private key = '';

  constructor() {
    this.group.name = 'Armory';
    this.group.visible = false;
    this.beamMaterial = holo(this.color, 0.08);
    this.beam = new Mesh(new CylinderGeometry(0.08, 0.32, 0.7, 32, 1, true), this.beamMaterial);
    this.beam.position.y = -0.35;
    this.padMaterial = holo(this.color, 0.6);
    this.pad = new Mesh(new RingGeometry(0.26, 0.34, 48), this.padMaterial);
    this.pad.rotation.x = -Math.PI / 2;
    this.pad.position.y = -0.7;
    this.scanMaterial = holo(this.color, 0.35);
    this.scan = new Mesh(new RingGeometry(0.02, 0.3, 48), this.scanMaterial);
    this.scan.rotation.x = -Math.PI / 2;
    this.aura = new TierAura(0.3, this.color);
    this.group.add(this.beam, this.pad, this.scan, this.holder, this.aura.group);
  }

  /** Shows `model` (a fresh clone) as a hologram in `color` at `tier`. */
  setWeapon(id: string, model: Object3D, color: string, tier: number): void {
    const key = `${id}|${color}|${tier}`;
    if (key === this.key) return;
    this.key = key;
    this.color.set(color);
    this.beamMaterial.color.copy(this.color);
    this.padMaterial.color.copy(this.color);
    this.scanMaterial.color.copy(this.color);
    this.aura.set(tier, this.color);
    if (this.display) this.holder.remove(this.display);
    // The real weapon, with its real materials, standing in the projector beam.
    model.traverse((o) => {
      if (o.name === 'Outline') o.visible = false;
    });
    model.visible = true;
    const display = new Group();
    display.add(model);
    // Fit to about 0.45 m and centre it over the projector.
    model.position.set(0, 0, 0);
    model.updateMatrixWorld(true);
    this.box.setFromObject(model);
    this.box.getSize(this.size);
    const scale = 0.45 / Math.max(0.05, this.size.x, this.size.y, this.size.z);
    display.scale.setScalar(scale * (1 + tier * 0.04));
    this.box.getCenter(this.center);
    model.position.set(-this.center.x, -this.center.y, -this.center.z);
    this.display = display;
    this.holder.add(display);
  }

  show(head: Vector3, forward: Vector3): void {
    this.flat.set(forward.x, 0, forward.z);
    if (this.flat.lengthSq() < 1e-4) this.flat.set(0, 0, -1);
    this.flat.normalize();
    this.group.position.copy(head).addScaledVector(this.flat, 0.95);
    this.group.position.y = head.y + 0.02;
    this.visible = true;
    this.group.visible = true;
  }

  hide(): void {
    this.visible = false;
    this.group.visible = false;
  }

  update(time: number): void {
    if (!this.visible) return;
    this.holder.rotation.y = time * 0.6;
    this.holder.position.y = Math.sin(time * 1.5) * 0.02;
    this.scan.position.y = -0.25 + ((time * 0.35) % 1) * 0.5;
    this.scanMaterial.opacity = 0.2 + Math.sin(time * 9) * 0.05;
    this.beamMaterial.opacity = 0.07 + Math.sin(time * 13) * 0.015;
    this.pad.rotation.z = time * 0.5;
    this.aura.update(time);
  }
}
