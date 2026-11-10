import type { HeroId } from './heroes.js';

/**
 * Tag team: every mission is fought by a squad of up to three heroes and the
 * player swaps between them on the fly. A swap lands a TAG-IN strike, and the
 * incoming hero hits harder for a few seconds, so changing heroes is a move,
 * not a menu. Pure rules, unit tested.
 */

export const SQUAD_SIZE = 3;
/** Seconds the incoming hero's damage is boosted after a swap. */
export const TAG_BUFF_SECONDS = 4;
export const TAG_DAMAGE = 1.6;
/** Seconds before the next swap is allowed. */
export const SWAP_COOLDOWN = 2.2;

/**
 * Heroes lent to a squad that has no other owned heroes (a new player still
 * gets to swap on the first mission): the flashiest first.
 */
export const LENT_ORDER: readonly HeroId[] = ['ronin', 'tempest', 'psion', 'orion', 'weaver', 'havoc', 'talon', 'vesper', 'vanguard', 'arc'];

/** The lead hero, then owned heroes in unlock order, then lent heroes. */
export function buildSquad(lead: HeroId, owned: readonly HeroId[], size = SQUAD_SIZE): HeroId[] {
  const squad: HeroId[] = [lead];
  for (const hero of owned) if (squad.length < size && !squad.includes(hero)) squad.push(hero);
  for (const hero of LENT_ORDER) if (squad.length < size && !squad.includes(hero)) squad.push(hero);
  return squad;
}

/** The hero after `current` in the squad, wrapping around. */
export function nextInSquad(squad: readonly HeroId[], current: HeroId): HeroId {
  const at = squad.indexOf(current);
  return squad[(at + 1) % squad.length];
}

/** The two-fist swap gesture: fists touch, then fly apart quickly. */
export const SWAP_TOUCH = 0.14;
export const SWAP_APART = 0.4;
/** Fists must come apart within this long of touching. */
export const SWAP_WINDOW = 0.7;

export class SwapGesture {
  private touched = false;
  private since = 0;
  private fired = false;

  /**
   * Feeds one frame: both hands are closed fists and `gap` metres apart
   * (`fists` false resets it). Returns true on the frame the swap completes.
   */
  update(dt: number, fists: boolean, gap: number): boolean {
    if (!fists) {
      this.touched = false;
      this.fired = false;
      return false;
    }
    if (gap < SWAP_TOUCH) {
      this.touched = true;
      this.since = 0;
      this.fired = false;
      return false;
    }
    if (!this.touched) return false;
    this.since += dt;
    if (this.since > SWAP_WINDOW) {
      this.touched = false;
      return false;
    }
    if (gap > SWAP_APART && !this.fired) {
      this.fired = true;
      this.touched = false;
      return true;
    }
    return false;
  }
}
