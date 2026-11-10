import { Euler, Quaternion, Vector3 } from '@iwsdk/core';
import { type Intent, newIntent } from './pilot.js';

/**
 * Input for playing on a flat screen (phone, tablet, desktop): the action
 * pointer becomes an `Intent` (tap, hold, swipe), and the view turns with a
 * look pad, the phone's gyro, a right-drag or the arrow keys. Also owns the
 * small on-screen controls (pause, special, look pad, gyro toggle) and the
 * "rotate your phone" prompt.
 */

/** Set once the browser lets the page read the phone's motion sensors. */
const motion = { allowed: false };

/**
 * iOS only shares motion data after asking, and only from a tap, so the PLAY
 * button calls this inside its click handler. Elsewhere it is allowed at once.
 */
export function requestMotion(): void {
  const request = (window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined)?.requestPermission;
  if (typeof request !== 'function') {
    motion.allowed = true;
    return;
  }
  request()
    .then((answer) => {
      motion.allowed = answer === 'granted';
    })
    .catch(() => undefined);
}

const TAP_TIME = 0.3;
const TAP_TRAVEL = 0.06;
const SWIPE_TIME = 0.5;
const SWIPE_TRAVEL = 0.14;
const PITCH_LIMIT = 1.2;

const CSS = `
#screen-ui{position:fixed;inset:0;pointer-events:none;z-index:8;font-family:'Bangers','Impact',sans-serif;user-select:none;-webkit-user-select:none}
#screen-ui.off{display:none}
#screen-ui button{pointer-events:auto;font-family:inherit;letter-spacing:.08em;color:#06020F;border:3px solid #06020F;
  border-radius:14px;box-shadow:3px 3px 0 #06020F;cursor:pointer;touch-action:none}
#sc-pause{position:absolute;top:max(12px,env(safe-area-inset-top));right:max(12px,env(safe-area-inset-right));width:52px;height:52px;font-size:24px;background:#FFD23F}
#sc-special{position:absolute;right:max(18px,env(safe-area-inset-right));bottom:max(22px,env(safe-area-inset-bottom));min-width:110px;height:64px;
  font-size:22px;background:linear-gradient(135deg,#3DF5FF,#FF2D9A);display:none}
#sc-special.ready{display:block;animation:sc-pulse .8s ease-in-out infinite}
#sc-swap{position:absolute;right:max(18px,env(safe-area-inset-right));bottom:calc(max(22px,env(safe-area-inset-bottom)) + 78px);min-width:110px;height:52px;
  font-size:20px;background:#FFD23F;display:none}
#sc-swap.on{display:block}
@keyframes sc-pulse{50%{transform:scale(1.08)}}
#sc-gyro{position:absolute;top:max(12px,env(safe-area-inset-top));right:calc(max(12px,env(safe-area-inset-right)) + 64px);height:52px;
  padding:0 12px;font-size:16px;background:#E9FCFF;display:none}
#sc-gyro.on{background:#3DF5FF}
#sc-look{position:absolute;left:max(18px,env(safe-area-inset-left));bottom:max(18px,env(safe-area-inset-bottom));width:132px;height:132px;
  border-radius:50%;border:3px solid rgba(233,252,255,.55);background:radial-gradient(circle,rgba(61,245,255,.18),rgba(6,2,15,.35));
  pointer-events:auto;touch-action:none;display:none}
#sc-look::after{content:'LOOK';position:absolute;left:0;right:0;top:-24px;text-align:center;color:#E9FCFF;font-size:15px;letter-spacing:.12em;
  text-shadow:2px 2px 0 #06020F}
#sc-look i{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;background:#E9FCFF;
  border:3px solid #06020F;box-shadow:0 0 14px #3DF5FF}
#sc-tip{position:absolute;left:50%;bottom:max(20px,env(safe-area-inset-bottom));transform:translateX(-50%);max-width:min(70vw,560px);
  padding:8px 16px;border:3px solid #06020F;border-radius:12px;background:rgba(255,246,214,.94);color:#06020F;font-size:20px;letter-spacing:.05em;
  text-align:center;box-shadow:4px 4px 0 #06020F;opacity:0;transition:opacity .3s}
#sc-tip.show{opacity:1}
#sc-tip small{display:block;font-family:'Rajdhani',sans-serif;font-weight:600;font-size:15px;letter-spacing:0}
#sc-rotate{position:absolute;inset:0;display:none;place-items:center;text-align:center;background:rgba(6,2,15,.92);color:#E9FCFF;
  font-size:30px;letter-spacing:.08em;pointer-events:auto}
#sc-rotate b{display:block;font-size:64px;color:#FFD23F;animation:sc-turn 1.6s ease-in-out infinite}
@keyframes sc-turn{50%{transform:rotate(-90deg)}}
@media (orientation:portrait) and (max-width:900px){#screen-ui.touch #sc-rotate{display:grid}}
`;

