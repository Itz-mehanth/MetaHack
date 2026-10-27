import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  type Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  RepeatWrapping,
  SRGBColorSpace,
} from '@iwsdk/core';
import { distanceToWalls, type Segment } from './roomgeo.js';

const MAX = 24;
const HEIGHT = 0.5;
const STRIP = 0.07;

/**
 * The room's border, drawn from the scanned walls: a glowing strip along the
 * base of each wall and a low curtain of light that brightens as the player
 * nears it (and turns warning red at arm's length), so the whole room reads
 * as the arena and the player always knows where it ends.
 */
export class RoomBorder {
  readonly mesh: Mesh;
  private readonly material: MeshBasicMaterial;
  private readonly texture: CanvasTexture;
  private readonly positions = new Float32Array(MAX * 8 * 3);
  private readonly uvs = new Float32Array(MAX * 8 * 2);
  private readonly geometry = new BufferGeometry();
  private version = -1;

  constructor(parent: Object3D, color: Color) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const c = canvas.getContext('2d')!;
    for (let y = 0; y < 64; y += 1) {
      // v = 0 is the bottom row: brightest, fading up the curtain.
      const fade = Math.pow(1 - y / 63, 1.6);
      for (let x = 0; x < 64; x += 1) {
        const dash = x < 40 ? 1 : 0.35;
        c.fillStyle = `rgba(255,255,255,${(fade * dash).toFixed(3)})`;
        c.fillRect(x, 63 - y, 1, 1);
      }
    }
    this.texture = new CanvasTexture(canvas);
    this.texture.wrapS = RepeatWrapping;
    this.texture.colorSpace = SRGBColorSpace;
    this.geometry.setAttribute('position', new BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('uv', new BufferAttribute(this.uvs, 2));
    const index: number[] = [];
    for (let i = 0; i < MAX * 2; i += 1) index.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
    this.geometry.setIndex(index);
    this.material = new MeshBasicMaterial({
      map: this.texture,
      color: color.clone(),
      transparent: true,
      opacity: 0.4,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
    });
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.name = 'RoomBorder';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.mesh.visible = false;
    parent.add(this.mesh);
  }

  /** Rebuilds the strips when the walls change (`version` bumps on every re-scan). */
  private build(segments: readonly Segment[]): void {
    const p = this.positions;
    const uv = this.uvs;
    p.fill(0);
    let q = 0;
    const n = Math.min(MAX, segments.length);
    for (let i = 0; i < n; i += 1) {
      const s = segments[i];
      const length = Math.hypot(s.b[0] - s.a[0], s.b[2] - s.a[2]);
      const nx = (s.b[2] - s.a[2]) / (length || 1);
      const nz = -(s.b[0] - s.a[0]) / (length || 1);
      // Curtain: base edge then top edge.
      const quad = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, x3: number, y3: number, z3: number, v0: number, v1: number) => {
        p.set([x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3], q * 12);
        uv.set([0, v0, length, v0, length, v1, 0, v1], q * 8);
        q += 1;
      };
      quad(s.a[0], 0.01, s.a[2], s.b[0], 0.01, s.b[2], s.b[0], HEIGHT, s.b[2], s.a[0], HEIGHT, s.a[2], 0.02, 1);
      // Floor strip centred on the wall's footprint.
      quad(s.a[0] - nx * STRIP, 0.012, s.a[2] - nz * STRIP, s.b[0] - nx * STRIP, 0.012, s.b[2] - nz * STRIP, s.b[0] + nx * STRIP, 0.012, s.b[2] + nz * STRIP, s.a[0] + nx * STRIP, 0.012, s.a[2] + nz * STRIP, 0, 0);
    }
    for (let i = q; i < MAX * 2; i += 1) {
      p.fill(0, i * 12, i * 12 + 12);
      uv.fill(0, i * 8, i * 8 + 8);
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.uv.needsUpdate = true;
  }

  update(segments: readonly Segment[], version: number, headX: number, headZ: number, time: number, color: Color): void {
    this.mesh.visible = segments.length > 0;
    if (!this.mesh.visible) return;
    if (version !== this.version) {
      this.version = version;
      this.build(segments);
    }
    const d = distanceToWalls(segments, headX, headZ);
    const near = Math.max(0, Math.min(1, 1 - d / 1.3));
    this.material.opacity = 0.35 + 0.65 * near;
    // Warning red at arm's length.
    if (d < 0.55) this.material.color.set('#FF3355');
    else this.material.color.copy(color);
    this.texture.offset.x = (time * 0.25) % 1;
  }
}
