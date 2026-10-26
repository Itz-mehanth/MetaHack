import { Matrix4, Quaternion, Vector3 } from '@iwsdk/core';
import type { HandPose } from './gauntlet.js';
import type { HeroId } from './heroes.js';
import { type HandShape, type Quat, type Vec, blendShape, copyShape, handJoint, handPoint, newShape, SHAPES, writeHand } from './puppet.js';

/**
 * Screen play without hand tracking: turns taps, holds and swipes (from a
 * touch screen, a mouse or the attract-reel bot) into choreographed hand
 * motion. The hands are puppets posed in front of the camera like a
 * first-person view model, so every hero's real gesture code, weapons and
 * effects run unchanged: an open palm turned at the target fires ARC, a
 * fast fist swing cuts with RONIN, a pinch drawn back looses ORION's bow.
 *
 * Positions are in camera space (x right, y up, the camera looks down -z).
 */

/** What the player asks for this frame. */
export interface Intent {
  /** The pointer (finger or mouse button) is held. */
  down: boolean;
  /** It went down this frame. */
  pressed: boolean;
  /** It came up this frame. */
  released: boolean;
  /** Released after a short press that barely moved. */
  tap: boolean;
  /** Released at the end of a quick stroke. */
  swipe: boolean;
  /** Stroke direction on screen (x right, y up), unit; valid with `swipe`. */
  strokeX: number;
  strokeY: number;
  /** Seconds the pointer has been held. */
  held: number;
  /** Pointer across the screen, -1 left to 1 right: picks the hand. */
  x: number;
  /** Special move: X-strike, or the clap once OVERDRIVE is charged. */
  special: boolean;
}

export function newIntent(): Intent {
  return { down: false, pressed: false, released: false, tap: false, swipe: false, strokeX: 1, strokeY: 0, held: 0, x: 0, special: false };
}

/** Game state the choreography needs, filled in by the combat system. */
export interface PilotView {
  hero: HeroId;
  /** World point under the pointer: the enemy there, else a point down the ray. */
  target: Vector3;
  /** Metres from the camera to `target`. */
  range: number;
  hammerState: 'floating' | 'gripped' | 'docked' | 'flying' | 'returning';
  hammerHand: number;
  hammerAt: Vector3;
  hammerTime: number;
  /** Hand holding the bow, or -1 while it lies loose at `bowAt`. */
  bowHolder: number;
  bowAt: Vector3;
  /** Where the string rests (world); pinching near it starts a draw. */
  nock: Vector3;
  drawing: boolean;
  gunHolder: number;
  gunAt: Vector3;
  shieldHand: number;
  shieldWorn: boolean;
  /** PSION: each hand holds something. */
  held: [boolean, boolean];
  /** WEAVER: each hand has a webbed enemy on the line. */
  tethered: [boolean, boolean];
  /** OVERDRIVE is charged and unlocked: the special is a clap. */
  overdrive: boolean;
  /** ARC's UNI-BEAM is ready to charge. */
  unibeam: boolean;
}

export function newView(): PilotView {
  return {
    hero: 'arc',
    target: new Vector3(0, 1.4, -5),
    range: 5,
    hammerState: 'floating',
    hammerHand: 1,
    hammerAt: new Vector3(),
    hammerTime: 0,
    bowHolder: -1,
    bowAt: new Vector3(),
    nock: new Vector3(),
    drawing: false,
    gunHolder: -1,
    gunAt: new Vector3(),
    shieldHand: 0,
    shieldWorn: true,
    held: [false, false],
    tethered: [false, false],
    overdrive: false,
    unibeam: false,
  };
}

/** Bow string geometry (see bow.ts): nock rest behind the riser, full draw. */
const TIP_BACK = 0.15;
const MAX_DRAW = 0.55;
const DRAW_TIME = 0.55;
const SHOULDER: Vec = [0.19, -0.26, 0.04];
const KEYS = 7;
const RATE = 14;

interface Key {
  t: number;
  pos: Vector3;
  quat: Quaternion;
  shape: HandShape;
  /** The shape switches at once when this segment starts. */
  snap: boolean;
  /** Ease in and out (wind-ups, returns); strikes run at constant speed. */
  ease: boolean;
}

class Track {
  readonly pos = new Vector3();
  readonly quat = new Quaternion();
  readonly shape = newShape();
  readonly wantPos = new Vector3();
  readonly wantQuat = new Quaternion();
  readonly wantShape = newShape();
  readonly keys: Key[] = [];
  count = 0;
  time = 0;
  /** Seconds to keep a pose (a web shot, a recall) before relaxing. */
  hold = 0;
  /** PSION: lift stage; ORION: draw time. */
  stage: 'idle' | 'aim' | 'grab' | 'nock' | 'draw' = 'idle';
  timer = 0;

  constructor(x: number) {
    this.pos.set(x, -0.45, -0.3);
    for (let i = 0; i < KEYS; i += 1) {
      this.keys.push({ t: 0, pos: new Vector3(), quat: new Quaternion(), shape: newShape(), snap: false, ease: false });
    }
  }

  get busy(): boolean {
    return this.count > 0;
  }
}

