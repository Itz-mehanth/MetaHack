import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  type Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  Vector3,
} from '@iwsdk/core';

const POINTS = 14;

interface Bolt {
  mesh: Mesh;
  material: MeshBasicMaterial;
  positions: Float32Array;
  from: Vector3;
  to: Vector3;
  age: number;
  duration: number;
  /** Half width at the thickest point (m). */
  width: number;
  /** How far the path wanders from the straight line (1 = default). */
  chaos: number;
}

/**
 * Pooled jagged lightning: glowing ribbons that always face the eye, each
 * re-jittered every frame while it fades, which reads as crackling
 * electricity. A strike is a wide coloured ribbon, a thin white core and a
 * few forks, all cheap additive quads (no post-processing).
 */
export class Lightning {
  /** The viewer's position; set every frame so ribbons face it. */
  readonly eye = new Vector3(0, 1.6, 0);
  private readonly pool: Bolt[] = [];
  private next = 0;
  private readonly side = new Vector3();
  private readonly up = new Vector3();
  private readonly dir = new Vector3();
  private readonly p = new Vector3();
  private readonly q = new Vector3();
  private readonly view = new Vector3();
  private readonly centre = new Float32Array(POINTS * 3);

  constructor(parent: Object3D, count = 64) {
    const index: number[] = [];
    for (let i = 0; i < POINTS - 1; i += 1) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    for (let i = 0; i < count; i += 1) {
      const positions = new Float32Array(POINTS * 2 * 3);
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      geometry.setIndex(index);
      const material = new MeshBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        side: DoubleSide,
      });
      const mesh = new Mesh(geometry, material);
      mesh.name = `Lightning-${i}`;
      mesh.frustumCulled = false;
      mesh.visible = false;
      mesh.renderOrder = 12;
      parent.add(mesh);
      this.pool.push({ mesh, material, positions, from: new Vector3(), to: new Vector3(), age: 1, duration: 1, width: 0.02, chaos: 1 });
    }
  }

  /**
   * A strike from `from` to `to`. `width` is the half width of the coloured
   * ribbon; `forks` adds that many short branches (the big ones look best).
   */
  strike(from: Vector3, to: Vector3, color: Color, duration = 0.22, width = 0.018, forks = 0): void {
    this.add(from, to, color, duration, width, 1, false);
    this.add(from, to, color, duration * 0.8, width * 0.4, 0.45, true);
    const length = from.distanceTo(to);
    for (let k = 0; k < forks; k += 1) {
      // A branch leaves the main bolt part way down and wanders off.
      const t = 0.2 + Math.random() * 0.6;
      this.p.lerpVectors(from, to, t);
      this.q.set((Math.random() - 0.5) * 2, (Math.random() - 0.7) * 1.4, (Math.random() - 0.5) * 2).normalize().multiplyScalar(length * (0.12 + Math.random() * 0.18));
      this.q.add(this.p);
      this.add(this.p, this.q, color, duration * 0.7, width * 0.45, 1.2, false);
    }
  }

  /** A straight, thin, bright line: sword cuts and clashes. */
  streak(from: Vector3, to: Vector3, color: Color, duration = 0.14, width = 0.03): void {
    this.add(from, to, color, duration, width, 0.04, false);
    this.add(from, to, color, duration * 0.8, width * 0.4, 0.02, true);
  }

  private add(from: Vector3, to: Vector3, color: Color, duration: number, width: number, chaos: number, white: boolean): void {
    const bolt = this.pool[this.next];
    this.next = (this.next + 1) % this.pool.length;
    bolt.from.copy(from);
    bolt.to.copy(to);
    bolt.age = 0;
    bolt.duration = duration;
    bolt.width = width;
    bolt.chaos = chaos;
    if (white) bolt.material.color.set('#ffffff');
    else bolt.material.color.copy(color);
    bolt.mesh.visible = true;
    bolt.material.opacity = 1;
    this.jitter(bolt, 1);
  }

  /** Rebuilds the ribbon: a random path along from-to, widened toward the eye. */
  private jitter(bolt: Bolt, fade: number): void {
    this.dir.subVectors(bolt.to, bolt.from);
    const length = this.dir.length();
    this.dir.normalize();
    this.up.set(0, 1, 0);
    if (Math.abs(this.dir.y) > 0.9) this.up.set(1, 0, 0);
    this.side.crossVectors(this.dir, this.up).normalize();
    this.up.crossVectors(this.side, this.dir).normalize();
    const spread = Math.min(0.45, 0.07 + length * 0.07) * bolt.chaos;
    const c = this.centre;
    for (let i = 0; i < POINTS; i += 1) {
      const t = i / (POINTS - 1);
      const envelope = Math.sin(Math.PI * t);
      this.p.lerpVectors(bolt.from, bolt.to, t);
      this.p.addScaledVector(this.side, (Math.random() * 2 - 1) * spread * envelope);
      this.p.addScaledVector(this.up, (Math.random() * 2 - 1) * spread * envelope);
      this.p.toArray(c, i * 3);
    }
    for (let i = 0; i < POINTS; i += 1) {
      // Width swells in the middle and tapers to points at both ends.
      const w = bolt.width * fade * (0.25 + 0.75 * Math.sin((Math.PI * i) / (POINTS - 1)));
      this.p.fromArray(c, i * 3);
      const a = i > 0 ? i - 1 : 0;
      const b = i < POINTS - 1 ? i + 1 : POINTS - 1;
      this.dir.set(c[b * 3] - c[a * 3], c[b * 3 + 1] - c[a * 3 + 1], c[b * 3 + 2] - c[a * 3 + 2]);
      this.view.subVectors(this.eye, this.p);
      this.side.crossVectors(this.dir, this.view).normalize().multiplyScalar(w);
      bolt.positions[i * 6] = this.p.x - this.side.x;
      bolt.positions[i * 6 + 1] = this.p.y - this.side.y;
      bolt.positions[i * 6 + 2] = this.p.z - this.side.z;
      bolt.positions[i * 6 + 3] = this.p.x + this.side.x;
      bolt.positions[i * 6 + 4] = this.p.y + this.side.y;
      bolt.positions[i * 6 + 5] = this.p.z + this.side.z;
    }
    bolt.mesh.geometry.attributes.position.needsUpdate = true;
  }

  update(dt: number): void {
    for (const bolt of this.pool) {
      if (!bolt.mesh.visible) continue;
      bolt.age += dt;
      const t = bolt.age / bolt.duration;
      if (t >= 1) {
        bolt.mesh.visible = false;
        continue;
      }
      // Bright and flickering, thinning out as it dies.
      bolt.material.opacity = (1 - t * t) * (0.65 + Math.random() * 0.35);
      this.jitter(bolt, 1 - t * 0.6);
    }
  }
}
