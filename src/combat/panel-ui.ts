import {
  AdditiveBlending,
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Vector3,
} from '@iwsdk/core';
import { drawIcon, iconsReady } from './icons.js';

/** Canvas pixels; widgets are laid out in this space. */
export const PANEL_PX_W = 1600;
export const PANEL_PX_H = 1000;
const WIDTH_M = 0.78;
const HEIGHT_M = WIDTH_M * (PANEL_PX_H / PANEL_PX_W);
const FONT = "'Orbitron', 'Rajdhani', system-ui, sans-serif";
const BODY = "'Rajdhani', system-ui, sans-serif";

export type WidgetKind = 'button' | 'tile' | 'slider' | 'text' | 'portrait';

export interface Widget {
  id: string;
  kind?: WidgetKind;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  /** Second line (tiles, buttons) or right-hand note (text). */
  sub?: string;
  /** Third line for tiles. */
  detail?: string;
  color?: string;
  disabled?: boolean;
  selected?: boolean;
  /** 0..1 for sliders. */
  value?: number;
  /** 0..3 stars drawn on tiles; undefined hides them. */
  stars?: number;
  /** Small corner label, e.g. a price or LOCKED. */
  badge?: string;
  size?: number;
  align?: 'left' | 'center';
  /** Icon name from public/icons, drawn on buttons and tiles. */
  icon?: string;
}

export interface PanelContent {
  title: string;
  subtitle?: string;
  coins?: number;
  accent: string;
  widgets: Widget[];
}

export interface PanelEvent {
  id: string;
  value?: number;
  /** World position of the touch, for feedback effects. */
  point: Vector3;
}

/**
 * A holographic, pokeable menu panel drawn on a canvas. Fingertips press a
 * widget by pushing through the panel surface; they must pull back before
 * pressing again. Sliders track the fingertip while it is pressed in.
 */
export class Panel {
  readonly group = new Group();
  visible = false;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly texture: CanvasTexture;
  private readonly face: Mesh;
  private readonly glow: MeshBasicMaterial;
  private content: PanelContent = { title: '', accent: '#3DF5FF', widgets: [] };
  private hoverId = '';
  private flashId = '';
  private flash = 0;
  private armed = true;
  private dirty = true;
  private readonly local = new Vector3();
  private readonly flat = new Vector3();
  private readonly event: PanelEvent = { id: '', point: new Vector3() };

