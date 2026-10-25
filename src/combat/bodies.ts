import {
  CanvasTexture,
  CircleGeometry,
  type Color,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from '@iwsdk/core';

/**
 * Bodies for the walking aliens: severable parts that fly off as physics
 * gibs when a blade cuts through, and the restore that puts them back for
 * the pooled enemy's next life. Plus the player's "you were hit" blood
 * overlay. Allocation-free after construction.
 */

/** One severable part of an alien, and where it belongs. */
export interface Part {
  readonly object: Object3D;
  /** Flesh cut faces shown once severed: on the part, and on the body. */
  readonly cap: Object3D | null;
  readonly stump: Object3D | null;
  readonly parent: Object3D;
  readonly position: Vector3;
  readonly quaternion: Quaternion;
  readonly scale: Vector3;
}

export type PartName = 'Upper' | 'Head' | 'ArmL' | 'ArmR';

/** Captures the rest transform of each severable part of `root`. */
export function captureParts(root: Object3D): Partial<Record<PartName, Part>> {
  const parts: Partial<Record<PartName, Part>> = {};
  for (const name of ['Upper', 'Head', 'ArmL', 'ArmR'] as const) {
    const object = root.getObjectByName(name);
    if (object?.parent == null) continue;
    parts[name] = {
      object,
      cap: root.getObjectByName(`Cap${name}`) ?? null,
      stump: root.getObjectByName(`Stump${name}`) ?? null,
      parent: object.parent,
      position: object.position.clone(),
      quaternion: object.quaternion.clone(),
      scale: object.scale.clone(),
    };
  }
  return parts;
}

/** Puts a part back under its original parent at its rest pose. */
export function restorePart(part: Part): void {
  if (part.object.parent !== part.parent) part.parent.add(part.object);
  part.object.position.copy(part.position);
  part.object.quaternion.copy(part.quaternion);
  part.object.scale.copy(part.scale);
  if (part.cap) part.cap.visible = false;
  if (part.stump) part.stump.visible = false;
}

interface Gib {
  part: Part | null;
  velocity: Vector3;
  spin: Vector3;
  life: number;
  resting: boolean;
}

export type BleedFn = (at: Vector3, velocity: Vector3, heavy: boolean) => void;

/**
 * Severed parts in flight: thrown off with the cut, tumbling under gravity,
 * bouncing on the floor, then resting until their owner's death ends.
 */
export class Gibs {
  /** m/s^2; lowered by the low-gravity twist. */
  gravity = 9.8;
  private readonly pool: Gib[] = [];
  private readonly world = new Vector3();
  private readonly v = new Vector3();

  constructor(
    private readonly scene: Object3D,
    capacity = 24,
  ) {
    for (let i = 0; i < capacity; i += 1) {
      this.pool.push({ part: null, velocity: new Vector3(), spin: new Vector3(), life: 0, resting: false });
    }
  }

  /** Detaches `part` into the scene, flying with `velocity` (m/s). */
  throw(part: Part, velocity: Vector3, spin: number): void {
    const gib = this.pool.find((g) => g.part == null);
    if (gib == null) return;
    this.scene.attach(part.object);
    if (part.cap) part.cap.visible = true;
    if (part.stump) part.stump.visible = true;
    gib.part = part;
    gib.velocity.copy(velocity);
    gib.spin.set((Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin);
    gib.life = 0;
    gib.resting = false;
  }

  /** Steps every gib; `bleed` sprays ichor from the cut while it flies. */
  update(dt: number, bleed: BleedFn): void {
    for (const gib of this.pool) {
      const part = gib.part;
      if (part == null) continue;
      gib.life += dt;
      if (gib.resting) continue;
      const object = part.object;
      gib.velocity.y -= this.gravity * dt;
      object.position.addScaledVector(gib.velocity, dt);
      object.rotation.x += gib.spin.x * dt;
      object.rotation.y += gib.spin.y * dt;
      object.rotation.z += gib.spin.z * dt;
      if (Math.random() < 0.5) {
        object.getWorldPosition(this.world);
        this.v.copy(gib.velocity).multiplyScalar(-0.1);
        bleed(this.world, this.v, false);
      }
      if (object.position.y < 0.06) {
        object.position.y = 0.06;
        if (Math.abs(gib.velocity.y) < 1.2) {
          gib.resting = true;
          continue;
        }
        // Bounce with heavy damping and floor friction.
        gib.velocity.y = -gib.velocity.y * 0.3;
        gib.velocity.x *= 0.5;
        gib.velocity.z *= 0.5;
        gib.spin.multiplyScalar(0.4);
      }
    }
  }

  /** Puts every gib belonging to `parts` back on its body. */
  recall(parts: Partial<Record<PartName, Part>>): void {
    for (const gib of this.pool) {
      if (gib.part == null) continue;
      if (gib.part === parts.Upper || gib.part === parts.Head || gib.part === parts.ArmL || gib.part === parts.ArmR) {
        restorePart(gib.part);
        gib.part = null;
      }
    }
  }

  /** Fades severed parts that have rested a while (shrink into the floor). */
  sink(parts: Partial<Record<PartName, Part>>, amount: number): void {
    for (const gib of this.pool) {
      if (gib.part == null) continue;
      if (gib.part === parts.Upper || gib.part === parts.Head || gib.part === parts.ArmL || gib.part === parts.ArmR) {
        gib.part.object.position.y -= amount;
      }
    }
  }
}

/**
 * Red blood splatter on the edge of the view when the player is hit,
 * heavier on the side the hit came from, plus a low-health pulse.
 */
export class BloodScreen {
  readonly mesh: Mesh;
  private readonly material: MeshBasicMaterial;
  private level = 0;
  private pulse = 0;

  constructor() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const c = canvas.getContext('2d')!;
    // Soft red vignette all round.
    const g = c.createRadialGradient(size / 2, size / 2, size * 0.28, size / 2, size / 2, size * 0.72);
    g.addColorStop(0, 'rgba(120,0,0,0)');
    g.addColorStop(1, 'rgba(150,0,8,0.85)');
    c.fillStyle = g;
    c.fillRect(0, 0, size, size);
    // Splatter concentrated on the left edge (rotated toward the hit).
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 70; i += 1) {
      const y = rand() * size;
      const x = Math.pow(rand(), 2.2) * size * 0.4;
      const r = 4 + rand() * 26 * (1 - x / (size * 0.45));
      c.fillStyle = `rgba(${110 + rand() * 60}, 0, ${rand() * 12}, ${0.55 + rand() * 0.4})`;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
      if (rand() < 0.35) {
        // Drip.
        c.fillRect(x - r * 0.25, y, r * 0.5, r * (2 + rand() * 4));
      }
    }
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    this.material = new MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false });
    this.mesh = new Mesh(new PlaneGeometry(0.62, 0.62), this.material);
    this.mesh.name = 'BloodScreen';
    this.mesh.position.z = -0.25;
    this.mesh.renderOrder = 31;
    this.mesh.visible = false;
  }

  /** A hit from screen direction `angle` (radians, 0 = from the left, going counter-clockwise). */
  hit(angle: number, strength = 1): void {
    this.level = Math.min(1, this.level + 0.75 * strength);
    this.mesh.rotation.z = angle;
  }

  /** `danger` 0..1: low health makes the edges pulse. */
  update(dt: number, danger: number): void {
    this.level = Math.max(0, this.level - dt * 0.7);
    this.pulse += dt * (2 + danger * 3);
    const beat = danger > 0 ? danger * 0.35 * Math.max(0, Math.sin(this.pulse * Math.PI)) : 0;
    const opacity = Math.min(1, this.level + beat);
    this.material.opacity = opacity;
    this.mesh.visible = opacity > 0.01;
  }
}

