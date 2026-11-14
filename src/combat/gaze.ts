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
export const PINCH_OFF = 0.058;
/** Minimum seconds between two clicks from one hand. */
export const CLICK_GAP = 0.4;

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
