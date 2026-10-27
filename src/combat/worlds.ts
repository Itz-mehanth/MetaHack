import type { TransitStyle } from './transit.js';

/**
 * Every level is a different world: its own sky, nebula, planet or moon,
 * ring, stars and how far it tears into the player's room in MR. Pure data,
 * keyed by stage id (plus the saga's OBLIVION look).
 */

export interface WorldLook {
  /** Sky at the zenith and at the horizon, and the ground below it. */
  readonly top: string;
  readonly horizon: string;
  readonly ground: string;
  /** Nebula / cloud colour. */
  readonly cloud: string;
  /** Burning edge of the rifts, rim light. */
  readonly accent: string;
  /** Planet, moon or sun: colour, direction (x, y, z) and angular radius. */
  readonly planet: string;
  readonly planetDir: readonly [number, number, number];
  readonly planetSize: number;
  /** Ringed planet (or accretion disc when the planet is dark). */
  readonly ring: boolean;
  /** 0..1 star density. */
  readonly stars: number;
  /** How much of the room the world breaks through in MR (0..0.6). */
  readonly rift: number;
}

const L = (
  top: string,
  horizon: string,
  ground: string,
  cloud: string,
  accent: string,
  planet: string,
  planetDir: [number, number, number],
  planetSize: number,
  ring: boolean,
  stars: number,
  rift: number,
): WorldLook => ({ top, horizon, ground, cloud, accent, planet, planetDir, planetSize, ring, stars, rift });

