/**
 * The player's shield (health) as the player should feel it, kept pure so it can
 * be tested: how much just broke, how much has just come back, when the shield
 * first runs low, and when a heartbeat falls. The gauge (shieldgauge.ts) draws
 * from this and the combat system plays the sounds and warnings it reports.
 */

export type VitalLevel = 'ok' | 'low' | 'critical';

/** At or under this fraction of the shield the warning starts (2 of 5 pips). */
export const LOW_FRACTION = 0.4;

/** `critical` on the last pip, `low` at 40% or less, else `ok` (and `ok` when there is nothing left to warn about). */
export function vitalLevel(health: number, max: number): VitalLevel {
  if (health <= 0 || max <= 0) return 'ok';
  if (health <= 1) return 'critical';
  return health / max <= LOW_FRACTION ? 'low' : 'ok';
}

/** What happened in one update. The same object is reused: read it, do not keep it. */
export interface VitalEvents {
  /** Shield lost since the last update (pips), else 0. */
  lost: number;
  /** Shield restored since the last update (pips), else 0. */
  gained: number;
  /** The shield has just fallen to LOW (from fine). */
  enteredLow: boolean;
  /** The shield has just fallen to its last pip. */
  enteredCritical: boolean;
  /** A heartbeat falls on this update. */
  beat: boolean;
}

/** Seconds a lost pip stays where it was before the ghost drains away. */
const GHOST_HOLD = 0.45;
/** Pips per second the ghost drains at. */
const GHOST_SPEED = 2.6;
/** Seconds a hit's flash and a restore's flash take to fade. */
const HURT_FADE = 1.1;
const HEAL_FADE = 1.2;
/** Seconds between heartbeats while LOW and CRITICAL. */
export const BEAT_LOW = 1.05;
export const BEAT_CRITICAL = 0.62;
/** How fast a heartbeat's pulse dies away (per second). */
const PULSE_FADE = 3.2;

export class Vitals {
  health = 0;
  max = 0;
  level: VitalLevel = 'ok';
  /** Where the shield was before the last hit; drains down to `health` (pips). */
  ghost = 0;
  /** 1 on a hit, fading to 0. */
  hurt = 0;
  /** 1 on a restore, fading to 0. */
  heal = 0;
  /** 1 on a heartbeat, fading to 0. */
  pulse = 0;
  private ghostHold = 0;
  private beatClock = 0;
  private synced = false;
  private readonly events: VitalEvents = { lost: 0, gained: 0, enteredLow: false, enteredCritical: false, beat: false };

  /** 0 when fine, 0.4 when low, 1 on the last pip: how hard the screen edges should pulse. */
  get danger(): number {
    return this.level === 'critical' ? 1 : this.level === 'low' ? 0.4 : 0;
  }

  /**
   * `live`: a run is under way (otherwise the numbers are only copied, so a new
   * run's full shield is not a "restore"). `armed`: the fight is on, so a low
   * shield beats like a heart.
   */
  update(dt: number, health: number, max: number, live: boolean, armed: boolean): VitalEvents {
    const e = this.events;
    e.lost = 0;
    e.gained = 0;
    e.enteredLow = false;
    e.enteredCritical = false;
    e.beat = false;

    if (!live || !this.synced || max !== this.max) {
      this.synced = true;
      this.health = health;
      this.max = max;
      this.ghost = health;
      this.level = vitalLevel(health, max);
      this.hurt = 0;
      this.heal = 0;
      this.pulse = 0;
      this.ghostHold = 0;
      this.beatClock = 0;
      return e;
    }

    const delta = health - this.health;
    if (delta < -0.001) {
      e.lost = -delta;
      this.hurt = 1;
      this.ghostHold = GHOST_HOLD;
    } else if (delta > 0.001) {
      e.gained = delta;
      this.heal = 1;
    }
    this.health = health;

    const level = vitalLevel(health, max);
    if (level !== this.level) {
      if (level === 'critical') e.enteredCritical = true;
      else if (level === 'low' && this.level === 'ok') e.enteredLow = true;
      this.level = level;
      this.beatClock = 0;
    }

    if (this.ghost < health) this.ghost = health;
    else if (this.ghost > health) {
      if (this.ghostHold > 0) this.ghostHold -= dt;
      else this.ghost = Math.max(health, this.ghost - GHOST_SPEED * dt);
    }
    this.hurt = Math.max(0, this.hurt - dt / HURT_FADE);
    this.heal = Math.max(0, this.heal - dt / HEAL_FADE);
    this.pulse = Math.max(0, this.pulse - dt * PULSE_FADE);

    if (armed && this.level !== 'ok') {
      this.beatClock += dt;
      if (this.beatClock >= (this.level === 'critical' ? BEAT_CRITICAL : BEAT_LOW)) {
        this.beatClock = 0;
        e.beat = true;
        this.pulse = 1;
      }
    } else this.beatClock = 0;
    return e;
  }
}
