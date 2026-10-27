import type { HeroId } from './heroes.js';
import type { EnemyKind } from './missions.js';
import { type Intent, newIntent } from './pilot.js';

/**
 * The attract reel behind the landing page: a live trailer of the real game.
 * A bot plays each hero in turn with the same taps, holds and swipes a
 * player would use on a screen (so the hands, weapons and gore are the real
 * thing), while a director moves the camera like a handheld shot.
 */

export interface Shot {
  hero: HeroId;
  /** The variant shown off (an id from arsenal.ts). */
  weapon: string;
}

/** Hero order and the flashiest weapon for each. */
export const SHOWCASE: readonly Shot[] = [
  { hero: 'ronin', weapon: 'ronin-flame' },
  { hero: 'arc', weapon: 'arc-beam' },
  { hero: 'tempest', weapon: 'tempest-thunder' },
  { hero: 'psion', weapon: 'psion-inferno' },
  { hero: 'havoc', weapon: 'havoc-minigun' },
  { hero: 'vanguard', weapon: 'vanguard-storm' },
  { hero: 'vesper', weapon: 'vesper-nova' },
  { hero: 'weaver', weapon: 'weaver-electro' },
  { hero: 'orion', weapon: 'orion-blast' },
  { hero: 'talon', weapon: 'talon-molten' },
];

export const SHOT_SECONDS = 9;
/** Enemies kept on the field at most. */
export const REEL_CROWD = 6;
export const REEL_KINDS: readonly EnemyKind[] = ['drone', 'drone', 'swarmer', 'blade', 'armored', 'drone'];

/** How the bot fights with each hero: hold time, pause, and the style of input. */
const STYLE: Readonly<Record<HeroId, { mode: 'hold' | 'tap' | 'blade' | 'drag' | 'web'; hold: number; gap: number }>> = {
  arc: { mode: 'hold', hold: 1.3, gap: 0.3 },
  havoc: { mode: 'hold', hold: 1.8, gap: 0.35 },
  orion: { mode: 'hold', hold: 0.8, gap: 0.3 },
  ronin: { mode: 'blade', hold: 0, gap: 0.34 },
  talon: { mode: 'blade', hold: 0, gap: 0.3 },
  tempest: { mode: 'tap', hold: 0, gap: 1.35 },
  vanguard: { mode: 'tap', hold: 0, gap: 1.5 },
  vesper: { mode: 'hold', hold: 1.0, gap: 0.3 },
  weaver: { mode: 'web', hold: 0, gap: 0.55 },
  psion: { mode: 'drag', hold: 0.95, gap: 0.45 },
};

export class AttractBot {
  readonly intent: Intent = newIntent();
  /** Where the bot "touches" the screen (normalised device coordinates). */
  readonly ndc = { x: 0, y: -0.1 };
  hero: HeroId = 'ronin';
  private timer = 0.6;
  private step = 0;
  private holding = 0;
  /** Aim point eased toward the chosen target, so drags look like a hand. */
  private aimX = 0;
  private aimY = -0.1;

  /** Starts a new shot with `hero`. */
  reset(hero: HeroId): void {
    this.hero = hero;
    this.timer = 0.5;
    this.step = 0;
    this.holding = 0;
    this.intent.down = false;
    this.intent.held = 0;
  }

