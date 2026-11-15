import type { HeroId } from './heroes.js';
import { chapterFor } from './story.js';
import { CHAMPIONS } from './twists.js';
import { chapterId, introId } from './voice.js';

/**
 * The story movie that opens each hero's journey: what the region was, who
 * destroyed it and how, the three trials (two lords, then the boss) and the
 * hero's call. Pure data shared by the 3D sequence (chaptercinema.ts) and the
 * voice-over renderer (scripts/vo). The movie's own lines are voiced
 * narrations; the boss's declaration reuses the level-3 line already recorded.
 */

export type BeatKind = 'lore' | 'arrival' | 'declare' | 'fall' | 'road' | 'call' | 'recap';

export interface ChapterBeat {
  readonly kind: BeatKind;
  /** Voice-over file id (public/vo/<id>.mp3). */
  readonly id: string;
  /** Who speaks: the narrator, ECHO, or the boss (the declaration). */
  readonly voice: 'narrator' | 'echo' | 'villain' | 'vex';
  readonly text: string;
}

interface Written {
  readonly lore: string;
  readonly arrival: string;
  readonly fall: string;
}

/** The three hand-written beats of each region. */
const WRITTEN: Readonly<Record<HeroId, Written>> = {
  arc: {
    lore: 'Neo Veridia, the city that never slept. A million lights, one living grid, and an Anchor that kept its sky awake.',
    arrival: 'Then came Synapse, the Tyrant of the Grid. He did not break the city. He plugged into it.',
    fall: 'Every light bent to his will. The trains stopped, the towers went dark, and the people were caged in their own streets. The Anchor was torn from the sky.',
  },
  talon: {
    lore: 'Cinderhold, the forge city, where every blade in the realm was born in fire.',
    arrival: 'Then came Magmaw, the Furnace Brute. He kicked down the gates, and the fires never went out again.',
    fall: 'He melted the bridges and chained the workers to the vats. The sky turned to ash, and the Anchor was dragged into his forge.',
  },
  tempest: {
    lore: 'Thundercrest, a mountain above the clouds, where the sky itself once bowed to an ancient hammer.',
    arrival: 'Then came Skyrender, the Storm Witch. She learned the storm\'s secret name, and took the lightning for herself.',
    fall: 'She tore the peaks from their roots and hurled the pilots from the sky. The Anchor spun away into the eye of her storm.',
  },
  orion: {
    lore: 'Glacier Reach, a kingdom of crystal spires, where the cold kept a quiet peace.',
    arrival: 'Then came Cryoss, the Frozen Hunter. He hunts survivors for sport, and he has never lost a trail.',
    fall: 'He froze the rivers, shattered the spires, and left the outpost to the wolves. The Anchor became a trophy on his throne.',
  },
  weaver: {
    lore: 'The Rift. Once a quiet city of bridges, stitched together over an endless drop.',
    arrival: 'Then came Warlord Vex, lord of the Hollow Legion. He opened the sky above it, and everything began to fall.',
    fall: 'The streets tore loose. The bridges snapped. Whole crowds were pulled into the void, and the Anchor fell into the heart of the Rift.',
  },
  havoc: {
    lore: 'Rustfall, the scrap wastes. A hard land of scavengers, where the only law was a fast draw.',
    arrival: 'Then came Razorback, the Scrap Warlord. He bolted a war rig to his own body and claimed the wastes.',
    fall: 'His raiders burned the settlements and caged every scavenger in scrap. The Anchor was melted into the heart of his smelter.',
  },
  ronin: {
    lore: 'Moonfall, a temple under a silver moon, where monks rang the bell that kept the night in balance.',
    arrival: 'Then came Iron Oni, the Blade Warlord. He forged a war-mech from a thousand broken swords, and silenced the bell.',
    fall: 'His hunters swept the bamboo sea and caged the monks on the temple steps. The moon went dark, and the Anchor was cut from the sky.',
  },
  psion: {
    lore: 'Driftholm, a chain of islands held in the sky by gentle minds.',
    arrival: 'Then came Monolith, the Gravity Tyrant. He took hold of the sky, and decided it should fall on everyone.',
    fall: 'The islands cracked and sank. The docks were seized, and whole families were pinned in place. The Anchor was crushed into his gravity well.',
  },
  vanguard: {
    lore: 'Bastion City, a fortress of iron walls that had never fallen, defended by a shield that had never broken.',
    arrival: 'Then came Krag, the Siege Commander. He rolled his artillery to the gates, and promised the walls would fall in a day.',
    fall: 'Shells rained on the old town. The outer wall burst, and the families sheltering at the gate were trapped. The Anchor was carried to the citadel roof.',
  },
};

