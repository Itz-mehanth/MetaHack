/** Playable heroes, in hub display order. All original IP. */
export const HEROES = [
  { id: 'arc', name: 'ARC', color: '#3DF5FF', power: 'Palm blaster', how: 'Open palm, facing out' },
  { id: 'talon', name: 'TALON', color: '#FF2D9A', power: 'Energy claws', how: 'Make a fist, then swing' },
  { id: 'tempest', name: 'TEMPEST', color: '#9D8CFF', power: 'Storm hammer', how: 'Pinch to grab, throw, open hand to recall' },
] as const;

export type HeroId = (typeof HEROES)[number]['id'];
export type Hero = (typeof HEROES)[number];
