import { type Camera, type Matrix4, Quaternion, Vector3 } from '@iwsdk/core';
import type { Intent } from './pilot.js';

/**
 * Controller fallback. The game is hands-first, but a player whose headset is
 * not tracking hands (or who simply has controllers in their hands) must still
 * get a working game. In that case the controller's pointing ray plays the
 * part of the flat-screen pointer: the trigger is the attack button, the grip
 * is the special move, B / Y pauses, and a quick flick of the ray with the
 * trigger held is a swipe. The same pilot that drives phone and desktop play
 * turns that intent into the hero's real hand poses, so every hero works.
 */

const TAP_TIME = 0.3;
const TAP_TRAVEL = 0.06;
const SWIPE_TIME = 0.5;
const SWIPE_TRAVEL = 0.14;
const SWIPE_SPEED = 1.6;

export class PadInput {
  /** World position and direction of the primary controller's pointing ray. */
  readonly origin = new Vector3();
  readonly direction = new Vector3();
  /** A controller (not a hand) is connected. */
  present = false;
  /** One-frame edges. */
  pressed = false;
  pausePressed = false;
  /** Thumbstick click: tag in the next hero. */
  swapPressed = false;

  private trigger = 0;
  private squeeze = false;
  private actionButton = false;
  private pauseButton = false;
  private down = false;
  private downAt = 0;
  private startX = 0;
  private startY = 0;
  private lastX = 0;
  private lastY = 0;
  private lastAt = 0;
  private speed = 0;
  private wasSqueeze = false;
  private wasAction = false;
  private wasPause = false;
  private stickButton = false;
  private wasStick = false;
  private readonly rotation = new Quaternion();
  private readonly point = new Vector3();

  /** True when at least one connected source is a controller rather than a hand. */
  static hasController(session: XRSession): boolean {
    for (const source of session.inputSources) {
      if (source.hand == null && source.gamepad != null && source.targetRayMode === 'tracked-pointer') return true;
    }
    return false;
  }

  /**
   * Reads the controllers for this frame. The right one (or whichever there
   * is) is the pointer; B / Y on either pauses. Returns false when no
   * controller pose is available.
   */
  read(frame: XRFrame, space: XRReferenceSpace, origin: Matrix4, playerQuat: Quaternion, session: XRSession): boolean {
    let primary: XRInputSource | null = null;
    let pause = false;
    for (const source of session.inputSources) {
      if (source.hand != null || source.gamepad == null || source.targetRayMode !== 'tracked-pointer') continue;
      const buttons = source.gamepad.buttons;
      if (buttons[5]?.pressed) pause = true;
      if (primary == null || source.handedness === 'right') primary = source;
    }
    this.present = primary != null;
    this.pauseButton = pause;
    if (primary == null) return false;
    const pose = frame.getPose(primary.targetRaySpace, space);
    if (pose == null) return false;
    const p = pose.transform.position;
    const o = pose.transform.orientation;
    this.origin.set(p.x, p.y, p.z).applyMatrix4(origin);
    this.direction.set(0, 0, -1).applyQuaternion(this.rotation.set(o.x, o.y, o.z, o.w)).applyQuaternion(playerQuat).normalize();
    const buttons = primary.gamepad!.buttons;
    this.trigger = buttons[0]?.value ?? 0;
    this.squeeze = buttons[1]?.pressed ?? false;
    this.actionButton = buttons[4]?.pressed ?? false;
    this.stickButton = buttons[3]?.pressed ?? false;
    return true;
  }

  /**
   * Turns the controller into the screen `Intent` and pointer. `ndc` is where
   * the ray lands on the view (so the pilot can aim the hero's hands), and
   * `now` is a running clock in seconds.
   */
  apply(now: number, intent: Intent, ndc: { x: number; y: number }, camera: Camera): void {
    this.point.copy(this.origin).addScaledVector(this.direction, 6).project(camera);
    ndc.x = Math.max(-1, Math.min(1, this.point.x));
    ndc.y = Math.max(-1, Math.min(1, this.point.y));

    const down = this.trigger > 0.55;
    this.pressed = down && !this.down;
    const released = !down && this.down;
    if (this.pressed) {
      this.downAt = now;
      this.startX = ndc.x;
      this.startY = ndc.y;
      this.speed = 0;
    }
    if (down) {
      const step = now - this.lastAt;
      if (step > 1e-4 && !this.pressed) this.speed = Math.max(this.speed * 0.8, Math.hypot(ndc.x - this.lastX, ndc.y - this.lastY) / step);
    }
    this.lastX = ndc.x;
    this.lastY = ndc.y;
    this.lastAt = now;

    intent.pressed = this.pressed;
    intent.released = released;
    intent.down = down;
    intent.held = down ? now - this.downAt : 0;
    intent.x = ndc.x;
    intent.tap = false;
    intent.swipe = false;
    if (released) {
      const dx = ndc.x - this.startX;
      const dy = ndc.y - this.startY;
      const travel = Math.hypot(dx, dy);
      const time = now - this.downAt;
      intent.tap = time < TAP_TIME && travel < TAP_TRAVEL;
      intent.swipe = !intent.tap && ((time < SWIPE_TIME && travel > SWIPE_TRAVEL) || this.speed > SWIPE_SPEED);
      if (intent.swipe) {
        const l = Math.max(1e-4, travel);
        intent.strokeX = dx / l;
        intent.strokeY = dy / l;
      }
    }
    this.down = down;

    // Special: the grip or A / X, on the press.
    intent.special = (this.squeeze && !this.wasSqueeze) || (this.actionButton && !this.wasAction);
    this.wasSqueeze = this.squeeze;
    this.wasAction = this.actionButton;
    this.pausePressed = this.pauseButton && !this.wasPause;
    this.wasPause = this.pauseButton;
    this.swapPressed = this.stickButton && !this.wasStick;
    this.wasStick = this.stickButton;
  }
}
