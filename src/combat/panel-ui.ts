import {
  AdditiveBlending,
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
} from '@iwsdk/core';
import { drawIcon, iconsReady } from './icons.js';

/** Canvas pixels; widgets are laid out in this space. */
export const PANEL_PX_W = 1600;
export const PANEL_PX_H = 1000;
const WIDTH_M = 0.78;
const HEIGHT_M = WIDTH_M * (PANEL_PX_H / PANEL_PX_W);
/** The panel's size in metres (the menu handle hangs under it). */
export const PANEL_W_M = WIDTH_M;
export const PANEL_H_M = HEIGHT_M;
const FONT = "'Orbitron', 'Rajdhani', system-ui, sans-serif";
const BODY = "'Rajdhani', system-ui, sans-serif";
const COMIC = "'Bangers', 'Impact', sans-serif";

function rgb(hex: string): [number, number, number] {
  const h = hex.startsWith('#') ? hex.slice(1) : hex;
  const full = h.length === 3 ? h.replace(/./g, (x) => x + x) : h.slice(0, 6);
  const n = parseInt(full, 16);
  return Number.isNaN(n) ? [255, 255, 255] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** `a` blended toward `b` by `t`, as an rgba() string with `alpha`. */
function mix(a: string, b: string, t: number, alpha: number): string {
  const A = rgb(a);
  const B = rgb(b);
  const ch = (k: number) => Math.round(A[k] + (B[k] - A[k]) * t);
  return `rgba(${ch(0)}, ${ch(1)}, ${ch(2)}, ${alpha})`;
}

/** Rectangle path with its corners cut at 45 degrees. */
function chamfer(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, cut: number): void {
  c.beginPath();
  c.moveTo(x + cut, y);
  c.lineTo(x + w - cut, y);
  c.lineTo(x + w, y + cut);
  c.lineTo(x + w, y + h - cut);
  c.lineTo(x + w - cut, y + h);
  c.lineTo(x + cut, y + h);
  c.lineTo(x, y + h - cut);
  c.lineTo(x, y + cut);
  c.closePath();
}

/** Parallelogram path leaning right by `skew` pixels. */
function slant(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, skew: number): void {
  c.beginPath();
  c.moveTo(x + skew, y);
  c.lineTo(x + w, y);
  c.lineTo(x + w - skew, y + h);
  c.lineTo(x, y + h);
  c.closePath();
}

function hexagon(c: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  c.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    if (i === 0) c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  c.closePath();
}

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
  /** Widget under the gaze ray this frame (set by `aim`, consumed by `update`). */
  private aimId = '';
  private flashId = '';
  private flash = 0;
  private armed = true;
  private dirty = true;
  private readonly local = new Vector3();
  private readonly flat = new Vector3();
  /** Cached backdrops per accent colour. */
  private readonly backdrops = new Map<string, HTMLCanvasElement>();
  /** Animated hologram layer: a sweeping scan band and a pulsing edge. */
  private readonly holo: ShaderMaterial;
  private time = 0;
  /** 0..1 unfold animation when the panel opens. */
  private open = 1;
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
    this.holo = new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOpen: { value: 1 }, uColor: { value: this.glow.color } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uOpen;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          // A bright band sweeping down every few seconds.
          float s = fract(uTime * 0.28);
          float band = exp(-pow((1.0 - vUv.y - s) * 18.0, 2.0)) * 0.22;
          // Edge glow, breathing.
          float edge = min(min(vUv.x, 1.0 - vUv.x) * 1.6, min(vUv.y, 1.0 - vUv.y));
          float rim = smoothstep(0.04, 0.0, edge) * (0.18 + 0.08 * sin(uTime * 3.0));
          // Fine moving interference lines.
          float lines = step(0.5, fract(vUv.y * 240.0 - uTime * 6.0)) * 0.025;
          // Opening: a white-hot unfold.
          float flash = (1.0 - uOpen) * 0.55;
          gl_FragColor = vec4(uColor * (band + rim + lines) + vec3(flash), 1.0);
        }
      `,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const holoMesh = new Mesh(new PlaneGeometry(WIDTH_M, HEIGHT_M), this.holo);
    holoMesh.position.z = 0.002;
    holoMesh.renderOrder = 26;
    this.group.add(halo, this.face, holoMesh);
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
    if (!this.visible) this.open = 0;
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

  /** World position of widget `id`'s centre, or null if the panel has none (tests aim taps with it). */
  widgetPoint(id: string, out: Vector3): Vector3 | null {
    const w = this.content.widgets.find((x) => x.id === id);
    if (w == null) return null;
    out.set(((w.x + w.w / 2) / PANEL_PX_W - 0.5) * WIDTH_M, (0.5 - (w.y + w.h / 2) / PANEL_PX_H) * HEIGHT_M, 0);
    return this.face.localToWorld(out);
  }

  /** Handles fingertip pokes; returns a press event or null. */
  update(dt: number, tips: readonly Vector3[]): PanelEvent | null {
    if (!this.visible) return null;
    // Hologram life: the scan band, and the unfold when opening.
    this.time += dt;
    this.open = Math.min(1, this.open + dt * 4.5);
    const unfold = 1 - Math.pow(1 - this.open, 3);
    this.group.scale.set(0.92 + 0.08 * unfold, 0.04 + 0.96 * unfold, 1);
    this.holo.uniforms.uTime.value = this.time;
    this.holo.uniforms.uOpen.value = this.open;
    this.flash = Math.max(0, this.flash - dt * 4);
    if (this.flash === 0 && this.flashId) {
      this.flashId = '';
      this.dirty = true;
    }
    let hover = '';
    let result: PanelEvent | null = null;
    let anyClose = false;
    const aimed = this.aimId;
    this.aimId = '';
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
    // A fingertip wins; otherwise the gaze ray lights the button it rests on.
    if (!hover) hover = aimed;
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
    if (!this.visible || !this.rayHit(origin, direction, this.event.point)) return null;
    const widget = this.widgetAt(this.local.x, this.local.y);
    if (widget == null || widget.disabled) return null;
    const value = widget.kind === 'slider' ? Math.min(1, Math.max(0, (this.local.x - widget.x - 40) / (widget.w - 80))) : undefined;
    return this.emit(widget, this.event.point, value);
  }

  /**
   * Gaze hover: lights the button the ray rests on (for the next `update`) and
   * writes where the ray meets the panel to `out`. False if the ray misses the panel.
   */
  aim(origin: Vector3, direction: Vector3, out: Vector3): boolean {
    this.aimId = '';
    if (!this.visible || !this.rayHit(origin, direction, out)) return false;
    if (this.local.x < 0 || this.local.x > PANEL_PX_W || this.local.y < 0 || this.local.y > PANEL_PX_H) return false;
    const widget = this.widgetAt(this.local.x, this.local.y);
    if (widget != null && !widget.disabled) this.aimId = widget.id;
    return true;
  }

  /** Where the ray meets the panel plane (world point into `out`); leaves the panel-pixel position in `this.local`. */
  private rayHit(origin: Vector3, direction: Vector3, out: Vector3): boolean {
    this.face.getWorldPosition(this.flat);
    this.local.set(0, 0, 1).applyQuaternion(this.group.quaternion);
    const denom = direction.dot(this.local);
    if (Math.abs(denom) < 1e-5) return false;
    const t = this.flat.sub(origin).dot(this.local) / denom;
    if (t <= 0) return false;
    out.copy(origin).addScaledVector(direction, t);
    this.toPanel(out);
    return true;
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

  /**
   * The static backdrop for an accent colour, cached: chamfered glass with
   * an accent-tinted gradient, comic halftone dots, action speed lines,
   * scanlines, a double neon frame with corner brackets and measuring ticks.
   */
  private backdrop(accent: string): HTMLCanvasElement {
    const cached = this.backdrops.get(accent);
    if (cached) return cached;
    const canvas = document.createElement('canvas');
    canvas.width = PANEL_PX_W;
    canvas.height = PANEL_PX_H;
    const c = canvas.getContext('2d')!;
    const W = PANEL_PX_W;
    const H = PANEL_PX_H;
    const CUT = 56;
    const shape = (inset: number) => chamfer(c, inset, inset, W - inset * 2, H - inset * 2, CUT - inset * 0.4);
    // Glass: deep night with the accent bleeding in from the top.
    shape(10);
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, mix(accent, '#0A0420', 0.78, 0.94));
    bg.addColorStop(0.35, 'rgba(10, 4, 28, 0.93)');
    bg.addColorStop(1, 'rgba(2, 1, 8, 0.95)');
    c.fillStyle = bg;
    c.fill();
    c.save();
    shape(10);
    c.clip();
    // Action speed lines bursting from the top-left corner.
    c.strokeStyle = mix(accent, '#FFFFFF', 0.4, 0.07);
    for (let i = 0; i < 44; i += 1) {
      const a = (i / 44) * (Math.PI / 2) + Math.sin(i * 12.9898) * 0.02;
      c.lineWidth = 2 + (i % 3) * 2;
      c.beginPath();
      c.moveTo(-40, -40);
      c.lineTo(-40 + Math.cos(a) * 2200, -40 + Math.sin(a) * 2200);
      c.stroke();
    }
    // Comic halftone dots, densest in the bottom-right corner.
    c.fillStyle = mix(accent, '#FFFFFF', 0.2, 0.16);
    for (let y = 18; y < H; y += 22) {
      for (let x = 18 + ((y / 22) % 2) * 11; x < W; x += 22) {
        const t = Math.max(0, (x / W + y / H - 1.05) / 0.95);
        if (t <= 0) continue;
        c.beginPath();
        c.arc(x, y, 1 + t * 7, 0, Math.PI * 2);
        c.fill();
      }
    }
    // Scanlines.
    c.fillStyle = 'rgba(0, 0, 0, 0.18)';
    for (let y = 0; y < H; y += 6) c.fillRect(0, y, W, 2);
    // A soft accent glow pooled under the title.
    const pool = c.createRadialGradient(360, 90, 0, 360, 90, 520);
    pool.addColorStop(0, mix(accent, '#FFFFFF', 0, 0.22));
    pool.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = pool;
    c.fillRect(0, 0, W, 400);
    c.restore();
    // Frame: outer neon line, inner hairline.
    c.save();
    shape(10);
    c.lineWidth = 6;
    c.strokeStyle = accent;
    c.shadowColor = accent;
    c.shadowBlur = 34;
    c.stroke();
    c.restore();
    shape(26);
    c.lineWidth = 2;
    c.strokeStyle = mix(accent, '#FFFFFF', 0.5, 0.35);
    c.stroke();
    // Corner brackets.
    c.save();
    c.strokeStyle = '#FFFFFF';
    c.lineWidth = 6;
    c.shadowColor = accent;
    c.shadowBlur = 18;
    const L = 70;
    for (const [x, y, sx, sy] of [
      [10, 10, 1, 1],
      [W - 10, 10, -1, 1],
      [10, H - 10, 1, -1],
      [W - 10, H - 10, -1, -1],
    ] as const) {
      c.beginPath();
      c.moveTo(x + sx * (CUT + L), y);
      c.lineTo(x + sx * CUT, y);
      c.lineTo(x, y + sy * CUT);
      c.lineTo(x, y + sy * (CUT + L));
      c.stroke();
    }
    c.restore();
    // Measuring ticks along the bottom edge and a system tag.
    c.fillStyle = mix(accent, '#FFFFFF', 0.4, 0.5);
    for (let x = 140; x < W - 140; x += 24) c.fillRect(x, H - 34, 2, x % 120 === 20 ? 14 : 7);
    c.font = `700 18px ${FONT}`;
    c.textAlign = 'right';
    c.textBaseline = 'middle';
    c.fillText('SURGE//OS  v2.6  HOLO-LINK', W - 90, H - 54);
    this.backdrops.set(accent, canvas);
    return canvas;
  }

  private draw(): void {
    this.dirty = false;
    const c = this.ctx;
    const { accent, title, subtitle, coins, widgets } = this.content;
    c.clearRect(0, 0, PANEL_PX_W, PANEL_PX_H);
    c.drawImage(this.backdrop(accent), 0, 0);
    this.drawTitle(title, subtitle, accent);
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

  /** Comic title: inked letters with a colour-split shadow over a slanted caption banner. */
  private drawTitle(title: string, subtitle: string | undefined, accent: string): void {
    const c = this.ctx;
    c.save();
    c.font = `86px ${COMIC}`;
    const width = Math.min(1000, c.measureText(title).width);
    // Caption banner behind the title.
    slant(c, 44, 46, width + 110, 92, 26);
    const band = c.createLinearGradient(44, 0, width + 160, 0);
    band.addColorStop(0, mix(accent, '#000000', 0.15, 0.85));
    band.addColorStop(1, mix(accent, '#000000', 0.6, 0));
    c.fillStyle = band;
    c.fill();
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    c.lineJoin = 'round';
    // Colour-split shadow, then ink, then the white letters.
    c.fillStyle = 'rgba(255, 45, 154, 0.85)';
    c.fillText(title, 74 + 5, 96 + 4, 1000);
    c.fillStyle = 'rgba(61, 245, 255, 0.85)';
    c.fillText(title, 74 - 4, 96 - 2, 1000);
    c.lineWidth = 12;
    c.strokeStyle = '#06020F';
    c.strokeText(title, 74, 96, 1000);
    const fill = c.createLinearGradient(0, 60, 0, 130);
    fill.addColorStop(0, '#FFFFFF');
    fill.addColorStop(1, mix(accent, '#FFFFFF', 0.55, 1));
    c.fillStyle = fill;
    c.fillText(title, 74, 96, 1000);
    if (subtitle) {
      c.font = `600 32px ${BODY}`;
      const sw = Math.min(1090, c.measureText(subtitle).width + 40);
      c.fillStyle = 'rgba(0, 0, 0, 0.45)';
      slant(c, 60, 150, sw, 44, 12);
      c.fill();
      c.fillStyle = mix(accent, '#FFFFFF', 0.35, 1);
      c.fillText(subtitle, 80, 173, 1060);
    }
    c.restore();
  }

  private drawCoins(coins: number): void {
    const c = this.ctx;
    const text = coins.toLocaleString('en-US');
    c.font = `900 44px ${FONT}`;
    const width = c.measureText(text).width;
    const x = PANEL_PX_W - 80 - width;
    // A dark pill with the coin icon.
    c.save();
    c.beginPath();
    c.roundRect(x - 84, 58, width + 120, 72, 36);
    c.fillStyle = 'rgba(0, 0, 0, 0.5)';
    c.fill();
    c.lineWidth = 3;
    c.strokeStyle = 'rgba(255, 210, 63, 0.7)';
    c.stroke();
    c.restore();
    if (!drawIcon(c, 'coins', x - 44, 94, 54, '#FFD23F', 16)) {
      c.beginPath();
      c.arc(x - 44, 94, 22, 0, Math.PI * 2);
      c.fillStyle = '#FFD23F';
      c.fill();
    }
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillStyle = '#FFE58A';
    c.fillText(text, x, 96);
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

  /**
   * Slanted comic button: an inked offset shadow, a glass or hot-gradient
   * face, a glowing edge, an icon in a round badge and chevrons on the main
   * action. Hover brightens it; a press flashes white.
   */
  private drawButton(w: Widget, hover: boolean, flash: number, accent: string): void {
    const color = w.color ?? accent;
    const c = this.ctx;
    const primary = w.selected && !w.disabled;
    const skew = Math.min(22, w.h * 0.22);
    c.save();
    // Ink shadow, offset like a printed panel.
    if (!w.disabled) {
      slant(c, w.x + 8, w.y + 8, w.w, w.h, skew);
      c.fillStyle = 'rgba(0, 0, 0, 0.55)';
      c.fill();
    }
    slant(c, w.x, w.y, w.w, w.h, skew);
    if (w.disabled) c.fillStyle = 'rgba(255, 255, 255, 0.04)';
    else if (primary) {
      const g = c.createLinearGradient(w.x, w.y, w.x, w.y + w.h);
      g.addColorStop(0, mix(color, '#FFFFFF', 0.35, 1));
      g.addColorStop(0.55, color);
      g.addColorStop(1, mix(color, '#000000', 0.35, 1));
      c.fillStyle = g;
    } else {
      const g = c.createLinearGradient(w.x, w.y, w.x, w.y + w.h);
      g.addColorStop(0, `rgba(255, 255, 255, ${0.1 + (hover ? 0.1 : 0)})`);
      g.addColorStop(1, `rgba(255, 255, 255, ${0.02 + (hover ? 0.05 : 0)})`);
      c.fillStyle = g;
    }
    c.fill();
    if (flash > 0) {
      c.fillStyle = `rgba(255, 255, 255, ${flash * 0.6})`;
      c.fill();
    }
    c.lineWidth = primary ? 5 : 3;
    c.strokeStyle = w.disabled ? 'rgba(255, 255, 255, 0.15)' : primary ? '#06020F' : color;
    c.shadowColor = color;
    c.shadowBlur = w.disabled ? 0 : hover ? 34 : primary ? 22 : 10;
    c.stroke();
    c.restore();
    // Glossy top highlight.
    if (!w.disabled) {
      c.save();
      slant(c, w.x + skew * 0.4, w.y + 4, w.w - skew * 0.8, Math.max(6, w.h * 0.18), skew * 0.2);
      c.fillStyle = `rgba(255, 255, 255, ${primary ? 0.35 : 0.08})`;
      c.fill();
      c.restore();
    }
    const ink = w.disabled ? 'rgba(255,255,255,0.35)' : primary ? '#06020F' : '#FFFFFF';
    let left = w.x + skew;
    if (w.icon) {
      const size = Math.min(w.h * 0.58, 104);
      const bx = w.x + skew * 0.5 + size * 0.5 + 18;
      const by = w.y + w.h / 2;
      c.save();
      c.beginPath();
      c.arc(bx, by, size * 0.62, 0, Math.PI * 2);
      c.fillStyle = primary ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.35)';
      c.fill();
      c.lineWidth = 3;
      c.strokeStyle = w.disabled ? 'rgba(255,255,255,0.2)' : primary ? 'rgba(0,0,0,0.5)' : color;
      c.stroke();
      c.restore();
      drawIcon(c, w.icon, bx, by, size * 0.86, w.disabled ? 'rgba(255,255,255,0.35)' : primary ? '#06020F' : color, primary ? 0 : 14);
      left = bx + size * 0.62;
    }
    // Chevrons on the main action.
    if (primary && w.w > 360) {
      c.save();
      c.fillStyle = 'rgba(0, 0, 0, 0.35)';
      for (let k = 0; k < 3; k += 1) {
        const x = w.x + w.w - skew - 70 + k * 20;
        const y = w.y + w.h / 2;
        c.beginPath();
        c.moveTo(x, y - 18);
        c.lineTo(x + 14, y);
        c.lineTo(x, y + 18);
        c.lineTo(x + 7, y);
        c.closePath();
        c.fill();
      }
      c.restore();
    }
    const right = primary && w.w > 360 ? w.x + w.w - skew - 80 : w.x + w.w - skew;
    const cx = (left + right) / 2;
    const cy = w.y + w.h / 2;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = ink;
    c.font = `900 ${w.size ?? 40}px ${FONT}`;
    const maxWidth = Math.max(40, right - left - 16);
    if (w.sub) {
      c.fillText(w.label, cx, cy - 18, maxWidth);
      c.font = `700 27px ${BODY}`;
      c.fillStyle = w.disabled ? 'rgba(255,255,255,0.3)' : primary ? 'rgba(6,2,15,0.8)' : mix(color, '#FFFFFF', 0.55, 0.9);
      c.fillText(w.sub, cx, cy + 25, maxWidth);
    } else {
      c.fillText(w.label, cx, cy + 2, maxWidth);
    }
  }

  /** Angled card: colour band, icon in a glowing hex badge, title, chips, ribbon badge. */
  private drawTile(w: Widget, hover: boolean, flash: number, accent: string): void {
    const color = w.disabled ? '#5A5A6A' : w.color ?? accent;
    const c = this.ctx;
    const cut = 34;
    c.save();
    chamfer(c, w.x + 8, w.y + 10, w.w, w.h, cut);
    c.fillStyle = 'rgba(0, 0, 0, 0.5)';
    c.fill();
    chamfer(c, w.x, w.y, w.w, w.h, cut);
    const g = c.createLinearGradient(0, w.y, 0, w.y + w.h);
    g.addColorStop(0, mix(color, '#000000', 0.45, w.selected ? 0.55 : 0.32));
    g.addColorStop(0.45, `rgba(12, 6, 30, ${0.82})`);
    g.addColorStop(1, 'rgba(4, 2, 12, 0.9)');
    c.fillStyle = g;
    c.fill();
    if (hover || flash > 0) {
      c.fillStyle = `rgba(255, 255, 255, ${(hover ? 0.06 : 0) + flash * 0.4})`;
      c.fill();
    }
    c.lineWidth = w.selected ? 6 : 3;
    c.strokeStyle = color;
    c.shadowColor = color;
    c.shadowBlur = hover || w.selected ? 34 : 10;
    c.stroke();
    c.restore();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const cx = w.x + w.w / 2;
    let y = w.y + 60;
    if (w.icon) {
      const size = Math.min(120, w.h * 0.24);
      const iy = w.y + 30 + size / 2;
      c.save();
      hexagon(c, cx, iy, size * 0.68);
      c.fillStyle = 'rgba(0, 0, 0, 0.45)';
      c.fill();
      c.lineWidth = 4;
      c.strokeStyle = color;
      c.shadowColor = color;
      c.shadowBlur = 24;
      c.stroke();
      c.restore();
      drawIcon(c, w.icon, cx, iy, size * 0.8, w.disabled ? 'rgba(255,255,255,0.35)' : color, 22);
      y = iy + size * 0.68 + 44;
    }
    c.save();
    c.font = `${(w.size ?? 42) + 6}px ${COMIC}`;
    c.lineJoin = 'round';
    c.lineWidth = 9;
    c.strokeStyle = '#06020F';
    c.strokeText(w.label, cx, y, w.w - 40);
    c.fillStyle = w.disabled ? 'rgba(255,255,255,0.5)' : '#FFFFFF';
    c.fillText(w.label, cx, y, w.w - 40);
    c.restore();
    if (w.sub) {
      y += 54;
      c.font = `800 26px ${FONT}`;
      const sw = Math.min(w.w - 40, c.measureText(w.sub).width + 36);
      c.save();
      c.beginPath();
      c.roundRect(cx - sw / 2, y - 22, sw, 44, 22);
      c.fillStyle = w.disabled ? 'rgba(255,255,255,0.08)' : mix(color, '#000000', 0.2, 0.9);
      c.fill();
      c.restore();
      c.fillStyle = w.disabled ? 'rgba(255,255,255,0.45)' : '#06020F';
      c.fillText(w.sub, cx, y + 1, w.w - 60);
    }
    if (w.detail) {
      c.fillStyle = w.disabled ? 'rgba(255,255,255,0.3)' : 'rgba(233,252,255,0.82)';
      c.font = `600 28px ${BODY}`;
      for (const line of w.detail.split('\n')) {
        y += 40;
        c.fillText(line, cx, y + 6, w.w - 30);
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
      // Ribbon across the top-right corner.
      c.save();
      c.translate(w.x + w.w - 58, w.y + 58);
      c.rotate(Math.PI / 4);
      c.fillStyle = w.disabled ? '#3A3A48' : color;
      c.fillRect(-110, -20, 220, 40);
      c.fillStyle = '#06020F';
      c.font = `900 22px ${FONT}`;
      c.fillText(w.badge, 0, 1, 180);
      c.restore();
    }
  }

  /** Segmented energy bar with a diamond knob. */
  private drawSlider(w: Widget, hover: boolean, accent: string): void {
    const color = w.color ?? accent;
    const c = this.ctx;
    const value = w.value ?? 0;
    c.save();
    slant(c, w.x, w.y, w.w, w.h, 18);
    c.fillStyle = `rgba(255,255,255,${hover ? 0.1 : 0.05})`;
    c.fill();
    c.lineWidth = 3;
    c.strokeStyle = color;
    c.shadowColor = color;
    c.shadowBlur = hover ? 24 : 8;
    c.stroke();
    c.restore();
    const left = w.x + 40;
    const right = w.x + w.w - 40;
    const cy = w.y + w.h / 2 + 18;
    const segments = 24;
    const gap = 6;
    const segW = (right - left - gap * (segments - 1)) / segments;
    for (let i = 0; i < segments; i += 1) {
      const on = (i + 0.5) / segments <= value;
      c.fillStyle = on ? mix(color, '#FFFFFF', (i / segments) * 0.5, 1) : 'rgba(255,255,255,0.1)';
      c.fillRect(left + i * (segW + gap), cy - 9, segW, 18);
    }
    const kx = left + (right - left) * value;
    c.save();
    c.translate(kx, cy);
    c.rotate(Math.PI / 4);
    c.fillStyle = '#FFFFFF';
    c.shadowColor = color;
    c.shadowBlur = 22;
    c.fillRect(-15, -15, 30, 30);
    c.restore();
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillStyle = '#FFFFFF';
    c.font = `800 30px ${FONT}`;
    c.fillText(w.label, w.x + 40, w.y + 34);
    c.textAlign = 'right';
    c.fillStyle = color;
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