export class Pilot {
  /** False hides the hands (menus, cut-scenes). */
  active = false;
  private readonly tracks = [new Track(-0.17), new Track(0.17)];
  private readonly camPos = new Vector3();
  private readonly camQuat = new Quaternion();
  private readonly inverse = new Quaternion();
  /** The aim point in camera space. */
  private readonly target = new Vector3();
  private hero: HeroId | '' = '';
  /** Hand chosen by the side of the screen the press started on. */
  private lead = 1;
  private alternate = 1;
  private flurry = 0;
  private wasActive = false;

  private readonly s = new Vector3();
  private readonly d = new Vector3();
  private readonly u = new Vector3();
  private readonly l = new Vector3();
  private readonly f = new Vector3();
  private readonly t = new Vector3();
  private readonly p = new Vector3();
  private readonly w = new Vector3();
  private readonly y = new Vector3();
  /** Scratch owned by the frame builders (callers may pass any other vector). */
  private readonly fx = new Vector3();
  private readonly fy = new Vector3();
  private readonly fz = new Vector3();
  private readonly q = new Quaternion();
  private readonly q2 = new Quaternion();
  private readonly m = new Matrix4();
  private readonly shape = newShape();
  private readonly wv: Vec = [0, 0, 0];
  private readonly qv: Quat = [0, 0, 0, 1];
  /** Hand points in each hand's own frame. */
  private readonly pinchAt: [Vector3, Vector3];
  private readonly palmAt: [Vector3, Vector3];
  private readonly gripAt: [Vector3, Vector3];
  /**
   * The bow's up axis in each fist's own frame (pinky to index middle
   * joints), and the forward axis square to it. The bow squares its aim
   * against that axis, so the fist is turned to keep it square to the shot.
   */
  private readonly bowUp: [Vector3, Vector3];
  private readonly bowFore: [Vector3, Vector3];
  private readonly m2 = new Matrix4();

  constructor() {
    const v: Vec = [0, 0, 0];
    this.pinchAt = [0, 1].map((i) => new Vector3(...handPoint('pinch', SHAPES.pinch, i === 0, v))) as [Vector3, Vector3];
    this.palmAt = [0, 1].map((i) => new Vector3(...handPoint('palm', SHAPES.fist, i === 0, v))) as [Vector3, Vector3];
    this.gripAt = [0, 1].map((i) => new Vector3(...handPoint('grip', SHAPES.fist, i === 0, v))) as [Vector3, Vector3];
    this.bowUp = [0, 1].map((i) => {
      const a = new Vector3(...handJoint(7, SHAPES.fist, i === 0, v));
      return a.sub(new Vector3(...handJoint(22, SHAPES.fist, i === 0, v))).normalize();
    }) as [Vector3, Vector3];
    this.bowFore = [0, 1].map((i) => {
      const up = this.bowUp[i];
      return new Vector3(0, 0, -1).addScaledVector(up, up.z).normalize();
    }) as [Vector3, Vector3];
  }

  /** True while hand `i` plays a scripted move. */
  busy(i: number): boolean {
    return this.tracks[i].busy;
  }

  update(dt: number, intent: Intent, view: PilotView, camPos: Vector3, camQuat: Quaternion, poses: [HandPose, HandPose]): void {
    if (!this.active) {
      poses[0].tracked = false;
      poses[1].tracked = false;
      this.wasActive = false;
      return;
    }
    this.camPos.copy(camPos);
    this.camQuat.copy(camQuat);
    this.inverse.copy(camQuat).invert();
    this.toLocal(view.target, this.target);
    if (!this.wasActive || view.hero !== this.hero) this.reset(view.hero);
    this.wasActive = true;
    this.flurry -= dt;

    if (intent.pressed) this.lead = intent.x < -0.1 ? 0 : 1;
    if (intent.special) this.special(view);
    switch (view.hero) {
      case 'arc':
        this.arc(intent);
        break;
      case 'talon':
      case 'ronin':
        this.blades(intent);
        break;
      case 'tempest':
        this.tempest(intent, view);
        break;
      case 'orion':
        this.orion(dt, intent, view);
        break;
      case 'weaver':
        this.weaver(dt, intent, view);
        break;
      case 'havoc':
        this.havoc(intent, view);
        break;
      case 'psion':
        this.psion(dt, intent, view);
        break;
      case 'vanguard':
        this.vanguard(intent, view);
        break;
    }
    for (let i = 0; i < 2; i += 1) this.step(i, dt, poses[i]);
  }

  // ------------------------------------------------------------ heroes

  /** ARC: the palm on the pointer's side turns to the target and fires; hold long for both. */
  private arc(intent: Intent): void {
    const lead = this.lead;
    for (let i = 0; i < 2; i += 1) {
      if (this.tracks[i].busy) continue;
      if (intent.down && (i === lead || intent.held > 1.1)) this.blast(i, 0.44);
      else this.idle(i);
    }
  }

  /** TALON and RONIN: fists up; taps strike, swipes slash, holding keeps cutting. */
  private blades(intent: Intent): void {
    for (let i = 0; i < 2; i += 1) if (!this.tracks[i].busy) this.guard(i);
    if (intent.swipe) {
      const i = intent.strokeX < -0.3 ? 1 : intent.strokeX > 0.3 ? 0 : this.next();
      if (!this.tracks[i].busy) this.slash(i, intent.strokeX, intent.strokeY);
    } else if (intent.tap || (intent.down && intent.held > 0.25 && this.flurry <= 0)) {
      const i = this.next();
      if (!this.tracks[i].busy) {
        this.strike(i);
        this.flurry = 0.24;
      }
    }
  }