/** Alien ichor colours, bright enough to read in passthrough. */
export function ichorColor(out: Color, dark: boolean): Color {
  return dark ? out.set('#1E7A12') : out.set('#7CFF3D');
}

interface Pool {
  mesh: Mesh;
  material: MeshBasicMaterial;
  age: number;
  size: number;
}

/** Dark blood pools spreading on the floor under the dead; they dry and fade. */
export class BloodPools {
  private readonly pools: Pool[] = [];
  private next = 0;

  constructor(parent: Object3D, capacity = 20) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const c = canvas.getContext('2d')!;
    let seed = 11;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 14; i += 1) {
      const r = 10 + rand() * 26;
      const x = size / 2 + (rand() - 0.5) * 50;
      const y = size / 2 + (rand() - 0.5) * 50;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(70,0,4,0.95)');
      g.addColorStop(0.75, 'rgba(90,0,6,0.85)');
      g.addColorStop(1, 'rgba(90,0,6,0)');
      c.fillStyle = g;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    const geometry = new CircleGeometry(0.5, 20);
    geometry.rotateX(-Math.PI / 2);
    for (let i = 0; i < capacity; i += 1) {
      const material = new MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
      const mesh = new Mesh(geometry, material);
      mesh.name = 'BloodPool';
      mesh.visible = false;
      mesh.renderOrder = 1;
      parent.add(mesh);
      this.pools.push({ mesh, material, age: 0, size: 1 });
    }
  }

  /** Starts a pool spreading at floor point (x, z) up to `size` metres across. */
  spill(x: number, z: number, size: number): void {
    const pool = this.pools[this.next];
    this.next = (this.next + 1) % this.pools.length;
    pool.mesh.position.set(x, 0.004 + this.next * 0.0002, z);
    pool.mesh.rotation.y = Math.random() * Math.PI * 2;
    pool.size = size;
    pool.age = 0;
    pool.mesh.visible = true;
  }

  update(dt: number): void {
    for (const pool of this.pools) {
      if (!pool.mesh.visible) continue;
      pool.age += dt;
      const grow = Math.min(1, pool.age / 1.6);
      pool.mesh.scale.setScalar(pool.size * (0.2 + 0.8 * Math.sqrt(grow)));
      pool.material.opacity = pool.age < 9 ? 0.9 : Math.max(0, 0.9 - (pool.age - 9) / 3);
      if (pool.material.opacity <= 0) pool.mesh.visible = false;
    }
  }

  clear(): void {
    for (const pool of this.pools) pool.mesh.visible = false;
  }
}
