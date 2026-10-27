/** Playable heroes, in menu display order. All original IP. `how`: hand gestures; `tap`: screen controls. */
export const HEROES = [
  { id: 'arc', name: 'ARC', color: '#3DF5FF', power: 'Palm blaster', how: 'Open palm, facing out', tap: 'Tap or hold on enemies' },
  { id: 'talon', name: 'TALON', color: '#FF2D9A', power: 'Energy claws', how: 'Fist for claws: stab to skewer, swing to cut', tap: 'Tap to strike, swipe to slash' },
  { id: 'tempest', name: 'TEMPEST', color: '#9D8CFF', power: 'Storm hammer', how: 'Fist to grab, throw, palm to recall', tap: 'Tap to throw the hammer' },
  { id: 'orion', name: 'ORION', color: '#5DFFB0', power: 'Light bow', how: 'Pinch the string, pull back, release', tap: 'Hold to draw, let go to shoot' },
  { id: 'weaver', name: 'WEAVER', color: '#FF3D5A', power: 'Light webs', how: 'Shoot a web, then whip your hand to throw them', tap: 'Tap to web, swipe to throw' },
  { id: 'havoc', name: 'HAVOC', color: '#FFB01F', power: 'Plasma pistol', how: 'Grab the pistol, curl your index finger to fire', tap: 'Hold to fire' },
  { id: 'ronin', name: 'RONIN', color: '#4DA6FF', power: 'Twin katanas', how: 'Fists ignite blades: stab, slice, cross to X-strike', tap: 'Tap to cut, swipe to slash, X to cross' },
  { id: 'psion', name: 'PSION', color: '#E05CFF', power: 'Telekinesis', how: 'Palm at a crate or alien, close to lift, fling and open to throw', tap: 'Press to lift, drag and let go to throw' },
  { id: 'vesper', name: 'VESPER', color: '#8A5CFF', power: 'Sorcery', how: 'Two fingers fire runic darts; grab spell orbs and cast them with your hands', tap: 'Tap for darts, grab orbs, press CAST for spells' },
  { id: 'vanguard', name: 'VANGUARD', color: '#3D6BFF', power: 'Energy shield', how: 'Raise it to block, swing and let go to throw', tap: 'Tap to throw the shield, hold to block' },
] as const;

export type HeroId = (typeof HEROES)[number]['id'];
export type Hero = (typeof HEROES)[number];

/** Heroes whose powers are implemented; others show as coming soon. */
export const PLAYABLE: readonly HeroId[] = ['arc', 'talon', 'tempest', 'orion', 'weaver', 'havoc', 'ronin', 'psion', 'vanguard', 'vesper'];
