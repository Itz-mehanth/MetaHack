import { Matrix4, PerspectiveCamera, Quaternion } from '@iwsdk/core';
import { describe, expect, it } from 'vitest';
import { PadInput } from './pad.js';
import { newIntent } from './pilot.js';

interface FakeButton {
  value: number;
  pressed: boolean;
}

/** A session with one right controller whose ray and buttons the test controls. */
function rig() {
  const buttons: FakeButton[] = Array.from({ length: 6 }, () => ({ value: 0, pressed: false }));
  const pose = { x: 0, y: 1.4, z: 0, qx: 0, qy: 0, qz: 0, qw: 1 };
  const source = { handedness: 'right', targetRayMode: 'tracked-pointer', gamepad: { buttons }, targetRaySpace: {}, hand: undefined } as unknown as XRInputSource;
  const session = { inputSources: [source] } as unknown as XRSession;
  const frame = {
    getPose: () => ({ transform: { position: { x: pose.x, y: pose.y, z: pose.z }, orientation: { x: pose.qx, y: pose.qy, z: pose.qz, w: pose.qw } } }),
  } as unknown as XRFrame;
  const camera = new PerspectiveCamera(70, 1.6, 0.05, 100);
  camera.position.set(0, 1.6, 0);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  const input = new PadInput();
  const intent = newIntent();
  const ndc = { x: 0, y: 0 };
  const identity = new Matrix4();
  const quat = new Quaternion();
  let now = 0;
  /** One frame `dt` later. */
  const step = (dt = 1 / 72) => {
    now += dt;
    expect(input.read(frame, {} as XRReferenceSpace, identity, quat, session)).toBe(true);
    input.apply(now, intent, ndc, camera);
  };
  return { buttons, pose, input, intent, ndc, step, session };
}

describe('PadInput', () => {
  it('recognises a controller but not a hand', () => {
    const { session } = rig();
    expect(PadInput.hasController(session)).toBe(true);
    const hands = { inputSources: [{ hand: {}, gamepad: null, targetRayMode: 'tracked-pointer' }] } as unknown as XRSession;
    expect(PadInput.hasController(hands)).toBe(false);
  });

  it('points the ray forward from the controller', () => {
    const { input, step } = rig();
    step();
    expect(input.direction.z).toBeCloseTo(-1, 5);
    expect(input.origin.y).toBeCloseTo(1.4, 5);
  });

  it('turns a trigger press into press, hold and release', () => {
    const { buttons, intent, step } = rig();
    buttons[0].value = 1;
    step();
    expect(intent.pressed).toBe(true);
    expect(intent.down).toBe(true);
    step();
    expect(intent.pressed).toBe(false);
    expect(intent.down).toBe(true);
    expect(intent.held).toBeGreaterThan(0);
    buttons[0].value = 0;
    step();
    expect(intent.released).toBe(true);
    expect(intent.down).toBe(false);
  });

  it('calls a short, still press a tap', () => {
    const { buttons, intent, step } = rig();
    buttons[0].value = 1;
    step();
    step();
    buttons[0].value = 0;
    step();
    expect(intent.tap).toBe(true);
    expect(intent.swipe).toBe(false);
  });

  it('calls a quick flick of the ray a swipe, with its direction', () => {
    const { buttons, pose, intent, step } = rig();
    buttons[0].value = 1;
    step();
    // Sweep the controller sideways while the trigger is held.
    for (let i = 0; i < 6; i += 1) {
      pose.qy = -0.05 * (i + 1);
      pose.qw = Math.sqrt(1 - pose.qy * pose.qy);
      step();
    }
    buttons[0].value = 0;
    step();
    expect(intent.released).toBe(true);
    expect(intent.tap).toBe(false);
    expect(intent.swipe).toBe(true);
    expect(Math.abs(intent.strokeX)).toBeGreaterThan(0.8);
  });

  it('fires the special move once per grip press, and pauses once per B press', () => {
    const { buttons, input, intent, step } = rig();
    buttons[1].pressed = true;
    step();
    expect(intent.special).toBe(true);
    step();
    expect(intent.special).toBe(false);
    buttons[1].pressed = false;
    buttons[5].pressed = true;
    step();
    expect(input.pausePressed).toBe(true);
    step();
    expect(input.pausePressed).toBe(false);
  });
});
