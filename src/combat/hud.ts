import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from '@iwsdk/core';
import type { Run } from './run.js';

const WIDTH = 1024;
const HEIGHT = 512;

/**
 * Floating status board: wave, health pips, score, combo and a big centre
 * message. Redraws its canvas only when something it shows has changed.
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
    this.mesh = new Mesh(
      new PlaneGeometry(0.9, 0.45),
      new MeshBasicMaterial({ map: this.texture, transparent: true, depthWrite: false }),
    );
    this.mesh.name = 'Hud';
    this.mesh.renderOrder = 20;
  }

  update(run: Run, message: string, hint: string): void {
    const key = `${run.phase}|${run.wave}|${run.health}|${run.score}|${run.combo}|${message}|${hint}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    const c = this.ctx;
    c.clearRect(0, 0, WIDTH, HEIGHT);
    c.textAlign = 'center';
    c.shadowColor = '#00E5FF';
    c.shadowBlur = 18;

    if (run.phase !== 'title') {
      c.font = 'bold 44px sans-serif';
      c.fillStyle = '#9FF6FF';
      c.textAlign = 'left';
      c.fillText(`WAVE ${Math.min(run.wave + 1, run.totalWaves)}/${run.totalWaves}`, 40, 64);
      c.textAlign = 'right';
      c.fillText(run.score.toString().padStart(6, '0'), WIDTH - 40, 64);
      for (let i = 0; i < 5; i += 1) {
        c.fillStyle = i < run.health ? '#FF2D6F' : 'rgba(255,45,111,0.18)';
        c.shadowColor = '#FF2D6F';
        c.fillRect(40 + i * 62, 92, 50, 20);
      }
      if (run.combo > 1) {
        c.textAlign = 'right';
        c.fillStyle = '#FFD23F';
        c.shadowColor = '#FF8A1F';
        c.font = 'bold 52px sans-serif';
        c.fillText(`x${Math.min(run.combo, 8)} COMBO`, WIDTH - 40, 130);
      }
    }

    c.textAlign = 'center';
    if (message) {
      c.font = 'bold 110px sans-serif';
      c.fillStyle = '#FFFFFF';
      c.shadowColor = '#00E5FF';
      c.shadowBlur = 32;
      c.fillText(message, WIDTH / 2, 300);
    }
    if (hint) {
      c.font = '40px sans-serif';
      c.fillStyle = '#CFFBFF';
      c.shadowBlur = 12;
      c.fillText(hint, WIDTH / 2, 390);
    }
    this.texture.needsUpdate = true;
  }
}
