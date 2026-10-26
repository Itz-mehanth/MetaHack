import {
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Vector3,
} from '@iwsdk/core';
import type { HeroId } from './heroes.js';

/**
 * The coach card: a big, simple "do this with your hand" prompt that floats
 * just below eye level. Each tip pairs an animated hand pictogram with a
 * short instruction, so a first-time player learns a power in seconds.
 */

export type Gesture = 'palm' | 'fist' | 'swing' | 'grab' | 'throw' | 'pinch' | 'web' | 'trigger' | 'cross' | 'clap' | 'poke';

export interface Tip {
  readonly gesture: Gesture;
  readonly title: string;
  readonly sub: string;
}

/** How to fight with each hero, in the order a player needs it. */
export const HERO_TIPS: Readonly<Record<HeroId, readonly Tip[]>> = {
  arc: [
    { gesture: 'palm', title: 'OPEN YOUR PALM', sub: 'Face it at an enemy. It fires on its own.' },
    { gesture: 'palm', title: 'PALM TO CHEST, THEN PUSH OUT', sub: 'The arc reactor fires a huge beam that follows your hand.' },
  ],
  talon: [
    { gesture: 'fist', title: 'MAKE A FIST', sub: 'Claws come out. Punch through enemies.' },
    { gesture: 'swing', title: 'SWING FAST', sub: 'A fast swing throws a slash wave.' },
    { gesture: 'throw', title: 'STAB AND THROW', sub: 'Thrust into them to skewer, whip to throw the body.' },
  ],
  tempest: [
    { gesture: 'fist', title: 'GRAB THE HAMMER', sub: 'Close your hand around the handle.' },
    { gesture: 'throw', title: 'SWING AND LET GO', sub: 'It flies and calls down lightning.' },
    { gesture: 'palm', title: 'OPEN PALM TO RECALL', sub: 'Hold your palm out and it flies back.' },
  ],
  orion: [
    { gesture: 'pinch', title: 'PINCH THE STRING', sub: 'With the hand that is not holding the bow.' },
    { gesture: 'throw', title: 'PULL BACK, LET GO', sub: 'A longer draw shoots harder.' },
  ],
  weaver: [
    { gesture: 'web', title: 'SHOOT A WEB', sub: 'Index + pinky out, or thrust an open palm at them.' },
    { gesture: 'throw', title: 'WHIP YOUR HAND', sub: 'A webbed enemy goes flying where you whip.' },
    { gesture: 'fist', title: 'OR FIST AND PULL', sub: 'Rips a webbed enemy apart.' },
  ],
  havoc: [
    { gesture: 'fist', title: 'GRIP THE PISTOL', sub: 'It sits in your hand like a real one.' },
    { gesture: 'trigger', title: 'CURL YOUR INDEX FINGER', sub: 'Hold it curled to keep firing.' },
  ],
  ronin: [
    { gesture: 'fist', title: 'MAKE A FIST', sub: 'Each fist ignites a katana.' },
    { gesture: 'swing', title: 'SWING HARD', sub: 'Cuts limbs off. A hard swing sends a slash wave.' },
    { gesture: 'throw', title: 'STAB AND THROW', sub: 'Thrust to skewer them, whip to fling the body.' },
    { gesture: 'cross', title: 'CROSS BOTH BLADES', sub: 'Unleashes an X-STRIKE.' },
    { gesture: 'swing', title: 'BLOCK THEIR SWING', sub: 'Meet an enemy blade with yours to PARRY.' },
  ],
  vanguard: [
    { gesture: 'fist', title: 'RAISE YOUR SHIELD ARM', sub: 'Blocks shots and blades and bounces shots back.' },
    { gesture: 'throw', title: 'SWING AND LET GO', sub: 'The shield ricochets between enemies and comes back.' },
    { gesture: 'swing', title: 'PUNCH', sub: 'Your other fist hits like a truck.' },
  ],
  psion: [
    { gesture: 'palm', title: 'PALM AT A CRATE', sub: 'Or at an alien. A ring locks on.' },
    { gesture: 'grab', title: 'CLOSE YOUR HAND', sub: 'Lift it with your mind.' },
    { gesture: 'throw', title: 'FLING AND OPEN', sub: 'Throw it at the enemy.' },
  ],
};

export const CLAP_TIP: Tip = { gesture: 'clap', title: 'CLAP YOUR HANDS!', sub: 'Every hero fires at once.' };