  /** TEMPEST: catch the hammer, throw it at the target, call it back. */
  private tempest(intent: Intent, view: PilotView): void {
    const h = view.hammerState === 'floating' ? 1 : view.hammerHand;
    const other = 1 - h;
    if (!this.tracks[other].busy) this.idle(other);
    const track = this.tracks[h];
    if (track.busy) return;
    switch (view.hammerState) {
      case 'gripped':
        if (intent.tap || intent.swipe || (intent.down && intent.held > 0.2)) this.throwMove(h, 'hammer');
        else this.hammerReady(h);
        break;
      case 'docked':
        this.hammerReady(h);
        break;
      case 'flying':
        if (view.hammerTime > 0.7 || intent.tap) this.recall(h, view.hammerAt);
        else this.idle(h);
        break;
      case 'returning':
        this.recall(h, view.hammerAt);
        break;
      default:
        this.fetch(h, view.hammerAt);
    }
  }

  /** ORION: hold to nock and draw (aim follows the pointer), let go to loose. */
  private orion(dt: number, intent: Intent, view: PilotView): void {
    const b = view.bowHolder;
    if (b < 0) {
      this.fetch(0, view.bowAt);
      if (!this.tracks[1].busy) this.idle(1);
      return;
    }
    const drawHand = 1 - b;
    const track = this.tracks[drawHand];
    // Bow arm: fist pushed out toward the target, the bow upright and square to the shot.
    this.shoulder(b, this.s);
    this.d.subVectors(this.target, this.s).normalize();
    this.p.copy(this.s).addScaledVector(this.d, 0.52);
    this.p.y += 0.06;
    this.f.subVectors(this.target, this.p).normalize();
    this.up(this.f, this.u);
    this.align(this.bowUp[b], this.bowFore[b], this.u, this.f, this.q);
    this.set(b, this.p, this.q, SHAPES.fist);
    // The riser sits in the finger tube; aim from there.
    this.w.copy(this.gripAt[b]).applyQuaternion(this.q).add(this.p);
    this.d.subVectors(this.target, this.w).normalize();
    if (!intent.down) {
      if (track.stage !== 'idle') {
        // Let go: open the pinch where the hand is, so the arrow leaves at full draw.
        track.shape.pinch = 0;
        track.shape.thumb = 0;
        track.wantPos.copy(track.pos);
        track.wantQuat.copy(track.quat);
        copyShape(track.wantShape, track.shape);
        track.hold = 0.12;
      }
      track.stage = 'idle';
      track.timer = 0;
      track.hold -= dt;
      if (!track.busy && track.hold <= 0) this.idle(drawHand);
      return;
    }
    if (track.stage === 'idle') {
      track.stage = 'nock';
      track.timer = 0;
    }
    track.timer += dt;
    let draw = 0;
    if (view.drawing) {
      if (track.stage !== 'draw') {
        track.stage = 'draw';
        track.timer = 0;
      }
      draw = MAX_DRAW * Math.min(1, track.timer / DRAW_TIME);
    }
    // The pinch point: on the string, pulled back along the aim.
    this.t.copy(this.w).addScaledVector(this.d, -(TIP_BACK + draw));
    this.up(this.d, this.u);
    this.l.crossVectors(this.d, this.u);
    this.f.copy(this.d);
    // Palm toward the bow arm's side, fingers along the arrow.
    this.y.copy(this.l).multiplyScalar(drawHand === 1 ? -1 : 1);
    this.handFrame(this.f, this.y, this.q);
    this.p.copy(this.pinchAt[drawHand]).applyQuaternion(this.q);
    this.p.subVectors(this.t, this.p);
    const want = track.stage === 'draw' ? SHAPES.pinch : track.timer > 0.08 ? SHAPES.pinch : SHAPES.relaxed;
    this.set(drawHand, this.p, this.q, want);
    if (track.stage === 'draw') this.snapTo(drawHand);
  }

  /** WEAVER: tap shoots a web; swipe throws the webbed enemy; swipe down rips it. */
  private weaver(dt: number, intent: Intent, view: PilotView): void {
    for (let i = 0; i < 2; i += 1) {
      const track = this.tracks[i];
      track.hold -= dt;
      if (!track.busy && track.hold <= 0) this.idle(i);
    }
    if (intent.swipe) {
      const rip = intent.strokeY < -0.6;
      for (let i = 0; i < 2; i += 1) {
        if (view.tethered[i] && !this.tracks[i].busy) {
          if (rip) this.yank(i);
          else this.whip(i, intent.strokeX, intent.strokeY);
        }
      }
      return;
    }
    if (intent.tap || intent.down) {
      let i = this.lead;
      if (view.tethered[i] && !view.tethered[1 - i]) i = 1 - i;
      const track = this.tracks[i];
      if (track.busy) return;
      this.webPose(i);
      track.hold = 0.18;
    }
  }

