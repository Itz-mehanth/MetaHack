import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from '@iwsdk/core';
import { BlobShadows } from './shadows.js';

/**
 * Marks that tie virtual effects to the real room: light that spills across
 * the floor from explosions and bolts, scorch marks they leave behind, cracks
 * that glow where a portal tears through a wall, and red rings under enemies
 * about to strike. All pooled; each family is one draw call (cracks: a few).
 */

function radialTexture(stops: readonly (readonly [number, string])[]): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const c = canvas.getContext('2d')!;
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [at, color] of stops) g.addColorStop(at, color);
  c.fillStyle = g;
  c.fillRect(0, 0, 128, 128);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function additive(map: CanvasTexture): MeshBasicMaterial {
  return new MeshBasicMaterial({ map, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
}

function flatPlane(): PlaneGeometry {
  const geometry = new PlaneGeometry(1, 1);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

// ---------------------------------------------------------------- floor glow

interface Spill {
  x: number;
  y: number;
  z: number;
  radius: number;
  r: number;
  g: number;
  b: number;
  age: number;
  life: number;
}

/** Light from flashes spilling onto the floor, fading with the flash. */
export class FloorGlow {
  readonly mesh: InstancedMesh;
  private readonly spills: Spill[] = [];
  private readonly capacity: number;
  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly scale = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly tint = new Color();
  private next = 0;

  constructor(parent: Object3D, capacity = 16) {
    this.capacity = capacity;
    const texture = radialTexture([
      [0, 'rgba(255,255,255,0.95)'],
      [0.35, 'rgba(255,255,255,0.45)'],
      [1, 'rgba(255,255,255,0)'],
    ]);
    this.mesh = new InstancedMesh(flatPlane(), additive(texture), capacity);
    this.mesh.name = 'FloorGlow';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.mesh.count = 0;
    this.mesh.setColorAt(0, this.tint.setScalar(0));
    parent.add(this.mesh);
    for (let i = 0; i < capacity; i += 1) this.spills.push({ x: 0, y: 0, z: 0, radius: 1, r: 0, g: 0, b: 0, age: 1, life: 1 });
  }

  /** Light of `color` at the floor under (x, z), `radius` metres, lasting `life` s. */
  add(x: number, z: number, floorY: number, radius: number, color: Color, strength: number, life: number): void {
    const s = this.spills[this.next];
    this.next = (this.next + 1) % this.capacity;
    s.x = x;
    s.y = floorY + 0.008;
    s.z = z;
    s.radius = radius;
    s.r = color.r * strength;
    s.g = color.g * strength;
    s.b = color.b * strength;
    s.age = 0;
    s.life = Math.max(0.1, life);
  }

  update(dt: number): void {
    let n = 0;
    for (const s of this.spills) {
      if (s.age >= s.life) continue;
      s.age += dt;
      const t = Math.min(1, s.age / s.life);
      const fade = (1 - t) * (1 - t);
      this.position.set(s.x, s.y, s.z);
      const size = s.radius * 2 * (0.7 + 0.3 * t);
      this.scale.set(size, 1, size);
      this.matrix.compose(this.position, this.rotation, this.scale);
      this.mesh.setMatrixAt(n, this.matrix);
      this.mesh.setColorAt(n, this.tint.setRGB(s.r * fade, s.g * fade, s.b * fade));
      n += 1;
    }
    this.mesh.count = n;
    this.mesh.visible = n > 0;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  clear(): void {
    for (const s of this.spills) s.age = s.life;
  }
}

// ---------------------------------------------------------------- scorch marks

interface Mark {
  x: number;
  y: number;
  z: number;
  radius: number;
  age: number;
  life: number;
}

/** Burn marks left on the floor by blasts; they fade out over a quarter of a minute. */
export class ScorchMarks {
  private readonly shadows: BlobShadows;
  private readonly marks: Mark[] = [];
  private next = 0;

  constructor(parent: Object3D, capacity = 24) {
    this.shadows = new BlobShadows(parent, 'scorch');
    for (let i = 0; i < capacity; i += 1) this.marks.push({ x: 0, y: 0, z: 0, radius: 1, age: 99, life: 1 });
  }

  add(x: number, z: number, floorY: number, radius: number, life = 16): void {
    const m = this.marks[this.next];
    this.next = (this.next + 1) % this.marks.length;
    m.x = x;
    m.y = floorY;
    m.z = z;
    m.radius = radius;
    m.age = 0;
    m.life = life;
  }

  update(dt: number): void {
    this.shadows.begin();
    for (const m of this.marks) {
      if (m.age >= m.life) continue;
      m.age += dt;
      const t = m.age / m.life;
      // Hot for a moment, then a dark scar that fades in the last third.
      const strength = Math.min(1, m.age * 4) * (t < 0.65 ? 0.8 : 0.8 * (1 - (t - 0.65) / 0.35));
      this.shadows.add(m.x, m.y, m.z, m.radius, strength);
    }
    this.shadows.end();
  }

  clear(): void {
    for (const m of this.marks) m.age = m.life;
  }
}

// ---------------------------------------------------------------- wall cracks

interface Crack {
  mesh: Mesh;
  material: MeshBasicMaterial;
  age: number;
  size: number;
}

function crackTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const c = canvas.getContext('2d')!;
  c.clearRect(0, 0, 256, 256);
  let seed = 91;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (let k = 0; k < 11; k += 1) {
    let x = 128;
    let y = 128;
    let a = (k / 11) * Math.PI * 2 + rand() * 0.5;
    const width = 2 + rand() * 3;
    const steps = 5 + Math.floor(rand() * 4);
    for (let pass = 0; pass < 2; pass += 1) {
      c.strokeStyle = pass === 0 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,1)';
      c.lineWidth = pass === 0 ? width * 3 : width;
      c.beginPath();
      c.moveTo(128, 128);
      x = 128;
      y = 128;
      let b = a;
      for (let s = 0; s < steps; s += 1) {
        b += (rand() - 0.5) * 0.9;
        x += Math.cos(b) * (14 + rand() * 18);
        y += Math.sin(b) * (14 + rand() * 18);
        c.lineTo(x, y);
      }
      c.stroke();
    }
  }
  const g = c.createRadialGradient(128, 128, 0, 128, 128, 40);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 256);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Glowing cracks spreading on a wall where something tears through it. */
export class WallCracks {
  private readonly pool: Crack[] = [];
  private readonly target = new Vector3();
  private next = 0;

  constructor(parent: Object3D, count = 8) {
    const texture = crackTexture();
    const geometry = new PlaneGeometry(1, 1);
    for (let i = 0; i < count; i += 1) {
      const material = new MeshBasicMaterial({ map: texture, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      const mesh = new Mesh(geometry, material);
      mesh.name = `WallCrack-${i}`;
      mesh.visible = false;
      mesh.renderOrder = 3;
      parent.add(mesh);
      this.pool.push({ mesh, material, age: 99, size: 1 });
    }
  }

  /** A crack at `position` on a wall whose outward normal is `normal`. */
  add(position: Vector3, normal: Vector3, color: Color, size: number): void {
    const crack = this.pool[this.next];
    this.next = (this.next + 1) % this.pool.length;
    crack.mesh.position.copy(position).addScaledVector(normal, 0.012);
    this.target.copy(crack.mesh.position).add(normal);
    crack.mesh.lookAt(this.target);
    crack.mesh.rotateZ(Math.random() * Math.PI * 2);
    crack.material.color.copy(color);
    crack.age = 0;
    crack.size = size;
    crack.mesh.visible = true;
  }

  update(dt: number): void {
    for (const crack of this.pool) {
      if (!crack.mesh.visible) continue;
      crack.age += dt;
      const life = 3.2;
      if (crack.age >= life) {
        crack.mesh.visible = false;
        continue;
      }
      const grow = Math.min(1, crack.age / 0.35);
      crack.mesh.scale.setScalar(crack.size * (0.25 + 0.75 * (1 - (1 - grow) * (1 - grow))));
      crack.material.opacity = crack.age < 1.2 ? 1 : 1 - (crack.age - 1.2) / (life - 1.2);
    }
  }

  clear(): void {
    for (const crack of this.pool) crack.mesh.visible = false;
  }
}

// ---------------------------------------------------------------- telegraph rings

/** Red rings on the floor under enemies that are winding up to strike. Rebuilt every frame. */
export class Telegraphs {
  readonly mesh: InstancedMesh;
  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly scale = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly tint = new Color();
  private count = 0;

  constructor(parent: Object3D, capacity = 12) {
    const texture = radialTexture([
      [0, 'rgba(255,40,40,0.18)'],
      [0.7, 'rgba(255,60,60,0.30)'],
      [0.86, 'rgba(255,90,90,1)'],
      [0.94, 'rgba(255,60,60,0.4)'],
      [1, 'rgba(255,40,40,0)'],
    ]);
    this.mesh = new InstancedMesh(flatPlane(), additive(texture), capacity);
    this.mesh.name = 'Telegraphs';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.mesh.count = 0;
    this.mesh.setColorAt(0, this.tint.setScalar(0));
    parent.add(this.mesh);
  }

  begin(): void {
    this.count = 0;
  }

  /** A ring of `radius` under (x, z); `strength` 0..1 (it brightens as the blow nears). */
  add(x: number, z: number, floorY: number, radius: number, strength: number): void {
    if (this.count >= this.mesh.instanceMatrix.count) return;
    this.position.set(x, floorY + 0.01, z);
    this.scale.set(radius * 2, 1, radius * 2);
    this.matrix.compose(this.position, this.rotation, this.scale);
    this.mesh.setMatrixAt(this.count, this.matrix);
    this.mesh.setColorAt(this.count, this.tint.setRGB(strength, strength * 0.7, strength * 0.7));
    this.count += 1;
  }

  end(): void {
    this.mesh.count = this.count;
    this.mesh.visible = this.count > 0;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
