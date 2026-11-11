import { describe, expect, it } from 'vitest';
import { buildSquad, nextInSquad } from './squad.js';
import { chipLocal } from './squadbar.js';

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

describe('squad strip', () => {
  it('centres the portraits and spaces them evenly', () => {
    const three = [0, 1, 2].map((i) => chipLocal(i, 3));
    expect(three[1].x).toBeCloseTo(0, 6);
    expect(three[0].x).toBeCloseTo(-three[2].x, 6);
    expect(three[1].x - three[0].x).toBeCloseTo(three[2].x - three[1].x, 6);
    const two = [0, 1].map((i) => chipLocal(i, 2));
    expect(two[0].x).toBeCloseTo(-two[1].x, 6);
    expect(three[0].y).toBe(two[0].y);
  });
});