  constructor() {
    this.group.name = 'MenuPanel';
    this.canvas = document.createElement('canvas');
    this.canvas.width = PANEL_PX_W;
    this.canvas.height = PANEL_PX_H;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.texture.anisotropy = 8;
    this.face = new Mesh(
      new PlaneGeometry(WIDTH_M, HEIGHT_M),
      new MeshBasicMaterial({ map: this.texture, transparent: true, depthWrite: false, toneMapped: false }),
    );
    this.face.renderOrder = 25;
    this.glow = new MeshBasicMaterial({
      color: '#3DF5FF',
      transparent: true,
      opacity: 0.12,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const halo = new Mesh(new PlaneGeometry(WIDTH_M * 1.06, HEIGHT_M * 1.08), this.glow);
    halo.position.z = -0.003;
    this.group.add(halo, this.face);
    this.group.visible = false;
    void document.fonts?.ready.then(() => {
      this.dirty = true;
    });
    void iconsReady.then(() => {
      this.dirty = true;
    });
  }

  setContent(content: PanelContent): void {
    this.content = content;
    this.glow.color.set(content.accent);
    this.dirty = true;
  }

  /**
   * Floats the panel at arm's reach in front of `head`, tilted toward it.
   * `drop` lowers it (e.g. to keep 3D content above it visible).
   */
  place(head: Vector3, forward: Vector3, distance = 0.5, drop = 0.18): void {
    this.flat.set(forward.x, 0, forward.z);
    if (this.flat.lengthSq() < 1e-4) this.flat.set(0, 0, -1);
    this.flat.normalize();
    this.group.position.copy(head).addScaledVector(this.flat, distance);
    this.group.position.y = head.y - drop;
    this.local.copy(head);
    this.local.y -= 0.05;
    this.group.lookAt(this.local);
  }

  show(): void {
    this.visible = true;
    this.group.visible = true;
    this.armed = false;
  }

  hide(): void {
    this.visible = false;
    this.group.visible = false;
    this.hoverId = '';
  }

  private widgetAt(px: number, py: number): Widget | undefined {
    for (const w of this.content.widgets) {
      if (w.kind === 'text' || w.kind === 'portrait') continue;
      if (px >= w.x && px <= w.x + w.w && py >= w.y && py <= w.y + w.h) return w;
    }
    return undefined;
  }

  /** Converts a world point to panel pixels; z is metres in front of the face. */
  private toPanel(point: Vector3): void {
    this.local.copy(point);
    this.face.worldToLocal(this.local);
    this.local.x = (this.local.x / WIDTH_M + 0.5) * PANEL_PX_W;
    this.local.y = (0.5 - this.local.y / HEIGHT_M) * PANEL_PX_H;
  }

  /** Handles fingertip pokes; returns a press event or null. */
  update(dt: number, tips: readonly Vector3[]): PanelEvent | null {
    if (!this.visible) return null;
    this.flash = Math.max(0, this.flash - dt * 4);
    if (this.flash === 0 && this.flashId) {
      this.flashId = '';
      this.dirty = true;
    }
    let hover = '';
    let result: PanelEvent | null = null;
    let anyClose = false;
    for (const tip of tips) {
      this.toPanel(tip);
      const { x, y, z } = this.local;
      if (x < 0 || x > PANEL_PX_W || y < 0 || y > PANEL_PX_H || z > 0.12 || z < -0.08) continue;
      if (z < 0.03) anyClose = true;
      const widget = this.widgetAt(x, y);
      if (widget == null || widget.disabled) continue;
      hover = widget.id;
      if (z > 0.01) continue;
      if (widget.kind === 'slider') {
        const value = Math.min(1, Math.max(0, (x - widget.x - 40) / (widget.w - 80)));
        if (Math.abs(value - (widget.value ?? 0)) > 0.02) {
          result = this.emit(widget, tip, value);
        }
      } else if (this.armed) {
        this.armed = false;
        result = this.emit(widget, tip);
      }
    }
    if (!anyClose) this.armed = true;
    if (hover !== this.hoverId) {
      this.hoverId = hover;
      this.dirty = true;
    }
    this.glow.opacity = 0.1 + (hover ? 0.08 : 0) + this.flash * 0.2;
    if (this.dirty) this.draw();
    return result;
  }

  /** Desktop click: intersects a ray with the panel plane. */
  click(origin: Vector3, direction: Vector3): PanelEvent | null {
    if (!this.visible) return null;
    this.face.getWorldPosition(this.flat);
    this.local.set(0, 0, 1).applyQuaternion(this.group.quaternion);
    const denom = direction.dot(this.local);
    if (Math.abs(denom) < 1e-5) return null;
    const t = this.flat.sub(origin).dot(this.local) / denom;
    if (t <= 0) return null;
    const hit = this.event.point.copy(origin).addScaledVector(direction, t);
    this.toPanel(hit);
    const widget = this.widgetAt(this.local.x, this.local.y);
    if (widget == null || widget.disabled) return null;
    const value = widget.kind === 'slider' ? Math.min(1, Math.max(0, (this.local.x - widget.x - 40) / (widget.w - 80))) : undefined;
    return this.emit(widget, hit, value);
  }

  private emit(widget: Widget, point: Vector3, value?: number): PanelEvent {
    if (widget.kind !== 'slider') {
      this.flashId = widget.id;
      this.flash = 1;
      this.dirty = true;
    }
    this.event.id = widget.id;
    this.event.value = value;
    this.event.point.copy(point);
    return this.event;
  }

  // ---------------------------------------------------------------- drawing

  private draw(): void {
    this.dirty = false;
    const c = this.ctx;
    const { accent, title, subtitle, coins, widgets } = this.content;
    c.clearRect(0, 0, PANEL_PX_W, PANEL_PX_H);

    c.save();
    c.beginPath();
    c.roundRect(8, 8, PANEL_PX_W - 16, PANEL_PX_H - 16, 48);
    const bg = c.createLinearGradient(0, 0, 0, PANEL_PX_H);
    bg.addColorStop(0, 'rgba(14, 6, 34, 0.9)');
    bg.addColorStop(1, 'rgba(3, 1, 10, 0.92)');
    c.fillStyle = bg;
    c.fill();
    c.lineWidth = 5;
    c.strokeStyle = accent;
    c.shadowColor = accent;
    c.shadowBlur = 30;
    c.stroke();
    c.restore();

    c.textBaseline = 'middle';
    c.textAlign = 'left';
    c.fillStyle = '#FFFFFF';
    c.shadowColor = accent;
    c.shadowBlur = 24;
    c.font = `900 72px ${FONT}`;
    c.fillText(title, 64, 92);
    c.shadowBlur = 0;
    if (subtitle) {
      c.fillStyle = accent;
      c.font = `600 34px ${BODY}`;
      c.fillText(subtitle, 68, 152);
    }
    if (coins != null) this.drawCoins(coins);

    for (const w of widgets) {
      const hover = w.id === this.hoverId;
      const flash = w.id === this.flashId ? this.flash : 0;
      switch (w.kind ?? 'button') {
        case 'button':
          this.drawButton(w, hover, flash, accent);
          break;
        case 'tile':
          this.drawTile(w, hover, flash, accent);
          break;
        case 'slider':
          this.drawSlider(w, hover, accent);
          break;
        case 'text':
          this.drawText(w);
          break;
        case 'portrait':
          this.drawPortrait(w);
          break;
      }
    }
    this.texture.needsUpdate = true;
  }

  private drawCoins(coins: number): void {
    const c = this.ctx;
    const text = coins.toLocaleString('en-US');
    c.font = `900 48px ${FONT}`;
    const width = c.measureText(text).width;
    const x = PANEL_PX_W - 70 - width;
    if (!drawIcon(c, 'coins', x - 42, 92, 64, '#FFD23F', 18)) {
      c.beginPath();
      c.arc(x - 40, 92, 24, 0, Math.PI * 2);
      c.fillStyle = '#FFD23F';
      c.fill();
    }
    c.textAlign = 'left';
    c.fillStyle = '#FFE58A';
    c.font = `900 48px ${FONT}`;
    c.fillText(text, x, 94);
  }

  private roundBox(w: Widget, radius: number, fill: string, stroke: string | null, glow: number): void {
    const c = this.ctx;
    c.save();
    c.beginPath();
    c.roundRect(w.x, w.y, w.w, w.h, radius);
    c.fillStyle = fill;
    c.fill();
    if (stroke) {
      c.lineWidth = 4;
      c.strokeStyle = stroke;
      c.shadowColor = stroke;
      c.shadowBlur = glow;
      c.stroke();
    }
    c.restore();
  }

  private drawButton(w: Widget, hover: boolean, flash: number, accent: string): void {
    const color = w.color ?? accent;
    const c = this.ctx;
    const primary = w.selected;
    const fill = w.disabled
      ? 'rgba(255,255,255,0.05)'
      : primary
        ? color
        : `rgba(255,255,255,${0.06 + (hover ? 0.08 : 0) + flash * 0.3})`;
    this.roundBox(w, Math.min(36, w.h / 2), fill, w.disabled ? null : color, hover ? 30 : 12);
    if (w.icon) {
      const size = Math.min(w.h * 0.62, 110);
      const tint = w.disabled ? 'rgba(255,255,255,0.35)' : primary ? '#06020F' : color;
      drawIcon(c, w.icon, w.x + size * 0.5 + 26, w.y + w.h / 2, size, tint, primary ? 0 : 14);
    }
    c.textAlign = 'center';
    c.fillStyle = w.disabled ? 'rgba(255,255,255,0.35)' : primary ? '#06020F' : '#FFFFFF';
    c.font = `900 ${w.size ?? 40}px ${FONT}`;
    const cy = w.y + w.h / 2;
    if (w.sub) {
      c.fillText(w.label, w.x + w.w / 2, cy - 18);
      c.font = `600 28px ${BODY}`;
      c.fillStyle = w.disabled ? 'rgba(255,255,255,0.3)' : primary ? '#06020F' : 'rgba(233,252,255,0.8)';
      c.fillText(w.sub, w.x + w.w / 2, cy + 24);
    } else {
      c.fillText(w.label, w.x + w.w / 2, cy + 2);
    }
  }

  private drawTile(w: Widget, hover: boolean, flash: number, accent: string): void {
    const color = w.color ?? accent;
    const c = this.ctx;
    const fill = w.selected ? 'rgba(255,255,255,0.14)' : `rgba(255,255,255,${0.04 + (hover ? 0.07 : 0) + flash * 0.3})`;
    this.roundBox(w, 28, fill, w.disabled ? 'rgba(255,255,255,0.18)' : color, hover || w.selected ? 34 : 10);
    c.textAlign = 'center';
    const cx = w.x + w.w / 2;
    let y = w.y + 56;
    if (w.icon) {
      const size = Math.min(130, w.h * 0.26);
      drawIcon(c, w.icon, cx, w.y + 24 + size / 2, size, w.disabled ? 'rgba(255,255,255,0.3)' : color, 26);
      y += size + 4;
    }
    c.fillStyle = w.disabled ? 'rgba(255,255,255,0.45)' : '#FFFFFF';
    c.shadowColor = color;
    c.shadowBlur = w.disabled ? 0 : 16;
    c.font = `900 ${w.size ?? 42}px ${FONT}`;
    c.fillText(w.label, cx, y);
    c.shadowBlur = 0;
    if (w.sub) {
      y += 52;
      c.fillStyle = w.disabled ? 'rgba(255,255,255,0.35)' : color;
      c.font = `700 30px ${FONT}`;
      c.fillText(w.sub, cx, y);
    }
    if (w.detail) {
      c.fillStyle = w.disabled ? 'rgba(255,255,255,0.3)' : 'rgba(233,252,255,0.78)';
      c.font = `600 28px ${BODY}`;
      const lines = w.detail.split('\n');
      for (const line of lines) {
        y += 40;
        c.fillText(line, cx, y);
      }
    }
    if (w.stars != null) {
      c.font = `900 44px ${FONT}`;
      for (let i = 0; i < 3; i += 1) {
        c.fillStyle = i < w.stars ? '#FFD23F' : 'rgba(255,255,255,0.15)';
        c.fillText('★', cx + (i - 1) * 54, w.y + w.h - 90);
      }
    }
    if (w.badge) {
      c.font = `900 28px ${FONT}`;
      const bw = c.measureText(w.badge).width + 40;
      const bx = cx - bw / 2;
      const by = w.y + w.h - 54;
      c.save();
      c.beginPath();
      c.roundRect(bx, by, bw, 40, 20);
      c.fillStyle = w.disabled ? 'rgba(255,255,255,0.1)' : color;
      c.fill();
      c.restore();
      c.fillStyle = w.disabled ? 'rgba(255,255,255,0.6)' : '#06020F';
      c.fillText(w.badge, cx, by + 21);
    }
  }

  private drawSlider(w: Widget, hover: boolean, accent: string): void {
    const color = w.color ?? accent;
    const c = this.ctx;
    const value = w.value ?? 0;
    this.roundBox(w, w.h / 2, `rgba(255,255,255,${hover ? 0.1 : 0.05})`, color, hover ? 24 : 8);
    const left = w.x + 40;
    const right = w.x + w.w - 40;
    const cy = w.y + w.h / 2 + 18;
    c.fillStyle = 'rgba(255,255,255,0.15)';
    c.fillRect(left, cy - 6, right - left, 12);
    c.fillStyle = color;
    c.fillRect(left, cy - 6, (right - left) * value, 12);
    c.beginPath();
    c.arc(left + (right - left) * value, cy, 22, 0, Math.PI * 2);
    c.fillStyle = '#FFFFFF';
    c.shadowColor = color;
    c.shadowBlur = 20;
    c.fill();
    c.shadowBlur = 0;
    c.textAlign = 'left';
    c.fillStyle = '#FFFFFF';
    c.font = `700 30px ${FONT}`;
    c.fillText(w.label, w.x + 40, w.y + 34);
    c.textAlign = 'right';
    c.fillText(`${Math.round(value * 100)}%`, w.x + w.w - 40, w.y + 34);
  }

  /** Stylised holographic face for a transmission; `label` is the speaker kind. */
  private drawPortrait(w: Widget): void {
    const c = this.ctx;
    const color = w.color ?? '#FFFFFF';
    this.roundBox(w, 28, 'rgba(255,255,255,0.04)', color, 26);
    const cx = w.x + w.w / 2;
    const cy = w.y + w.h * 0.46;
    const r = w.w * 0.3;
    c.save();
    c.shadowColor = color;
    c.shadowBlur = 30;
    c.strokeStyle = color;
    c.fillStyle = 'rgba(10, 6, 24, 0.9)';
    c.lineWidth = 6;
    // Head / helmet.
    c.beginPath();
    c.ellipse(cx, cy, r, r * 1.2, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = color;
    const speaker = w.label;
    if (speaker === 'vex') {
      // Crown of spikes and burning slit eyes.
      for (let i = -2; i <= 2; i += 1) {
        c.beginPath();
        c.moveTo(cx + i * r * 0.35 - r * 0.12, cy - r * 1.05);
        c.lineTo(cx + i * r * 0.35, cy - r * (1.6 - Math.abs(i) * 0.15));
        c.lineTo(cx + i * r * 0.35 + r * 0.12, cy - r * 1.05);
        c.fill();
      }
      for (const side of [-1, 1]) {
        c.beginPath();
        c.moveTo(cx + side * r * 0.15, cy - r * 0.1);
        c.lineTo(cx + side * r * 0.75, cy - r * 0.35);
        c.lineTo(cx + side * r * 0.7, cy - r * 0.05);
        c.fill();
      }
      c.fillRect(cx - r * 0.45, cy + r * 0.55, r * 0.9, r * 0.08);
    } else if (speaker === 'villain') {
      // Angular mask with a jagged grin.
      for (const side of [-1, 1]) {
        c.beginPath();
        c.moveTo(cx + side * r * 0.12, cy - r * 0.15);
        c.lineTo(cx + side * r * 0.65, cy - r * 0.3);
        c.lineTo(cx + side * r * 0.55, cy + r * 0.02);
        c.fill();
      }
      c.beginPath();
      c.moveTo(cx - r * 0.5, cy + r * 0.45);
      for (let i = 0; i <= 8; i += 1) c.lineTo(cx - r * 0.5 + i * r * 0.125, cy + r * (i % 2 ? 0.62 : 0.45));
      c.stroke();
    } else if (speaker === 'oblivax') {
      // Faceless mask: one burning vertical eye under a crown of shards.
      for (let i = -3; i <= 3; i += 1) {
        c.beginPath();
        c.moveTo(cx + i * r * 0.26 - r * 0.08, cy - r * 1.1);
        c.lineTo(cx + i * r * 0.26, cy - r * (1.75 - Math.abs(i) * 0.14));
        c.lineTo(cx + i * r * 0.26 + r * 0.08, cy - r * 1.1);
        c.fill();
      }
      c.fillStyle = '#FFFFFF';
      c.beginPath();
      c.ellipse(cx, cy - r * 0.1, r * 0.09, r * 0.45, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = color;
      for (const side of [-1, 1]) c.fillRect(cx + side * r * 0.45 - r * 0.03, cy + r * 0.2, r * 0.06, r * 0.5);
    } else if (speaker === 'echo') {
      // Command AI: concentric rings and a live waveform.
      c.lineWidth = 4;
      for (const k of [0.35, 0.6]) {
        c.beginPath();
        c.arc(cx, cy, r * k, 0, Math.PI * 2);
        c.stroke();
      }
      c.lineWidth = 6;
      c.beginPath();
      for (let i = 0; i <= 24; i += 1) {
        const x = cx - r * 0.8 + (i / 24) * r * 1.6;
        const y = cy + Math.sin(i * 1.3 + (w.value ?? 0) * 20) * r * 0.18 * Math.sin((i / 24) * Math.PI);
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    } else if (speaker === 'hero') {
      // Hero visor band.
      c.beginPath();
      c.roundRect(cx - r * 0.75, cy - r * 0.25, r * 1.5, r * 0.32, r * 0.16);
      c.fill();
      c.fillRect(cx - r * 0.06, cy + r * 0.3, r * 0.12, r * 0.5);
    } else {
      // Civilian: simple friendly face.
      for (const side of [-1, 1]) {
        c.beginPath();
        c.arc(cx + side * r * 0.35, cy - r * 0.15, r * 0.1, 0, Math.PI * 2);
        c.fill();
      }
      c.beginPath();
      c.arc(cx, cy + r * 0.25, r * 0.35, 0.15 * Math.PI, 0.85 * Math.PI);
      c.stroke();
    }
    c.restore();
    // Scanlines for the hologram look.
    c.fillStyle = 'rgba(0, 0, 0, 0.25)';
    for (let y = w.y + 8; y < w.y + w.h - 8; y += 8) c.fillRect(w.x + 8, y, w.w - 16, 3);
    // Signal glitch as a new line comes in: torn, colour-split bars.
    const glitch = w.value ?? 0;
    if (glitch > 0) {
      for (let i = 0; i < Math.ceil(glitch * 7); i += 1) {
        const y = w.y + 20 + Math.random() * (w.h - 40);
        const h = 4 + Math.random() * 14;
        const shift = (Math.random() - 0.5) * 60 * glitch;
        c.fillStyle = i % 2 ? `rgba(255, 45, 154, ${0.5 * glitch})` : `rgba(61, 245, 255, ${0.5 * glitch})`;
        c.fillRect(w.x + 10 + shift, y, w.w - 20, h);
      }
    }
  }

  private drawText(w: Widget): void {
    const c = this.ctx;
    c.textAlign = w.align === 'center' ? 'center' : 'left';
    c.fillStyle = w.color ?? 'rgba(233,252,255,0.85)';
    c.font = `600 ${w.size ?? 32}px ${BODY}`;
    const x = w.align === 'center' ? w.x + w.w / 2 : w.x;
    const lines = w.label.split('\n');
    lines.forEach((line, i) => c.fillText(line, x, w.y + 20 + i * (w.size ?? 32) * 1.35));
    if (w.sub) {
      c.textAlign = 'right';
      c.fillText(w.sub, w.x + w.w, w.y + 20);
    }
  }
}