  /** HAVOC: the gun hand aims at the pointer; holding squeezes the trigger. */
  private havoc(intent: Intent, view: PilotView): void {
    const g = view.gunHolder;
    if (g < 0) {
      this.fetch(1, view.gunAt);
      if (!this.tracks[0].busy) this.idle(0);
      return;
    }
    if (!this.tracks[1 - g].busy) this.idle(1 - g);
    this.shoulder(g, this.s);
    this.d.subVectors(this.target, this.s).normalize();
    this.p.copy(this.s).addScaledVector(this.d, 0.46);
    this.p.y += 0.08;
    this.f.subVectors(this.target, this.p).normalize();
    this.up(this.f, this.u);
    this.setFist(g, this.p, this.f, this.u, intent.down ? SHAPES.fist : SHAPES.point);
    // The trigger finger moves at once; the arm follows smoothly.
    copyShape(this.tracks[g].shape, this.tracks[g].wantShape);
  }

  /** PSION: press locks on and lifts, drag steers it, letting go throws it. */
  private psion(dt: number, intent: Intent, view: PilotView): void {
    for (let i = 0; i < 2; i += 1) {
      const track = this.tracks[i];
      if (track.busy) continue;
      if (view.held[i]) {
        track.stage = 'idle';
        if (intent.down) this.steer(i);
        else this.fling(i);
        continue;
      }
      if (intent.down && i === this.lead) {
        if (track.stage === 'idle') {
          track.stage = 'aim';
          track.timer = 0;
        }
        track.timer += dt;
        // Open palm at the target to lock on, then close the hand to lift.
        this.blast(i, 0.42);
        if (track.timer > 0.2) copyShape(track.wantShape, SHAPES.fist);
      } else {
        track.stage = 'idle';
        this.idle(i);
      }
    }
  }

  /** VANGUARD: shield arm guards; tap throws the shield, hold blocks; close taps punch. */
  private vanguard(intent: Intent, view: PilotView): void {
    const sh = view.shieldHand;
    const fist = 1 - sh;
    if (!this.tracks[fist].busy) this.guard(fist);
    const track = this.tracks[sh];
    if (track.busy) return;
    if (!view.shieldWorn) {
      this.idle(sh);
      if ((intent.tap || intent.swipe) && view.range < 1.8 && !this.tracks[fist].busy) this.punch(fist);
      return;
    }
    if ((intent.tap || intent.swipe) && view.range < 1.6 && !this.tracks[fist].busy) {
      this.punch(fist);
      return;
    }
    if (intent.tap || intent.swipe) {
      this.throwMove(sh, 'shield');
      return;
    }
    this.shieldUp(sh, intent.down && intent.held > 0.3);
  }

  /** Special: the clap when OVERDRIVE is ready, else RONIN's X-strike. */
  private special(view: PilotView): void {
    if (this.tracks[0].busy || this.tracks[1].busy) return;
    if (view.overdrive) this.clap();
    else if (view.hero === 'ronin') this.cross();
    else if (view.hero === 'tempest' && view.hammerState === 'gripped') this.raise(view.hammerHand);
    else if (view.hero === 'arc' && view.unibeam) this.chestCharge(1);
  }

  /** ARC: an open palm pressed to the chest while the reactor charges. */
  private chestCharge(i: number): void {
    const side = i === 0 ? -1 : 1;
    this.begin(i);
    this.f.set(-side * 0.9, 0.2, -0.3).normalize();
    this.y.set(0, 0.2, 1);
    this.handFrame(this.f, this.y, this.q);
    this.p.set(side * 0.09, -0.3, -0.14);
    this.key(i, 0.3, this.p, this.q, SHAPES.open, false, true);
    this.key(i, 0.95, this.p, this.q, SHAPES.open, false);
  }

  /** TEMPEST: lift the hammer overhead and hold it there while the storm gathers. */
  private raise(i: number): void {
    const side = i === 0 ? -1 : 1;
    this.begin(i);
    this.f.set(0, 0.85, -0.5).normalize();
    this.u.set(-side * 0.3, 0.2, 1);
    this.thumbFrame(i, this.f, this.u, this.q);
    this.p.set(side * 0.1, 0.36, -0.25);
    this.key(i, 0.3, this.p, this.q, SHAPES.fist, false, true);
    this.key(i, 1.3, this.p, this.q, SHAPES.fist, false);
  }

  // ------------------------------------------------------------ poses

  private idle(i: number): void {
    const side = i === 0 ? -1 : 1;
    this.p.set(side * 0.17, -0.25, -0.36);
    this.f.set(-side * 0.15, 0.55, -0.82);
    this.y.set(-side * 0.85, -0.25, -0.3);
    this.handFrame(this.f, this.y, this.q);
    this.set(i, this.p, this.q, SHAPES.relaxed);
  }

  /** Open palm toward the target, `reach` metres out from the shoulder. */
  private blast(i: number, reach: number): void {
    this.shoulder(i, this.s);
    this.d.subVectors(this.target, this.s).normalize();
    this.p.copy(this.s).addScaledVector(this.d, reach);
    this.up(this.d, this.f);
    this.handFrame(this.f, this.d, this.q);
    this.set(i, this.p, this.q, SHAPES.open);
  }