export class ScreenInput {
  readonly intent: Intent = newIntent();
  /** Pointer on screen in normalised device coordinates. */
  readonly ndc = { x: 0, y: 0 };
  /** View direction chosen by the player. */
  yaw = 0;
  pitch = -0.2;
  /** A press landed this frame at `ndc` (menus use it for clicks). */
  clicked = false;
  readonly touch: boolean;
  /** Called when the pause button or key is pressed. */
  onPause: (() => void) | null = null;

  private readonly root: HTMLDivElement;
  private readonly special: HTMLButtonElement;
  private readonly gyroButton: HTMLButtonElement;
  private readonly look: HTMLDivElement;
  private readonly knob: HTMLElement;
  private readonly tip: HTMLDivElement;
  private readonly cleanup: Array<() => void> = [];
  private pointerId = -1;
  private downAt = 0;
  private startX = 0;
  private startY = 0;
  private lastX = 0;
  private lastY = 0;
  private lastT = 0;
  private velX = 0;
  private velY = 0;
  private pressedFlag = false;
  private releasedFlag = false;
  private specialFlag = false;
  private swapFlag = false;
  private readonly swapButton: HTMLButtonElement;
  private dragId = -1;
  private dragX = 0;
  private dragY = 0;
  private lookId = -1;
  private stickX = 0;
  private stickY = 0;
  private readonly keys = new Set<string>();
  private gyroOn = false;
  private gyroSeen = false;
  private gyroYaw = 0;
  private gyroPitch = 0;
  private yawOffset = 0;
  private pitchOffset = 0;
  private motionUsed = false;
  private gyroBase = -1;
  private readonly euler = new Euler();
  private readonly dq = new Quaternion();
  private readonly q0 = new Quaternion();
  private readonly q1 = new Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
  private readonly zee = new Vector3(0, 0, 1);
  private tipTimer = 0;
  private shownKey = -1;
  private specialLabel = '-';

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.touch = window.matchMedia?.('(pointer: coarse)').matches ?? 'ontouchstart' in window;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    this.root = document.createElement('div');
    this.root.id = 'screen-ui';
    this.root.className = `off${this.touch ? ' touch' : ''}`;
    this.root.innerHTML = `<button id="sc-pause" aria-label="Pause">II</button>
      <button id="sc-gyro">GYRO</button>
      <div id="sc-look"><i></i></div>
      <button id="sc-special">SPECIAL</button>
      <button id="sc-swap">TAG IN (Q)</button>
      <div id="sc-tip"></div>
      <div id="sc-rotate"><div><b>&#x21BB;</b>TURN YOUR PHONE SIDEWAYS</div></div>`;
    document.body.appendChild(this.root);
    this.special = this.root.querySelector('#sc-special')!;
    this.swapButton = this.root.querySelector('#sc-swap')!;
    this.gyroButton = this.root.querySelector('#sc-gyro')!;
    this.look = this.root.querySelector('#sc-look')!;
    this.knob = this.look.querySelector('i')!;
    this.tip = this.root.querySelector('#sc-tip')!;
    if (this.touch) this.look.style.display = 'block';