/** The same lessons for playing on a phone or a monitor (tap, hold, swipe). */
export const SCREEN_TIPS: Readonly<Record<HeroId, readonly Tip[]>> = {
  arc: [
    { gesture: 'palm', title: 'TAP OR HOLD ON ENEMIES', sub: 'Your palm turns and fires where you point.' },
    { gesture: 'palm', title: 'KEEP HOLDING', sub: 'After a second both hands fire.' },
    { gesture: 'palm', title: 'PRESS UNI-BEAM', sub: 'The reactor fires a giant beam where you point.' },
  ],
  talon: [
    { gesture: 'fist', title: 'TAP TO STRIKE', sub: 'Claws rake what you tap. Hold to keep slashing.' },
    { gesture: 'swing', title: 'SWIPE TO SLASH', sub: 'Fast swipes throw slash waves.' },
  ],
  tempest: [
    { gesture: 'throw', title: 'TAP TO THROW THE HAMMER', sub: 'It flies at what you tap, then comes back.' },
    { gesture: 'palm', title: 'TAP AGAIN TO RECALL', sub: 'It also returns by itself.' },
    { gesture: 'throw', title: 'PRESS STORM', sub: 'Lift the hammer: the sky strikes every alien in sight.' },
  ],
  orion: [{ gesture: 'pinch', title: 'HOLD TO DRAW, LET GO TO SHOOT', sub: 'Drag to aim. A full draw hits harder.' }],
  weaver: [
    { gesture: 'web', title: 'TAP TO SHOOT A WEB', sub: 'It sticks like a bullet and holds them.' },
    { gesture: 'throw', title: 'SWIPE TO THROW THEM', sub: 'Swipe down instead to rip them apart.' },
  ],
  havoc: [{ gesture: 'trigger', title: 'HOLD TO FIRE', sub: 'The gun follows your finger.' }],
  ronin: [
    { gesture: 'fist', title: 'TAP TO CUT, SWIPE TO SLASH', sub: 'Hard swipes send slash waves.' },
    { gesture: 'cross', title: 'X-STRIKE', sub: 'Press X-STRIKE (or a second finger) to cross both blades.' },
  ],
  vanguard: [
    { gesture: 'throw', title: 'TAP TO THROW THE SHIELD', sub: 'It bounces between enemies and comes back.' },
    { gesture: 'fist', title: 'HOLD TO BLOCK', sub: 'Shots bounce off it. Tap close enemies to punch.' },
  ],
  psion: [
    { gesture: 'palm', title: 'PRESS ON A CRATE OR ALIEN', sub: 'Keep holding: you lift it with your mind.' },
    { gesture: 'throw', title: 'DRAG, THEN LET GO', sub: 'It flies at whatever you point at.' },
  ],
};

const W = 1024;
const H = 400;
const FONT = "'Bangers', 'Impact', sans-serif";
const BODY = "'Rajdhani', 'Segoe UI', sans-serif";
const INK = '#0A0A12';

export class Coach {
  readonly group = new Group();
  visible = false;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly texture: CanvasTexture;
  private readonly material: MeshBasicMaterial;
  private tip: Tip | null = null;
  private color = '#3DF5FF';
  private step = '';
  private age = 0;
  private frame = -1;
  private readonly target = new Vector3();
  private readonly flat = new Vector3();

