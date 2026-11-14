import { describe, expect, it } from 'vitest';
import { CLICK_GAP, PINCH_OFF, PINCH_ON, PINCH_SETTLE, PINCH_SURE, PinchEdge, SKIP_ARM, SKIP_HOLD, SkipPinch } from './gaze.js';

describe('PinchEdge', () => {
  it('clicks once when the fingers close', () => {
    const pinch = new PinchEdge();
    expect(pinch.update(0.1, 0)).toBe(false);
    expect(pinch.update(PINCH_SURE - 0.005, 0.1)).toBe(true);
    expect(pinch.update(PINCH_SURE - 0.005, 0.2)).toBe(false);
    expect(pinch.held).toBe(true);
  });

  it('does not click while the fingers are still closing', () => {
    const pinch = new PinchEdge();
    // 8 cm, 6 cm, 4.5 cm, then 3.5 cm for one frame, on the way to a full pinch.
    expect(pinch.update(0.08, 0)).toBe(false);
    expect(pinch.update(0.06, 0.014)).toBe(false);
    expect(pinch.update(0.045, 0.028)).toBe(false);
    expect(pinch.update(PINCH_ON - 0.002, 0.042)).toBe(false);
    expect(pinch.held).toBe(false);
    // ...and the click lands as they finish closing.
    expect(pinch.update(PINCH_SURE - 0.004, 0.056)).toBe(true);
  });

  it('clicks a loose pinch that stays closed, and not one that opens again', () => {
    const slow = new PinchEdge();
    expect(slow.update(PINCH_ON - 0.003, 0)).toBe(false);
    expect(slow.update(PINCH_ON - 0.003, PINCH_SETTLE / 2)).toBe(false);
    expect(slow.update(PINCH_ON - 0.003, PINCH_SETTLE + 0.01)).toBe(true);
    const flick = new PinchEdge();
    expect(flick.update(PINCH_ON - 0.003, 0)).toBe(false);
    expect(flick.update(0.05, PINCH_SETTLE / 2)).toBe(false);
    // The wait starts over when the tips come back inside the line.
    expect(flick.update(PINCH_ON - 0.003, PINCH_SETTLE)).toBe(false);
    expect(flick.update(PINCH_ON - 0.003, PINCH_SETTLE * 1.5)).toBe(false);
    expect(flick.update(PINCH_ON - 0.003, PINCH_SETTLE * 2.2)).toBe(true);
  });

  it('needs a real release before it can click again (hysteresis)', () => {
    const pinch = new PinchEdge();
    expect(pinch.update(0.01, 0)).toBe(true);
    // Fingers drift between the two thresholds: still held, no new click.
    expect(pinch.update((PINCH_ON + PINCH_OFF) / 2, 1)).toBe(false);
    expect(pinch.update(0.01, 2)).toBe(false);
    expect(pinch.update(PINCH_OFF + 0.02, 3)).toBe(false);
    expect(pinch.update(0.01, 4)).toBe(true);
  });

  it('ignores a pinch that re-closes inside the click gap', () => {
    const pinch = new PinchEdge();
    expect(pinch.update(0.01, 0)).toBe(true);
    expect(pinch.update(0.1, CLICK_GAP / 4)).toBe(false);
    expect(pinch.update(0.01, CLICK_GAP / 2)).toBe(false);
    expect(pinch.update(0.1, CLICK_GAP * 0.75)).toBe(false);
    expect(pinch.update(0.01, CLICK_GAP * 1.2)).toBe(true);
  });

  it('forgets a pinch when the hand is lost', () => {
    const pinch = new PinchEdge();
    pinch.update(0.01, 0);
    expect(pinch.update(null, 1)).toBe(false);
    expect(pinch.held).toBe(false);
    expect(pinch.update(0.01, 2)).toBe(true);
  });
});

describe('skipping a movie with a pinch', () => {
  const step = 1 / 72;
  /** Runs `seconds` of frames with the given state; returns true if the skip fired. */
  const run = (skip: SkipPinch, playing: boolean, firm: boolean, seconds: number): boolean => {
    let fired = false;
    for (let t = 0; t < seconds; t += step) if (skip.update(playing, firm, step)) fired = true;
    return fired;
  };

  it('does not fire for the pinch that was already held when the movie began', () => {
    const skip = new SkipPinch();
    expect(run(skip, false, true, 1)).toBe(false); // pressing START STORY
    expect(run(skip, true, true, 3)).toBe(false); // movie plays while the same pinch is still held
  });

  it('does not fire until the hand has been open for a moment', () => {
    const skip = new SkipPinch();
    run(skip, true, false, SKIP_ARM / 2);
    expect(run(skip, true, true, SKIP_HOLD * 2)).toBe(false);
  });

  it('fires for a firm pinch that begins after the hand was open, held long enough', () => {
    const skip = new SkipPinch();
    run(skip, true, false, SKIP_ARM + 0.2);
    expect(run(skip, true, true, SKIP_HOLD / 2)).toBe(false);
    expect(run(skip, true, true, SKIP_HOLD)).toBe(true);
  });

  it('a brief pinch is not a skip, and letting go starts over', () => {
    const skip = new SkipPinch();
    run(skip, true, false, SKIP_ARM + 0.2);
    expect(run(skip, true, true, SKIP_HOLD * 0.6)).toBe(false);
    run(skip, true, false, 0.1);
    expect(run(skip, true, true, SKIP_HOLD * 0.6)).toBe(false);
  });

  it('forgets everything when the movie ends', () => {
    const skip = new SkipPinch();
    run(skip, true, false, 1);
    run(skip, false, false, 0.1);
    expect(run(skip, true, true, SKIP_HOLD * 2)).toBe(false);
  });
});