    const on = <E extends Event>(el: EventTarget, type: string, fn: (e: E) => void) => {
      el.addEventListener(type, fn as EventListener);
      this.cleanup.push(() => el.removeEventListener(type, fn as EventListener));
    };
    on<PointerEvent>(canvas, 'pointerdown', (e) => this.down(e));
    on<PointerEvent>(window, 'pointermove', (e) => this.move(e));
    on<PointerEvent>(window, 'pointerup', (e) => this.up(e));
    on<PointerEvent>(window, 'pointercancel', (e) => this.up(e));
    on(canvas, 'contextmenu', (e) => e.preventDefault());
    on<PointerEvent>(this.look, 'pointerdown', (e) => {
      e.preventDefault();
      this.lookId = e.pointerId;
      this.look.setPointerCapture(e.pointerId);
      this.stick(e);
    });
    on<PointerEvent>(this.look, 'pointermove', (e) => {
      if (e.pointerId === this.lookId) this.stick(e);
    });
    const release = (e: PointerEvent) => {
      if (e.pointerId !== this.lookId) return;
      this.lookId = -1;
      this.stickX = 0;
      this.stickY = 0;
      this.knob.style.transform = '';
    };
    on(this.look, 'pointerup', release);
    on(this.look, 'pointercancel', release);
    on<PointerEvent>(this.swapButton, 'pointerdown', (e) => {
      e.preventDefault();
      this.swapFlag = true;
    });
    on<PointerEvent>(this.special, 'pointerdown', (e) => {
      e.preventDefault();
      this.specialFlag = true;
    });
    on(this.root.querySelector<HTMLButtonElement>('#sc-pause')!, 'click', () => this.onPause?.());
    on(this.gyroButton, 'click', () => {
      if (this.gyroOn) this.setGyro(false);
      else void this.enableGyro();
    });
    on<KeyboardEvent>(window, 'keydown', (e) => {
      const key = e.key.toLowerCase();
      if (key === ' ' || key === 'e') this.specialFlag = true;
      if (key === 'q') this.swapFlag = true;
      if ((key === 'escape' || key === 'p') && !this.root.classList.contains('off')) this.onPause?.();
      this.keys.add(key);
    });
    on<KeyboardEvent>(window, 'keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    on(window, 'blur', () => this.keys.clear());
    on<DeviceOrientationEvent>(window, 'deviceorientation', (e) => this.orient(e));
  }

  dispose(): void {
    for (const fn of this.cleanup) fn();
    this.root.remove();
  }

  /** Shows the on-screen controls (`playing`: a stage is running). */
  show(visible: boolean, playing: boolean): void {
    // Called every frame: touch the DOM only when something changes.
    const key = (visible ? 1 : 0) + (playing ? 2 : 0) + (this.gyroSeen ? 4 : 0);
    if (key === this.shownKey) return;
    this.shownKey = key;
    this.root.classList.toggle('off', !visible);
    this.root.classList.toggle('playing', playing);
    this.root.querySelector<HTMLElement>('#sc-pause')!.style.display = playing ? 'block' : 'none';
    this.look.style.display = this.touch && playing ? 'block' : 'none';
    this.gyroButton.style.display = this.touch && playing && this.gyroSeen ? 'block' : 'none';
    if (!playing) this.setSpecial('');
  }

  /** Shows or hides the TAG IN button (a squad is in play). */
  setSwap(on: boolean): void {
    this.swapButton.classList.toggle('on', on);
  }

  /** True once per Q press or tap of TAG IN. */
  takeSwap(): boolean {
    const pressed = this.swapFlag;
    this.swapFlag = false;
    return pressed;
  }

  /** Labels the special button; empty hides it. */
  setSpecial(label: string): void {
    if (label === this.specialLabel) return;
    this.specialLabel = label;
    this.special.textContent = label;
    this.special.classList.toggle('ready', label !== '');
  }

  /** A short how-to line at the bottom of the screen. */
  showTip(title: string, sub: string, seconds = 4): void {
    this.tip.innerHTML = `${title}<small>${sub}</small>`;
    this.tip.classList.add('show');
    this.tipTimer = seconds;
  }

