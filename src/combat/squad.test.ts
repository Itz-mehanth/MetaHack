import { describe, expect, it } from 'vitest';
import { buildSquad, nextInSquad, SwapGesture } from './squad.js';

describe('squad', () => {
  it('leads with the chosen hero, then owned heroes, then lent ones', () => {
    expect(buildSquad('arc', ['arc', 'talon', 'orion'])).toEqual(['arc', 'talon', 'orion']);
    expect(buildSquad('talon', ['arc', 'talon', 'orion'])).toEqual(['talon', 'arc', 'orion']);
  });

  it('lends heroes to a new player so they can swap straight away', () => {
    const squad = buildSquad('arc', ['arc']);
    expect(squad).toHaveLength(3);
    expect(squad[0]).toBe('arc');
    expect(new Set(squad).size).toBe(3);
  });

  it('cycles through the squad and wraps', () => {
    const squad = buildSquad('arc', ['arc', 'talon', 'orion']);
    expect(nextInSquad(squad, 'arc')).toBe('talon');
    expect(nextInSquad(squad, 'orion')).toBe('arc');
  });
});

describe('SwapGesture', () => {
  const run = (frames: [boolean, number][], dt = 0.05) => {
    const gesture = new SwapGesture();
    return frames.map(([fists, gap]) => gesture.update(dt, fists, gap));
  };

  it('fires when fists touch and then fly apart', () => {
    const out = run([[true, 0.5], [true, 0.1], [true, 0.1], [true, 0.25], [true, 0.5]]);
    expect(out.filter(Boolean)).toHaveLength(1);
    expect(out[4]).toBe(true);
  });

  it('does not fire for fists that were never touching', () => {
    expect(run([[true, 0.5], [true, 0.3], [true, 0.6]]).some(Boolean)).toBe(false);
  });

  it('does not fire when the fists open', () => {
    expect(run([[true, 0.1], [false, 0.1], [true, 0.5]]).some(Boolean)).toBe(false);
  });

  it('times out if the fists linger together', () => {
    const slow = run([[true, 0.1], ...Array.from({ length: 16 }, () => [true, 0.2] as [boolean, number]), [true, 0.5]]);
    expect(slow.some(Boolean)).toBe(false);
  });

  it('can fire again after another touch', () => {
    const out = run([[true, 0.1], [true, 0.5], [true, 0.1], [true, 0.5]]);
    expect(out.filter(Boolean)).toHaveLength(2);
  });
});

