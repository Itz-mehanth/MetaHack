/**
 * Gaze and pinch for menus: look at a button, pinch to press it. This is how
 * Meta's glasses are driven (eye or head gaze plus a pinch), and it also lets
 * a seated or tired player select without reaching out to poke. The ray comes
 * from the combat system; this file is only the pinch click, kept pure.
 */

/**
 * Thumb and index tips closer than this (metres) count as a pinch. Measured on a
 * Quest 3: a deliberate pinch bottoms out at about 3 cm between the two tip
 * joints (a tight fist reads 1 cm, a relaxed hand 5 cm or more), so the line
 * sits at 4 cm.
 */
export const PINCH_ON = 0.04;
/** ...and the pinch is released once they pass this. */
export const PINCH_OFF = 0.047;
/** Minimum seconds between two clicks from one hand. */
export const CLICK_GAP = 0.4;

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

  /**
   * Feed the thumb-index distance each frame (null when the hand is not
   * tracked). Returns true on the frame a pinch closes, with a short lockout
   * so one pinch is one click.
   */
  update(distance: number | null, now: number): boolean {
    if (distance == null) {
      this.down = false;
      return false;
    }
    if (this.down) {
      if (distance > PINCH_OFF) this.down = false;
      return false;
    }
    if (distance < PINCH_ON) {
      this.down = true;
      if (now - this.lastClick >= CLICK_GAP) {
        this.lastClick = now;
        return true;
      }
    }
    return false;
  }

  /** True while the pinch is held. */
  get held(): boolean {
    return this.down;
  }
}
