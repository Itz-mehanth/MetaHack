import {
  AdditiveBlending,
  NormalBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  type Object3D,
  Points,
  PointsMaterial,
  RGBAFormat,
  Sprite,
  SpriteMaterial,
  Vector3,
} from '@iwsdk/core';

/**
 * Quest-cheap effects: one additive point cloud for every spark and trail,
 * plus a small pool of glow sprites for flashes. Nothing allocates per frame.
 */

let glowTexture: DataTexture | null = null;

/** Soft radial glow, generated once without touching the DOM. */
export function getGlowTexture(): DataTexture {
  if (glowTexture) return glowTexture;
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (x + 0.5) / size - 0.5;
      const dy = (y + 0.5) / size - 0.5;
      const r = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2);
      const a = Math.pow(1 - r, 2.2);
      const i = (y * size + x) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = Math.round(a * 255);
    }
  }
  glowTexture = new DataTexture(data, size, size, RGBAFormat);
  glowTexture.needsUpdate = true;
  return glowTexture;
}

export function createGlowSprite(color: Color | string, opacity = 1): Sprite {
  const sprite = new Sprite(
    new SpriteMaterial({
      map: getGlowTexture(),
      color,
      transparent: true,
      opacity,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  sprite.renderOrder = 10;
  return sprite;
}

export class Particles {
  readonly points: Points;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly base: Float32Array;
  private readonly velocities: Float32Array;
  private readonly life: Float32Array;
  private readonly maxLife: Float32Array;
  private readonly drag: Float32Array;
  private readonly gravity: Float32Array;
  private next = 0;
  /** Share of emitted particles that actually spawn (the quality governor lowers it). */
  density = 1;

  constructor(
    private readonly capacity = 900,
    size = 0.035,
    additive = true,
  ) {
    this.positions = new Float32Array(capacity * 3).fill(-1000);
    this.colors = new Float32Array(capacity * 3);
    this.base = new Float32Array(capacity * 3);
    this.velocities = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity).fill(1);
    this.drag = new Float32Array(capacity);
    this.gravity = new Float32Array(capacity);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new BufferAttribute(this.colors, 3));
    this.points = new Points(
      geometry,
      new PointsMaterial({
        size,
        map: getGlowTexture(),
        vertexColors: true,
        transparent: true,
        blending: additive ? AdditiveBlending : NormalBlending,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    this.points.name = 'Particles';
    this.points.frustumCulled = false;
    this.points.renderOrder = 11;
  }

  emit(
    position: Vector3,
    velocity: Vector3,
    color: Color,
    life: number,
    drag = 1.5,
    gravity = 1.2,
  ): void {
    if (this.density < 1 && Math.random() > this.density) return;
    const i = this.next;
    this.next = (this.next + 1) % this.capacity;
    const j = i * 3;
    this.positions[j] = position.x;
    this.positions[j + 1] = position.y;
    this.positions[j + 2] = position.z;
    this.velocities[j] = velocity.x;
    this.velocities[j + 1] = velocity.y;
    this.velocities[j + 2] = velocity.z;
    this.base[j] = color.r;
    this.base[j + 1] = color.g;
    this.base[j + 2] = color.b;
    this.life[i] = life;
    this.maxLife[i] = life;
    this.drag[i] = drag;
    this.gravity[i] = gravity;
  }

  /** Emits `count` sparks in random directions at `speed` m/s (±50%). */
  burst(position: Vector3, color: Color, count: number, speed: number, life: number, scratch: Vector3): void {
    for (let n = 0; n < count; n += 1) {
      scratch.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
      scratch.normalize().multiplyScalar(speed * (0.5 + Math.random()));
      this.emit(position, scratch, color, life * (0.6 + Math.random() * 0.8), 2.5);
    }
  }

  update(dt: number): void {
    for (let i = 0; i < this.capacity; i += 1) {
      if (this.life[i] <= 0) continue;
      const j = i * 3;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.positions[j + 1] = -1000;
        this.colors[j] = this.colors[j + 1] = this.colors[j + 2] = 0;
        continue;
      }
      const k = Math.max(0, 1 - this.drag[i] * dt);
      this.velocities[j] *= k;
      this.velocities[j + 1] = this.velocities[j + 1] * k - this.gravity[i] * dt;
      this.velocities[j + 2] *= k;
      this.positions[j] += this.velocities[j] * dt;
      this.positions[j + 1] += this.velocities[j + 1] * dt;
      this.positions[j + 2] += this.velocities[j + 2] * dt;
      const f = this.life[i] / this.maxLife[i];
      this.colors[j] = this.base[j] * f;
      this.colors[j + 1] = this.base[j + 1] * f;
      this.colors[j + 2] = this.base[j + 2] * f;
    }
    const geometry = this.points.geometry;
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  }

  clear(): void {
    this.life.fill(0);
    this.positions.fill(-1000);
    this.colors.fill(0);
  }
}

interface Flash {
  sprite: Sprite;
  material: SpriteMaterial;
  age: number;
  duration: number;
  from: number;
  to: number;
}

/** Expanding, fading glow flashes (explosions, muzzle flashes, hits). */
export class Flashes {
  private readonly pool: Flash[] = [];
  private next = 0;

  constructor(parent: Object3D, count = 24) {
    for (let i = 0; i < count; i += 1) {
      const sprite = createGlowSprite('#ffffff', 0);
      sprite.name = `Flash-${i}`;
      sprite.visible = false;
      parent.add(sprite);
      this.pool.push({
        sprite,
        material: sprite.material,
        age: 1,
        duration: 1,
        from: 0,
        to: 0,
      });
    }
  }

  spawn(position: Vector3, color: Color, from: number, to: number, duration: number): void {
    const flash = this.pool[this.next];
    this.next = (this.next + 1) % this.pool.length;
    flash.sprite.position.copy(position);
    flash.material.color.copy(color);
    flash.age = 0;
    flash.duration = duration;
    flash.from = from;
    flash.to = to;
    flash.sprite.visible = true;
  }

  update(dt: number): void {
    for (const flash of this.pool) {
      if (!flash.sprite.visible) continue;
      flash.age += dt;
      const t = flash.age / flash.duration;
      if (t >= 1) {
        flash.sprite.visible = false;
        continue;
      }
      const e = 1 - (1 - t) * (1 - t);
      flash.sprite.scale.setScalar(flash.from + (flash.to - flash.from) * e);
      flash.material.opacity = 1 - t;
    }
  }

  clear(): void {
    for (const flash of this.pool) flash.sprite.visible = false;
  }
}
