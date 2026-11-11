import { CanvasTexture, type Camera, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, Vector3 } from '@iwsdk/core';
import { drawIcon, iconsReady } from './icons.js';

const W = 512;
const H = 160;

const PLANE_W = 0.46;
const PLANE_H = 0.144;

/** Centre of portrait `index` of `count` on the strip, in metres from the strip's middle. */
export function chipLocal(index: number, count: number): { x: number; y: number } {
  const px = W / 2 + (index - (count - 1) / 2) * 140;
  return { x: ((px - W / 2) / W) * PLANE_W, y: (0.5 - 58 / H) * PLANE_H };
}

export interface SquadChip {
  id: string;
  color: string;
  /** A hero borrowed for this mission rather than owned. */
  lent: boolean;
}

/**
 * The squad strip at the bottom of the view: one chip per hero with the
 * active one lit, and a hint line on how to swap. Redrawn only on change.
 */
export class SquadBar {
  readonly mesh: Mesh;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly texture: CanvasTexture;
  private key = '';
  private chips: readonly SquadChip[] = [];
  private active = '';
  private hint = '';
  /** Pulse after a swap (0..1), fading. */
  private flash = 0;
  private readonly material: MeshBasicMaterial;

  constructor(camera: Camera) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.material = new MeshBasicMaterial({ map: this.texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
    this.mesh = new Mesh(new PlaneGeometry(PLANE_W, PLANE_H), this.material);
    this.mesh.name = 'SquadBar';
    this.mesh.position.set(0, -0.34, -0.85);
    this.mesh.renderOrder = 36;
    this.mesh.visible = false;
    camera.add(this.mesh);
    void iconsReady.then(() => {
      this.key = '';
      this.draw();
    });
  }

  /** Shows `chips` with `active` lit and `hint` underneath (empty to hide the bar). */
  set(chips: readonly SquadChip[], active: string, hint: string): void {
    this.chips = chips;
    this.active = active;
    this.hint = hint;
    this.mesh.visible = chips.length > 1;
    this.draw();
  }

  hide(): void {
    this.mesh.visible = false;
  }

  private readonly pick = new Vector3();

  /** The portrait within `radius` metres of the world point (a pinching hand), or -1. */
  pickChip(point: Vector3, radius: number): number {
    if (!this.mesh.visible) return -1;
    this.mesh.updateWorldMatrix(true, false);
    let best = -1;
    let nearest = radius;
    for (let i = 0; i < this.chips.length; i += 1) {
      const at = chipLocal(i, this.chips.length);
      const d = this.mesh.localToWorld(this.pick.set(at.x, at.y, 0)).distanceTo(point);
      if (d < nearest) {
        nearest = d;
        best = i;
      }
    }
    return best;
  }

  /** A swap just landed: pulse the bar. */
  pulse(): void {
    this.flash = 1;
  }

  update(dt: number): void {
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 2.5);
      this.mesh.scale.setScalar(1 + this.flash * 0.18);
    }
  }

  private draw(): void {
    const key = `${this.chips.map((c) => c.id + c.color + c.lent).join(',')}|${this.active}|${this.hint}`;
    if (key === this.key) return;
    this.key = key;
    const c = this.ctx;
    c.clearRect(0, 0, W, H);
    const n = this.chips.length;
    for (let i = 0; i < n; i += 1) {
      const chip = this.chips[i];
      const x = W / 2 + (i - (n - 1) / 2) * 140;
      const on = chip.id === this.active;
      c.fillStyle = on ? 'rgba(8,12,26,0.92)' : 'rgba(8,12,26,0.6)';
      c.strokeStyle = on ? chip.color : 'rgba(150,160,190,0.5)';
      c.lineWidth = on ? 6 : 3;
      c.beginPath();
      c.roundRect(x - 56, 12, 112, 92, 18);
      c.fill();
      if (on) {
        c.shadowColor = chip.color;
        c.shadowBlur = 18;
      }
      c.stroke();
      c.shadowBlur = 0;
      drawIcon(c, chip.id, x, 58, on ? 70 : 52, on ? chip.color : '#8089A0', on ? 14 : 0);
      if (chip.lent) {
        c.font = "bold 20px 'Rajdhani', system-ui, sans-serif";
        c.textAlign = 'center';
        c.fillStyle = '#FFD23F';
        c.fillText('LENT', x, 98);
      }
    }
    if (this.hint) {
      c.font = "bold 28px 'Rajdhani', system-ui, sans-serif";
      c.textAlign = 'center';
      c.lineWidth = 6;
      c.strokeStyle = 'rgba(0,0,0,0.85)';
      c.strokeText(this.hint, W / 2, 144);
      c.fillStyle = '#E9FCFF';
      c.fillText(this.hint, W / 2, 144);
    }
    this.texture.needsUpdate = true;
  }
}
