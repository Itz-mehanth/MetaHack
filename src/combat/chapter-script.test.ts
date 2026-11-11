import { describe, expect, it } from 'vitest';
import { chapterBeats, chapterCast, storySeen, titleCase } from './chapter-script.js';
import { HEROES } from './heroes.js';
import { introId } from './voice.js';

describe('hero story movies', () => {
  it('title-cases names for the voice', () => {
    expect(titleCase('NULL WARDEN')).toBe('Null Warden');
    expect(titleCase("SKYRENDER'S")).toBe("Skyrender's");
    expect(titleCase('WARLORD VEX')).toBe('Warlord Vex');
  });

  it('has six beats per hero with unique voice files', () => {
    const all = new Set<string>();
    for (const hero of HEROES) {
      const beats = chapterBeats(hero.id, hero.name);
      expect(beats.map((b) => b.kind)).toEqual(['lore', 'arrival', 'declare', 'fall', 'road', 'call']);
      for (const beat of beats) {
        expect(beat.text.length).toBeGreaterThan(10);
        all.add(beat.id);
      }
    }
    expect(all.size).toBe(HEROES.length * 6);
  });

  it('names the region, the boss, both lords and all three places', () => {
    for (const hero of HEROES) {
      const cast = chapterCast(hero.id);
      const beats = chapterBeats(hero.id, hero.name);
      const text = (kind: string): string => beats.find((b) => b.kind === kind)!.text.toLowerCase();
      expect(text('lore'), `${hero.id} lore`).toContain(cast.region.toLowerCase());
      expect(text('arrival'), `${hero.id} arrival`).toContain(cast.boss.toLowerCase());
      const road = text('road');
      for (const name of [cast.boss, ...cast.lords, ...cast.places]) expect(road, `${hero.id} road: ${name}`).toContain(name.toLowerCase());
      expect(text('call')).toContain(hero.name.toLowerCase());
    }
  });

  it("reuses the boss's recorded level-3 line as the declaration", () => {
    for (const hero of HEROES) {
      const cast = chapterCast(hero.id);
      const declare = chapterBeats(hero.id, hero.name).find((b) => b.kind === 'declare')!;
      expect(declare.id).toBe(introId(cast.world, 3, 0));
    }
  });

  it('remembers which stories were seen', () => {
    expect(storySeen('ronin')).toBe('story-ronin');
  });
});
