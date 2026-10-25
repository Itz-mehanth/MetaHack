import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  type Color,
  Line,
  LineBasicMaterial,
  type Object3D,
  Vector3,
} from '@iwsdk/core';

const POINTS = 14;

interface Bolt {
  line: Line;
  material: LineBasicMaterial;
  positions: Float32Array;
  from: Vector3;
  to: Vector3;
  age: number;
  duration: number;
}

/**
 * Pooled jagged lightning arcs. Each arc re-jitters every frame while it
 * fades, which reads as crackling electricity. Two lines per strike (a
 * coloured arc and a white core) give it some body on a headset.
 */
export class Lightning {
  private readonly pool: Bolt[] = [];
  private next = 0;
  private readonly side = new Vector3();
  private readonly up = new Vector3();
  private readonly dir = new Vector3();
  private readonly p = new Vector3();

  constructor(parent: Object3D, count = 16) {
    for (let i = 0; i < count; i += 1) {
      const positions = new Float32Array(POINTS * 3);
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      const material = new LineBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const line = new Line(geometry, material);
      line.name = `Lightning-${i}`;
      line.frustumCulled = false;
      line.visible = false;
      line.renderOrder = 12;
      parent.add(line);
      this.pool.push({ line, material, positions, from: new Vector3(), to: new Vector3(), age: 1, duration: 1 });
    }
  }

  strike(from: Vector3, to: Vector3, color: Color, duration = 0.22): void {
    for (let k = 0; k < 2; k += 1) {
      const bolt = this.pool[this.next];
      this.next = (this.next + 1) % this.pool.length;
      bolt.from.copy(from);
      bolt.to.copy(to);
      bolt.age = 0;
      bolt.duration = duration;
      if (k === 0) bolt.material.color.copy(color);
      else bolt.material.color.set('#ffffff');
      bolt.line.visible = true;
      this.jitter(bolt, k === 0 ? 1 : 0.45);
    }
  }

  private jitter(bolt: Bolt, amount: number): void {
    this.dir.subVectors(bolt.to, bolt.from);
    const length = this.dir.length();
    this.dir.normalize();
    this.up.set(0, 1, 0);
    if (Math.abs(this.dir.y) > 0.9) this.up.set(1, 0, 0);
    this.side.crossVectors(this.dir, this.up).normalize();
    this.up.crossVectors(this.side, this.dir).normalize();
    const spread = Math.min(0.25, 0.06 + length * 0.05) * amount;
    for (let i = 0; i < POINTS; i += 1) {
      const t = i / (POINTS - 1);
      const envelope = Math.sin(Math.PI * t);
      this.p.lerpVectors(bolt.from, bolt.to, t);
      this.p.addScaledVector(this.side, (Math.random() * 2 - 1) * spread * envelope);
      this.p.addScaledVector(this.up, (Math.random() * 2 - 1) * spread * envelope);
      this.p.toArray(bolt.positions, i * 3);
    }
    bolt.line.geometry.attributes.position.needsUpdate = true;
  }

  update(dt: number): void {
    for (let i = 0; i < this.pool.length; i += 1) {
      const bolt = this.pool[i];
      if (!bolt.line.visible) continue;
      bolt.age += dt;
      const t = bolt.age / bolt.duration;
      if (t >= 1) {
        bolt.line.visible = false;
        continue;
      }
      bolt.material.opacity = (1 - t) * (0.6 + Math.random() * 0.4);
      this.jitter(bolt, i % 2 === 0 ? 1 : 0.45);
    }
  }
}
