import type { EnemyKind } from './missions.js';

/**
 * The creature roster: rigged, animated monsters (Quaternius "Ultimate
 * Monsters", CC0) that replace the humanoid aliens in most worlds, so no two
 * worlds fight the same enemies. Pure data; the runtime lives in creature.ts.
 *
 * Every file in public/creatures/<id>.glb carries the clips idle, walk, run,
 * attack, hit and death (a few lack walk or idle; creature.ts falls back).
 */

export type Family = 'big' | 'blob' | 'flying';

export interface Species {
  readonly id: string;
  readonly name: string;
  readonly family: Family;
  /** Height multiplier on top of the role's height. */
  readonly scale: number;
  /** Ichor colour for hits (hex). */
  readonly blood: string;
}

export const SPECIES: readonly Species[] = [
  { id: 'alien', name: 'GREY', family: 'big', scale: 1, blood: '#7CFF6B' },
  { id: 'demon', name: 'DEMON', family: 'big', scale: 1.05, blood: '#FF3B1F' },
  { id: 'bluedemon', name: 'FROST DEMON', family: 'big', scale: 1.05, blood: '#6BD5FF' },
  { id: 'orc', name: 'ORC', family: 'big', scale: 1.05, blood: '#8CCB3A' },
  { id: 'orcskull', name: 'SKULL ORC', family: 'big', scale: 1.1, blood: '#B8C24A' },
  { id: 'yeti', name: 'YETI', family: 'big', scale: 1.1, blood: '#BFEFFF' },
  { id: 'dino', name: 'RAPTOR', family: 'big', scale: 1, blood: '#FF8A3D' },
  { id: 'mushking', name: 'SPORE KING', family: 'big', scale: 1, blood: '#C58AFF' },
  { id: 'cactoro', name: 'THORNBACK', family: 'big', scale: 1, blood: '#5DFF9E' },
  { id: 'tribal', name: 'MASKED', family: 'big', scale: 1, blood: '#FFB04A' },
  { id: 'ninja', name: 'SHADE', family: 'big', scale: 1, blood: '#9D8CFF' },
  { id: 'george', name: 'JUGGERNAUT', family: 'big', scale: 1, blood: '#FFD23F' },
  { id: 'leela', name: 'STRIDER', family: 'big', scale: 1, blood: '#3DF5FF' },
  { id: 'mike', name: 'GUARD UNIT', family: 'big', scale: 1, blood: '#FFB04A' },
  { id: 'stan', name: 'BREACHER', family: 'big', scale: 1, blood: '#FF5A3D' },
  { id: 'frog', name: 'LEAPER', family: 'big', scale: 0.9, blood: '#7CFF6B' },
  { id: 'monkroose', name: 'SCAVENGER', family: 'big', scale: 1, blood: '#FFB04A' },
  { id: 'spiky', name: 'SPIKER', family: 'blob', scale: 1.05, blood: '#7CFF6B' },
  { id: 'greenblob', name: 'SLIME', family: 'blob', scale: 1, blood: '#7CFF6B' },
  { id: 'pinkblob', name: 'GLOOM', family: 'blob', scale: 1, blood: '#FF7AC6' },
  { id: 'mushnub', name: 'SPORELING', family: 'blob', scale: 1, blood: '#C58AFF' },
  { id: 'blobalien', name: 'CRAWLER', family: 'blob', scale: 1, blood: '#7CFF6B' },
  { id: 'blobyeti', name: 'SNOW HOUND', family: 'blob', scale: 1.05, blood: '#BFEFFF' },
  { id: 'bloborc', name: 'GNASHER', family: 'blob', scale: 1, blood: '#8CCB3A' },
  { id: 'ghost', name: 'WRAITH', family: 'flying', scale: 1, blood: '#9DF5FF' },
  { id: 'ghostskull', name: 'REAPER', family: 'flying', scale: 1, blood: '#C5FF9D' },
  { id: 'squidle', name: 'SQUIDLE', family: 'flying', scale: 1, blood: '#FF7AC6' },
  { id: 'hywirl', name: 'HYWIRL', family: 'flying', scale: 1, blood: '#C58AFF' },
  { id: 'armabee', name: 'STINGER', family: 'flying', scale: 1, blood: '#FFD23F' },
  { id: 'dragon', name: 'DRAKE', family: 'flying', scale: 1.15, blood: '#FF6A1A' },
  { id: 'dragonevo', name: 'WYRM', family: 'flying', scale: 1, blood: '#FF6A1A' },
  { id: 'alpakingevo', name: 'SKY LLAMA KING', family: 'flying', scale: 1, blood: '#FFB0E0' },
  { id: 'armabeeevo', name: 'HIVE QUEEN', family: 'flying', scale: 1, blood: '#FFD23F' },
  { id: 'glubevo', name: 'DEEP GLUB', family: 'flying', scale: 1, blood: '#6BD5FF' },
  { id: 'golelingevo', name: 'GOLEM LORD', family: 'flying', scale: 1, blood: '#FFE58A' },
  { id: 'glub', name: 'GLUB', family: 'flying', scale: 1, blood: '#6BD5FF' },
  { id: 'goleling', name: 'GOLEM SPRITE', family: 'flying', scale: 1, blood: '#FFE58A' },
  { id: 'alpaking', name: 'SKY LLAMA', family: 'flying', scale: 1.05, blood: '#FFB0E0' },
  { id: 'pigeon', name: 'DIVER', family: 'flying', scale: 1, blood: '#E9FCFF' },
];

