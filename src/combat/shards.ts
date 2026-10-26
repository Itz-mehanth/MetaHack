import {
  BoxGeometry,
  type BufferGeometry,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  TetrahedronGeometry,
  Vector3,
} from '@iwsdk/core';
import type { CollideFn } from './bodies.js';

/**
 * Debris from shattered props: pooled shards (planks, panels, chunks and
 * rocks) that burst out, tumble, bounce off the real room and fade. All
 * meshes and materials are made once; a burst only reuses them.
 */

export type ShardStuff = 'crate' | 'barrel' | 'explosive' | 'boulder' | 'girder';

interface Shard {
  mesh: Mesh;
  velocity: Vector3;
  spin: Vector3;
  life: number;
  max: number;
  size: number;
  resting: boolean;
}

export class Shards {
  private readonly pool: Shard[] = [];
  private next = 0;
  private readonly materials: Record<string, MeshStandardMaterial>;
  private readonly geometries: { plank: BufferGeometry; chunk: BufferGeometry; rock: BufferGeometry };

  constructor(parent: Object3D, capacity = 48) {
    this.materials = {
      wood: new MeshStandardMaterial({ color: '#3B4A3A', roughness: 0.6, metalness: 0.6 }),
      steel: new MeshStandardMaterial({ color: '#4A505E', roughness: 0.4, metalness: 0.9 }),
      red: new MeshStandardMaterial({ color: '#B0201A', roughness: 0.45, metalness: 0.6 }),
      hazard: new MeshStandardMaterial({ color: '#E8B21F', roughness: 0.5, metalness: 0.6 }),
      rock: new MeshStandardMaterial({ color: '#5B5248', roughness: 0.95, flatShading: true }),
      ember: new MeshStandardMaterial({ color: '#FF7A1A', emissive: '#FF5A00', emissiveIntensity: 2 }),
    };
    this.geometries = {
      plank: new BoxGeometry(1, 0.18, 0.55),
      chunk: new TetrahedronGeometry(0.6, 0),
      rock: new IcosahedronGeometry(0.55, 0),
    };
    for (let i = 0; i < capacity; i += 1) {
      const mesh = new Mesh(this.geometries.plank, this.materials.wood);
      mesh.name = 'Shard';
      mesh.visible = false;
      parent.add(mesh);
      this.pool.push({ mesh, velocity: new Vector3(), spin: new Vector3(), life: 0, max: 1, size: 0.1, resting: true });
    }
  }

  /** Bursts `count` shards of `stuff` from `at`, flung outward at about `speed`, biased along `push`. */
  burst(at: Vector3, stuff: ShardStuff, count: number, speed: number, push: Vector3): void {
    for (let k = 0; k < count; k += 1) {
      const shard = this.pool[this.next];
      this.next = (this.next + 1) % this.pool.length;
      const m = this.materials;
      const g = this.geometries;
      const r = Math.random();
      if (stuff === 'boulder') {
        shard.mesh.geometry = g.rock;
        shard.mesh.material = m.rock;
      } else if (stuff === 'crate') {
        shard.mesh.geometry = r < 0.75 ? g.plank : g.chunk;
        shard.mesh.material = r < 0.6 ? m.wood : m.steel;
      } else if (stuff === 'explosive') {
        shard.mesh.geometry = r < 0.6 ? g.plank : g.chunk;
        shard.mesh.material = r < 0.45 ? m.red : r < 0.7 ? m.hazard : r < 0.85 ? m.ember : m.steel;
      } else if (stuff === 'barrel') {
        shard.mesh.geometry = r < 0.7 ? g.plank : g.chunk;
        shard.mesh.material = r < 0.7 ? m.red : m.steel;
      } else {
        shard.mesh.geometry = g.chunk;
        shard.mesh.material = m.steel;
      }
      shard.size = 0.07 + Math.random() * 0.09;
      shard.mesh.scale.setScalar(shard.size);
      shard.mesh.position.set(at.x + (Math.random() - 0.5) * 0.25, at.y + (Math.random() - 0.3) * 0.25, at.z + (Math.random() - 0.5) * 0.25);
      shard.mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      shard.velocity.set(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.5 + Math.random()));
      shard.velocity.addScaledVector(push, 0.6);
      shard.spin.set((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18);
      shard.max = 2.5 + Math.random() * 1.5;
      shard.life = shard.max;
      shard.resting = false;
      shard.mesh.visible = true;
    }
  }

  update(dt: number, gravity: number, collide: CollideFn): void {
    for (const shard of this.pool) {
      if (!shard.mesh.visible) continue;
      shard.life -= dt;
      if (shard.life <= 0) {
        shard.mesh.visible = false;
        continue;
      }
      // Shrink away over the last half second.
      if (shard.life < 0.5) shard.mesh.scale.setScalar(shard.size * (shard.life / 0.5));
      if (shard.resting) continue;
      shard.velocity.y -= gravity * dt;
      shard.mesh.position.addScaledVector(shard.velocity, dt);
      shard.mesh.rotation.x += shard.spin.x * dt;
      shard.mesh.rotation.y += shard.spin.y * dt;
      shard.mesh.rotation.z += shard.spin.z * dt;
      const ny = collide(shard.mesh.position, shard.velocity, shard.size * 0.5);
      if (ny > -2) {
        shard.spin.multiplyScalar(0.5);
        if (ny > 0.7 && shard.velocity.lengthSq() < 0.3) shard.resting = true;
      }
    }
  }

  clear(): void {
    for (const shard of this.pool) shard.mesh.visible = false;
  }
}
