import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  type Color,
  IcosahedronGeometry,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  type Sprite,
  Vector3,
} from '@iwsdk/core';
import { createGlowSprite } from './vfx.js';

const POINTS = 16;

/**
 * One hand's web strand: a slightly sagging, shimmering double line from the
 * wrist to the web head, plus a glowing blob at the head.
 */
export class WebStrand {
  readonly head = new Vector3();
  private readonly lines: Line[] = [];
  private readonly positions: Float32Array[] = [];
  private readonly materials: LineBasicMaterial[] = [];
  private readonly blob: Sprite;
  private readonly p = new Vector3();

  constructor(parent: Object3D, color: Color) {
    for (let k = 0; k < 2; k += 1) {
      const positions = new Float32Array(POINTS * 3);
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      const material = new LineBasicMaterial({
        color: k === 0 ? '#FFFFFF' : color.clone(),
        transparent: true,
        opacity: k === 0 ? 0.95 : 0.6,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const line = new Line(geometry, material);
      line.frustumCulled = false;
      line.visible = false;
      line.renderOrder = 12;
      parent.add(line);
      this.lines.push(line);
      this.positions.push(positions);
      this.materials.push(material);
    }
    this.blob = createGlowSprite('#FFFFFF', 0.9);
    this.blob.scale.setScalar(0.08);
    this.blob.visible = false;
    parent.add(this.blob);
  }

  setColor(color: Color): void {
    this.materials[1].color.copy(color);
  }

  hide(): void {
    for (const line of this.lines) line.visible = false;
    this.blob.visible = false;
  }

  /** Draws the strand from `origin` to `this.head`. */
  draw(origin: Vector3, time: number, taut: number): void {
    const length = origin.distanceTo(this.head);
    for (let k = 0; k < 2; k += 1) {
      const positions = this.positions[k];
      for (let i = 0; i < POINTS; i += 1) {
        const t = i / (POINTS - 1);
        const envelope = Math.sin(Math.PI * t);
        this.p.lerpVectors(origin, this.head, t);
        this.p.y -= envelope * length * 0.06 * (1 - taut);
        const wobble = Math.sin(time * 30 + i * 1.7 + k) * 0.006 * envelope;
        this.p.x += wobble;
        this.p.z += wobble * (k === 0 ? 1 : -1);
        this.p.toArray(positions, i * 3);
      }
      this.lines[k].geometry.attributes.position.needsUpdate = true;
      this.lines[k].visible = true;
    }
    this.blob.position.copy(this.head);
    this.blob.visible = true;
  }
}

/** Wireframe cocoon wrapped around a snared enemy. */
export function createCocoon(): Mesh {
  const mesh = new Mesh(
    new IcosahedronGeometry(1, 1),
    new MeshBasicMaterial({
      color: '#F4FAFF',
      wireframe: true,
      transparent: true,
      opacity: 0.75,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  mesh.name = 'Cocoon';
  mesh.visible = false;
  return mesh;
}
