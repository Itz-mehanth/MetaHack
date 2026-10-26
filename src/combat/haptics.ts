/**
 * Touch feedback when something hits the player. A headset has no vibration
 * motor and WebXR exposes none, so this reaches what exists: controllers (if
 * the player is holding any), a phone's vibrator, and a connected gamepad.
 * With bare hands on a Quest only the sound, the screen flash and the blood
 * vignette can tell the player they were hit.
 */

interface Actuator {
  pulse?: (value: number, duration: number) => Promise<boolean>;
  playEffect?: (type: string, params: { startDelay: number; duration: number; weakMagnitude: number; strongMagnitude: number }) => Promise<unknown>;
}

interface PadLike {
  vibrationActuator?: Actuator | null;
  hapticActuators?: readonly Actuator[];
}

export class Haptics {
  enabled = true;
  private last = 0;

  /** A pulse of `strength` (0..1) lasting `ms`; rapid repeats are merged. */
  pulse(session: XRSession | null, strength: number, ms: number): void {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this.last < 70) return;
    this.last = now;
    const run = (pad: PadLike | null | undefined) => {
      if (pad == null) return;
      try {
        const actuator = pad.vibrationActuator ?? pad.hapticActuators?.[0];
        if (actuator?.playEffect) {
          void actuator.playEffect('dual-rumble', { startDelay: 0, duration: ms, weakMagnitude: strength * 0.7, strongMagnitude: strength }).catch(() => undefined);
        } else if (actuator?.pulse) void actuator.pulse(strength, ms).catch(() => undefined);
      } catch {
        // A pad that refuses is not worth an error.
      }
    };
    if (session) for (const source of session.inputSources) run(source.gamepad as unknown as PadLike | undefined);
    try {
      for (const pad of navigator.getGamepads?.() ?? []) run(pad as unknown as PadLike | null);
      navigator.vibrate?.(strength > 0.6 ? [Math.round(ms * 0.6), 30, Math.round(ms * 0.5)] : Math.round(ms * 0.6));
    } catch {
      // Not supported here.
    }
  }
}
