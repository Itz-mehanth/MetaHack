import { describe, expect, it } from 'vitest';
import { menuStillFacing } from './menuaim.js';

/** A heading `degrees` to the right of straight ahead (-z), as the flat part of a forward vector. */
const heading = (degrees: number, pitch = 0) => {
  const a = (degrees * Math.PI) / 180;
  const flat = Math.cos(pitch);
  return { x: Math.sin(a) * flat, z: -Math.cos(a) * flat };
};

describe('menu stays put while you select', () => {
  const menu = heading(0);

  it('keeps the menu when you look at the edge of the panel to press a button', () => {
    // A panel 0.5 m away and 0.6 m wide: its edge is about 30 degrees off the middle.
    expect(menuStillFacing(menu, heading(30))).toBe(true);
    expect(menuStillFacing(menu, heading(-30))).toBe(true);
    expect(menuStillFacing(menu, heading(55))).toBe(true);
  });

  it('brings the menu round once you have really turned away', () => {
    expect(menuStillFacing(menu, heading(90))).toBe(false);
    expect(menuStillFacing(menu, heading(180))).toBe(false);
    expect(menuStillFacing(menu, heading(-120))).toBe(false);
  });

  it('ignores how far up or down you are looking', () => {
    expect(menuStillFacing(menu, heading(10, 0.9))).toBe(true);
    expect(menuStillFacing(menu, heading(100, 0.9))).toBe(false);
  });

  it('keeps the menu when looking straight up or down (no heading to judge)', () => {
    expect(menuStillFacing(menu, { x: 0, z: 0 })).toBe(true);
  });

  it('re-anchors if the menu has no heading yet', () => {
    expect(menuStillFacing({ x: 0, z: 0 }, heading(0))).toBe(false);
  });
});
