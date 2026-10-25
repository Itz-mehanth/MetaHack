import { describe, expect, it } from 'vitest';
import { defaultProfile, WORLDS } from './progression.js';
import {
  ANCHORS_TO_FINALE,
  anchorLine,
  anchorsRecovered,
  CONVERGENCE_AT,
  FINALE_PHASES,
  finalePhase,
  finaleUnlocked,
  PROLOGUE,
  PROLOGUE_DONE,
  PROLOGUE_HEROES,
} from './saga.js';

describe('saga', () => {
  it('lends a hero for every prologue wave and ends on the boss', () => {
    expect(PROLOGUE_HEROES).toHaveLength(PROLOGUE.waves.length);
    expect(PROLOGUE.waves[PROLOGUE.waves.length - 1].boss).toBe(true);
  });

  it('counts an Anchor per beaten region boss and opens the finale', () => {
    const p = defaultProfile();
    expect(anchorsRecovered(p)).toEqual([]);
    for (const world of WORLDS.slice(0, ANCHORS_TO_FINALE)) p.stars[`${world.id}-3`] = 1;
    p.stars[`${WORLDS[5].id}-1`] = 3;
    expect(anchorsRecovered(p)).toHaveLength(ANCHORS_TO_FINALE);
    expect(finaleUnlocked(p)).toBe(false);
    p.unlocks.push(PROLOGUE_DONE);
    expect(finaleUnlocked(p)).toBe(true);
  });

  it('walks the finale relay down to CONVERGENCE', () => {
    expect(finalePhase(1)).toBe(0);
    expect(FINALE_PHASES[finalePhase(0.6)].hero).toBe('ronin');
    expect(FINALE_PHASES[finalePhase(0.3)].hero).toBe('psion');
    expect(finalePhase(CONVERGENCE_AT)).toBe(-1);
  });

  it('tells the player how many Anchors are left', () => {
    expect(anchorLine('MOONFALL', 1).text).toContain('2 more');
    expect(anchorLine('MOONFALL', ANCHORS_TO_FINALE).text).toContain('CONVERGENCE');
  });
});
