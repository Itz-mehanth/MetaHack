import type { HeroId } from './heroes.js';

/**
 * Original campaign story: the Hollow Legion, led by Warlord VEX, is seizing
 * cities and caging civilians. Each hero frees one region from one of VEX's
 * lieutenants over three levels, the last a boss fight. Pure data.
 */

export type Speaker = 'villain' | 'hero' | 'civilian' | 'vex' | 'oblivax' | 'echo';

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
  {
    hero: 'havoc',
    worldId: 'scrap-wastes',
    region: 'RUSTFALL',
    villain: { name: 'RAZORBACK', title: 'Scrap Warlord', color: '#FF5A1F' },
    levels: [
      {
        location: 'JUNKYARD GATE',
        blurb: "RAZORBACK's raiders hold the junkyard gate. Scavengers are locked in scrap cages.",
        hostages: 3,
        intro: [
          { speaker: 'villain', text: 'Fresh scrap! Strip that shiny pistol off the corpse, boys.' },
          { speaker: 'hero', text: 'Come and take it. One at a time, please.' },
        ],
        outro: [
          { speaker: 'civilian', text: 'You cleared the gate! We can breathe again!' },
          { speaker: 'villain', text: 'Lucky shots. The convoy will grind you to dust.' },
        ],
        taunts: ['Rush the gunslinger!', 'Flank left! FLANK!'],
        reward: { id: 'overdrive-havoc', name: 'OVERDRIVE', description: 'Clap your palms together when charged to unleash a shockwave' },
        map: [-0.6, 0.3],
      },
      {
        location: 'CONVOY ROAD',
        blurb: 'An armoured Legion convoy is hauling prisoners across the wastes. Stop it.',
        hostages: 4,
        intro: [
          { speaker: 'villain', text: 'Nobody stops my convoy. NOBODY.' },
          { speaker: 'hero', text: 'Then I guess I am nobody.' },
        ],
        outro: [{ speaker: 'villain', text: 'Enough games. Meet me at the smelter, gunslinger.' }],
        taunts: ['Brutes, up front!', 'Pin her down!'],
        reward: { id: 'core-havoc', name: 'POWER CORE', description: 'Permanent +25% damage for this hero' },
        map: [0.05, 0.0],
      },
      {
        location: 'THE SMELTER',
        blurb: 'Boss: RAZORBACK, fused into a war-rig at the heart of his smelter.',
        hostages: 3,
        intro: [
          { speaker: 'villain', text: 'I melt down heroes and wear what is left.' },
          { speaker: 'hero', text: 'Draw.' },
        ],
        outro: [
          { speaker: 'villain', text: 'Out... gunned...' },
          { speaker: 'vex', text: 'Another region lost. Hunt them all down!' },
        ],
        taunts: ['I will scrap you!', 'Molten metal, hot lead!', 'You are mine!'],
        reward: { id: 'legend-havoc', name: 'LEGEND SKIN', description: 'A free alternate suit colour, unlocked in the garage' },
        map: [0.6, -0.5],
      },
    ],
  },
  {
    hero: 'ronin',
    worldId: 'moon-temple',
    region: 'MOONFALL',
    villain: { name: 'IRON ONI', title: 'Blade Warlord', color: '#FF3355' },
    levels: [
      {
        location: 'TEMPLE STEPS',
        blurb: 'Legion stalkers swarm the mountain temple. Monks are caged on the steps.',
        hostages: 3,
        intro: [
          { speaker: 'villain', text: 'Two swords. One heartbeat. Let us see how long it lasts.' },
          { speaker: 'hero', text: 'Long enough to cut through all of you.' },
        ],
        outro: [
          { speaker: 'civilian', text: 'The steps are free! The bell can ring again!' },
          { speaker: 'villain', text: 'A good first cut. The bamboo sea will swallow you.' },
        ],
        taunts: ['Surround the swordsman!', 'Strike from the shadows!'],
        reward: overdrive('ronin'),
        map: [-0.6, 0.35],
      },
      {
        location: 'BAMBOO SEA',
        blurb: 'A moonlit forest crawling with Legion hunters. Villagers are hidden in cages.',
        hostages: 4,
        intro: [
          { speaker: 'villain', text: 'My hunters move faster than your blades.' },
          { speaker: 'hero', text: 'Then I will cross them.' },
        ],
        outro: [{ speaker: 'villain', text: 'Come to the moon gate, RONIN. Duel me.' }],
        taunts: ['Faster! FASTER!', 'Cut the hero down!'],
        reward: core('ronin'),
        map: [0.0, 0.0],
      },
      {
        location: 'MOON GATE',
        blurb: 'Boss: IRON ONI, in a war-mech forged from a thousand broken swords.',
        hostages: 3,
        intro: [
          { speaker: 'villain', text: 'Every blade I broke is part of me now.' },
          { speaker: 'hero', text: 'Then mine will be the last.' },
        ],
        outro: [
          { speaker: 'villain', text: 'Cut... clean...' },
          { speaker: 'vex', text: 'The temple falls? Then I will bring the sky down on them.' },
        ],
        taunts: ['I am the edge!', 'Kneel to iron!', 'Your blades will snap!'],
        reward: legend('ronin'),
        map: [0.6, -0.5],
      },
    ],
  },
  {
    hero: 'psion',
    worldId: 'sky-ruins',
    region: 'DRIFTHOLM',
    villain: { name: 'MONOLITH', title: 'Gravity Tyrant', color: '#E05CFF' },
    levels: [
      {
        location: 'FLOATING DOCKS',
        blurb: 'Islands hang in the sky. Legion brutes hold the docks and the people on them.',
        hostages: 3,
        intro: [
          { speaker: 'villain', text: 'Gravity answers to ME up here.' },
          { speaker: 'hero', text: 'Funny. Everything else answers to me.' },
        ],
        outro: [
          { speaker: 'civilian', text: 'A whole crate flew at them! We are saved!' },
          { speaker: 'villain', text: 'Parlour tricks. The sky bridge will bury you.' },
        ],
        taunts: ['Crush the mind-witch!', 'Do not let it see you!'],
        reward: overdrive('psion'),
        map: [-0.55, 0.3],
      },
      {
        location: 'SKY BRIDGE',
        blurb: 'A shattered bridge of stone between islands. Colossi guard the crossing.',
        hostages: 4,
        intro: [
          { speaker: 'villain', text: 'My Colossi are too heavy for any mind.' },
          { speaker: 'hero', text: 'We will see what they weigh in the air.' },
        ],
        outro: [{ speaker: 'villain', text: 'Enough. Come to the gravity well and be crushed.' }],
        taunts: ['Colossus, forward!', 'Stay on the ground!'],
        reward: core('psion'),
        map: [0.05, -0.05],
      },
      {
        location: 'GRAVITY WELL',
        blurb: 'Boss: MONOLITH, a floating fortress that bends the sky around it.',
        hostages: 3,
        intro: [
          { speaker: 'villain', text: 'I hold up mountains. What do you hold?' },
          { speaker: 'hero', text: 'Everything you dropped.' },
        ],
        outro: [
          { speaker: 'villain', text: 'The sky... is falling...' },
          { speaker: 'vex', text: 'So many heroes now. It does not matter. I am still coming.' },
        ],
        taunts: ['FALL!', 'Be crushed!', 'I am the weight of the world!'],
        reward: legend('psion'),
        map: [0.6, -0.5],
      },
    ],
  },
  {
    hero: 'vanguard',
    worldId: 'iron-bastion',
    region: 'BASTION CITY',
    villain: { name: 'KRAG', title: 'Siege Commander', color: '#FF8A1F' },
    levels: [
      {
        location: 'THE OUTER WALL',
        blurb: 'Legion siege troops are breaching the city wall. Families are trapped at the gate.',
        hostages: 3,
        intro: [
          { speaker: 'villain', text: 'A shield? Against an army? Bring down the wall!' },
          { speaker: 'hero', text: 'Walls fall. I do not.' },
        ],
        outro: [
          { speaker: 'civilian', text: 'The gate held! The shield held!' },
          { speaker: 'villain', text: 'One wall. My artillery is already aimed at the next.' },
        ],
        taunts: ['Shields up, men!', 'Overwhelm the shield!'],
        reward: { id: 'overdrive-vanguard', name: 'OVERDRIVE', description: 'Clap your palms together when charged to unleash a shockwave' },
        map: [-0.6, 0.3],
      },
      {
        location: 'ARTILLERY ROW',
        blurb: 'Shells rain on the old town while Legion squads hunt survivors in the streets.',
        hostages: 4,
        intro: [
          { speaker: 'villain', text: 'FIRE! Level the old town!' },
          { speaker: 'hero', text: 'Then I will walk through the fire.' },
        ],
        outro: [{ speaker: 'villain', text: 'Enough. My dropships will bury you at the citadel.' }],
        taunts: ['Barrage incoming!', 'Pin the shield down!'],
        reward: { id: 'core-vanguard', name: 'POWER CORE', description: 'Permanent +25% damage for this hero' },
        map: [0.0, 0.0],
      },
      {
        location: 'THE CITADEL',
        blurb: 'Boss: KRAG, in a siege engine on the citadel roof, troops dropping from his ships.',
        hostages: 3,
        intro: [
          { speaker: 'villain', text: 'Every soldier I have is dropping on your head.' },
          { speaker: 'hero', text: 'Good. Fewer places for you to hide.' },
        ],
        outro: [
          { speaker: 'villain', text: 'The shield... never broke...' },
          { speaker: 'vex', text: 'The Bastion stands? Then OBLIVAX will unmake it himself.' },
        ],
        taunts: ['DROP! DROP! DROP!', 'Break that shield!', 'I am the siege!'],
        reward: { id: 'legend-vanguard', name: 'LEGEND SKIN', description: 'A free alternate suit colour, unlocked in the garage' },
        map: [0.6, -0.5],
      },
    ],
  },
  {
    hero: 'vesper',
    worldId: 'veil-sanctum',
    region: 'THE VEIL',
    villain: { name: 'MORVETH', title: 'The Hollow Magus', color: '#7A4DFF' },
    levels: [
      {
        location: 'THE SILENT LIBRARY',
        blurb: 'The Legion has gutted a library that guards the Veil. Scholars are caged among the shelves.',
        hostages: 3,
        intro: [
          { speaker: 'villain', text: 'Burn the books. A world with no spells has no defenders.' },
          { speaker: 'hero', text: 'Every page you burn is a spell I already know.' },
        ],
        outro: [
          { speaker: 'civilian', text: 'The runes woke for you. They have not woken for anyone in years.' },
          { speaker: 'villain', text: 'Parlour tricks. The cloister will teach you fear.' },
        ],
        taunts: ['Silence the room!', 'No spell survives ash!'],
        reward: overdrive('vesper'),
        map: [-0.6, 0.3],
      },
      {
        location: 'MIRROR CLOISTER',
        blurb: 'Mirrors split the cloister into a dozen copies. Legion troops step out of every one.',
        hostages: 4,
        intro: [
          { speaker: 'villain', text: 'Which of us is real? It will not matter when you are dead.' },
          { speaker: 'hero', text: 'Mirrors only show what is in front of them. I am behind you.' },
        ],
        outro: [{ speaker: 'villain', text: 'Then come to the Hollow Throne, little sorcerer. Bring your orbs.' }],
        taunts: ['Break the glass!', 'Twelve of us, one of you!'],
        reward: core('vesper'),
        map: [0.0, 0.0],
      },
      {
        location: 'THE HOLLOW THRONE',
        blurb: 'Boss: MORVETH, a magus emptied of everything but hunger, on a throne that eats the light.',
        hostages: 3,
        intro: [
          { speaker: 'villain', text: 'I gave my name to the Unmaker. What have you given anyone?' },
          { speaker: 'hero', text: 'Spells. Back to the people you stole them from.' },
        ],
        outro: [
          { speaker: 'villain', text: 'The Veil... is thinner than I... thought...' },
          { speaker: 'vex', text: 'Another Anchor lost? Then OBLIVAX will come for the Veil himself.' },
        ],
        taunts: ['KNEEL TO THE HOLLOW!', 'Your orbs are empty!', 'I am the void between your spells!'],
        reward: legend('vesper'),
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
