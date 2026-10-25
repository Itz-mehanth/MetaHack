import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from '@iwsdk/core';
import { MAX_HEALTH, type Run } from './run.js';

const WIDTH = 1024;
const HEIGHT = 512;
const FONT = "'Orbitron', 'Rajdhani', system-ui, sans-serif";

/**
 * Floating status board: a glass status bar (wave, health, score), a combo
 * badge, and a large centre announcement with an optional hint. Redraws its
 * canvas only when something it shows has changed.
 */
export class Hud {
  readonly mesh: Mesh;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly texture: CanvasTexture;
  private lastKey = '';

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.texture.anisotropy = 4;
    this.mesh = new Mesh(
      new PlaneGeometry(0.8, 0.4),
      new MeshBasicMaterial({ map: this.texture, transparent: true, depthWrite: false, toneMapped: false }),
    );
    this.mesh.name = 'Hud';
    this.mesh.renderOrder = 20;
    // Web fonts arrive after the first draw; redraw once they are ready.
    void document.fonts
      ?.load(`900 40px Orbitron`)
      .then(() => document.fonts.ready)
      .then(() => {
        this.lastKey = '';
      });
  }

  update(run: Run, message: string, hint: string): void {
    const key = `${run.phase}|${run.wave}|${run.health}|${run.score}|${run.combo}|${message}|${hint}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    const c = this.ctx;
    c.clearRect(0, 0, WIDTH, HEIGHT);

    if (run.phase !== 'title') this.drawStatus(run);
    if (message) this.drawMessage(message);
    if (hint) this.drawHint(hint);
    this.texture.needsUpdate = true;
  }

  private glass(x: number, y: number, w: number, h: number, r: number, accent: string): void {
    const c = this.ctx;
    c.save();
    c.beginPath();
    c.roundRect(x, y, w, h, r);
    c.fillStyle = 'rgba(8, 4, 22, 0.72)';
    c.fill();
    c.lineWidth = 3;
    c.strokeStyle = accent;
    c.shadowColor = accent;
    c.shadowBlur = 16;
    c.stroke();
    c.restore();
  }

  private drawStatus(run: Run): void {
    const c = this.ctx;
    this.glass(24, 20, WIDTH - 48, 104, 26, 'rgba(61, 245, 255, 0.7)');

    c.textBaseline = 'middle';
    c.textAlign = 'left';
    c.fillStyle = '#7FF6FF';
    c.font = `700 22px ${FONT}`;
    c.fillText('WAVE', 58, 54);
    c.fillStyle = '#FFFFFF';
    c.font = `900 46px ${FONT}`;
    c.fillText(`${Math.min(run.wave + 1, run.totalWaves)}/${run.totalWaves}`, 56, 94);

    // Health: segmented bar in the middle.
    const segW = 58;
    const gap = 10;
    const total = MAX_HEALTH * segW + (MAX_HEALTH - 1) * gap;
    const x0 = (WIDTH - total) / 2;
    c.fillStyle = '#FF7AC6';
    c.font = `700 22px ${FONT}`;
    c.textAlign = 'center';
    c.fillText('SHIELD', WIDTH / 2, 50);
    for (let i = 0; i < MAX_HEALTH; i += 1) {
      const alive = i < run.health;
      c.save();
      c.beginPath();
      c.roundRect(x0 + i * (segW + gap), 74, segW, 26, 8);
      c.fillStyle = alive ? (run.health <= 2 ? '#FF3B5C' : '#FF2D9A') : 'rgba(255, 45, 154, 0.15)';
      if (alive) {
        c.shadowColor = '#FF2D9A';
        c.shadowBlur = 14;
      }
      c.fill();
      c.restore();
    }

    c.textAlign = 'right';
    c.fillStyle = '#7FF6FF';
    c.font = `700 22px ${FONT}`;
    c.fillText('SCORE', WIDTH - 58, 54);
    c.fillStyle = '#FFFFFF';
    c.font = `900 46px ${FONT}`;
    c.fillText(run.score.toLocaleString('en-US'), WIDTH - 56, 94);

    if (run.combo > 1) {
      this.glass(WIDTH - 260, 138, 212, 64, 20, 'rgba(255, 210, 63, 0.9)');
      c.textAlign = 'center';
      c.fillStyle = '#FFD23F';
      c.shadowColor = '#FF8A1F';
      c.shadowBlur = 18;
      c.font = `900 36px ${FONT}`;
      c.fillText(`x${Math.min(run.combo, 8)} COMBO`, WIDTH - 154, 171);
      c.shadowBlur = 0;
    }
  }

  private drawMessage(message: string): void {
    const c = this.ctx;
    c.save();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `900 112px ${FONT}`;
    const gradient = c.createLinearGradient(0, 230, 0, 350);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(0.55, '#7FF6FF');
    gradient.addColorStop(1, '#FF2D9A');
    c.fillStyle = gradient;
    c.shadowColor = 'rgba(61, 245, 255, 0.9)';
    c.shadowBlur = 36;
    c.fillText(message, WIDTH / 2, 295);
    c.restore();
  }

  private drawHint(hint: string): void {
    const c = this.ctx;
    c.font = `600 30px ${FONT}`;
    const w = Math.min(WIDTH - 60, c.measureText(hint).width + 80);
    this.glass((WIDTH - w) / 2, 384, w, 70, 35, 'rgba(255, 45, 154, 0.75)');
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#F2FDFF';
    c.fillText(hint, WIDTH / 2, 420);
  }
}
