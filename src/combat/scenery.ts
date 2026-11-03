import {
  BoxGeometry,
  type BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  Group,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  type Object3D,
  OctahedronGeometry,
  Quaternion,
  ShaderMaterial,
  Vector3,
  Color,
} from '@iwsdk/core';
import type { GroundStyle } from './ground.js';

/**
 * The world around the player in VR and on a flat screen: rings of dark
 * silhouettes (towers, spires, columns, floating shards and islands) lit from
 * their bases and fogged into the horizon, so each world has a skyline and a
 * sense of depth instead of an empty grid. A handful of instanced meshes, a
 * dozen draw calls at most; hidden in mixed reality, where the room is the set.
 */

type Kit = 'tower' | 'spire' | 'column' | 'shard' | 'rock' | 'island';

interface Recipe {
  kit: Kit;
  count: number;
  /** Distance from the player, height and width ranges (metres). */
  r: readonly [number, number];
  h: readonly [number, number];
  w: readonly [number, number];
  /** Height of the base above the floor (floating shards and islands). */
  lift?: readonly [number, number];
  /** 0..1.5: how strongly the base glows. */
  glow?: number;
}

const RECIPES: Readonly<Record<GroundStyle, readonly Recipe[]>> = {
  grid: [],
  lava: [
    { kit: 'spire', count: 26, r: [13, 34], h: [4, 16], w: [2, 5], glow: 1.3 },
    { kit: 'rock', count: 22, r: [7, 18], h: [0.5, 1.8], w: [1.4, 3.2], glow: 1.1 },
  ],
  rock: [
    { kit: 'shard', count: 18, r: [11, 30], h: [2, 6], w: [1, 2.6], lift: [3, 14], glow: 0.9 },
    { kit: 'spire', count: 14, r: [15, 34], h: [5, 15], w: [2, 4.5], glow: 0.7 },
  ],
  ice: [
    { kit: 'spire', count: 30, r: [11, 32], h: [3, 14], w: [1, 3.2], glow: 1.2 },
    { kit: 'shard', count: 10, r: [12, 28], h: [2, 5], w: [0.8, 1.8], lift: [2, 9], glow: 1 },
  ],
  void: [
    { kit: 'shard', count: 24, r: [9, 30], h: [2, 7], w: [0.8, 2.4], lift: [2, 16], glow: 1.2 },
    { kit: 'tower', count: 6, r: [22, 34], h: [10, 22], w: [0.7, 1.4], glow: 1.4 },
  ],
  sand: [
    { kit: 'tower', count: 14, r: [11, 30], h: [2, 9], w: [1.6, 4], glow: 0.5 },
    { kit: 'spire', count: 9, r: [14, 32], h: [5, 12], w: [0.6, 1.2], glow: 0.6 },
    { kit: 'rock', count: 16, r: [7, 20], h: [0.5, 1.6], w: [1.4, 3], glow: 0.3 },
  ],
  garden: [
    { kit: 'column', count: 24, r: [9, 26], h: [3, 7], w: [0.5, 0.8], glow: 0.5 },
    { kit: 'tower', count: 5, r: [24, 34], h: [6, 11], w: [3, 5], glow: 0.6 },
    { kit: 'rock', count: 14, r: [8, 22], h: [0.4, 1.2], w: [1, 2.4], glow: 0.2 },
  ],
  moss: [
    { kit: 'island', count: 14, r: [12, 34], h: [3, 7], w: [3, 8], lift: [2, 16], glow: 0.8 },
    { kit: 'column', count: 10, r: [9, 22], h: [3, 6], w: [0.5, 0.8], glow: 0.6 },
  ],
  plate: [
    { kit: 'tower', count: 26, r: [13, 34], h: [6, 24], w: [2, 5], glow: 0.9 },
    { kit: 'rock', count: 14, r: [7, 16], h: [0.6, 1.6], w: [1.6, 3], glow: 0.4 },
  ],
  rune: [
    { kit: 'column', count: 14, r: [8, 22], h: [3, 6], w: [0.6, 0.9], glow: 1.5 },
    { kit: 'shard', count: 12, r: [10, 28], h: [2, 5], w: [0.8, 1.8], lift: [3, 12], glow: 1.3 },
    { kit: 'spire', count: 8, r: [20, 34], h: [8, 18], w: [1.5, 3], glow: 1 },
  ],
};

const CAPACITY = 32;

/** A unit-height geometry standing on y = 0 (so the shader can read height as `position.y`). */
function unit(geometry: BufferGeometry, height: number): BufferGeometry {
  geometry.translate(0, height / 2, 0);
  geometry.scale(1, 1 / height, 1);
  return geometry;
}

function geometries(): Record<Kit, BufferGeometry> {
  const island = new ConeGeometry(0.5, 1, 7);
  island.rotateX(Math.PI);
  return {
    tower: unit(new BoxGeometry(1, 1, 1), 1),
    spire: unit(new ConeGeometry(0.5, 1, 5), 1),
    column: unit(new CylinderGeometry(0.4, 0.5, 1, 8), 1),
    shard: unit(new OctahedronGeometry(0.5, 0), 1),
    rock: unit(new IcosahedronGeometry(0.5, 0), 1),
    island: unit(island, 1),
  };
}

