import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Vector3,
} from '@iwsdk/core';
import { type Hero, HEROES } from './heroes.js';
import { missionFor } from './missions.js';

const CARD_W = 0.26;
const CARD_H = 0.34;
const FONT = "'Orbitron', 'Rajdhani', system-ui, sans-serif";

interface Card {
  hero: Hero;
  group: Group;
  center: Vector3;
  canvas: HTMLCanvasElement;
  texture: CanvasTexture;
  emblem: Group;
  glow: MeshBasicMaterial;
  hover: number;
  locked: boolean;
}

function emblemFor(hero: Hero, color: Color): Group {
  const group = new Group();
  const lit = new MeshBasicMaterial({ color, toneMapped: false });
  const white = new MeshBasicMaterial({ color: '#FFFFFF', toneMapped: false });
  if (hero.id === 'arc') {
    group.add(new Mesh(new IcosahedronGeometry(0.03, 1), white));
    const shell = new Mesh(new IcosahedronGeometry(0.045, 0), new MeshBasicMaterial({ color, wireframe: true, toneMapped: false }));
    group.add(shell);
  } else if (hero.id === 'talon') {
    const blade = new CylinderGeometry(0.0008, 0.006, 0.09, 4);
    for (let i = -1; i <= 1; i += 1) {
      const b = new Mesh(blade, i === 0 ? white : lit);
      b.position.x = i * 0.018;
      b.rotation.z = i * -0.12;
      b.scale.x = 0.4;
      group.add(b);
    }
  } else {
    const head = new Mesh(new BoxGeometry(0.06, 0.035, 0.035), lit);
    head.position.y = 0.03;
    const handle = new Mesh(new CylinderGeometry(0.005, 0.005, 0.07, 8), white);
    handle.position.y = -0.015;
    group.add(head, handle);
  }
  return group;
}

/**
 * Hero-select hub: three holographic cards in an arc in front of the player.
 * Poke a card with a fingertip, or hit it with a shot, to pick that hero.
 */
export class HeroHub {
  readonly group = new Group();
  readonly cards: Card[] = [];
  visible = false;
  private readonly local = new Vector3();
  private readonly flat = new Vector3();

