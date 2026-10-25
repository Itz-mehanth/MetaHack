/** Playable heroes, in menu display order. All original IP. */
export const HEROES = [
  { id: 'arc', name: 'ARC', color: '#3DF5FF', power: 'Palm blaster', how: 'Open palm, facing out' },
  { id: 'talon', name: 'TALON', color: '#FF2D9A', power: 'Energy claws', how: 'Make a fist, then swing' },
  { id: 'tempest', name: 'TEMPEST', color: '#9D8CFF', power: 'Storm hammer', how: 'Fist to grab, throw, palm to recall' },
  { id: 'orion', name: 'ORION', color: '#5DFFB0', power: 'Light bow', how: 'Pinch the string, pull back, release' },
  { id: 'weaver', name: 'WEAVER', color: '#FF3D5A', power: 'Light webs', how: 'Two-finger flick to web, fist to yank' },
  { id: 'havoc', name: 'HAVOC', color: '#FFB01F', power: 'Plasma pistol', how: 'Grab the pistol, curl your index finger to fire' },
] as const;

export type HeroId = (typeof HEROES)[number]['id'];
export type Hero = (typeof HEROES)[number];

/** Heroes whose powers are implemented; others show as coming soon. */
export const PLAYABLE: readonly HeroId[] = ['arc', 'talon', 'tempest', 'orion', 'weaver', 'havoc'];
