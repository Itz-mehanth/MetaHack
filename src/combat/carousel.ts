import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  type MeshStandardMaterial,
  type Object3D,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
} from '@iwsdk/core';
import { type HoloState, holoPatch } from './holo.js';
import { drawIcon, iconsReady } from './icons.js';

const RADIUS = 2.15;
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
  /** Hologram colour (the hero's accent) shared by every patched material of this figure. */
  holo: HoloState;
  /** Light cone from above and the scan ring that climbs the figure. */
  beam: Mesh;
  beamMaterial: ShaderMaterial;
  ring: Mesh;
  ringMaterial: MeshBasicMaterial;
}

const BEAM_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const BEAM_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uK;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float along = pow(1.0 - vUv.y, 1.4);
    float face = pow(abs(dot(normalize(vN), normalize(vV))), 1.3);
    gl_FragColor = vec4(uColor * (0.35 + along), along * face * 0.55 * uK);
  }
`;

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
  private readonly time = { value: 0 };

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
    // The armour becomes a projected hologram in the hero's colour.
    const holo: HoloState = { color: new Color('#FFFFFF'), time: this.time };
    const lit = new Map<MeshStandardMaterial, MeshStandardMaterial>();
    figure.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      const material = mesh.material as MeshStandardMaterial;
      if (material.name === 'accent' || !material.isMeshStandardMaterial) return;
      let copy = lit.get(material);
      if (copy == null) {
        copy = material.clone();
        holoPatch(copy, holo);
        lit.set(material, copy);
      }
      mesh.material = copy;
    });
    figure.position.y = 0.5;
    root.add(pedestal, figure);

    const beamMaterial = new ShaderMaterial({
      uniforms: { uColor: { value: holo.color }, uK: { value: 1 } },
      vertexShader: BEAM_VERTEX,
      fragmentShader: BEAM_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
    });
    const beam = new Mesh(new CylinderGeometry(0.07, 0.58, 2.7, 28, 1, true), beamMaterial);
    beam.position.y = 1.45;
    beam.renderOrder = 4;
    const ringMaterial = new MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.8, depthWrite: false, blending: AdditiveBlending, toneMapped: false });
    const ring = new Mesh(new TorusGeometry(0.34, 0.008, 6, 48), ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.renderOrder = 5;
    root.add(beam, ring);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 192;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    const label = new Mesh(
      new PlaneGeometry(0.5, 0.1875),
      new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }),
    );
    label.position.y = 1.7;
    root.add(label);
    this.group.add(root);
    this.items.push({ id, root, figure, accents, rim, canvas, texture, label, name: id, status: '', color: '#FFFFFF', holo, beam, beamMaterial, ring, ringMaterial });
    void document.fonts?.load(`48px Bangers`).then(() => this.items.forEach((item) => this.drawLabel(item)));
    void iconsReady.then(() => this.items.forEach((item) => this.drawLabel(item)));
  }

  /** Sets a hero's display name, status line (price, OWNED...) and colour. */
  setInfo(id: string, name: string, status: string, color: string): void {
    const item = this.items.find((i) => i.id === id);
    if (item == null) return;
    const c = new Color(color);
    item.holo.color.copy(c);
    item.ringMaterial.color.copy(c);
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
    // Hero emblem on the left, ink-outlined like the lettering.
    drawIcon(c, item.id, 78, 82, 128, '#0A0A12');
    drawIcon(c, item.id, 78, 82, 112, item.color, 18);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `96px ${FONT}`;
    c.lineWidth = 14;
    c.lineJoin = 'round';
    c.strokeStyle = '#0A0A12';
    c.strokeText(item.name, 310, 70);
    c.fillStyle = item.color;
    c.fillText(item.name, 310, 70);
    if (item.status) {
      c.font = `48px ${FONT}`;
      c.lineWidth = 10;
      c.strokeText(item.status, 310, 150);
      c.fillStyle = '#FFF6D6';
      c.fillText(item.status, 310, 150);
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

  /** Moves the ring to a new centre and heading without disturbing its spin or focus (the menu was dragged). */
  reanchor(head: Vector3, forward: Vector3): void {
    this.center.set(head.x, 0, head.z);
    this.flat.set(forward.x, 0, forward.z);
    if (this.flat.lengthSq() < 1e-4) this.flat.set(0, 0, -1);
    this.flat.normalize();
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
    this.time.value = time;
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
      const radius = RADIUS - near * 0.2;
      item.root.position.set(this.center.x + x * radius, 0, this.center.z + z * radius);
      this.target.set(this.center.x, 0, this.center.z);
      item.root.lookAt(this.target);
      item.root.scale.setScalar(1 + near * 0.2);
      // The focused hero turns a little and breathes; others stand still.
      item.figure.rotation.y = near * Math.sin(time * 0.6) * 0.7;
      item.figure.position.y = 0.5 + near * Math.sin(time * 2) * 0.012;
      // Light cone from above, and a scan ring climbing the figure.
      item.beamMaterial.uniforms.uK.value = 0.2 + near * 0.5;
      const climb = (time * 0.5 + i * 0.37) % 1;
      item.ring.position.y = 0.52 + climb * 0.95;
      item.ring.scale.setScalar(1 - Math.abs(climb - 0.5) * 0.5);
      item.ringMaterial.opacity = (0.25 + near * 0.6) * (1 - Math.abs(climb - 0.5) * 1.4);
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
