import {
  AdditiveBlending,
  CanvasTexture,
  type Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  type Sprite,
  Vector3,
} from '@iwsdk/core';
import { createGlowSprite } from './vfx.js';

/**
 * WEAVER's webs are bullets: a glowing glob that spins open into a web net
 * as it flies, then splats where it lands (an enemy, a wall, the floor).
 * Nothing is tethered to the hand. Pooled; nothing allocates while firing.
 */

const SPLAT_LIFE = 6;

export interface WebShot {
  active: boolean;
  position: Vector3;
  previous: Vector3;
  velocity: Vector3;
  /** Seconds in the air; the shot dies of old age. */
  age: number;
  life: number;
  /** Hand that fired it (webbed enemies are thrown by that hand). */
  hand: number;
  group: Group;
  net: Mesh;
  core: Sprite;
  spin: number;
}

interface Splat {
  mesh: Mesh;
  age: number;
  active: boolean;
  size: number;
}

/** A web drawn on a canvas: spokes, then sagging rings between them. */
function webTexture(rings: number, spokes: number, line: number): CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const c = canvas.getContext('2d')!;
  const mid = size / 2;
  c.strokeStyle = '#FFFFFF';
  c.lineCap = 'round';
  c.lineWidth = line;
  c.shadowColor = '#FFFFFF';
  c.shadowBlur = 6;
  const radius = (ring: number) => (ring / rings) * (mid - 8);
  // Spokes.
  for (let s = 0; s < spokes; s += 1) {
    const a = (s / spokes) * Math.PI * 2;
    c.beginPath();
    c.moveTo(mid, mid);
    c.lineTo(mid + Math.cos(a) * (mid - 8), mid + Math.sin(a) * (mid - 8));
    c.stroke();
  }
  // Rings: each span between two spokes sags toward the centre.
  for (let r = 1; r <= rings; r += 1) {
    const rad = radius(r);
    for (let s = 0; s < spokes; s += 1) {
      const a0 = (s / spokes) * Math.PI * 2;
      const a1 = ((s + 1) / spokes) * Math.PI * 2;
      const am = (a0 + a1) / 2;
      const sag = rad * 0.82;
      c.beginPath();
      c.moveTo(mid + Math.cos(a0) * rad, mid + Math.sin(a0) * rad);
      c.quadraticCurveTo(mid + Math.cos(am) * sag, mid + Math.sin(am) * sag, mid + Math.cos(a1) * rad, mid + Math.sin(a1) * rad);
      c.stroke();
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export class WebShots {
  readonly shots: WebShot[] = [];
  private readonly splats: Splat[] = [];
  private nextSplat = 0;
  private readonly forward = new Vector3(0, 0, 1);
  private readonly aim = new Quaternion();
  private readonly spinQuat = new Quaternion();
  private readonly zAxis = new Vector3(0, 0, 1);
  private readonly netMaterial: MeshBasicMaterial;
  private readonly splatMaterial: MeshBasicMaterial;

  constructor(parent: Object3D, color: Color, capacity = 16, splatCapacity = 16) {
    this.netMaterial = new MeshBasicMaterial({
      map: webTexture(3, 8, 3),
      color: '#FFFFFF',
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
    });
    this.splatMaterial = new MeshBasicMaterial({
      map: webTexture(5, 10, 4),
      color: '#F4FAFF',
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const quad = new PlaneGeometry(1, 1);
    for (let i = 0; i < capacity; i += 1) {
      const group = new Group();
      group.visible = false;
      const net = new Mesh(quad, this.netMaterial);
      net.name = 'WebNet';
      const core = createGlowSprite(color, 0.9);
      core.scale.setScalar(0.1);
      group.add(net, core);
      parent.add(group);
      this.shots.push({
        active: false,
        position: new Vector3(),
        previous: new Vector3(),
        velocity: new Vector3(),
        age: 0,
        life: 1,
        hand: 0,
        group,
        net,
        core,
        spin: 0,
      });
    }
    for (let i = 0; i < splatCapacity; i += 1) {
      const mesh = new Mesh(quad, this.splatMaterial);
      mesh.name = 'WebSplat';
      mesh.visible = false;
      parent.add(mesh);
      this.splats.push({ mesh, age: 0, active: false, size: 0.5 });
    }
  }

  setColor(color: Color): void {
    for (const shot of this.shots) shot.core.material.color.copy(color);
  }

  /** Launches a web from `origin` along `velocity`; null when the pool is busy. */
  fire(origin: Vector3, velocity: Vector3, hand: number, life = 0.9): WebShot | null {
    const shot = this.shots.find((s) => !s.active);
    if (shot == null) return null;
    shot.active = true;
    shot.position.copy(origin);
    shot.previous.copy(origin);
    shot.velocity.copy(velocity);
    shot.age = 0;
    shot.life = life;
    shot.hand = hand;
    shot.spin = Math.random() * 6;
    shot.group.position.copy(origin);
    shot.group.visible = true;
    return shot;
  }

  retire(shot: WebShot): void {
    shot.active = false;
    shot.group.visible = false;
  }

  /** Moves a shot one step and spins its net open. Returns false once it has expired. */
  step(shot: WebShot, dt: number): boolean {
    shot.previous.copy(shot.position);
    shot.position.addScaledVector(shot.velocity, dt);
    shot.age += dt;
    shot.group.position.copy(shot.position);
    // The net faces along the flight and spins, opening as it goes.
    this.forward.copy(shot.velocity).normalize();
    this.aim.setFromUnitVectors(this.zAxis, this.forward);
    shot.spin += dt * 14;
    this.spinQuat.setFromAxisAngle(this.zAxis, shot.spin);
    shot.net.quaternion.copy(this.aim).multiply(this.spinQuat);
    const open = Math.min(1, shot.age / 0.25);
    shot.net.scale.setScalar(0.05 + open * 0.55);
    shot.core.scale.setScalar(0.14 + 0.03 * Math.sin(shot.age * 40));
    if (shot.age >= shot.life) {
      this.retire(shot);
      return false;
    }
    return true;
  }

  /** A web splat on a surface: `normal` points out of the surface. */
  splat(point: Vector3, normal: Vector3, size = 0.55): void {
    const splat = this.splats[this.nextSplat];
    this.nextSplat = (this.nextSplat + 1) % this.splats.length;
    splat.active = true;
    splat.age = 0;
    splat.mesh.visible = true;
    splat.mesh.position.copy(point).addScaledVector(normal, 0.012);
    this.aim.setFromUnitVectors(this.zAxis, normal);
    this.spinQuat.setFromAxisAngle(this.zAxis, Math.random() * 6.28);
    splat.mesh.quaternion.copy(this.aim).multiply(this.spinQuat);
    splat.size = size * (0.8 + Math.random() * 0.4);
    splat.mesh.scale.setScalar(0.01);
  }

  /** Pops splats open, then shrinks them away over the last second. */
  update(dt: number): void {
    for (const splat of this.splats) {
      if (!splat.active) continue;
      splat.age += dt;
      if (splat.age >= SPLAT_LIFE) {
        splat.active = false;
        splat.mesh.visible = false;
        continue;
      }
      const open = Math.min(1, splat.age / 0.1);
      const fade = Math.min(1, SPLAT_LIFE - splat.age);
      splat.mesh.scale.setScalar(splat.size * (1 - (1 - open) * (1 - open)) * fade);
    }
  }

  clear(): void {
    for (const shot of this.shots) this.retire(shot);
    for (const splat of this.splats) {
      splat.active = false;
      splat.mesh.visible = false;
    }
  }
}