export function speciesById(id: string): Species | undefined {
  return SPECIES.find((s) => s.id === id);
}

/** Roles that creatures can fill, and the family of model each uses. */
export const ROLE_FAMILY: Partial<Record<EnemyKind, Family>> = {
  drone: 'big',
  armored: 'big',
  blade: 'big',
  titan: 'big',
  swarmer: 'blob',
  flyer: 'flying',
};

/** Standing height (m) of the creature in each role. */
export const ROLE_HEIGHT: Partial<Record<EnemyKind, number>> = {
  drone: 1.7,
  armored: 2.0,
  blade: 1.8,
  titan: 3.2,
  swarmer: 1.25,
  flyer: 1.15,
};

/** Creatures kept ready per role (a pool slot is one skinned clone with its own mixer). */
export const ROLE_POOL: Partial<Record<EnemyKind, number>> = { drone: 8, armored: 6, blade: 6, titan: 4, swarmer: 9, flyer: 6 };

/**
 * Which species fills each role in each world. A missing role keeps the
 * original humanoid alien.
 */
export const ROSTER: Readonly<Record<string, Partial<Record<EnemyKind, string>>>> = {
  'neon-grid': { drone: 'mike', armored: 'stan', titan: 'george', flyer: 'squidle' },
  'ember-foundry': { swarmer: 'bloborc', blade: 'demon', armored: 'orc', titan: 'orcskull', flyer: 'dragon' },
  'storm-peak': { drone: 'ninja', titan: 'dino', flyer: 'ghost' },
  'frost-spire': { swarmer: 'blobyeti', drone: 'tribal', armored: 'bluedemon', titan: 'yeti', flyer: 'glub' },
  'void-rift': { swarmer: 'spiky', blade: 'ninja', armored: 'bluedemon', titan: 'cactoro', flyer: 'hywirl' },
  'scrap-wastes': { drone: 'monkroose', armored: 'orc', swarmer: 'greenblob', titan: 'george', flyer: 'armabee' },
  'moon-temple': { blade: 'tribal', swarmer: 'pinkblob', armored: 'orc', titan: 'mushking', flyer: 'goleling' },
  'sky-ruins': { drone: 'alien', armored: 'bluedemon', titan: 'dino', flyer: 'alpaking' },
  'iron-bastion': { drone: 'mike', blade: 'leela', armored: 'stan', titan: 'george', flyer: 'ghostskull' },
};

/** Each region's boss: a giant flying creature (species, height in metres). */
export const BOSSES: Readonly<Record<string, { readonly species: string; readonly height: number }>> = {
  'neon-grid': { species: 'dragon', height: 2.6 },
  'ember-foundry': { species: 'dragonevo', height: 3 },
  'storm-peak': { species: 'squidle', height: 2.6 },
  'frost-spire': { species: 'glubevo', height: 2.8 },
  'void-rift': { species: 'ghost', height: 3 },
  'scrap-wastes': { species: 'armabeeevo', height: 2.8 },
  'moon-temple': { species: 'golelingevo', height: 2.8 },
  'sky-ruins': { species: 'alpakingevo', height: 3 },
  'iron-bastion': { species: 'hywirl', height: 2.8 },
};

/** The species fighting as `kind` in `worldId` ('' for the humanoid aliens). */
export function speciesFor(worldId: string, kind: EnemyKind): string {
  return ROSTER[worldId]?.[kind] ?? '';
}

/** Every species a world uses, once each. */
export function speciesIn(worldId: string): string[] {
  return [...new Set(Object.values(ROSTER[worldId] ?? {}))];
}
