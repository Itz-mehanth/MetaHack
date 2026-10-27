import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  type Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
} from '@iwsdk/core';
import { createGlowSprite } from './vfx.js';

/**
 * Visuals for VESPER's lasting spells: the mandala wheel, the rift portal,
 * the time bubble and the astral twins. All additive meshes and sprites,
 * created once and re-posed each frame.
 */

const look = new Vector3();

function additive(color: Color | string, opacity: number, map?: CanvasTexture): MeshBasicMaterial {
  return new MeshBasicMaterial({ color, map: map ?? null, transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, toneMapped: false });
}

/** A swirling portal face. */
function swirl(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const c = canvas.getContext('2d')!;
  const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.5, 'rgba(120,200,255,0.45)');
  g.addColorStop(1, 'rgba(60,20,160,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 256);
  c.strokeStyle = 'rgba(255,255,255,0.5)';
  for (let arm = 0; arm < 4; arm += 1) {
    c.beginPath();
    for (let t = 0; t < 1; t += 0.02) {
      const a = (arm / 4) * Math.PI * 2 + t * 5;
      const r = 8 + t * 116;
      c.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r);
    }
    c.lineWidth = 3;
    c.stroke();
  }
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export class SpellFx {
  private readonly mandalaGroup = new Group();
  private readonly mandalaRings: Mesh[] = [];
  private readonly riftGroup = new Group();
  private readonly riftDisc: Mesh;
  private readonly riftRing: Mesh;
  private readonly bubbleGroup = new Group();
  private readonly bubbleShell: Mesh;
  private readonly bubbleRings: Mesh[] = [];
  private readonly twins: Group[] = [];
  private readonly twinRings: Mesh[][] = [];

  constructor(parent: Object3D, color: Color) {
    // Mandala wheel: nested gold rings, spokes and glyph blocks.
    for (const [r, w, c] of [[0.3, 0.008, '#FFC857'], [0.22, 0.006, '#8A5CFF'], [0.14, 0.006, '#FFC857']] as const) {
      const ring = new Mesh(new TorusGeometry(r, w, 6, 56), additive(c, 0.9));
      this.mandalaRings.push(ring);
      this.mandalaGroup.add(ring);
    }
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      const glyph = new Mesh(new BoxGeometry(0.02, 0.05, 0.004), additive('#FFE8A8', 0.9));
      glyph.position.set(Math.cos(a) * 0.26, Math.sin(a) * 0.26, 0);
      glyph.rotation.z = a;
      this.mandalaGroup.add(glyph);
    }
    this.mandalaGroup.add(new Mesh(new CircleGeometry(0.3, 32), additive('#8A5CFF', 0.18)), createGlowSprite('#FFC857', 0.5));
    this.mandalaGroup.children[this.mandalaGroup.children.length - 1].scale.setScalar(0.7);
    this.mandalaGroup.visible = false;
    // Rift portal: a ring with a swirling face.
    this.riftRing = new Mesh(new TorusGeometry(0.9, 0.025, 8, 64), additive('#7CE8FF', 0.95));
    this.riftDisc = new Mesh(new CircleGeometry(0.88, 48), additive('#FFFFFF', 0.8, swirl()));
    this.riftGroup.add(this.riftRing, this.riftDisc, createGlowSprite('#7CE8FF', 0.4));
    this.riftGroup.children[2].scale.setScalar(2.4);
    this.riftGroup.visible = false;
    // Time bubble: a faint shell and rune bands around the player.
    this.bubbleShell = new Mesh(new SphereGeometry(1, 32, 20), additive('#8A5CFF', 0.1));
    (this.bubbleShell.material as MeshBasicMaterial).side = BackSide;
    this.bubbleGroup.add(this.bubbleShell);
    for (let i = 0; i < 3; i += 1) {
      const ring = new Mesh(new TorusGeometry(1, 0.006, 4, 96), additive('#C9B0FF', 0.6));
      ring.rotation.set(Math.PI / 2 + (i - 1) * 0.5, i * 1.1, 0);
      this.bubbleRings.push(ring);
      this.bubbleGroup.add(ring);
    }
    this.bubbleGroup.visible = false;
    // Astral twins: a glow, two turning rings and a palm plate.
    for (let k = 0; k < 2; k += 1) {
      const g = new Group();
      const rings: Mesh[] = [];
      for (let i = 0; i < 2; i += 1) {
        const ring = new Mesh(new TorusGeometry(0.09 + i * 0.03, 0.004, 4, 32), additive('#C9B0FF', 0.8));
        rings.push(ring);
        g.add(ring);
      }
      g.add(createGlowSprite('#C9B0FF', 0.9), new Mesh(new CircleGeometry(0.05, 6), additive('#FFFFFF', 0.7)));
      g.children[2].scale.setScalar(0.3);
      g.visible = false;
      this.twins.push(g);
      this.twinRings.push(rings);
      parent.add(g);
    }
    parent.add(this.mandalaGroup, this.riftGroup, this.bubbleGroup);
    void color;
  }

  /** The wheel at `at`, facing along `normal` (away from the caster). */
  mandala(at: Vector3, normal: Vector3, time: number, power: number): void {
    const g = this.mandalaGroup;
    g.visible = true;
    g.position.copy(at);
    look.copy(at).add(normal);
    g.lookAt(look);
    g.scale.setScalar(0.4 + 0.6 * power);
    this.mandalaRings[0].rotation.z = time * 0.8;
    this.mandalaRings[1].rotation.z = -time * 1.3;
    this.mandalaRings[2].rotation.z = time * 2.1;
    g.rotation.z += Math.sin(time * 2) * 0.002;
  }

  hideMandala(): void {
    this.mandalaGroup.visible = false;
  }

  /** The portal at `at`, facing `toward` (the caster). */
  rift(at: Vector3, toward: Vector3, time: number, power: number): void {
    const g = this.riftGroup;
    g.visible = true;
    g.position.copy(at);
    g.lookAt(toward);
    g.scale.setScalar(0.2 + 0.8 * power);
    this.riftDisc.rotation.z = -time * 1.6;
    this.riftRing.rotation.z = time * 0.7;
  }

  hideRift(): void {
    this.riftGroup.visible = false;
  }

  bubble(center: Vector3, radius: number, time: number, power: number): void {
    const g = this.bubbleGroup;
    g.visible = true;
    g.position.copy(center);
    g.scale.setScalar(radius * (0.3 + 0.7 * power));
    this.bubbleRings.forEach((r, i) => (r.rotation.z = time * (0.4 + i * 0.2)));
    (this.bubbleShell.material as MeshBasicMaterial).opacity = 0.08 + Math.sin(time * 3) * 0.02;
  }

  hideBubble(): void {
    this.bubbleGroup.visible = false;
  }

  twin(index: number, at: Vector3, toward: Vector3, time: number): void {
    const g = this.twins[index];
    g.visible = true;
    g.position.copy(at);
    g.lookAt(toward);
    this.twinRings[index][0].rotation.z = time * 2;
    this.twinRings[index][1].rotation.z = -time * 3;
  }

  hideTwins(): void {
    for (const t of this.twins) t.visible = false;
  }

  hideAll(): void {
    this.hideMandala();
    this.hideRift();
    this.hideBubble();
    this.hideTwins();
  }
}