  /** Blade guard: fists up, thumbs up, blades leaning forward. */
  private guard(i: number): void {
    const side = i === 0 ? -1 : 1;
    this.p.set(side * 0.16, -0.21, -0.38);
    this.f.set(-side * 0.05, 0.3, -0.95).normalize();
    this.u.set(-side * 0.25, 1, 0.1);
    this.setFist(i, this.p, this.f, this.u, SHAPES.fist);
  }

  private hammerReady(i: number): void {
    const side = i === 0 ? -1 : 1;
    this.p.set(side * 0.18, -0.19, -0.36);
    this.f.set(-side * 0.1, 0.45, -0.88).normalize();
    this.u.set(-side * 0.3, 0.9, 0.3);
    this.setFist(i, this.p, this.f, this.u, SHAPES.fist);
  }

  /** Open palm turned at a loose weapon (it flies to the hand), or reach in and grab it. */
  private fetch(i: number, at: Vector3): void {
    this.toLocal(at, this.t);
    this.shoulder(i, this.s);
    this.d.subVectors(this.t, this.s);
    const distance = this.d.length();
    this.d.divideScalar(Math.max(1e-4, distance));
    if (distance < 0.65) {
      // Close: put the palm on it, and close the hand once it is there.
      this.up(this.d, this.f);
      this.handFrame(this.f, this.d, this.q);
      this.p.copy(this.palmAt[i]).applyQuaternion(this.q);
      this.p.subVectors(this.t, this.p);
      const track = this.tracks[i];
      this.set(i, this.p, this.q, track.pos.distanceTo(this.p) < 0.05 ? SHAPES.fist : SHAPES.open);
      return;
    }
    this.p.copy(this.s).addScaledVector(this.d, 0.4);
    this.d.subVectors(this.t, this.p).normalize();
    this.up(this.d, this.f);
    this.handFrame(this.f, this.d, this.q);
    this.set(i, this.p, this.q, SHAPES.open);
  }

  /** Open palm held toward a weapon in flight: it comes back. */
  private recall(i: number, at: Vector3): void {
    this.toLocal(at, this.t);
    this.shoulder(i, this.s);
    this.d.subVectors(this.t, this.s).normalize();
    this.p.copy(this.s).addScaledVector(this.d, 0.38);
    this.d.subVectors(this.t, this.p).normalize();
    this.up(this.d, this.f);
    this.handFrame(this.f, this.d, this.q);
    this.set(i, this.p, this.q, SHAPES.open);
  }

  /** Web shooter: fingers at the target (index and pinky out), palm down. */
  private webPose(i: number): void {
    this.shoulder(i, this.s);
    this.d.subVectors(this.target, this.s).normalize();
    this.p.copy(this.s).addScaledVector(this.d, 0.42);
    this.f.subVectors(this.target, this.p).normalize();
    this.y.set(0, -1, 0);
    this.handFrame(this.f, this.y, this.q);
    this.set(i, this.p, this.q, SHAPES.web);
    this.snapTo(i);
  }

  /** PSION: the palm on a long lever from the chest steers the lifted object. */
  private steer(i: number): void {
    // Chest: 30 cm below the eyes in world space, as the hold code assumes.
    this.w.set(0, -0.3, 0).add(this.camPos);
    this.toLocal(this.w, this.s);
    // Keep the object about 2.4 m out along the pointer ray.
    this.t.copy(this.target).normalize().multiplyScalar(2.4);
    this.d.subVectors(this.t, this.s).normalize();
    this.p.copy(this.s).addScaledVector(this.d, 0.56);
    this.up(this.d, this.f);
    this.handFrame(this.d, this.f.negate(), this.q);
    this.w.copy(this.palmAt[i]).applyQuaternion(this.q);
    this.p.sub(this.w);
    this.set(i, this.p, this.q, SHAPES.fist);
  }

  private shieldUp(i: number, block: boolean): void {
    const side = i === 0 ? -1 : 1;
    if (block) this.p.set(side * 0.03, -0.13, -0.3);
    else this.p.set(side * 0.13, -0.2, -0.34);
    // Back of the hand (and the shield) to the front, fingers up.
    this.f.set(-side * (block ? 0.1 : 0.35), 1, 0);
    this.y.set(-side * (block ? 0 : 0.25), 0, 1);
    this.handFrame(this.f, this.y, this.q);
    this.set(i, this.p, this.q, SHAPES.fist);
  }

  // ------------------------------------------------------------ moves

  /** A strike at the target: wind up high and out, cut down and across through it. */
  private strike(i: number): void {
    const side = i === 0 ? -1 : 1;
    this.shoulder(i, this.s);
    this.d.subVectors(this.target, this.s).normalize();
    this.up(this.d, this.u);
    this.l.crossVectors(this.d, this.u).normalize();
    this.begin(i);
    // Wind-up: raised and drawn back, blade pointing up and back.
    this.p.copy(this.s).addScaledVector(this.d, 0.2).addScaledVector(this.l, side * 0.14).addScaledVector(this.u, 0.14);
    this.f.copy(this.d).multiplyScalar(0.4).addScaledVector(this.u, 0.6).addScaledVector(this.l, side * 0.2).normalize();
    this.t.copy(this.d).multiplyScalar(-0.6).addScaledVector(this.u, 0.5).addScaledVector(this.l, side * 0.3);
    this.thumbFrame(i, this.f, this.t, this.q);
    this.key(i, 0.08, this.p, this.q, SHAPES.fist, true);
    // Through the target line and across the body.
    this.p.copy(this.s).addScaledVector(this.d, 0.68).addScaledVector(this.l, -side * 0.08).addScaledVector(this.u, -0.05);
    this.t.copy(this.d).multiplyScalar(0.2).addScaledVector(this.u, -0.3).addScaledVector(this.l, -side * 0.9);
    this.thumbFrame(i, this.d, this.t, this.q);
    this.key(i, 0.2, this.p, this.q, SHAPES.fist, false);
    this.guardKey(i, 0.46);
  }