  constructor() {
    this.group.name = 'Coach';
    this.canvas = document.createElement('canvas');
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.material = new MeshBasicMaterial({ map: this.texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
    const card = new Mesh(new PlaneGeometry(0.5, (0.5 * H) / W), this.material);
    card.renderOrder = 20;
    this.group.add(card);
    this.group.visible = false;
  }

  /** Shows `tip` in `color`; `step` is an optional "2 / 3" style counter. */
  show(tip: Tip, color: string, step = ''): void {
    if (this.tip === tip && this.color === color && this.step === step && this.visible) return;
    this.tip = tip;
    this.color = color;
    this.step = step;
    this.age = 0;
    this.frame = -1;
    this.visible = true;
    this.group.visible = true;
  }

  hide(): void {
    this.visible = false;
    this.group.visible = false;
    this.tip = null;
  }

  /** Follows the gaze lazily, 0.7 m ahead and a little below eye level. */
  update(dt: number, head: Vector3, forward: Vector3): void {
    if (!this.visible || this.tip == null) return;
    this.age += dt;
    this.flat.set(forward.x, 0, forward.z);
    if (this.flat.lengthSq() < 1e-4) this.flat.set(0, 0, -1);
    this.flat.normalize();
    this.target.copy(head).addScaledVector(this.flat, 0.7);
    this.target.y = head.y - 0.2;
    if (this.age === dt) this.group.position.copy(this.target);
    else this.group.position.lerp(this.target, Math.min(1, dt * 2.5));
    this.group.lookAt(head);
    // Pop in, then breathe.
    const pop = Math.min(1, this.age / 0.25);
    this.group.scale.setScalar((0.6 + 0.4 * pop) * (1 + Math.sin(this.age * 3) * 0.015));
    this.material.opacity = pop;
    // The pictogram animates at ~12 fps to keep canvas uploads cheap.
    const frame = Math.floor(this.age * 12);
    if (frame !== this.frame) {
      this.frame = frame;
      this.draw(this.age);
    }
  }

  private draw(t: number): void {
    const c = this.ctx;
    const tip = this.tip!;
    c.clearRect(0, 0, W, H);
    // Comic panel: ink border, dark fill, coloured header strip.
    c.save();
    c.fillStyle = INK;
    c.beginPath();
    c.roundRect(8, 8, W - 16, H - 16, 36);
    c.fill();
    c.fillStyle = 'rgba(16, 12, 34, 0.96)';
    c.beginPath();
    c.roundRect(20, 20, W - 40, H - 40, 28);
    c.fill();
    c.strokeStyle = this.color;
    c.lineWidth = 6;
    c.shadowColor = this.color;
    c.shadowBlur = 24;
    c.stroke();
    c.restore();
    // Pictogram disc.
    c.save();
    c.fillStyle = this.color;
    c.globalAlpha = 0.14;
    c.beginPath();
    c.arc(200, 200, 150, 0, Math.PI * 2);
    c.fill();
    c.restore();
    drawGesture(c, tip.gesture, 200, 205, this.color, t);
    // Text.
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.font = `78px ${FONT}`;
    c.lineJoin = 'round';
    c.lineWidth = 12;
    c.strokeStyle = INK;
    const title = fitText(c, tip.title, 600, 78);
    c.font = `${title}px ${FONT}`;
    c.strokeText(tip.title, 380, 160);
    c.fillStyle = this.color;
    c.fillText(tip.title, 380, 160);
    c.font = `600 38px ${BODY}`;
    c.fillStyle = '#E9FCFF';
    wrapText(c, tip.sub, 380, 245, 590, 44);
    if (this.step) {
      c.font = `34px ${FONT}`;
      c.textAlign = 'right';
      c.fillStyle = this.color;
      c.fillText(this.step, W - 50, 62);
    }
    this.texture.needsUpdate = true;
  }
}

function fitText(c: CanvasRenderingContext2D, text: string, width: number, size: number): number {
  let s = size;
  c.font = `${s}px ${FONT}`;
  while (s > 40 && c.measureText(text).width > width) {
    s -= 4;
    c.font = `${s}px ${FONT}`;
  }
  return s;
}

function wrapText(c: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, line: number): void {
  let current = '';
  let row = 0;
  for (const word of text.split(' ')) {
    const next = current ? `${current} ${word}` : word;
    if (c.measureText(next).width > width && current) {
      c.fillText(current, x, y + row * line);
      current = word;
      row += 1;
    } else current = next;
  }
  if (current) c.fillText(current, x, y + row * line);
}

// ---------------------------------------------------------------- pictograms

/** Flat cartoon hand, palm facing the viewer, centred at (x, y). `curl` 0 open .. 1 fist. */
function hand(c: CanvasRenderingContext2D, x: number, y: number, s: number, curl: number, color: string, fingers = [1, 1, 1, 1], thumb = 1): void {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.lineWidth = 7;
  c.strokeStyle = INK;
  c.fillStyle = '#F2E6DA';
  // Fingers: rounded bars that shorten as they curl.
  const xs = [-36, -12, 12, 36];
  const lens = [70, 80, 74, 58];
  for (let i = 0; i < 4; i += 1) {
    const extended = fingers[i] * (1 - curl);
    const len = 18 + lens[i] * extended;
    c.beginPath();
    c.roundRect(xs[i] - 11, -40 - len, 22, len + 20, 11);
    c.fill();
    c.stroke();
  }
  // Thumb.
  c.save();
  c.translate(-52, 6);
  c.rotate(-0.9 + curl * 0.9 * thumb);
  c.beginPath();
  c.roundRect(-11, -58 * (1 - curl * 0.5), 22, 58 * (1 - curl * 0.5) + 10, 11);
  c.fill();
  c.stroke();
  c.restore();
  // Palm.
  c.beginPath();
  c.roundRect(-52, -46, 104, 100, 30);
  c.fill();
  c.stroke();
  if (curl > 0.7) {
    // Knuckle creases on a fist.
    c.lineWidth = 4;
    for (const kx of [-24, 0, 24]) {
      c.beginPath();
      c.moveTo(kx, -40);
      c.lineTo(kx, -22);
      c.stroke();
    }
  }
  c.restore();
  void color;
}

function burst(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, spikes = 10): void {
  c.save();
  c.fillStyle = color;
  c.shadowColor = color;
  c.shadowBlur = 20;
  c.beginPath();
  for (let i = 0; i < spikes * 2; i += 1) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const rr = i % 2 ? r * 0.5 : r;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
  c.fill();
  c.restore();
}

function arrow(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string): void {
  c.save();
  c.strokeStyle = color;
  c.fillStyle = color;
  c.lineWidth = 10;
  c.lineCap = 'round';
  c.shadowColor = color;
  c.shadowBlur = 14;
  c.beginPath();
  c.moveTo(x0, y0);
  c.lineTo(x1, y1);
  c.stroke();
  const a = Math.atan2(y1 - y0, x1 - x0);
  c.beginPath();
  c.moveTo(x1 + Math.cos(a) * 18, y1 + Math.sin(a) * 18);
  c.lineTo(x1 + Math.cos(a + 2.3) * 22, y1 + Math.sin(a + 2.3) * 22);
  c.lineTo(x1 + Math.cos(a - 2.3) * 22, y1 + Math.sin(a - 2.3) * 22);
  c.fill();
  c.restore();
}

function blade(c: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string): void {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.strokeStyle = color;
  c.shadowColor = color;
  c.shadowBlur = 22;
  c.lineWidth = 14;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(0, -150);
  c.stroke();
  c.strokeStyle = '#FFFFFF';
  c.lineWidth = 5;
  c.stroke();
  c.restore();
}

function drawGesture(c: CanvasRenderingContext2D, gesture: Gesture, x: number, y: number, color: string, t: number): void {
  const pulse = (Math.sin(t * 6) + 1) / 2;
  const cycle = (t % 1.6) / 1.6;
  switch (gesture) {
    case 'palm':
      hand(c, x - 20, y + 20, 0.95, 0, color);
      burst(c, x + 85, y - 60, 30 + pulse * 18, color);
      break;
    case 'fist':
      hand(c, x, y + 30, 1, Math.min(1, cycle * 2.2), color);
      if (cycle > 0.5) burst(c, x, y - 80, 18 + pulse * 10, color, 8);
      break;
    case 'swing': {
      const a = -0.9 + Math.sin(t * 5) * 0.9;
      c.save();
      c.translate(x, y + 70);
      c.rotate(a);
      hand(c, 0, -50, 0.8, 1, color);
      c.restore();
      arrow(c, x - 110, y - 90, x + 110, y - 90, color);
      break;
    }
    case 'grab':
      hand(c, x, y + 30, 1, cycle < 0.5 ? 0 : 1, color);
      c.save();
      c.fillStyle = '#8A7A6A';
      c.strokeStyle = INK;
      c.lineWidth = 6;
      c.fillRect(x - 40, y - 150 - (cycle < 0.5 ? 0 : 30), 80, 60);
      c.strokeRect(x - 40, y - 150 - (cycle < 0.5 ? 0 : 30), 80, 60);
      c.restore();
      break;
    case 'throw': {
      const open = cycle > 0.55 ? 1 : 0;
      hand(c, x - 60 + cycle * 120, y + 40 - cycle * 40, 0.85, 1 - open, color);
      arrow(c, x - 120, y - 110, x + 120, y - 110, color);
      break;
    }
    case 'pinch':
      hand(c, x, y + 30, 1, 0.55, color, [1, 0.2, 0.2, 0.2]);
      burst(c, x - 40, y - 60, 14 + pulse * 8, color, 6);
      break;
    case 'web':
      hand(c, x, y + 30, 1, 0, color, [1, 0, 0, 1]);
      arrow(c, x, y - 100, x, y - 170, color);
      break;
    case 'trigger':
      hand(c, x, y + 30, 1, 0, color, [cycle < 0.5 ? 0.9 : 0, 0, 0, 0]);
      if (cycle > 0.5) burst(c, x + 90, y - 50, 26, color);
      break;
    case 'cross': {
      const close = Math.min(1, cycle * 2);
      blade(c, x - 70 + close * 50, y + 90, 0.15 + close * 0.45, color);
      blade(c, x + 70 - close * 50, y + 90, -0.15 - close * 0.45, color);
      if (close >= 1) burst(c, x, y - 15, 30 + pulse * 15, '#FFFFFF');
      break;
    }
    case 'clap': {
      const gap = Math.abs(Math.sin(t * 4)) * 70;
      c.save();
      c.translate(x - 40 - gap / 2, y + 20);
      c.rotate(0.25);
      hand(c, 0, 0, 0.7, 0, color);
      c.restore();
      c.save();
      c.translate(x + 40 + gap / 2, y + 20);
      c.rotate(-0.25);
      c.scale(-1, 1);
      hand(c, 0, 0, 0.7, 0, color);
      c.restore();
      if (gap < 15) burst(c, x, y - 70, 36, '#FFFFFF');
      break;
    }
    case 'poke':
      hand(c, x, y + 40, 1, 0, color, [1, 0, 0, 0]);
      burst(c, x - 36, y - 120, 12 + pulse * 10, color, 6);
      break;
  }
}