export const WORLD_LOOKS: Readonly<Record<string, WorldLook>> = {
  // ARC: neon city skies.
  'neon-grid-1': L('#050018', '#FF2E8C', '#07000F', '#3A0A5A', '#3DF5FF', '#FF9A3D', [0, 0.1, -1], 0.17, false, 0.6, 0.2),
  'neon-grid-2': L('#000814', '#1AE6FF', '#00040A', '#0A3A5A', '#FF2D9A', '#8AF0FF', [-0.55, 0.35, -0.75], 0.09, true, 0.8, 0.28),
  'neon-grid-3': L('#12000A', '#FF3B5C', '#0A0005', '#5A0A1A', '#FFD23F', '#FF3B5C', [0.35, 0.3, -0.9], 0.22, true, 0.3, 0.38),
  // TALON: the foundry world.
  'ember-foundry-1': L('#1A0500', '#FF6A00', '#120300', '#5A1A00', '#FFC02E', '#FFC02E', [0.2, 0.12, -1], 0.14, false, 0.2, 0.2),
  'ember-foundry-2': L('#0A0605', '#FF3A00', '#080404', '#3A2A20', '#FF6A1A', '#FF8A3D', [-0.6, 0.45, -0.7], 0.07, false, 0.1, 0.28),
  'ember-foundry-3': L('#200000', '#FFB000', '#100000', '#8A2000', '#FF2A00', '#FF2A00', [0, 0.35, -1], 0.3, false, 0.1, 0.4),
  // TEMPEST: storm worlds.
  'storm-peak-1': L('#02030A', '#6F7FFF', '#01020A', '#2A3060', '#B6A6FF', '#B6A6FF', [0.5, 0.4, -0.8], 0.08, true, 0.5, 0.22),
  'storm-peak-2': L('#000010', '#9D8CFF', '#00000A', '#4A3A8A', '#FFFFFF', '#F2F0FF', [-0.3, 0.6, -0.75], 0.05, false, 0.4, 0.3),
  'storm-peak-3': L('#05001A', '#FF66CC', '#03000A', '#3A1A6A', '#B6A6FF', '#9D8CFF', [0, 0.25, -1], 0.24, true, 0.6, 0.4),
  // ORION: frozen worlds.
  'frost-spire-1': L('#01060E', '#9FE8FF', '#020812', '#1AFFC0', '#9FE8FF', '#E8FBFF', [0.45, 0.35, -0.85], 0.06, false, 0.9, 0.2),
  'frost-spire-2': L('#0B1A2A', '#CFEFFF', '#0A1420', '#8AB0C8', '#FFFFFF', '#FFFFFF', [-0.4, 0.2, -0.9], 0.08, false, 0.1, 0.28),
  'frost-spire-3': L('#000818', '#4DA6FF', '#000610', '#6FD6FF', '#9FE8FF', '#9FE8FF', [0, 0.3, -1], 0.25, true, 0.7, 0.4),
  // WEAVER: the void.
  'void-rift-1': L('#000000', '#C04DFF', '#000000', '#3A0A5A', '#C04DFF', '#000000', [0.3, 0.3, -0.9], 0.12, true, 0.9, 0.24),
  'void-rift-2': L('#050010', '#39FF88', '#020008', '#0A5A2A', '#39FF88', '#C04DFF', [-0.5, 0.4, -0.75], 0.1, false, 0.8, 0.32),
  'void-rift-3': L('#000000', '#FF2D9A', '#000000', '#5A0A3A', '#39FF88', '#000000', [0, 0.28, -1], 0.2, true, 1, 0.45),
  // HAVOC: the wastes.
  'scrap-wastes-1': L('#3A2A18', '#FFB01F', '#2A1A0A', '#8A6A3A', '#FFB01F', '#FFF2B0', [0.4, 0.3, -0.85], 0.1, false, 0, 0.2),
  'scrap-wastes-2': L('#2A1A0A', '#C46A1F', '#1A1006', '#6A4A2A', '#FF5A1F', '#FFB01F', [-0.3, 0.45, -0.85], 0.05, false, 0, 0.3),
  'scrap-wastes-3': L('#0B0602', '#FF5A1F', '#080402', '#4A1A0A', '#3DE0C8', '#FF5A1F', [0, 0.2, -1], 0.18, true, 0.5, 0.4),
  // RONIN: moon temple skies.
  'moon-temple-1': L('#01030C', '#E8EEFF', '#01020A', '#1A2A5A', '#4DA6FF', '#F4F4FF', [0.3, 0.4, -0.85], 0.2, false, 0.8, 0.2),
  'moon-temple-2': L('#0A1830', '#FF9AD5', '#060E1A', '#3A2A5A', '#FF9AD5', '#FFE0F0', [-0.5, 0.25, -0.8], 0.1, false, 0.4, 0.28),
  'moon-temple-3': L('#0A0005', '#FF3355', '#050003', '#3A0A1A', '#FF3355', '#FF3355', [0, 0.32, -1], 0.24, false, 0.6, 0.4),
  // PSION: floating sky islands.
  'sky-ruins-1': L('#2A1450', '#FFB0F0', '#140A28', '#FFFFFF', '#3DFFC8', '#3DFFC8', [0.5, 0.35, -0.8], 0.09, true, 0.2, 0.22),
  'sky-ruins-2': L('#3A1030', '#FFB070', '#1A0818', '#FF8AC0', '#FFD070', '#FFD070', [-0.2, 0.15, -1], 0.12, false, 0.1, 0.3),
  'sky-ruins-3': L('#0A0418', '#E05CFF', '#05020C', '#5A2A8A', '#E05CFF', '#000000', [0, 0.3, -1], 0.2, true, 0.9, 0.42),
  // VANGUARD: a city under siege.
  'iron-bastion-1': L('#0A1428', '#FF9A3D', '#060A14', '#5A3A2A', '#3D6BFF', '#FFD08A', [0.3, 0.12, -1], 0.13, false, 0.2, 0.22),
  'iron-bastion-2': L('#05060C', '#FF3B1F', '#030306', '#3A1A10', '#FF8A3D', '#FF3B1F', [-0.4, 0.4, -0.8], 0.06, false, 0.6, 0.32),
  'iron-bastion-3': L('#101820', '#3D6BFF', '#080C10', '#2A3A5A', '#FF8A3D', '#9CC8FF', [0, 0.3, -1], 0.22, true, 0.5, 0.42),
  // VESPER: the Veil, a sanctum of living runes.
  'veil-sanctum-1': L('#07031A', '#FFC857', '#04020C', '#3A1A7A', '#8A5CFF', '#FFE8A8', [0.25, 0.2, -1], 0.12, true, 0.7, 0.22),
  'veil-sanctum-2': L('#0A0420', '#8A5CFF', '#05020E', '#5A2AAA', '#FFC857', '#C9B0FF', [-0.45, 0.4, -0.8], 0.07, false, 0.9, 0.32),
  'veil-sanctum-3': L('#10002A', '#FF7AC6', '#080014', '#6A1A9A', '#FFC857', '#000000', [0, 0.3, -1], 0.24, true, 0.8, 0.42),
  // The saga: OBLIVAX unmaking everything.
  oblivion: L('#000000', '#FF4FD8', '#000000', '#3A0A3A', '#FF4FD8', '#FFFFFF', [0, 0.5, -0.9], 0.03, false, 1, 0.55),
};

export function lookFor(stageId: string, worldId: string): WorldLook {
  return WORLD_LOOKS[stageId] ?? WORLD_LOOKS[`${worldId}-1`] ?? WORLD_LOOKS.oblivion;
}

/** How the player travels to each region's levels (level 2 takes a wormhole). */
const TRANSIT: Readonly<Record<string, TransitStyle>> = {
  'neon-grid': 'warp',
  'ember-foundry': 'fire',
  'storm-peak': 'sky',
  'frost-spire': 'sky',
  'void-rift': 'blackhole',
  'scrap-wastes': 'warp',
  'moon-temple': 'wormhole',
  'sky-ruins': 'sky',
  'iron-bastion': 'sky',
  'veil-sanctum': 'wormhole',
  oblivion: 'blackhole',
};

export function transitFor(worldId: string, level: number): TransitStyle {
  const style = TRANSIT[worldId] ?? 'warp';
  if (level === 2) return style === 'wormhole' ? 'warp' : 'wormhole';
  if (level === 3 && style !== 'blackhole') return style === 'sky' ? 'blackhole' : style;
  return style;
}