  /** A slash along a screen stroke, passing in front of the target. */
  private slash(i: number, sx: number, sy: number): void {
    this.shoulder(i, this.s);
    this.d.subVectors(this.target, this.s).normalize();
    this.l.set(sx, sy, 0).normalize();
    // Blade across the stroke so the edge leads, kept pointing up or outward.
    this.t.set(-this.l.y, this.l.x, 0);
    if (this.t.y < 0 || (Math.abs(this.t.y) < 0.2 && this.t.x * (i === 0 ? -1 : 1) < 0)) this.t.negate();
    this.begin(i);
    this.p.copy(this.s).addScaledVector(this.d, 0.24).addScaledVector(this.l, -0.2);
    this.w.copy(this.t).addScaledVector(this.d, -0.35);
    this.thumbFrame(i, this.d, this.w, this.q);
    this.key(i, 0.07, this.p, this.q, SHAPES.fist, true);
    this.p.copy(this.s).addScaledVector(this.d, 0.66).addScaledVector(this.l, 0.17);
    this.w.copy(this.t).addScaledVector(this.d, 0.35);
    this.thumbFrame(i, this.d, this.w, this.q);
    this.key(i, 0.18, this.p, this.q, SHAPES.fist, false);
    this.guardKey(i, 0.44);
  }

  /** Over-the-shoulder throw toward the target, opening the hand mid-swing. */
  private throwMove(i: number, what: 'hammer' | 'shield'): void {
    const side = i === 0 ? -1 : 1;
    this.shoulder(i, this.s);
    this.d.subVectors(this.target, this.s).normalize();
    this.up(this.d, this.u);
    this.l.crossVectors(this.d, this.u).normalize();
    // Release point out along the aim; the wind-up behind it, so the swing runs at the target.
    this.t.copy(this.s).addScaledVector(this.d, 0.62);
    this.begin(i);
    if (what === 'hammer') {
      this.p.copy(this.t).addScaledVector(this.d, -0.55).addScaledVector(this.u, 0.12).addScaledVector(this.l, side * 0.06);
      this.f.copy(this.u).addScaledVector(this.d, -0.3).normalize();
      this.w.copy(this.l).multiplyScalar(-side).addScaledVector(this.u, 0.2);
      this.thumbFrame(i, this.f, this.w, this.q);
    } else {
      // Backhand: the shield arm crosses the body, then sweeps out.
      this.p.copy(this.t).addScaledVector(this.d, -0.5).addScaledVector(this.l, -side * 0.18).addScaledVector(this.u, 0.02);
      this.f.set(-side * 0.6, 0.8, 0);
      this.y.set(-side * 0.6, 0, 0.8);
      this.handFrame(this.f, this.y, this.q);
    }
    this.key(i, 0.13, this.p, this.q, SHAPES.fist, true);
    // Mid-swing: still closed.
    this.w.lerpVectors(this.p, this.t, 0.45);
    this.f.copy(this.d).addScaledVector(this.u, 0.3).normalize();
    this.y.copy(this.u).multiplyScalar(-0.2).addScaledVector(this.l, side * -0.9);
    this.handFrame(this.f, this.y, this.q2);
    this.key(i, 0.18, this.w, this.q2, SHAPES.fist, false);
    // Let go while still moving fast, and follow through.
    this.p.copy(this.t).addScaledVector(this.d, 0.08);
    this.handFrame(this.d, this.y.copy(this.u).negate(), this.q);
    this.key(i, 0.26, this.p, this.q, SHAPES.open, true);
    this.p.copy(this.s).addScaledVector(this.d, 0.4);
    this.key(i, 0.5, this.p, this.q, SHAPES.open, false, true);
  }

  /** A straight punch at the target. */
  private punch(i: number): void {
    this.shoulder(i, this.s);
    this.d.subVectors(this.target, this.s).normalize();
    this.up(this.d, this.u);
    this.begin(i);
    this.p.copy(this.s).addScaledVector(this.d, 0.18);
    this.thumbFrame(i, this.d, this.u, this.q);
    this.key(i, 0.07, this.p, this.q, SHAPES.fist, true, true);
    this.p.copy(this.s).addScaledVector(this.d, 0.86);
    this.key(i, 0.15, this.p, this.q, SHAPES.fist, false);
    this.guardKey(i, 0.4);
  }

