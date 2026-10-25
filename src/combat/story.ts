import type { HeroId } from './heroes.js';

/**
 * Original campaign story: the Hollow Legion, led by Warlord VEX, is seizing
 * cities and caging civilians. Each hero frees one region from one of VEX's
 * lieutenants over three levels, the last a boss fight. Pure data.
 */

export type Speaker = 'villain' | 'hero' | 'civilian' | 'vex';

export interface Line {
  readonly speaker: Speaker;
  readonly text: string;
}

export interface Reward {
  /** Stored in profile.unlocks. */
  readonly id: string;
  readonly name: string;
  readonly description: string;
}

export interface LevelStory {
  readonly location: string;
  readonly blurb: string;
  readonly hostages: number;
  readonly intro: readonly Line[];
  readonly outro: readonly Line[];
  /** Shouted by the villain at the start of later waves. */
  readonly taunts: readonly string[];
  readonly reward: Reward;
  /** Normalised position on the region's holo-map (x, z in -1..1). */
  readonly map: readonly [number, number];
}

export interface Chapter {
  readonly hero: HeroId;
  readonly worldId: string;
  readonly region: string;
  readonly villain: { readonly name: string; readonly title: string; readonly color: string };
  readonly levels: readonly LevelStory[];
}

const overdrive = (hero: HeroId): Reward => ({
  id: `overdrive-${hero}`,
  name: 'OVERDRIVE',
  description: 'Clap your palms together when charged to unleash a shockwave',
});
const core = (hero: HeroId): Reward => ({
  id: `core-${hero}`,
  name: 'POWER CORE',
  description: 'Permanent +25% damage for this hero',
});
const legend = (hero: HeroId): Reward => ({
  id: `legend-${hero}`,
  name: 'LEGEND SKIN',
  description: 'A free alternate suit colour, unlocked in the garage',
});