  /**
   * Phones: turn the view with the device. iOS asks permission, which only
   * works from a tap, so the PLAY button calls this.
   */
  async enableGyro(): Promise<boolean> {
    const request = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission;
    if (typeof request === 'function') {
      try {
        if ((await request()) !== 'granted') return false;
      } catch {
        return false;
      }
    }
    this.setGyro(true);
    return true;
  }

  private setGyro(on: boolean): void {
    this.gyroOn = on;
    this.gyroBase = -1;
    this.gyroButton.classList.toggle('on', on);
    this.gyroButton.textContent = on ? 'GYRO ON' : 'GYRO OFF';
  }

  /** Points the view (e.g. at a menu) without fighting the gyro. */
  lookAt(yaw: number, pitch: number): void {
    this.yaw = yaw;
    this.pitch = pitch;
    this.gyroBase = -1;
  }

  /**
   * Advances one frame: one-frame flags (press, release, tap, swipe,
   * special), the look controls and the tip timer.
   */
  frame(dt: number): Intent {
    const intent = this.intent;
    const now = performance.now() / 1000;
    intent.pressed = this.pressedFlag;
    intent.released = this.releasedFlag;
    intent.special = this.specialFlag;
    this.clicked = this.pressedFlag;
    this.pressedFlag = false;
    this.releasedFlag = false;
    this.specialFlag = false;
    intent.down = this.pointerId >= 0;
    intent.held = intent.down ? now - this.downAt : 0;
    intent.x = this.ndc.x;
    if (!intent.released) {
      intent.tap = false;
      intent.swipe = false;
    }

    // Look: stick, keys, right-drag (applied in move), gyro.
    let yawRate = 0;
    let pitchRate = 0;
    const dead = (v: number) => (Math.abs(v) < 0.15 ? 0 : (v - Math.sign(v) * 0.15) / 0.85);
    yawRate -= dead(this.stickX) * 2.4;
    pitchRate -= dead(this.stickY) * 1.6;
    if (this.keys.has('arrowleft') || this.keys.has('a')) yawRate += 1.8;
    if (this.keys.has('arrowright') || this.keys.has('d')) yawRate -= 1.8;
    if (this.keys.has('arrowup') || this.keys.has('w')) pitchRate += 1.2;
    if (this.keys.has('arrowdown') || this.keys.has('s')) pitchRate -= 1.2;
    // Holding the pointer near a side edge turns that way.
    if (intent.down && intent.held > 0.3 && Math.abs(this.ndc.x) > 0.86) yawRate -= Math.sign(this.ndc.x) * 1.1;
    // Phones: the gyro comes on by itself once motion data is allowed.
    if (motion.allowed && !this.motionUsed && this.touch) {
      this.motionUsed = true;
      this.setGyro(true);
    }
    if (this.gyroOn && this.gyroSeen) {
      if (this.gyroBase < 0) {
        // Re-centre: however the phone is held now, the view stays where it is.
        this.yawOffset = this.yaw - this.gyroYaw;
        this.pitchOffset = this.pitch - this.gyroPitch;
        this.gyroBase = 1;
      }
      this.yawOffset += yawRate * dt;
      this.pitchOffset += pitchRate * dt;
      this.yaw = this.gyroYaw + this.yawOffset;
      this.pitch = this.gyroPitch + this.pitchOffset;
    } else {
      this.yaw += yawRate * dt;
      this.pitch += pitchRate * dt;
    }
    this.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.pitch));

    if (this.tipTimer > 0) {
      this.tipTimer -= dt;
      if (this.tipTimer <= 0) this.tip.classList.remove('show');
    }
    return intent;
  }

  private setNdc(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private down(e: PointerEvent): void {
    // Right or middle button: drag to look.
    if (e.pointerType === 'mouse' && e.button !== 0) {
      this.dragId = e.pointerId;
      this.dragX = e.clientX;
      this.dragY = e.clientY;
      return;
    }
    if (this.pointerId >= 0) {
      // A second finger on the scene: the special move.
      this.specialFlag = true;
      return;
    }
    e.preventDefault();
    this.pointerId = e.pointerId;
    this.setNdc(e);
    this.downAt = performance.now() / 1000;
    this.startX = this.ndc.x;
    this.startY = this.ndc.y;
    this.lastX = this.ndc.x;
    this.lastY = this.ndc.y;
    this.lastT = this.downAt;
    this.velX = 0;
    this.velY = 0;
    this.pressedFlag = true;
  }

  private move(e: PointerEvent): void {
    if (e.pointerId === this.dragId) {
      const scale = 2.6 / Math.max(320, this.canvas.clientHeight);
      this.yaw -= (e.clientX - this.dragX) * scale;
      this.pitch -= (e.clientY - this.dragY) * scale;
      this.dragX = e.clientX;
      this.dragY = e.clientY;
      return;
    }
    if (e.pointerId !== this.pointerId && !(e.pointerType === 'mouse' && this.pointerId < 0)) return;
    this.setNdc(e);
    if (e.pointerId !== this.pointerId) return;
    const now = performance.now() / 1000;
    const dt = Math.max(1e-3, now - this.lastT);
    const aspect = this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight);
    // Smoothed stroke velocity in screen heights per second.
    const k = Math.min(1, dt * 25);
    this.velX += (((this.ndc.x - this.lastX) * aspect) / dt - this.velX) * k;
    this.velY += ((this.ndc.y - this.lastY) / dt - this.velY) * k;
    this.lastX = this.ndc.x;
    this.lastY = this.ndc.y;
    this.lastT = now;
  }

  private up(e: PointerEvent): void {
    if (e.pointerId === this.dragId) {
      this.dragId = -1;
      return;
    }
    if (e.pointerId !== this.pointerId) return;
    this.setNdc(e);
    this.pointerId = -1;
    this.releasedFlag = true;
    const time = performance.now() / 1000 - this.downAt;
    const aspect = this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight);
    const dx = (this.ndc.x - this.startX) * aspect;
    const dy = this.ndc.y - this.startY;
    const travel = Math.hypot(dx, dy) / 2;
    const intent = this.intent;
    intent.tap = time < TAP_TIME && travel < TAP_TRAVEL;
    // A swipe: a quick stroke, or a flick at the end of a longer drag.
    const speed = Math.hypot(this.velX, this.velY) / 2;
    intent.swipe = !intent.tap && ((time < SWIPE_TIME && travel > SWIPE_TRAVEL) || speed > 1.6);
    if (intent.swipe) {
      const sx = speed > 1.6 ? this.velX : dx;
      const sy = speed > 1.6 ? this.velY : dy;
      const l = Math.max(1e-4, Math.hypot(sx, sy));
      intent.strokeX = sx / l;
      intent.strokeY = sy / l;
    }
  }

  private stick(e: PointerEvent): void {
    const rect = this.look.getBoundingClientRect();
    const r = rect.width / 2;
    let x = (e.clientX - rect.left - r) / r;
    let y = (e.clientY - rect.top - r) / r;
    const l = Math.hypot(x, y);
    if (l > 1) {
      x /= l;
      y /= l;
    }
    this.stickX = x;
    this.stickY = y;
    this.knob.style.transform = `translate(${x * r * 0.6}px, ${y * r * 0.6}px)`;
  }

  /** Device orientation to a camera yaw and pitch (screen rotation aware). */
  private orient(e: DeviceOrientationEvent): void {
    if (e.alpha == null || e.beta == null || e.gamma == null) return;
    if (!this.gyroSeen) {
      this.gyroSeen = true;
      this.shownKey = -1;
    }
    const deg = Math.PI / 180;
    const screenAngle = (screen.orientation?.angle ?? (window as unknown as { orientation?: number }).orientation ?? 0) * deg;
    this.euler.set(e.beta * deg, e.alpha * deg, -e.gamma * deg, 'YXZ');
    this.dq.setFromEuler(this.euler);
    this.dq.multiply(this.q1);
    this.dq.multiply(this.q0.setFromAxisAngle(this.zee, -screenAngle));
    this.euler.setFromQuaternion(this.dq, 'YXZ');
    this.gyroYaw = this.euler.y;
    this.gyroPitch = this.euler.x;
  }
}