  constructor(locked: readonly string[] = []) {
    this.group.name = 'HeroHub';
    for (const hero of HEROES) {
      const color = new Color(hero.color);
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 672;
      const texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = 4;
      const group = new Group();
      group.name = `HeroCard-${hero.id}`;
      const face = new Mesh(
        new PlaneGeometry(CARD_W, CARD_H),
        new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }),
      );
      const glow = new MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.18,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const halo = new Mesh(new PlaneGeometry(CARD_W * 1.18, CARD_H * 1.14), glow);
      halo.position.z = -0.004;
      const emblem = emblemFor(hero, color);
      emblem.position.set(0, CARD_H * 0.17, 0.05);
      group.add(halo, face, emblem);
      this.group.add(group);
      const card: Card = {
        hero,
        group,
        center: new Vector3(),
        canvas,
        texture,
        emblem,
        glow,
        hover: 0,
        locked: locked.includes(hero.id),
      };
      this.draw(card);
      this.cards.push(card);
    }
    this.group.visible = false;
    void document.fonts?.ready.then(() => this.cards.forEach((c) => this.draw(c)));
  }

  setLocked(id: string, locked: boolean): void {
    const card = this.cards.find((c) => c.hero.id === id);
    if (card == null || card.locked === locked) return;
    card.locked = locked;
    this.draw(card);
  }

  private draw(card: Card): void {
    const { hero, canvas } = card;
    const mission = missionFor(hero.id);
    const c = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;
    c.clearRect(0, 0, w, h);
    c.save();
    c.beginPath();
    c.roundRect(10, 10, w - 20, h - 20, 36);
    const bg = c.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, 'rgba(14, 6, 34, 0.92)');
    bg.addColorStop(1, 'rgba(4, 2, 12, 0.92)');
    c.fillStyle = bg;
    c.fill();
    c.lineWidth = 5;
    c.strokeStyle = hero.color;
    c.shadowColor = hero.color;
    c.shadowBlur = 24;
    c.stroke();
    c.restore();

    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = hero.color;
    c.font = `700 22px ${FONT}`;
    c.fillText(mission.world, w / 2, 300);
    c.fillStyle = '#FFFFFF';
    c.shadowColor = hero.color;
    c.shadowBlur = 20;
    c.font = `900 64px ${FONT}`;
    c.fillText(hero.name, w / 2, 360);
    c.shadowBlur = 0;
    c.font = `700 28px ${FONT}`;
    c.fillStyle = '#E9FCFF';
    c.fillText(hero.power.toUpperCase(), w / 2, 420);
    c.font = `500 24px 'Rajdhani', sans-serif`;
    c.fillStyle = 'rgba(233, 252, 255, 0.75)';
    c.fillText(hero.how, w / 2, 462);
    c.fillText(mission.objective, w / 2, 500);

    c.save();
    c.beginPath();
    c.roundRect(96, 560, w - 192, 64, 32);
    c.fillStyle = card.locked ? 'rgba(255,255,255,0.08)' : hero.color;
    c.fill();
    c.restore();
    c.font = `900 26px ${FONT}`;
    c.fillStyle = card.locked ? 'rgba(255,255,255,0.5)' : '#06020F';
    c.fillText(card.locked ? 'COMING SOON' : 'POKE TO PLAY', w / 2, 593);
    card.texture.needsUpdate = true;
  }

  /** Lays the cards out in an arc in front of `head`, facing it. */
  show(head: Vector3, forward: Vector3): void {
    this.flat.set(forward.x, 0, forward.z);
    if (this.flat.lengthSq() < 1e-4) this.flat.set(0, 0, -1);
    this.flat.normalize();
    const angles = [-0.62, 0, 0.62];
    for (let i = 0; i < this.cards.length; i += 1) {
      const card = this.cards[i];
      const a = angles[i] ?? 0;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const x = this.flat.x * cos - this.flat.z * sin;
      const z = this.flat.x * sin + this.flat.z * cos;
      card.group.position.set(head.x + x * 0.55, head.y - 0.22, head.z + z * 0.55);
      this.local.set(head.x, head.y - 0.22, head.z);
      card.group.lookAt(this.local);
      card.center.copy(card.group.position);
      card.hover = 0;
    }
    this.visible = true;
    this.group.visible = true;
  }

  hide(): void {
    this.visible = false;
    this.group.visible = false;
  }

  /**
   * Animates the cards and checks fingertip pokes. Returns the index of a
   * poked, unlocked card, or -1.
   */
  update(dt: number, time: number, tips: readonly Vector3[]): number {
    if (!this.visible) return -1;
    let picked = -1;
    for (let i = 0; i < this.cards.length; i += 1) {
      const card = this.cards[i];
      let near = 0;
      for (const tip of tips) {
        this.local.copy(tip);
        card.group.worldToLocal(this.local);
        const inside = Math.abs(this.local.x) < CARD_W / 2 && Math.abs(this.local.y) < CARD_H / 2;
        if (!inside) continue;
        if (this.local.z < 0.12) near = Math.max(near, 1 - Math.max(0, this.local.z) / 0.12);
        if (this.local.z < 0.015 && this.local.z > -0.05 && !card.locked) picked = i;
      }
      card.hover += (near - card.hover) * Math.min(1, dt * 10);
      card.group.scale.setScalar(1 + card.hover * 0.06);
      card.glow.opacity = (card.locked ? 0.06 : 0.18) + card.hover * 0.45 + Math.sin(time * 2 + i) * 0.04;
      card.emblem.rotation.y = time * 1.2 + i;
      card.emblem.position.y = CARD_H * 0.17 + Math.sin(time * 2 + i) * 0.006;
    }
    return picked;
  }

  /** Index of an unlocked card whose centre segment a→b passes near, or -1. */
  hitBySegment(a: Vector3, b: Vector3, scratch: Vector3, scratch2: Vector3): number {
    if (!this.visible) return -1;
    for (let i = 0; i < this.cards.length; i += 1) {
      const card = this.cards[i];
      if (card.locked) continue;
      scratch.subVectors(b, a);
      const lengthSq = scratch.lengthSq();
      let t = lengthSq > 0 ? scratch2.subVectors(card.center, a).dot(scratch) / lengthSq : 0;
      t = Math.max(0, Math.min(1, t));
      scratch2.copy(a).addScaledVector(scratch, t);
      if (scratch2.distanceTo(card.center) < 0.16) return i;
    }
    return -1;
  }
}