  /** WEAVER: whip the webbed enemy away along the stroke. */
  private whip(i: number, sx: number, sy: number): void {
    this.begin(i);
    const t = this.tracks[i];
    this.l.set(sx, sy, -0.6).normalize();
    this.p.copy(t.pos).addScaledVector(this.l, -0.08);
    this.key(i, 0.06, this.p, t.quat, SHAPES.open, true, true);
    this.p.addScaledVector(this.l, 0.42);
    this.key(i, 0.15, this.p, t.quat, SHAPES.open, false);
    this.idleKey(i, 0.42);
  }

  /** WEAVER: fist and pull back hard: rips the webbed enemy apart. */
  private yank(i: number): void {
    this.begin(i);
    const t = this.tracks[i];
    this.p.copy(t.pos);
    this.key(i, 0.05, this.p, t.quat, SHAPES.fist, true);
    this.p.z += 0.3;
    this.p.y -= 0.05;
    this.key(i, 0.14, this.p, t.quat, SHAPES.fist, false);
    this.idleKey(i, 0.4);
  }

  /** PSION: thrust the lifted object toward the target, opening the hand. */
  private fling(i: number): void {
    const t = this.tracks[i];
    this.begin(i);
    this.w.set(0, -0.3, 0).add(this.camPos);
    this.toLocal(this.w, this.s);
    this.d.subVectors(t.pos, this.s).normalize();
    this.p.copy(t.pos).addScaledVector(this.d, 0.12);
    this.key(i, 0.05, this.p, t.quat, SHAPES.fist, false);
    this.p.addScaledVector(this.d, 0.16);
    this.key(i, 0.1, this.p, t.quat, SHAPES.open, true);
    // Palm turned up and kept open a moment, so it locks onto nothing on the way back.
    this.f.set(0, 0.3, -1);
    this.y.set(0, 1, 0);
    this.handFrame(this.f, this.y, this.q);
    this.key(i, 0.3, this.p, this.q, SHAPES.open, false, true);
    this.key(i, 0.65, this.p, this.q, SHAPES.open, false);
    this.idleKey(i, 0.9);
  }

  /** Both palms apart, then slammed together. */
  private clap(): void {
    for (let i = 0; i < 2; i += 1) {
      const side = i === 0 ? -1 : 1;
      this.begin(i);
      this.f.set(0, 1, -0.3);
      this.y.set(-side, 0, 0);
      this.handFrame(this.f, this.y, this.q);
      this.p.set(side * 0.25, -0.12, -0.4);
      this.key(i, 0.13, this.p, this.q, SHAPES.open, true, true);
      this.p.set(side * 0.045, -0.12, -0.4);
      this.key(i, 0.24, this.p, this.q, SHAPES.open, false);
      this.key(i, 0.34, this.p, this.q, SHAPES.open, false);
      this.idleKey(i, 0.6);
    }
  }

  /** RONIN: blades apart, then crossed in an X in front of the face. */
  private cross(): void {
    for (let i = 0; i < 2; i += 1) {
      const side = i === 0 ? -1 : 1;
      this.begin(i);
      this.f.set(0, 0.25, -1).normalize();
      this.u.set(side * 0.4, 1, 0);
      this.thumbFrame(i, this.f, this.u, this.q);
      this.p.set(side * 0.22, -0.16, -0.38);
      this.key(i, 0.12, this.p, this.q, SHAPES.fist, true, true);
      // Thumbs rolled inward: each blade leans across the other.
      this.u.set(-side * 0.75, 1, 0);
      this.thumbFrame(i, this.f, this.u, this.q);
      this.p.set(side * 0.04, -0.15, -0.4);
      this.key(i, 0.22, this.p, this.q, SHAPES.fist, false);
      this.key(i, 0.36, this.p, this.q, SHAPES.fist, false);
      this.guardKey(i, 0.6);
    }
  }

  // ------------------------------------------------------------ helpers

  private reset(hero: HeroId): void {
    this.hero = hero;
    for (let i = 0; i < 2; i += 1) {
      const t = this.tracks[i];
      t.count = 0;
      t.hold = 0;
      t.stage = 'idle';
      t.timer = 0;
      // Bring the hands up into view from below.
      t.pos.set(i === 0 ? -0.2 : 0.2, -0.5, -0.3);
      this.idle(i);
      t.quat.copy(t.wantQuat);
      copyShape(t.shape, t.wantShape);
    }
  }

  private next(): number {
    this.alternate = 1 - this.alternate;
    return this.alternate;
  }

  private shoulder(i: number, out: Vector3): Vector3 {
    return out.set(i === 0 ? -SHOULDER[0] : SHOULDER[0], SHOULDER[1], SHOULDER[2]);
  }

  private toLocal(world: Vector3, out: Vector3): Vector3 {
    return out.subVectors(world, this.camPos).applyQuaternion(this.inverse);
  }

  /** Camera-space up made perpendicular to `d` (falls back to -z when vertical). */
  private up(d: Vector3, out: Vector3): Vector3 {
    out.set(0, 1, 0).addScaledVector(d, -d.y);
    if (out.lengthSq() < 1e-4) out.set(0, 0, -1).addScaledVector(d, d.z);
    return out.normalize();
  }

