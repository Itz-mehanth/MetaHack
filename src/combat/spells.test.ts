import { describe, expect, it } from 'vitest';
import { rollSpell, SPELLS, spellById } from './spells.js';

describe('spell book', () => {
  it('has unique spells with a gesture and an effect', () => {
    expect(new Set(SPELLS.map((s) => s.id)).size).toBe(SPELLS.length);
    for (const s of SPELLS) {
      expect(s.gesture.length).toBeGreaterThan(5);
      expect(spellById(s.id)).toBe(s);
    }
  });

  it('only offers healing when hurt, and favours it then', () => {
    for (let i = 0; i < 200; i += 1) expect(rollSpell(false, () => i / 200).id).not.toBe('ankh');
    let ankh = 0;
    for (let i = 0; i < 400; i += 1) if (rollSpell(true, () => i / 400).id === 'ankh') ankh += 1;
    expect(ankh).toBeGreaterThan(400 / SPELLS.length);
  });

  it('can roll every other spell', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 300; i += 1) seen.add(rollSpell(true, () => i / 300).id);
    expect(seen.size).toBe(SPELLS.length);
  });
});
