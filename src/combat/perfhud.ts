import { CanvasTexture, type Camera, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from '@iwsdk/core';

export interface PerfReadout {
  fps: number;
  avgMs: number;
  p95Ms: number;
  slowPct: number;
  tier: number;
  locked: boolean;
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  enemies: number;
  /** Shown as a heading, e.g. the session kind. */
  mode: string;
}

const W = 384;
const H = 192;

/**
 * A small developer readout of frame rate, frame time, draw calls, triangles
 * and the quality tier. In a headset it is a card stuck low in the view; on a
 * flat screen it is a corner overlay. Redraws a few times a second.
 */
export class PerfHud {
  readonly mesh: Mesh;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly texture: CanvasTexture;
  private readonly dom: HTMLPreElement;
  private enabled = false;
  private wait = 0;

  constructor(camera: Camera) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.mesh = new Mesh(
      new PlaneGeometry(0.3, 0.15),
      new MeshBasicMaterial({ map: this.texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }),
    );
    this.mesh.name = 'PerfHud';
    this.mesh.position.set(-0.22, -0.2, -0.8);
    this.mesh.renderOrder = 40;
    this.mesh.visible = false;
    camera.add(this.mesh);

    this.dom = document.createElement('pre');
    this.dom.style.cssText =
      'position:fixed;left:8px;top:8px;margin:0;padding:6px 8px;font:12px/1.35 monospace;color:#9DFFB0;background:rgba(0,0,0,0.65);border-radius:6px;z-index:99999;pointer-events:none;display:none;white-space:pre';
    document.body.appendChild(this.dom);
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.mesh.visible = on;
    this.dom.style.display = on ? 'block' : 'none';
  }

  /** Redraws about four times a second. `presenting`: in a headset (DOM is hidden there). */
  update(dt: number, read: () => PerfReadout, presenting: boolean): void {
    if (!this.enabled) return;
    this.wait -= dt;
    if (this.wait > 0) return;
    this.wait = 0.25;
    const r = read();
    const good = r.fps >= 60;
    const lines = [
      `${r.fps.toFixed(0)} fps  ${r.avgMs.toFixed(1)} ms  p95 ${r.p95Ms.toFixed(1)}`,
      `slow ${r.slowPct.toFixed(0)}%  tier ${r.tier}${r.locked ? ' (locked)' : ''}`,
      `calls ${r.calls}  tris ${(r.triangles / 1000).toFixed(0)}k`,
      `geo ${r.geometries}  tex ${r.textures}  foes ${r.enemies}`,
      r.mode,
    ];
    if (presenting) {
      const c = this.ctx;
      c.clearRect(0, 0, W, H);
      c.fillStyle = 'rgba(6, 8, 18, 0.82)';
      c.fillRect(0, 0, W, H);
      c.strokeStyle = good ? '#3DFF8A' : '#FF3B5C';
      c.lineWidth = 4;
      c.strokeRect(2, 2, W - 4, H - 4);
      c.font = 'bold 30px monospace';
      c.fillStyle = good ? '#9DFFB0' : '#FF8A9A';
      c.fillText(lines[0], 14, 42);
      c.font = '24px monospace';
      c.fillStyle = '#FFFFFF';
      for (let i = 1; i < lines.length; i += 1) c.fillText(lines[i], 14, 42 + i * 34);
      this.texture.needsUpdate = true;
    } else {
      this.dom.style.color = good ? '#9DFFB0' : '#FF8A9A';
      this.dom.textContent = lines.join('\n');
    }
  }
}
