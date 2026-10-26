import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  RepeatWrapping,
  SRGBColorSpace,
  type Sprite,
  TorusGeometry,
  Vector3,
} from '@iwsdk/core';
import { createGlowSprite } from './vfx.js';

/**
 * A continuous energy beam that reads as a weapon, not a stick: a white-hot
 * core inside a coloured sheath with flowing energy stripes, a fat soft
 * glow, rings that race down its length, a flare where it leaves the
 * emitter and one where it lands. Three cylinders, a few rings and two
 * sprites; all additive, nothing allocated while it plays.
 */

const RINGS = 6;
let stripes: CanvasTexture | null = null;

/** Soft diagonal energy stripes, tiling along the beam. */
function stripeTexture(): CanvasTexture {
  if (stripes) return stripes;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const c = canvas.getContext('2d')!;
  c.clearRect(0, 0, 64, 256);
  for (let i = 0; i < 8; i += 1) {
    const y = (i / 8) * 256;
    const g = c.createLinearGradient(0, y, 0, y + 28);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, y, 64, 28);
  }
  stripes = new CanvasTexture(canvas);
  stripes.wrapS = RepeatWrapping;
  stripes.wrapT = RepeatWrapping;
  stripes.colorSpace = SRGBColorSpace;
  return stripes;
}

export class BeamFx {
  readonly group = new Group();
  private readonly core: Mesh;
  private readonly sheath: Mesh;
  private readonly glow: Mesh;
  private readonly rings: Mesh[] = [];
  private readonly start: Sprite;
  private readonly end: Sprite;
  private readonly sheathMaterial: MeshBasicMaterial;
  private readonly glowMaterial: MeshBasicMaterial;
  private readonly ringMaterial: MeshBasicMaterial;
  private readonly flow: CanvasTexture;
  private readonly look = new Vector3();
  private visibleNow = false;

  constructor(parent: Object3D, color: Color) {
    this.flow = stripeTexture().clone();
    this.flow.needsUpdate = true;
    // Unit cylinder along +Z from the origin.
    const geometry = new CylinderGeometry(1, 1, 1, 14, 1, true);
    geometry.rotateX(Math.PI / 2);
    geometry.translate(0, 0, 0.5);
    const mat = (c: Color | string, opacity: number, map?: CanvasTexture) =>
      new MeshBasicMaterial({ color: c, map: map ?? null, transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
    this.sheathMaterial = mat(color.clone(), 0.85, this.flow);
    this.glowMaterial = mat(color.clone(), 0.22);
    this.ringMaterial = mat(color.clone(), 0.8);
    this.core = new Mesh(geometry, mat('#FFFFFF', 0.98));
    this.sheath = new Mesh(geometry, this.sheathMaterial);
    this.glow = new Mesh(geometry, this.glowMaterial);
    const ring = new TorusGeometry(1, 0.06, 6, 20);
    for (let i = 0; i < RINGS; i += 1) {
      const mesh = new Mesh(ring, this.ringMaterial);
      mesh.renderOrder = 11;
      this.rings.push(mesh);
      this.group.add(mesh);
    }
    this.start = createGlowSprite(color, 0.9);
    this.end = createGlowSprite('#FFFFFF', 0.9);
    this.group.add(this.glow, this.sheath, this.core, this.start, this.end);
    for (const mesh of [this.core, this.sheath, this.glow]) {
      mesh.frustumCulled = false;
      mesh.renderOrder = 10;
    }
    this.group.visible = false;
    this.group.name = 'Beam';
    parent.add(this.group);
  }

  setColor(color: Color): void {
    this.sheathMaterial.color.copy(color);
    this.glowMaterial.color.copy(color);
    this.ringMaterial.color.copy(color);
    this.start.material.color.copy(color);
  }

  /**
   * Draws the beam from `origin` along unit `direction` for `length` metres.
   * `width` is the sheath radius; `power` (0..1) fades it in and out.
   */
  show(origin: Vector3, direction: Vector3, length: number, width: number, time: number, power = 1): void {
    const g = this.group;
    g.visible = true;
    this.visibleNow = true;
    g.position.copy(origin);
    this.look.copy(origin).add(direction);
    g.lookAt(this.look);
    // Restless width: the beam breathes and crackles.
    const flicker = 1 + Math.sin(time * 61) * 0.06 + Math.sin(time * 23) * 0.08;
    const w = width * flicker * (0.35 + 0.65 * power);
    this.core.scale.set(w * 0.2, w * 0.2, length);
    this.sheath.scale.set(w * 0.7, w * 0.7, length);
    this.glow.scale.set(w * 1.8, w * 1.8, length);
    // Energy flows down the sheath.
    this.flow.repeat.set(1, Math.max(1, length * 0.7));
    this.flow.offset.y = -time * 3.2;
    this.sheathMaterial.opacity = 0.85 * power;
    this.glowMaterial.opacity = (0.2 + Math.sin(time * 18) * 0.04) * power;
    this.ringMaterial.opacity = 0.75 * power;
    // Rings race away from the emitter, swelling as they go.
    for (let i = 0; i < RINGS; i += 1) {
      const t = (time * 1.6 + i / RINGS) % 1;
      const ring = this.rings[i];
      ring.position.set(0, 0, t * length);
      ring.scale.setScalar(w * (1.05 + 0.35 * Math.sin(t * Math.PI)));
      ring.rotation.z = time * 4 + i;
    }
    this.start.position.set(0, 0, 0.02);
    this.start.scale.setScalar(w * (3.2 + Math.sin(time * 40) * 0.6));
    this.end.position.set(0, 0, length);
    this.end.scale.setScalar(w * (3 + Math.sin(time * 33) * 0.8) * power);
  }

  hide(): void {
    if (!this.visibleNow) return;
    this.visibleNow = false;
    this.group.visible = false;
  }

  get visible(): boolean {
    return this.visibleNow;
  }
}
