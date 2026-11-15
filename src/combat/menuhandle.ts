import { CanvasTexture, Group, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, Vector3 } from '@iwsdk/core';

/**
 * The menu's handle: a bar just under the panel that you pinch and drag to move the
 * whole menu (panel and 3D props) anywhere in the room, and a small RECENTER chip
 * beside it that you poke to bring the menu back in front of you. It is a child of
 * the panel, so it follows the panel wherever that goes. Only the drawing and the
 * hit tests live here; the dragging itself is in CombatSystem.updateMenuRig.
 */

const WIDTH_M = 0.52;
const HEIGHT_M = 0.065;
const PX_W = 1040;
const PX_H = 130;
/** Share of the width the bar takes; the chip is in the rest. */
const BAR_SHARE = 0.78;
const FONT = "'Orbitron', 'Rajdhani', system-ui, sans-serif";
const CYAN = '#3DF5FF';
const GOLD = '#FFD23F';

export class MenuHandle {
  readonly group = new Group();
  private readonly mesh: Mesh;
  private readonly material: MeshBasicMaterial;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly texture: CanvasTexture;
  private readonly local = new Vector3();
  private key = '';
  private hover = false;
  private held = false;
  private hint = false;
  private chip = false;
  private pop = 0;

  constructor() {
    this.group.name = 'MenuHandle';
    this.canvas = document.createElement('canvas');
    this.canvas.width = PX_W;
    this.canvas.height = PX_H;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.material = new MeshBasicMaterial({ map: this.texture, transparent: true, depthWrite: false, toneMapped: false });
    this.mesh = new Mesh(new PlaneGeometry(WIDTH_M, HEIGHT_M), this.material);
    this.mesh.renderOrder = 26;
    this.group.add(this.mesh);
    this.group.visible = false;
    // The webfont loads late: draw again once it is in.
    void document.fonts?.ready.then(() => {
      this.key = '';
    });
  }

  /** Hangs the handle under a panel `panelHeight` metres tall (a child of the panel's group). */
  mount(panel: Group, panelHeight: number): void {
    this.group.position.set(0, -(panelHeight / 2) - HEIGHT_M / 2 - 0.03, 0.004);
    panel.add(this.group);
  }

  get visible(): boolean {
    return this.group.visible;
  }

  setVisible(on: boolean): void {
    this.group.visible = on;
  }

  /** What to show: a hand is near the bar, the bar is held, the first-time hint, a hand is over the chip. */
  setState(hover: boolean, held: boolean, hint: boolean, chip: boolean): void {
    this.hover = hover;
    this.held = held;
    this.hint = hint;
    this.chip = chip;
  }

  /** A little pulse on the bar (a grab, a recenter). */
  bump(): void {
    this.pop = 1;
  }

  update(dt: number): void {
    if (!this.group.visible) return;
    this.pop = Math.max(0, this.pop - dt * 4);
    this.group.scale.setScalar(1 + this.pop * 0.08);
    this.material.opacity = this.held || this.hover || this.chip || this.hint ? 1 : 0.62;
    const key = `${this.hover}${this.held}${this.hint}${this.chip}`;
    if (key !== this.key) {
      this.key = key;
      this.draw();
    }
  }

  /** True when a world point is over the bar (with `margin` metres to spare, for a pinch that is near rather than exact). */
  overBar(world: Vector3, margin = 0.05): boolean {
    this.toLocal(world);
    const left = -WIDTH_M / 2;
    const right = left + WIDTH_M * BAR_SHARE;
    return this.local.x > left - margin && this.local.x < right + margin && Math.abs(this.local.y) < HEIGHT_M / 2 + margin && Math.abs(this.local.z) < 0.07;
  }

  /** True when a fingertip is over the RECENTER chip. */
  overChip(world: Vector3, margin = 0.015): boolean {
    this.toLocal(world);
    const cx = -WIDTH_M / 2 + WIDTH_M * (BAR_SHARE + (1 - BAR_SHARE) / 2);
    return Math.hypot(this.local.x - cx, this.local.y) < HEIGHT_M / 2 + margin && Math.abs(this.local.z) < 0.05;
  }

  private toLocal(world: Vector3): void {
    this.local.copy(world);
    this.mesh.worldToLocal(this.local);
  }

  private draw(): void {
    const c = this.ctx;
    c.clearRect(0, 0, PX_W, PX_H);
    const barW = PX_W * BAR_SHARE - 10;
    const accent = this.held ? '#FFFFFF' : CYAN;
    const lit = this.held || this.hover || this.hint;
    // The bar.
    c.save();
    c.fillStyle = this.held ? 'rgba(61, 245, 255, 0.35)' : 'rgba(8, 6, 22, 0.9)';
    c.beginPath();
    c.roundRect(6, 8, barW, PX_H - 16, 40);
    c.fill();
    c.strokeStyle = accent;
    c.lineWidth = lit ? 7 : 4;
    c.shadowColor = CYAN;
    c.shadowBlur = lit ? 22 : 6;
    c.globalAlpha = lit ? 1 : 0.75;
    c.stroke();
    c.restore();
    // Grip dots: two columns of two at each end.
    c.fillStyle = accent;
    for (const x of [70, 150, barW - 140, barW - 60]) {
      for (const y of [PX_H / 2 - 18, PX_H / 2 + 18]) {
        c.beginPath();
        c.arc(x, y, 8, 0, Math.PI * 2);
        c.fill();
      }
    }
    // Label.
    const label = this.held ? 'MOVING' : this.chip ? 'BRING MENU HERE' : this.hint ? 'PINCH + DRAG TO MOVE' : this.hover ? 'PINCH + DRAG' : 'MOVE MENU';
    c.fillStyle = this.held ? '#FFFFFF' : '#E9FCFF';
    c.font = `700 ${label.length > 16 ? 30 : 42}px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(label, 6 + barW / 2, PX_H / 2 + 3);
    // The recenter chip: a ring with a crosshair.
    const cx = PX_W * (BAR_SHARE + (1 - BAR_SHARE) / 2);
    const cy = PX_H / 2;
    c.save();
    c.fillStyle = this.chip ? 'rgba(255, 210, 63, 0.35)' : 'rgba(8, 6, 22, 0.9)';
    c.beginPath();
    c.arc(cx, cy, 52, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = GOLD;
    c.lineWidth = this.chip ? 8 : 5;
    c.shadowColor = GOLD;
    c.shadowBlur = this.chip ? 22 : 6;
    c.stroke();
    c.restore();
    c.strokeStyle = GOLD;
    c.lineWidth = 6;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(cx, cy, 20, 0, Math.PI * 2);
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
      c.moveTo(cx + dx * 28, cy + dy * 28);
      c.lineTo(cx + dx * 40, cy + dy * 40);
    }
    c.stroke();
    this.texture.needsUpdate = true;
  }
}
