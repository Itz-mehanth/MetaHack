import { describe, expect, it } from 'vitest';
import { CLICK_GAP, PINCH_OFF, PINCH_ON, PinchEdge } from './gaze.js';

describe('PinchEdge', () => {
  it('clicks once when the fingers close', () => {
    const pinch = new PinchEdge();
    expect(pinch.update(0.1, 0)).toBe(false);
    expect(pinch.update(PINCH_ON - 0.005, 0.1)).toBe(true);
    expect(pinch.update(PINCH_ON - 0.005, 0.2)).toBe(false);
    expect(pinch.held).toBe(true);
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