  /** Hand frame from the finger direction and the direction out of the palm. */
  private handFrame(fingers: Vector3, palm: Vector3, out: Quaternion): Quaternion {
    this.fz.copy(fingers).normalize().negate();
    this.fy.copy(palm).negate();
    this.fy.addScaledVector(this.fz, -this.fy.dot(this.fz)).normalize();
    this.fx.crossVectors(this.fy, this.fz);
    this.m.makeBasis(this.fx, this.fy, this.fz);
    return out.setFromRotationMatrix(this.m);
  }

  /**
   * The rotation taking two square axes of the hand's own frame (`a`, `b`)
   * onto two square directions in camera space (`toA`, `toB`).
   */
  private align(a: Vector3, b: Vector3, toA: Vector3, toB: Vector3, out: Quaternion): Quaternion {
    this.fx.crossVectors(a, b);
    this.m.makeBasis(a, b, this.fx);
    this.fy.crossVectors(toA, toB);
    this.m2.makeBasis(toA, toB, this.fy);
    this.m2.multiply(this.m.transpose());
    return out.setFromRotationMatrix(this.m2);
  }

  /** Same frame from the finger direction and where the thumb side points. */
  private thumbFrame(i: number, fingers: Vector3, thumb: Vector3, out: Quaternion): Quaternion {
    this.fz.copy(fingers).normalize().negate();
    // The right thumb sits on -x of the hand, the left on +x.
    this.fx.copy(thumb).multiplyScalar(i === 1 ? -1 : 1);
    this.fx.addScaledVector(this.fz, -this.fx.dot(this.fz)).normalize();
    this.fy.crossVectors(this.fz, this.fx);
    this.m.makeBasis(this.fx, this.fy, this.fz);
    return out.setFromRotationMatrix(this.m);
  }

  private setFist(i: number, at: Vector3, fingers: Vector3, thumb: Vector3, shape: HandShape): void {
    this.thumbFrame(i, fingers, thumb, this.q);
    this.set(i, at, this.q, shape);
  }

  /** Sets where hand `i` should be when no move is playing. */
  private set(i: number, at: Vector3, quat: Quaternion, shape: HandShape): void {
    const t = this.tracks[i];
    t.wantPos.copy(at);
    t.wantQuat.copy(quat);
    copyShape(t.wantShape, shape);
  }

  /** Jumps hand `i` straight to its wanted pose (no smoothing lag). */
  private snapTo(i: number): void {
    const t = this.tracks[i];
    t.pos.copy(t.wantPos);
    t.quat.copy(t.wantQuat);
    copyShape(t.shape, t.wantShape);
  }

  private begin(i: number): void {
    const t = this.tracks[i];
    t.count = 0;
    t.time = 0;
    this.key(i, 0, t.pos, t.quat, t.shape, false);
  }

  private key(i: number, time: number, pos: Vector3, quat: Quaternion, shape: HandShape, snap: boolean, ease = false): void {
    const t = this.tracks[i];
    if (t.count >= KEYS) return;
    const k = t.keys[t.count];
    k.t = time;
    k.pos.copy(pos);
    k.quat.copy(quat);
    copyShape(k.shape, shape);
    k.snap = snap;
    k.ease = ease;
    t.count += 1;
  }

  private guardKey(i: number, time: number): void {
    this.guard(i);
    const t = this.tracks[i];
    this.key(i, time, t.wantPos, t.wantQuat, t.wantShape, false, true);
  }

  private idleKey(i: number, time: number): void {
    this.idle(i);
    const t = this.tracks[i];
    this.key(i, time, t.wantPos, t.wantQuat, t.wantShape, false, true);
  }

  /** Advances hand `i` (scripted move, else easing toward its wanted pose) and writes its joints. */
  private step(i: number, dt: number, pose: HandPose): void {
    const t = this.tracks[i];
    if (t.count > 1) {
      t.time += dt;
      const keys = t.keys;
      let k = 0;
      while (k < t.count - 2 && t.time >= keys[k + 1].t) k += 1;
      const a = keys[k];
      const b = keys[k + 1];
      let s = Math.min(1, Math.max(0, (t.time - a.t) / Math.max(1e-4, b.t - a.t)));
      if (b.ease) s = s * s * (3 - 2 * s);
      t.pos.lerpVectors(a.pos, b.pos, s);
      t.quat.slerpQuaternions(a.quat, b.quat, s);
      if (b.snap) copyShape(t.shape, b.shape);
      else blendShape(copyShape(t.shape, a.shape), b.shape, s);
      if (t.time >= keys[t.count - 1].t) t.count = 0;
    } else {
      t.count = 0;
      const k = 1 - Math.exp(-dt * RATE);
      t.pos.lerp(t.wantPos, k);
      t.quat.slerp(t.wantQuat, k);
      blendShape(t.shape, t.wantShape, 1 - Math.exp(-dt * 22));
    }
    // Camera space to world.
    this.w.copy(t.pos).applyQuaternion(this.camQuat).add(this.camPos);
    this.q.copy(this.camQuat).multiply(t.quat);
    this.wv[0] = this.w.x;
    this.wv[1] = this.w.y;
    this.wv[2] = this.w.z;
    this.qv[0] = this.q.x;
    this.qv[1] = this.q.y;
    this.qv[2] = this.q.z;
    this.qv[3] = this.q.w;
    writeHand(pose, i === 0, this.wv, this.qv, t.shape);
    pose.tracked = true;
  }
}
