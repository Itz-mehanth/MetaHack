import { CanvasTexture, type Camera, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from '@iwsdk/core';
import type { Vitals } from './vitals.js';

const W = 512;
const H = 128;
const PLANE_W = 0.36;
const PLANE_H = PLANE_W * (H / W);
const FONT = "'Orbitron', 'Rajdhani', system-ui, sans-serif";

const COLOR = { ok: '#3DF5FF', low: '#FFB020', critical: '#FF3B5C' } as const;

/** Quantises an animation value so the canvas is redrawn a few times a second, not every frame. */
const q = (value: number, steps: number): number => Math.round(value * steps);

/**
 * The shield gauge: a row of energy cells with the count, always in the lower
 * part of the view (a child of the camera, just above the squad strip) so the
 * player never has to look for their health. A hit shakes and swells it and
 * leaves the lost cell flashing white then draining red; a restore sweeps green
 * along it; at LOW it turns amber and at CRITICAL red, and it beats with the
 * heartbeat. Redrawn only while it is changing.
 */
export class ShieldGauge {
  readonly mesh: Mesh;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly texture: CanvasTexture;
  private key = '';
  private clock = 0;

  constructor(camera: Camera) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.mesh = new Mesh(
      new PlaneGeometry(PLANE_W, PLANE_H),
      new MeshBasicMaterial({ map: this.texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }),
    );
    this.mesh.name = 'ShieldGauge';
    this.mesh.position.set(0, -0.215, -0.85);
    this.mesh.renderOrder = 34;
    this.mesh.visible = false;
    camera.add(this.mesh);
    // The web font arrives after the first draw: draw again once it is ready.
    void document.fonts
      ?.load('900 40px Orbitron')
      .then(() => document.fonts.ready)
      .then(() => {
        this.key = '';
      });
  }

  /** `show`: the gauge belongs on screen now. `calm`: no shake, swell or strong pulse (REDUCE FLASHES). */
  update(v: Vitals, show: boolean, dt: number, calm: boolean): void {
    const visible = show && v.max > 0;
    this.mesh.visible = visible;
    if (!visible) return;
    this.clock += dt;
    const swell = calm ? 0 : Math.max(v.hurt, v.heal * 0.5) * 0.3;
    const beat = v.level === 'ok' ? 0 : v.pulse * (calm ? 0.35 : 1) * 0.1;
    this.mesh.scale.setScalar(1 + swell + beat);
    this.mesh.position.x = calm ? 0 : Math.sin(this.clock * 70) * 0.014 * v.hurt * v.hurt;
    this.draw(v, calm);
  }

  private draw(v: Vitals, calm: boolean): void {
    const cells = Math.max(1, Math.round(v.max));
    const blink = v.level !== 'ok' && v.pulse > 0.5 ? 1 : 0;
    const key = `${cells}|${v.health}|${q(v.ghost, 8)}|${q(v.hurt, 8)}|${q(v.heal, 8)}|${v.level}|${blink}|${calm ? 1 : 0}`;
    if (key === this.key) return;
    this.key = key;

    const c = this.ctx;
    const tint = COLOR[v.level];
    c.clearRect(0, 0, W, H);

    // A dim plate so the cells read on a bright room, outlined in the level's colour.
    c.save();
    c.beginPath();
    c.roundRect(6, 6, W - 12, H - 12, 22);
    c.fillStyle = 'rgba(6, 10, 26, 0.66)';
    c.fill();
    c.lineWidth = v.level === 'ok' ? 3 : 5;
    c.strokeStyle = tint;
    c.globalAlpha = v.level === 'ok' ? 0.6 : 0.75 + 0.25 * blink;
    c.shadowColor = tint;
    c.shadowBlur = v.level === 'ok' ? 10 : 20;
    c.stroke();
    c.restore();

    // The label and the count.
    const left = Math.ceil(v.health - 1e-6);
    let label = `SHIELD ${left}/${cells}`;
    let labelColor = '#9BF8FF';
    if (v.health <= 0) {
      label = 'SHIELD DOWN';
      labelColor = COLOR.critical;
    } else if (v.level === 'critical') {
      label = `CRITICAL ${left}/${cells}`;
      labelColor = blink ? '#FFFFFF' : COLOR.critical;
    } else if (v.level === 'low') {
      label = `SHIELD LOW ${left}/${cells}`;
      labelColor = blink ? '#FFFFFF' : COLOR.low;
    } else if (v.heal > 0.3) {
      label = `SHIELD UP ${left}/${cells}`;
      labelColor = '#39FF88';
    }
    c.save();
    c.font = `900 24px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 5;
    c.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    c.strokeText(label, W / 2, 33);
    c.fillStyle = labelColor;
    c.fillText(label, W / 2, 33);
    c.restore();

    // The cells.
    const gap = 10;
    const area = W - 72;
    const cellW = Math.min(78, (area - (cells - 1) * gap) / cells);
    const x0 = (W - (cells * cellW + (cells - 1) * gap)) / 2;
    const y0 = 56;
    const cellH = 48;
    const sweep = (1 - v.heal) * (cells + 1.5);
    for (let i = 0; i < cells; i += 1) {
      const x = x0 + i * (cellW + gap);
      // A hexagonal energy cell.
      const path = (): void => {
        const b = 9;
        c.beginPath();
        c.moveTo(x + b, y0);
        c.lineTo(x + cellW - b, y0);
        c.lineTo(x + cellW, y0 + cellH / 2);
        c.lineTo(x + cellW - b, y0 + cellH);
        c.lineTo(x + b, y0 + cellH);
        c.lineTo(x, y0 + cellH / 2);
        c.closePath();
      };
      c.save();
      path();
      c.fillStyle = 'rgba(160, 180, 210, 0.1)';
      c.fill();
      c.lineWidth = 3;
      c.strokeStyle = 'rgba(160, 180, 210, 0.45)';
      c.stroke();
      c.clip();

      // What has just been lost, flashing white then draining red.
      const ghost = Math.min(1, Math.max(0, v.ghost - i));
      if (ghost > 0) {
        c.fillStyle = v.hurt > 0.45 ? '#FFFFFF' : '#FF4D63';
        c.fillRect(x, y0, cellW * ghost, cellH);
      }
      const real = Math.min(1, Math.max(0, v.health - i));
      if (real > 0) {
        c.fillStyle = tint;
        c.shadowColor = tint;
        c.shadowBlur = 14;
        c.fillRect(x, y0, cellW * real, cellH);
        // A bright band across the top of a full cell.
        c.shadowBlur = 0;
        c.fillStyle = 'rgba(255, 255, 255, 0.28)';
        c.fillRect(x, y0, cellW * real, cellH * 0.32);
      }
      // A restore sweeps green along the cells that are full.
      if (v.heal > 0 && real > 0) {
        const glow = Math.max(0, 1 - Math.abs(i + 0.5 - sweep)) * 0.85;
        if (glow > 0) {
          c.fillStyle = `rgba(57, 255, 136, ${glow.toFixed(2)})`;
          c.fillRect(x, y0, cellW * real, cellH);
        }
      }
      c.restore();

      // A crack through a cell that has just broken.
      if (v.hurt > 0.05 && ghost > 0 && real < 1) {
        c.save();
        c.strokeStyle = `rgba(255, 255, 255, ${Math.min(1, v.hurt * 1.4).toFixed(2)})`;
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(x + cellW * 0.55, y0 + 2);
        c.lineTo(x + cellW * 0.42, y0 + cellH * 0.35);
        c.lineTo(x + cellW * 0.6, y0 + cellH * 0.6);
        c.lineTo(x + cellW * 0.45, y0 + cellH - 2);
        c.stroke();
        c.restore();
      }
    }
    this.texture.needsUpdate = true;
  }
}