function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export class Scenery {
  readonly group = new Group();
  private readonly meshes = new Map<Kit, InstancedMesh>();
  private readonly material: ShaderMaterial;
  private key = '';
  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly scale = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly euler = new Euler();

  constructor(parent: Object3D) {
    this.group.name = 'Scenery';
    // Transparent only so it sorts after the sky sphere (which paints over everything opaque beyond 7 m).
    this.material = new ShaderMaterial({
      transparent: true,
      uniforms: {
        uDark: { value: new Color('#05030C') },
        uGlow: { value: new Color('#3DF5FF') },
        uHorizon: { value: new Color('#FF2E8C') },
      },
      vertexShader: /* glsl */ `
        attribute float aGlow;
        varying float vH;
        varying float vDist;
        varying float vGlow;
        varying vec3 vN;
        void main() {
          vH = position.y;
          vGlow = aGlow;
          mat4 m = instanceMatrix;
          vec4 local = m * vec4(position, 1.0);
          vDist = length(local.xz);
          vN = normalize(mat3(m) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * local;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uDark;
        uniform vec3 uGlow;
        uniform vec3 uHorizon;
        varying float vH;
        varying float vDist;
        varying float vGlow;
        varying vec3 vN;
        void main() {
          float low = 1.0 - clamp(vH, 0.0, 1.0);
          vec3 col = uDark;
          col += uGlow * pow(low, 2.5) * 0.55 * vGlow;
          col += uGlow * 0.16 * max(vN.y, 0.0) * vGlow;
          // Thin lit edge on the glow-facing side keeps shapes readable on a black floor.
          col += uHorizon * 0.10 * (1.0 - abs(vN.y));
          float fog = smoothstep(12.0, 36.0, vDist);
          col = mix(col, uHorizon * 0.45, fog * 0.75);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const shapes = geometries();
    for (const kit of Object.keys(shapes) as Kit[]) {
      const geometry = shapes[kit];
      const glow = new Float32Array(CAPACITY).fill(1);
      geometry.setAttribute('aGlow', new InstancedBufferAttribute(glow, 1));
      const mesh = new InstancedMesh(geometry, this.material, CAPACITY);
      mesh.name = `Scenery-${kit}`;
      mesh.frustumCulled = false;
      mesh.count = 0;
      mesh.visible = false;
      mesh.renderOrder = -4;
      this.group.add(mesh);
      this.meshes.set(kit, mesh);
    }
    parent.add(this.group);
  }

  /** Lays out `style`'s skyline in the world's colours (no-op if unchanged). */
  build(style: GroundStyle, dark: string, glow: string, horizon: string): void {
    const key = `${style}|${dark}|${glow}|${horizon}`;
    if (key === this.key) return;
    this.key = key;
    const u = this.material.uniforms;
    // The silhouette body: the sky's mid colour pushed nearly to black.
    (u.uDark.value as Color).set(dark).multiplyScalar(0.35);
    (u.uGlow.value as Color).set(glow);
    (u.uHorizon.value as Color).set(horizon);
    for (const mesh of this.meshes.values()) {
      mesh.count = 0;
      mesh.visible = false;
    }
    const random = rng(style.length * 7919 + 17);
    const between = (range: readonly [number, number]) => range[0] + (range[1] - range[0]) * random();
    for (const recipe of RECIPES[style]) {
      const mesh = this.meshes.get(recipe.kit)!;
      const glowAttr = mesh.geometry.getAttribute('aGlow');
      const count = Math.min(CAPACITY, recipe.count);
      for (let i = 0; i < count; i += 1) {
        // Spread evenly around the player with jitter, so no gaps and no clumps.
        const angle = ((i + random() * 0.8) / count) * Math.PI * 2;
        const r = between(recipe.r);
        const h = between(recipe.h);
        const w = between(recipe.w);
        const lift = recipe.lift ? between(recipe.lift) : 0;
        this.position.set(Math.cos(angle) * r, lift, Math.sin(angle) * r);
        this.euler.set(recipe.kit === 'shard' ? (random() - 0.5) * 0.5 : 0, random() * Math.PI * 2, recipe.kit === 'shard' ? (random() - 0.5) * 0.5 : 0);
        this.rotation.setFromEuler(this.euler);
        this.scale.set(w, h, recipe.kit === 'tower' ? w * (0.7 + random() * 0.6) : w);
        this.matrix.compose(this.position, this.rotation, this.scale);
        mesh.setMatrixAt(i, this.matrix);
        glowAttr.setX(i, (recipe.glow ?? 1) * (0.8 + random() * 0.4));
      }
      glowAttr.needsUpdate = true;
      mesh.count = count;
      mesh.visible = count > 0;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
}
