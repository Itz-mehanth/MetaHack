/** Playable heroes, in wrist-button cycle order. All original IP. */
export const HEROES = [
  { id: 'arc', name: 'ARC', color: '#3DF5FF' },
  { id: 'talon', name: 'TALON', color: '#FF2D9A' },
] as const;

export type HeroId = (typeof HEROES)[number]['id'];