  /**
   * Advances one frame. `targets` holds NDC x, y pairs of enemies on screen,
   * nearest first; `tethered`: WEAVER has someone on the line; `special`:
   * the special move (X-strike or clap) is ready.
   */
  update(dt: number, targets: Float32Array, count: number, tethered: boolean, special: boolean): Intent {
    const intent = this.intent;
    intent.pressed = false;
    intent.released = false;
    intent.tap = false;
    intent.swipe = false;
    intent.special = false;
    this.timer -= dt;
    if (intent.down) intent.held += dt;

    // Aim: the nearest enemy on screen; while dragging, the second one.
    const style = STYLE[this.hero];
    const pick = style.mode === 'drag' && intent.down && intent.held > style.hold * 0.55 && count > 1 ? 1 : 0;
    if (count > 0) {
      const k = Math.min(1, dt * (intent.down ? 9 : 14));
      this.aimX += (targets[pick * 2] - this.aimX) * k;
      this.aimY += (targets[pick * 2 + 1] - this.aimY) * k;
    }
    this.ndc.x = this.aimX;
    this.ndc.y = this.aimY;
    intent.x = this.aimX;

    if (count === 0) {
      if (intent.down) this.release(false);
      return intent;
    }
    if (special && this.timer < 0.2 && (this.hero === 'ronin' || this.step % 6 === 5)) {
      intent.special = true;
      this.timer = 0.9;
      this.step += 1;
      return intent;
    }
    switch (style.mode) {
      case 'hold':
      case 'drag':
        if (intent.down) {
          this.holding -= dt;
          if (this.holding <= 0) {
            this.release(false);
            this.timer = style.gap;
          }
        } else if (this.timer <= 0) {
          this.press();
          this.holding = style.hold * (0.8 + Math.random() * 0.4);
        }
        break;
      case 'blade':
        if (this.timer <= 0) {
          this.step += 1;
          this.press();
          if (this.step % 3 === 0) {
            // A hard diagonal swipe through the target.
            const a = (Math.random() < 0.5 ? 0.35 : Math.PI - 0.35) + (Math.random() - 0.5) * 0.6;
            this.release(true, Math.cos(a), -Math.abs(Math.sin(a)) * (Math.random() < 0.7 ? 1 : -1));
          } else this.release(false);
          this.timer = style.gap * (0.85 + Math.random() * 0.3);
        }
        break;
      case 'tap':
        if (this.timer <= 0) {
          this.step += 1;
          this.press();
          this.release(false);
          this.timer = style.gap * (0.85 + Math.random() * 0.3);
        }
        break;
      case 'web':
        if (this.timer <= 0) {
          this.step += 1;
          this.press();
          if (tethered) {
            // Throw them across the room, or now and then rip them apart.
            const rip = Math.random() < 0.3;
            const sx = rip ? 0 : Math.random() < 0.5 ? -1 : 1;
            this.release(true, sx * 0.9, rip ? -1 : 0.45);
            this.timer = style.gap * 1.4;
          } else {
            this.release(false);
            this.timer = style.gap;
          }
        }
        break;
    }
    return intent;
  }

  private press(): void {
    const intent = this.intent;
    intent.down = true;
    intent.pressed = true;
    intent.held = 0;
  }

  private release(swipe: boolean, sx = 1, sy = 0): void {
    const intent = this.intent;
    intent.down = false;
    intent.released = true;
    intent.tap = !swipe && intent.held < 0.3;
    intent.swipe = swipe;
    if (swipe) {
      const l = Math.max(1e-4, Math.hypot(sx, sy));
      intent.strokeX = sx / l;
      intent.strokeY = sy / l;
    }
  }
}

/**
 * Camera work for the reel: drifts toward the fight like a handheld shot,
 * with a slow sway and a slight roll, and a small push-in after each cut.
 */
export class Director {
  yaw = 0;
  pitch = -0.1;
  roll = 0;
  private time = 0;
  private cut = 0;

  reset(): void {
    this.cut = 0;
  }

  /** `targetYaw` is the bearing of what the bot is fighting (radians), or NaN. */
  update(dt: number, targetYaw: number): void {
    this.time += dt;
    this.cut += dt;
    const t = this.time;
    const want = Number.isNaN(targetYaw) ? 0 : Math.max(-0.5, Math.min(0.5, targetYaw * 0.6));
    this.yaw += (want + Math.sin(t * 0.23) * 0.06 - this.yaw) * Math.min(1, dt * 1.3);
    // Look down a touch more right after a cut (the hero's hands), then settle.
    const settle = Math.max(0, 1 - this.cut / 1.6);
    this.pitch = -0.12 - settle * 0.08 + Math.sin(t * 0.31) * 0.025 + Math.sin(t * 1.7) * 0.004;
    this.roll = Math.sin(t * 0.19) * 0.035 + Math.sin(t * 1.3) * 0.004;
  }
}
