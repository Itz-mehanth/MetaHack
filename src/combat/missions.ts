import type { HeroId } from './heroes.js';

/** Pure enemy and mission data. No Three.js; numbers are metres/seconds. */

export type EnemyKind = 'drone' | 'armored' | 'swarmer' | 'titan';

export interface EnemyDef {
  readonly hp: number;
  /** Hit radius in metres. */
  readonly radius: number;
  /** Distance from the head at which it starts its self-destruct charge. */
  readonly chargeDistance: number;
  readonly chargeTime: number;
  /** Side-to-side weave amplitude (m/s) while approaching. */
  readonly weave: number;
  /** Damage dealt to the player when the charge completes. */
  readonly damage: number;
  readonly score: number;
}

export const ENEMIES: Readonly<Record<EnemyKind, EnemyDef>> = {
  drone: { hp: 1, radius: 0.16, chargeDistance: 0.75, chargeTime: 0.9, weave: 0.25, damage: 1, score: 100 },
  armored: { hp: 2, radius: 0.21, chargeDistance: 0.75, chargeTime: 0.9, weave: 0.2, damage: 1, score: 200 },
  swarmer: { hp: 1, radius: 0.12, chargeDistance: 0.6, chargeTime: 0.5, weave: 0.9, damage: 1, score: 80 },
  titan: { hp: 6, radius: 0.38, chargeDistance: 1.1, chargeTime: 1.6, weave: 0.1, damage: 2, score: 600 },
};

export interface WaveDef {
  readonly count: number;
  /** Seconds between spawn groups. */
  readonly interval: number;
  readonly speed: number;
  /** Enemy kinds drawn at random for each spawn; repeat an entry to weight it. */
  readonly kinds: readonly EnemyKind[];
  /** Enemies per spawn group (swarms arrive in packs). */
  readonly burst?: number;
}

export interface Mission {
  readonly id: string;
  readonly hero: HeroId;
  readonly world: string;
  readonly objective: string;
  readonly waves: readonly WaveDef[];
}

export const MISSIONS: readonly Mission[] = [
  {
    id: 'neon-grid',
    hero: 'arc',
    world: 'NEON GRID',
    objective: 'Hold the line: 5 drone waves',
    waves: [
      { count: 4, interval: 1.8, speed: 0.7, kinds: ['drone'] },
      { count: 6, interval: 1.5, speed: 0.8, kinds: ['drone'] },
      { count: 8, interval: 1.3, speed: 0.9, kinds: ['drone', 'drone', 'drone', 'armored'] },
      { count: 10, interval: 1.1, speed: 1.0, kinds: ['drone', 'drone', 'armored'] },
      { count: 12, interval: 0.9, speed: 1.1, kinds: ['drone', 'armored'] },
    ],
  },
  {
    id: 'ember-foundry',
    hero: 'talon',
    world: 'EMBER FOUNDRY',
    objective: 'Blade frenzy: 4 swarm waves',
    waves: [
      { count: 9, interval: 2.4, speed: 1.3, kinds: ['swarmer'], burst: 3 },
      { count: 12, interval: 2.2, speed: 1.5, kinds: ['swarmer'], burst: 3 },
      { count: 16, interval: 2.0, speed: 1.6, kinds: ['swarmer', 'swarmer', 'swarmer', 'armored'], burst: 4 },
      { count: 20, interval: 1.8, speed: 1.8, kinds: ['swarmer', 'swarmer', 'armored'], burst: 4 },
    ],
  },
  {
    id: 'storm-peak',
    hero: 'tempest',
    world: 'STORM PEAK',
    objective: 'Siege: bring down the titans',
    waves: [
      { count: 3, interval: 3.0, speed: 0.45, kinds: ['titan', 'drone', 'drone'] },
      { count: 5, interval: 2.6, speed: 0.5, kinds: ['titan', 'drone', 'armored'] },
      { count: 7, interval: 2.2, speed: 0.55, kinds: ['titan', 'titan', 'armored', 'drone'] },
      { count: 6, interval: 2.4, speed: 0.6, kinds: ['titan'] },
    ],
  },
];

export function missionFor(hero: HeroId): Mission {
  return MISSIONS.find((m) => m.hero === hero) ?? MISSIONS[0];
}