export const CHAPTERS: readonly Chapter[] = [
  {
    hero: 'arc',
    worldId: 'neon-grid',
    region: 'NEO VERIDIA',
    villain: { name: 'SYNAPSE', title: 'Tyrant of the Grid', color: '#FF2E8C' },
    levels: [
      {
        location: 'TRANSIT HUB',
        blurb: 'Legion drones have sealed the transit hub. Commuters are trapped in energy cages.',
        hostages: 3,
        intro: [
          { speaker: 'vex', text: 'This city belongs to the Hollow Legion now. Kneel, or be caged.' },
          { speaker: 'villain', text: 'Your little lights cannot reach my grid, hero.' },
          { speaker: 'hero', text: 'Funny. My hands disagree.' },
        ],
        outro: [
          { speaker: 'civilian', text: 'You came for us! Thank you!' },
          { speaker: 'villain', text: 'A lucky spark. The tower will be your grave.' },
        ],
        taunts: ['Swarm the hero!', 'More drones! Overload them!'],
        reward: overdrive('arc'),
        map: [-0.6, 0.4],
      },
      {
        location: 'DATA SPIRE',
        blurb: 'SYNAPSE is siphoning the city power from the Data Spire. Armored units guard it.',
        hostages: 4,
        intro: [
          { speaker: 'villain', text: 'Every watt in this city feeds me now.' },
          { speaker: 'hero', text: 'Then let me give you a few thousand more.' },
        ],
        outro: [
          { speaker: 'civilian', text: 'The lights are coming back on!' },
          { speaker: 'villain', text: 'Enough! Face me at the core, if you dare.' },
        ],
        taunts: ['Armor up! Crush that glow!', 'You are running out of light!'],
        reward: core('arc'),
        map: [0.1, -0.1],
      },
      {
        location: 'GRID CORE',
        blurb: 'Boss: SYNAPSE himself, wired into the heart of the city.',
        hostages: 3,
        intro: [
          { speaker: 'villain', text: 'I am the grid. You cannot unplug a god.' },
          { speaker: 'hero', text: 'Watch me.' },
        ],
        outro: [
          { speaker: 'villain', text: 'Impossible... VEX... will avenge...' },
          { speaker: 'vex', text: 'One region falls. The Legion has many more.' },
        ],
        taunts: ['I will burn your circuits!', 'Feel the full current!', 'This ends now!'],
        reward: legend('arc'),
        map: [0.6, -0.55],
      },
    ],
  },
  {
    hero: 'talon',
    worldId: 'ember-foundry',
    region: 'CINDERHOLD',
    villain: { name: 'MAGMAW', title: 'Furnace Brute', color: '#FF6A00' },
    levels: [
      {
        location: 'SLAG YARDS',
        blurb: 'Swarmers pour out of the slag yards. Workers are chained near the vats.',
        hostages: 3,
        intro: [
          { speaker: 'villain', text: 'Fresh meat for the furnace! Swarm, my pets!' },
          { speaker: 'hero', text: 'Sorry. I only do carving.' },
        ],
        outro: [
          { speaker: 'civilian', text: 'Those claws! You saved us!' },
          { speaker: 'villain', text: 'You cut my pets. I will melt your bones.' },
        ],
        taunts: ['Eat her alive!', 'MORE! SEND THEM ALL!'],
        reward: overdrive('talon'),
        map: [-0.55, -0.35],
      },
      {
        location: 'MOLTEN BRIDGE',
        blurb: 'The bridge over the lava river is the only way in. MAGMAW has it swarming.',
        hostages: 4,
        intro: [
          { speaker: 'villain', text: 'Nobody crosses my bridge and lives!' },
          { speaker: 'hero', text: 'Then I will be the first.' },
        ],
        outro: [{ speaker: 'villain', text: 'Come to my forge, little cat. Come and burn.' }],
        taunts: ['The heat is rising!', 'You are slowing down!'],
        reward: core('talon'),
        map: [0.05, 0.25],
      },
      {
        location: 'THE GREAT FORGE',
        blurb: 'Boss: MAGMAW in his forge, a mountain of molten armor.',
        hostages: 3,
        intro: [
          { speaker: 'villain', text: 'I AM THE FIRE! I AM THE FURNACE!' },
          { speaker: 'hero', text: 'And I am the blade that cools you down.' },
        ],
        outro: [
          { speaker: 'villain', text: 'The forge... goes... cold...' },
          { speaker: 'vex', text: 'Interesting. These heroes are adapting.' },
        ],
        taunts: ['Burn! BURN!', 'You cannot cut fire!', 'I will smelt you!'],
        reward: legend('talon'),
        map: [0.6, -0.4],
      },
    ],
  },
  {
    hero: 'tempest',
    worldId: 'storm-peak',
    region: 'THUNDERCREST',
    villain: { name: 'SKYRENDER', title: 'Storm Witch', color: '#B6A6FF' },
    levels: [
      {
        location: 'CLOUD BASE',
        blurb: 'Titans have landed at the cloud base. Pilots are caged on the flight deck.',
        hostages: 3,
        intro: [
          { speaker: 'villain', text: 'The sky answers to me now, little thunder god.' },
          { speaker: 'hero', text: 'The sky. Not the hammer.' },
        ],
        outro: [
          { speaker: 'civilian', text: 'We can fly again! Thank you!' },
          { speaker: 'villain', text: 'I will bury you under a thousand storms.' },
        ],
        taunts: ['Titans, flatten him!', 'Feel the wind turn!'],
        reward: overdrive('tempest'),
        map: [-0.5, 0.5],
      },
      {
        location: 'RUNE BRIDGE',
        blurb: 'SKYRENDER is using the ancient rune bridge to amplify her storm.',
        hostages: 4,
        intro: [
          { speaker: 'villain', text: 'These runes were carved for gods. You are not one.' },
          { speaker: 'hero', text: 'Let us test that.' },
        ],
        outro: [{ speaker: 'villain', text: 'Climb to the peak, then. The lightning is waiting.' }],
        taunts: ['Break him!', 'The storm grows stronger!'],
        reward: core('tempest'),
        map: [0.15, 0.0],
      },
      {
        location: 'EYE OF THE STORM',
        blurb: 'Boss: SKYRENDER at the summit, riding the storm itself.',
        hostages: 3,
        intro: [
          { speaker: 'villain', text: 'I AM the storm!' },
          { speaker: 'hero', text: 'Then I am the lightning rod.' },
        ],
        outro: [
          { speaker: 'villain', text: 'The winds... abandon me...' },
          { speaker: 'vex', text: 'Three of my lieutenants. You are becoming a problem.' },
        ],
        taunts: ['Kneel before the tempest!', 'The sky falls on you!', 'I will not lose!'],
        reward: legend('tempest'),
        map: [0.55, -0.55],
      },
    ],
  },
  {
    hero: 'orion',
    worldId: 'frost-spire',
    region: 'GLACIER REACH',
    villain: { name: 'CRYOSS', title: 'Frozen Hunter', color: '#9FE8FF' },
    levels: [
      {
        location: 'ICE OUTPOST',
        blurb: 'CRYOSS hunts the survivors of the ice outpost for sport.',
        hostages: 3,
        intro: [
          { speaker: 'villain', text: 'A hunter with a bow. How quaint. I hunt hunters.' },
          { speaker: 'hero', text: 'Then you have never met one who does not miss.' },
        ],
        outro: [
          { speaker: 'civilian', text: 'We thought we would freeze out there!' },
          { speaker: 'villain', text: 'The spires are mine. Come and be my trophy.' },
        ],
        taunts: ['Pack, surround her!', 'Your fingers are freezing!'],
        reward: overdrive('orion'),
        map: [-0.6, -0.2],
      },
      {
        location: 'CRYSTAL CANYON',
        blurb: 'A canyon of crystal spires; the Legion ambushes everyone who enters.',
        hostages: 4,
        intro: [
          { speaker: 'villain', text: 'Every crystal here is my eye. I see you.' },
          { speaker: 'hero', text: 'Good. Watch closely.' },
        ],
        outro: [{ speaker: 'villain', text: 'Impressive aim. It will not save you at the summit.' }],
        taunts: ['Do not let her draw!', 'Close in, close in!'],
        reward: core('orion'),
        map: [0.0, 0.35],
      },
      {
        location: 'FROZEN THRONE',
        blurb: 'Boss: CRYOSS on his throne of ice.',
        hostages: 3,
        intro: [
          { speaker: 'villain', text: 'Your last arrow is already frozen in the air.' },
          { speaker: 'hero', text: 'Then I will make every one before it count.' },
        ],
        outro: [
          { speaker: 'villain', text: 'Thawed... by a mortal...' },
          { speaker: 'vex', text: 'Fine. Come to the Rift. I will end this myself.' },
        ],
        taunts: ['Shatter!', 'Feel the cold of the void!', 'You are prey!'],
        reward: legend('orion'),
        map: [0.6, -0.45],
      },
    ],
  },
  {
    hero: 'weaver',
    worldId: 'void-rift',
    region: 'THE RIFT',
    villain: { name: 'WARLORD VEX', title: 'Lord of the Hollow Legion', color: '#C04DFF' },
    levels: [
      {
        location: 'BROKEN CITY',
        blurb: 'The Rift tears through the city. Civilians are being pulled into the void.',
        hostages: 3,
        intro: [
          { speaker: 'vex', text: 'The Rift swallows all. Even little spiders.' },
          { speaker: 'hero', text: 'Spiders build bridges over holes like yours.' },
        ],
        outro: [
          { speaker: 'civilian', text: 'You caught us! We were falling!' },
          { speaker: 'vex', text: 'Delay me if you can. The Rift grows.' },
        ],
        taunts: ['Tear her web apart!', 'The void hungers!'],
        reward: overdrive('weaver'),
        map: [-0.55, 0.3],
      },
      {
        location: 'SHATTERED BRIDGE',
        blurb: 'Debris floats over the void. VEX\'s elite guard the way to the Rift heart.',
        hostages: 4,
        intro: [
          { speaker: 'vex', text: 'My elite have never lost.' },
          { speaker: 'hero', text: 'First time for everything.' },
        ],
        outro: [{ speaker: 'vex', text: 'Enough. Face me at the heart of the Rift.' }],
        taunts: ['Elites, end this!', 'You are tangled now!'],
        reward: core('weaver'),
        map: [0.1, -0.05],
      },
      {
        location: 'RIFT HEART',
        blurb: 'Final boss: WARLORD VEX, at the heart of the Rift.',
        hostages: 3,
        intro: [
          { speaker: 'vex', text: 'Five heroes defied me. You will be the last.' },
          { speaker: 'hero', text: 'We are not five. We are everyone you caged.' },
        ],
        outro: [
          { speaker: 'vex', text: 'The Legion... is... hollow...' },
          { speaker: 'civilian', text: 'The Rift is closing! We are free!' },
        ],
        taunts: ['I am eternal!', 'The void obeys ME!', 'Kneel!'],
        reward: legend('weaver'),
        map: [0.6, -0.5],
      },
    ],
  },
];

export function chapterFor(hero: HeroId): Chapter {
  return CHAPTERS.find((c) => c.hero === hero) ?? CHAPTERS[0];
}

export function chapterForWorld(worldId: string): Chapter | undefined {
  return CHAPTERS.find((c) => c.worldId === worldId);
}

/** Story for stage `number` (1-based) of a world. */
export function levelStory(worldId: string, number: number): LevelStory | undefined {
  return chapterForWorld(worldId)?.levels[number - 1];
}
