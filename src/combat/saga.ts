import type { HeroId } from './heroes.js';
import { hasUnlock, type Profile, type Stage, type World, WORLDS } from './progression.js';
import type { LevelStory, Line } from './story.js';

/**
 * The overarching saga: OBLIVAX, the Unmaker, has pulled the nine Anchors
 * that hold reality in place; Warlord VEX is his herald. A guided prologue
 * (three lent heroes, then a fight you cannot win) opens the game, every
 * chapter boss returns one Anchor, and with enough Anchors the finale,
 * CONVERGENCE, unites every hero. Pure data and rules.
 */

export const OBLIVION: World = { id: 'oblivion', name: 'THE UNMAKING', color: '#FF4FD8', enemies: ['drone', 'swarmer', 'armored'] };

export const OBLIVAX = { name: 'OBLIVAX', title: 'The Unmaker', color: '#FF4FD8' } as const;
export const ECHO = { name: 'ECHO', title: 'Surge Command', color: '#3DF5FF' } as const;

/** Unlock id stored once the prologue is finished. */
export const PROLOGUE_DONE = 'prologue';
export const FINALE_DONE = 'finale';
/** Anchors needed before the finale opens (the rest join as holograms). */
export const ANCHORS_TO_FINALE = 3;
/** OBLIVAX health fraction where CONVERGENCE takes over. */
export const CONVERGENCE_AT = 0.1;
/** Prologue: health fraction where OBLIVAX stops the fight and erases the room. */
export const PROLOGUE_ERASE_AT = 0.6;

export const PROLOGUE: Stage = {
  id: 'prologue',
  world: OBLIVION,
  index: -1,
  number: 0,
  name: 'PROLOGUE',
  objective: 'Channel three heroes, then face the Unmaker',
  waves: [
    { count: 3, interval: 1.8, speed: 0.55, kinds: ['drone'] },
    { count: 3, interval: 2.0, speed: 0.7, kinds: ['blade'] },
    { count: 3, interval: 2.0, speed: 0.5, kinds: ['drone', 'armored'] },
    { count: 0, interval: 3, speed: 0.6, kinds: ['drone'], boss: true },
  ],
};

/** Hero lent to the player in each prologue wave. */
export const PROLOGUE_HEROES: readonly HeroId[] = ['arc', 'ronin', 'psion', 'arc'];

export const FINALE: Stage = {
  id: 'finale',
  world: OBLIVION,
  index: -2,
  number: 0,
  name: 'CONVERGENCE',
  objective: 'Every hero, one fight',
  waves: [{ count: 0, interval: 3, speed: 0.8, kinds: ['drone'], boss: true }],
};

export interface FinalePhase {
  /** Active while OBLIVAX's health fraction is above this. */
  readonly above: number;
  readonly hero: HeroId;
  readonly call: string;
}

export const FINALE_PHASES: readonly FinalePhase[] = [
  { above: 0.75, hero: 'arc', call: 'ARC: BLAST HIS SHIELD!' },
  { above: 0.5, hero: 'ronin', call: 'RONIN: CUT HIM DOWN!' },
  { above: 0.25, hero: 'psion', call: 'PSION: THROW THE DEBRIS!' },
  { above: CONVERGENCE_AT, hero: 'tempest', call: 'TEMPEST: HAMMER HIM!' },
];

/** Index into FINALE_PHASES for a health fraction, or -1 once CONVERGENCE starts. */
export function finalePhase(fraction: number): number {
  return FINALE_PHASES.findIndex((p) => fraction > p.above);
}

export function isSagaStage(stage: Stage): boolean {
  return stage.world.id === OBLIVION.id;
}

/** Region ids whose boss (and so whose Anchor) has been beaten. */
export function anchorsRecovered(profile: Profile): string[] {
  return WORLDS.filter((w) => (profile.stars[`${w.id}-3`] ?? 0) > 0).map((w) => w.id);
}

export function finaleUnlocked(profile: Profile): boolean {
  return hasUnlock(profile, PROLOGUE_DONE) && anchorsRecovered(profile).length >= ANCHORS_TO_FINALE;
}

const sagaReward = (id: string, name: string, description: string) => ({ id, name, description });

export const SAGA_STORY: Readonly<Record<'prologue' | 'finale', LevelStory>> = {
  prologue: {
    location: 'THE UNMAKING',
    blurb: 'Something vast has entered the sky.',
    hostages: 0,
    intro: [
      { speaker: 'echo', text: 'Surge Command online. I am ECHO. Something enormous just entered our sky.' },
      { speaker: 'oblivax', text: 'I am OBLIVAX. I have unmade ten thousand worlds. Yours is next.' },
      { speaker: 'echo', text: 'Our heroes are scattered. You will channel them through your own hands. Let us begin.' },
    ],
    outro: [],
    taunts: ['Kneel before the end.', 'Your heroes are dust.', 'I unmade stars!'],
    reward: sagaReward(PROLOGUE_DONE, 'THE CALL', 'The war for the Anchors begins'),
    map: [0, 0],
  },
  finale: {
    location: 'CONVERGENCE',
    blurb: 'Every hero, one fight, inside your own room.',
    hostages: 0,
    intro: [
      { speaker: 'echo', text: 'The Anchors are linked. Every hero is with you now. This is it.' },
      { speaker: 'oblivax', text: 'You stitched your little world back together. I will tear it apart, thread by thread.' },
      { speaker: 'echo', text: 'I will switch heroes as his defences change. Follow my call!' },
    ],
    outro: [
      { speaker: 'oblivax', text: 'Impossible... so many sparks... the end... ends...' },
      { speaker: 'echo', text: 'Reality is holding. Your room is whole again. The Anchors are safe.' },
      { speaker: 'civilian', text: 'SURGE! SURGE! SURGE!' },
    ],
    taunts: ['Your shield is nothing!', 'I will unmake you!', 'NOTHING REMAINS!', 'I AM THE END!'],
    reward: sagaReward(FINALE_DONE, 'CONVERGENCE', 'You saved the universe'),
    map: [0, 0],
  },
};

/** Played when OBLIVAX stops the prologue fight and erases the room. */
export const PROLOGUE_ERASURE: readonly Line[] = [
  { speaker: 'oblivax', text: 'Brave. Pointless. Watch your world come undone.' },
  { speaker: 'echo', text: 'He is erasing the room around you! He has pulled the nine Anchors that hold reality together.' },
  { speaker: 'vex', text: 'The Legion holds every Anchor now, master. The heroes are scattered across nine regions.' },
  { speaker: 'echo', text: 'Then we take them back, one region at a time. Win back three Anchors and we can face him together.' },
];

/** ECHO's opening line for a chapter's first level, once the saga has begun. */
export function chapterCall(region: string, hero: string): Line {
  return { speaker: 'echo', text: `VEX's Legion is holding the ${region} Anchor. ${hero}, get it back.` };
}

/** ECHO's line after a chapter boss falls. */
export function anchorLine(region: string, recovered: number): Line {
  const total = WORLDS.length;
  const tail =
    recovered === ANCHORS_TO_FINALE
      ? ' That is enough to fight back. CONVERGENCE is open!'
      : recovered < ANCHORS_TO_FINALE
        ? ` ${ANCHORS_TO_FINALE - recovered} more and we can face OBLIVAX.`
        : '';
  return { speaker: 'echo', text: `The ${region} Anchor is ours. ${recovered} of ${total} secured.${tail}` };
}
