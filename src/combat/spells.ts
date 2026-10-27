/**
 * VESPER's spell book. Enemies drop rune orbs; touching one loads a random
 * spell, cast with a hand gesture (or the CAST button on a screen) before the
 * charge fades. Pure data so it can be tested and shown in the HUD.
 */

export type SpellId = 'mandala' | 'rift' | 'bubble' | 'bind' | 'clones' | 'meteor' | 'ankh';

export interface SpellDef {
  readonly id: SpellId;
  readonly name: string;
  readonly color: string;
  /** How to cast it with bare hands. */
  readonly gesture: string;
  /** What it does, in a few words. */
  readonly effect: string;
  /** Relative drop weight. */
  readonly weight: number;
}

export const SPELLS: readonly SpellDef[] = [
  { id: 'mandala', name: 'MANDALA SHIELD', color: '#FFC857', gesture: 'Hold one open palm out toward them', effect: 'A rune wheel blocks hits and reflects shots', weight: 3 },
  { id: 'rift', name: 'RIFT PORTAL', color: '#7CE8FF', gesture: 'Hold both palms out together', effect: 'A portal returns shots and pulls enemies in', weight: 2 },
  { id: 'bubble', name: 'TIME BUBBLE', color: '#8A5CFF', gesture: 'Cup both hands together, then open them', effect: 'Enemies around you crawl at a fifth of their speed', weight: 2 },
  { id: 'bind', name: 'BINDING SIGILS', color: '#FF7AC6', gesture: 'Make a fist, then snap it open at them', effect: 'Rune shackles hold enemies and double your damage', weight: 3 },
  { id: 'clones', name: 'ASTRAL TWINS', color: '#C9B0FF', gesture: 'Spread both hands wide apart', effect: 'Two ghost casters fire darts beside you', weight: 2 },
  { id: 'meteor', name: 'METEOR SIGIL', color: '#FF7A3D', gesture: 'Raise a hand overhead, then slam it down', effect: 'Meteors rain on the enemies ahead', weight: 2 },
  { id: 'ankh', name: 'HEALING ANKH', color: '#39FF88', gesture: 'Press both palms to your chest', effect: 'Restores 2 shield', weight: 1 },
];

export function spellById(id: string): SpellDef | undefined {
  return SPELLS.find((s) => s.id === id);
}

/** A random spell by weight; healing is far likelier when `hurt`, and never offered at full health. */
export function rollSpell(hurt: boolean, random: () => number = Math.random): SpellDef {
  const pool = SPELLS.filter((s) => s.id !== 'ankh' || hurt);
  const weight = (s: SpellDef) => (s.id === 'ankh' ? s.weight * 4 : s.weight);
  let total = 0;
  for (const s of pool) total += weight(s);
  let r = random() * total;
  for (const s of pool) {
    r -= weight(s);
    if (r <= 0) return s;
  }
  return pool[pool.length - 1];
}
