/**
 * Gaze and pinch for menus: look at a button, pinch to press it. This is how
 * Meta's glasses are driven (eye or head gaze plus a pinch), and it also lets
 * a seated or tired player select without reaching out to poke. The ray comes
 * from the combat system; this file is only the pinch click, kept pure.
 */

/**
 * Thumb and index tips closer than this (metres) count as a pinch for grabs: the
 * bow string and the menu handle. Measured on a Quest 3: a deliberate pinch
 * bottoms out at about 3 cm between the two tip joints (a tight fist reads 1 cm, a
 * relaxed hand 5 cm or more).
 */
export const PINCH_ON = 0.037;

/**
 * A menu click: the gap must be under CLICK_ON, and a pinch that is not quite
 * finished (over CLICK_SURE) has to stay closed for CLICK_SETTLE, so fingers on
 * their way to a pinch do not click. These are the values that worked on a Quest 3
 * (a deliberate pinch bottoms out at 3 cm). A tighter set (3.3 cm, settle 0.12 s)
 * left a few millimetres of slack for tracking noise and stopped real pinches
 * from counting, so what keeps a click deliberate now is the gaze dwell and the
 * stillness check below, which do not depend on how precisely the fingers are measured.
 */
export const CLICK_ON = 0.037;
/** ...and the pinch is released once they pass this. */
export const CLICK_OFF = 0.045;
/** Tips this close are a finished pinch: it counts at once. */
export const CLICK_SURE = 0.03;
/** Seconds a pinch between CLICK_SURE and CLICK_ON must stay closed before it counts. */
export const CLICK_SETTLE = 0.07;
/** Minimum seconds between two clicks from one hand. */
export const CLICK_GAP = 0.4;
/** Seconds the gaze must have rested on the same button before a pinch can press it. */
export const GAZE_DWELL = 0.25;
/** A pinch made while the (smoothed) speed of the pinch point is over this (m/s) is a hand swinging through, not a click. */
export const CLICK_STILL = 1.0;

/**
 * How long the gaze has rested on one thing (a button, a planet). Pass the id of
 * what it rests on each frame ('' for nothing); a click only counts after the
 * dwell, so sweeping the reticle across buttons while pinching presses none.
 */
export class GazeDwell {
  private id = '';
  seconds = 0;

  update(id: string, dt: number): number {
    if (id === '') {
      this.id = '';
      this.seconds = 0;
    } else if (id !== this.id) {
      this.id = id;
      this.seconds = 0;
    } else this.seconds += dt;
    return this.seconds;
  }
}

/** A firm pinch (metres) held to skip a movie: tighter than a menu click, which a loosely held hand can make. */
export const SKIP_PINCH = 0.036;
/** Seconds the hand must have been open during the movie before a pinch can skip it. */
export const SKIP_ARM = 0.4;
/** Seconds the firm pinch must then be held. */
export const SKIP_HOLD = 0.8;

/**
 * Skipping a movie with a pinch. The pinch that pressed START STORY (or a hand
 * resting close to a pinch) must never count, so a skip needs a firm pinch that
 * begins after the hand has been open for a moment while the movie plays, and
 * is then held.
 */
export class SkipPinch {
  private armed = false;
  private open = 0;
  private hold = 0;

  /** `playing`: a movie is on. `firm`: a hand is pinching firmly now. True on the frame the skip fires. */
  update(playing: boolean, firm: boolean, dt: number): boolean {
    if (!playing) {
      this.armed = false;
      this.open = 0;
      this.hold = 0;
      return false;
    }
    if (!firm) {
      this.open += dt;
      if (this.open > SKIP_ARM) this.armed = true;
      this.hold = 0;
      return false;
    }
    this.open = 0;
    this.hold = this.armed ? this.hold + dt : 0;
    return this.hold > SKIP_HOLD;
  }
}

export class PinchEdge {
  private down = false;
  private lastClick = -10;
  /** When the tips first came inside PINCH_ON (-1: they are not inside it). */
  private since = -1;

  /**
   * Feed the thumb-index distance each frame (null when the hand is not
   * tracked). Returns true on the frame a pinch closes, with a short lockout
   * so one pinch is one click. A pinch counts once the tips are under CLICK_SURE,
   * or have stayed under CLICK_ON for CLICK_SETTLE: fingers merely passing
   * through on the way to a pinch do not click.
   */
  update(distance: number | null, now: number): boolean {
    if (distance == null) {
      this.down = false;
      this.since = -1;
      return false;
    }
    if (this.down) {
      if (distance > CLICK_OFF) this.down = false;
      return false;
    }
    if (distance >= CLICK_ON) {
      this.since = -1;
      return false;
    }
    if (this.since < 0) this.since = now;
    if (distance >= CLICK_SURE && now - this.since < CLICK_SETTLE) return false;
    this.down = true;
    this.since = -1;
    if (now - this.lastClick >= CLICK_GAP) {
      this.lastClick = now;
      return true;
    }
    return false;
  }

  /** True while the pinch is held. */
  get held(): boolean {
    return this.down;
  }
}
