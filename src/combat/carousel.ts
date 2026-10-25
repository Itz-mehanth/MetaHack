import {
  CanvasTexture,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  type MeshStandardMaterial,
  type Object3D,
  PlaneGeometry,
  SRGBColorSpace,
  Vector3,
} from '@iwsdk/core';

const RADIUS = 1.65;
const SPACING = 0.5;
const FONT = "'Bangers', 'Impact', sans-serif";

interface Item {
  id: string;
  root: Group;
  figure: Object3D;
  accents: MeshStandardMaterial[];
  rim: MeshStandardMaterial | null;
  canvas: HTMLCanvasElement;
  texture: CanvasTexture;
  label: Mesh;
  name: string;
  status: string;
  color: string;
}

/**
 * Hero-select carousel: heroes on glowing pedestals in an arc around the
 * player. The focused hero stands front and centre, larger and turning to
 * face the player; swipe or use the panel arrows to spin the ring.
 */
export class HeroCarousel {
  readonly group = new Group();
  focus = 0;
  visible = false;
  private position = 0;
  private readonly items: Item[] = [];
  private readonly center = new Vector3();
  private readonly flat = new Vector3(0, 0, -1);
  private readonly target = new Vector3();

  constructor() {
    this.group.name = 'HeroCarousel';
    this.group.visible = false;
  }

  get focusedId(): string {
    return this.items[this.focus]?.id ?? '';
  }

  /** Adds a hero figure on its pedestal. Accent materials are cloned per item. */
  add(id: string, figure: Object3D, pedestal: Object3D): void {
    const root = new Group();
    root.name = `Slot-${id}`;
    const accents: MeshStandardMaterial[] = [];
    let rim: MeshStandardMaterial | null = null;
    const cloned = new Map<MeshStandardMaterial, MeshStandardMaterial>();
    const swap = (object: Object3D, isPedestal: boolean) =>
      object.traverse((o) => {
        const mesh = o as Mesh;
        if (!mesh.isMesh) return;
        const material = mesh.material as MeshStandardMaterial;
        if (material.name !== 'accent') return;
        let copy = cloned.get(material);
        if (copy == null) {
          copy = material.clone();
          cloned.set(material, copy);
          if (isPedestal) rim = copy;
          else accents.push(copy);
        }
        mesh.material = copy;
      });
    swap(figure, false);
    swap(pedestal, true);
    figure.position.y = 0.5;
    root.add(pedestal, figure);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 192;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    const label = new Mesh(
      new PlaneGeometry(0.5, 0.1875),
      new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }),
    );
    label.position.y = 1.85;
    root.add(label);
    this.group.add(root);
    this.items.push({ id, root, figure, accents, rim, canvas, texture, label, name: id, status: '', color: '#FFFFFF' });
    void document.fonts?.load(`48px Bangers`).then(() => this.items.forEach((item) => this.drawLabel(item)));
  }

  /** Sets a hero's display name, status line (price, OWNED...) and colour. */
  setInfo(id: string, name: string, status: string, color: string): void {
    const item = this.items.find((i) => i.id === id);
    if (item == null) return;
    const c = new Color(color);
    for (const m of item.accents) {
      m.color.copy(c);
      m.emissive.copy(c);
    }
    if (item.rim) {
      item.rim.color.copy(c);
      item.rim.emissive.copy(c);
    }
    if (item.name === name && item.status === status && item.color === color) return;
    item.name = name;
    item.status = status;
    item.color = color;
    this.drawLabel(item);
  }

  private drawLabel(item: Item): void {
    const c = item.canvas.getContext('2d')!;
    c.clearRect(0, 0, 512, 192);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `96px ${FONT}`;
    c.lineWidth = 14;
    c.lineJoin = 'round';
    c.strokeStyle = '#0A0A12';
    c.strokeText(item.name, 256, 70);
    c.fillStyle = item.color;
    c.fillText(item.name, 256, 70);
    if (item.status) {
      c.font = `48px ${FONT}`;
      c.lineWidth = 10;
      c.strokeText(item.status, 256, 150);
      c.fillStyle = '#FFF6D6';
      c.fillText(item.status, 256, 150);
    }
    item.texture.needsUpdate = true;
  }

  /** Centres the ring on the player's feet, opening toward `forward`. */
  show(head: Vector3, forward: Vector3): void {
    this.center.set(head.x, 0, head.z);
    this.flat.set(forward.x, 0, forward.z);
    if (this.flat.lengthSq() < 1e-4) this.flat.set(0, 0, -1);
    this.flat.normalize();
    this.position = this.focus;
    this.visible = true;
    this.group.visible = true;
  }

  hide(): void {
    this.visible = false;
    this.group.visible = false;
  }

  setFocus(index: number): void {
    this.focus = Math.max(0, Math.min(this.items.length - 1, index));
  }

  step(direction: number): boolean {
    const before = this.focus;
    this.setFocus(this.focus + direction);
    return this.focus !== before;
  }

  update(dt: number, time: number, head: Vector3): void {
    if (!this.visible) return;
    this.position += (this.focus - this.position) * Math.min(1, dt * 7);
    for (let i = 0; i < this.items.length; i += 1) {
      const item = this.items[i];
      const offset = i - this.position;
      const a = offset * SPACING;
      const hidden = Math.abs(a) > 1.35;
      item.root.visible = !hidden;
      if (hidden) continue;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const x = this.flat.x * cos - this.flat.z * sin;
      const z = this.flat.x * sin + this.flat.z * cos;
      const near = Math.max(0, 1 - Math.abs(offset));
      const radius = RADIUS - near * 0.25;
      item.root.position.set(this.center.x + x * radius, 0, this.center.z + z * radius);
      this.target.set(this.center.x, 0, this.center.z);
      item.root.lookAt(this.target);
      item.root.scale.setScalar(1 + near * 0.25);
      // The focused hero turns a little and breathes; others stand still.
      item.figure.rotation.y = near * Math.sin(time * 0.8) * 0.35;
      item.figure.position.y = 0.5 + near * Math.sin(time * 2) * 0.01;
      item.label.lookAt(head);
      const glow = 0.8 + near * 2.4;
      for (const m of item.accents) m.emissiveIntensity = glow;
      if (item.rim) item.rim.emissiveIntensity = 0.6 + near * 3;
    }
  }

  /** World position of the focused hero's chest, for effects. */
  focusPoint(out: Vector3): Vector3 {
    const item = this.items[this.focus];
    if (item == null) return out.set(0, 1.3, -1.5);
    return out.copy(item.root.position).setY(1.3);
  }
}