/** "NULL WARDEN" -> "Null Warden" (for a voice that spells all-capitals). */
export function titleCase(text: string): string {
  return text.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, gap: string, letter: string) => gap + letter.toUpperCase());
}

/** The two lords (the champions of levels 1 and 2) and the boss of a hero's region. */
export function chapterCast(hero: HeroId): { region: string; boss: string; bossTitle: string; bossColor: string; lords: [string, string]; places: [string, string, string]; world: string } {
  const chapter = chapterFor(hero);
  return {
    region: titleCase(chapter.region),
    boss: titleCase(chapter.villain.name),
    bossTitle: chapter.villain.title,
    bossColor: chapter.villain.color,
    lords: [titleCase(CHAMPIONS[`${chapter.worldId}-1`] ?? 'Champion'), titleCase(CHAMPIONS[`${chapter.worldId}-2`] ?? 'Champion')],
    places: [titleCase(chapter.levels[0].location), titleCase(chapter.levels[1].location), titleCase(chapter.levels[2].location)],
    world: chapter.worldId,
  };
}

/** The six beats of the hero's story movie, in order. */
export function chapterBeats(hero: HeroId, heroName: string): ChapterBeat[] {
  const chapter = chapterFor(hero);
  const cast = chapterCast(hero);
  const w = WRITTEN[hero];
  const declaration = chapter.levels[2].intro[0];
  return [
    { kind: 'lore', id: chapterId(hero, 1), voice: 'narrator', text: w.lore },
    { kind: 'arrival', id: chapterId(hero, 2), voice: 'narrator', text: w.arrival },
    { kind: 'declare', id: introId(chapter.worldId, 3, 0), voice: declaration.speaker === 'vex' ? 'vex' : 'villain', text: declaration.text },
    { kind: 'fall', id: chapterId(hero, 3), voice: 'narrator', text: w.fall },
    {
      kind: 'road',
      id: chapterId(hero, 4),
      voice: 'narrator',
      text: `Three trials stand between you and ${cast.boss}. First, the ${cast.lords[0]}, at the ${cast.places[0]}. Then the ${cast.lords[1]}, at the ${cast.places[1]}. And at the ${cast.places[2]}, ${cast.boss} waits.`,
    },
    { kind: 'call', id: chapterId(hero, 5), voice: 'echo', text: `${titleCase(heroName)}. Three trials, one Anchor. Your road to ${cast.boss} begins now.` },
  ];
}

/** The short narration before level 2 or 3: who has fallen, who is next. */
export function chapterRecap(hero: HeroId, level: number): ChapterBeat {
  const cast = chapterCast(hero);
  const text =
    level >= 3
      ? `Both lords have fallen. Only ${cast.boss} remains, at the ${cast.places[2]}. End this.`
      : `The ${cast.lords[0]} has fallen. Next comes the ${cast.lords[1]}, at the ${cast.places[1]}. Beyond it, ${cast.boss} waits.`;
  return { kind: 'recap', id: chapterId(hero, level >= 3 ? 7 : 6), voice: 'narrator', text };
}

/** Unlock id stored once a hero's story movie has played (it plays by itself only once). */
export const storySeen = (hero: HeroId, level = 1): string => (level <= 1 ? `story-${hero}` : `story-${hero}-${level}`);
