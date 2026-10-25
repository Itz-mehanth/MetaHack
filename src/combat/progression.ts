import type { HeroId } from './heroes.js';
import type { EnemyKind, WaveDef } from './missions.js';
import { chapterFor, levelStory } from './story.js';

/**
 * Pure game progression: worlds and stages, difficulty, rewards, the coin
 * economy (heroes, upgrades, skins) and the saved profile shape.
 */

// ---------------------------------------------------------------- worlds & stages

export interface World {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  /** Regular enemies, weakest first. */
  readonly enemies: readonly EnemyKind[];
}

export const WORLDS: readonly World[] = [
  { id: 'neon-grid', name: 'NEON GRID', color: '#3DF5FF', enemies: ['drone', 'armored'] },
  { id: 'ember-foundry', name: 'EMBER FOUNDRY', color: '#FF6A1A', enemies: ['swarmer', 'armored'] },
  { id: 'storm-peak', name: 'STORM PEAK', color: '#9D8CFF', enemies: ['drone', 'titan'] },
  { id: 'frost-spire', name: 'FROST SPIRE', color: '#9FE8FF', enemies: ['swarmer', 'drone', 'armored'] },
  { id: 'void-rift', name: 'VOID RIFT', color: '#C04DFF', enemies: ['swarmer', 'armored', 'titan'] },
  { id: 'scrap-wastes', name: 'SCRAP WASTES', color: '#FFB01F', enemies: ['drone', 'armored', 'swarmer'] },
];

export const STAGES_PER_WORLD = 3;

export interface Stage {
  readonly id: string;
  readonly world: World;
  /** 0-based index across all stages; unlocks are sequential. */
  readonly index: number;
  readonly number: number;
  readonly name: string;
  readonly objective: string;
  readonly waves: readonly WaveDef[];
}

const STAGE_NAMES = ['BREACH', 'ONSLAUGHT', 'OVERLORD'];

function buildWaves(world: World, worldIndex: number, stage: number): WaveDef[] {
  const tier = worldIndex * STAGES_PER_WORLD + stage;
  const waveCount = 3 + Math.min(2, Math.floor(tier / 3));
  const swarm = world.enemies[0] === 'swarmer';
  const waves: WaveDef[] = [];
  for (let w = 0; w < waveCount; w += 1) {
    const last = w === waveCount - 1;
    const kinds: EnemyKind[] = [];
    // Early waves lean on the weakest enemy; later ones mix in the rest.
    for (let k = 0; k < world.enemies.length; k += 1) {
      const kind = world.enemies[k];
      if (kind === 'titan' && !(last || stage === 2)) continue;
      const weight = k === 0 ? 3 : w >= k ? 1 : 0;
      for (let n = 0; n < weight; n += 1) kinds.push(kind);
    }
    if (stage === 2 && last && !kinds.includes('titan')) kinds.push('titan');
    waves.push({
      count: (swarm ? 6 : 4) + w * 2 + tier,
      interval: Math.max(0.8, (swarm ? 2.4 : 1.8) - w * 0.2 - tier * 0.04),
      speed: (swarm ? 1.3 : 0.7) + w * 0.08 + tier * 0.04,
      kinds,
      burst: swarm ? 3 + Math.min(2, Math.floor(w / 2)) : undefined,
      boss: stage === 2 && last ? true : undefined,
    });
  }
  return waves;
}

export const STAGES: readonly Stage[] = WORLDS.flatMap((world, worldIndex) =>
  STAGE_NAMES.map((name, stage) => {
    const waves = buildWaves(world, worldIndex, stage);
    return {
      id: `${world.id}-${stage + 1}`,
      world,
      index: worldIndex * STAGES_PER_WORLD + stage,
      number: stage + 1,
      name,
      objective: stage === 2 ? `Boss stage: ${waves.length} waves` : `Survive ${waves.length} waves`,
      waves,
    };
  }),
);

export function stageById(id: string): Stage | undefined {
  return STAGES.find((s) => s.id === id);
}

// ---------------------------------------------------------------- difficulty

export type Difficulty = 'easy' | 'normal' | 'hard';

export const DIFFICULTY: Readonly<Record<Difficulty, { speed: number; health: number; coins: number }>> = {
  easy: { speed: 0.8, health: 7, coins: 0.75 },
  normal: { speed: 1, health: 5, coins: 1 },
  hard: { speed: 1.25, health: 3, coins: 1.5 },
};

// ---------------------------------------------------------------- economy

export const HERO_PRICE: Readonly<Record<HeroId, number>> = {
  arc: 0,
  talon: 300,
  tempest: 600,
  orion: 900,
  weaver: 1200,
  havoc: 1500,
};

export const ENEMY_COINS: Readonly<Record<EnemyKind, number>> = {
  drone: 5,
  armored: 10,
  swarmer: 4,
  titan: 40,
  boss: 150,
  orb: 0,
  pod: 10,
};

export interface UpgradeDef {
  readonly id: string;
  /** Hero this upgrade belongs to, or 'all' for shared upgrades. */
  readonly hero: HeroId | 'all';
  readonly name: string;
  readonly description: string;
}

export const MAX_UPGRADE = 5;
export const UPGRADE_COSTS = [100, 200, 400, 700, 1200] as const;

export const UPGRADES: readonly UpgradeDef[] = [
  { id: 'shield', hero: 'all', name: 'SHIELD CORE', description: '+1 max shield per level' },
  { id: 'arc-power', hero: 'arc', name: 'OVERCHARGE', description: 'Bolts hit harder' },
  { id: 'arc-rate', hero: 'arc', name: 'RAPID CYCLE', description: 'Faster fire rate' },
  { id: 'arc-split', hero: 'arc', name: 'SPLIT BEAM', description: 'Extra bolts per shot' },
  { id: 'talon-reach', hero: 'talon', name: 'LONG EDGE', description: 'Longer blades' },
  { id: 'talon-wave', hero: 'talon', name: 'SHOCK EDGE', description: 'Stronger crescents' },
  { id: 'talon-tempo', hero: 'talon', name: 'FURY', description: 'Crescents recharge faster' },
  { id: 'tempest-chain', hero: 'tempest', name: 'CHAIN STORM', description: 'Lightning jumps further' },
  { id: 'tempest-impact', hero: 'tempest', name: 'THUNDERCLAP', description: 'Harder throws' },
  { id: 'tempest-recall', hero: 'tempest', name: 'MAGNETISM', description: 'Faster recall' },
  { id: 'orion-draw', hero: 'orion', name: 'QUICK DRAW', description: 'Full draw sooner' },
  { id: 'orion-volley', hero: 'orion', name: 'VOLLEY', description: 'Extra arrows on full draw' },
  { id: 'orion-pierce', hero: 'orion', name: 'PIERCER', description: 'Arrows pass through more' },
  { id: 'weaver-range', hero: 'weaver', name: 'LONG LINE', description: 'Webs fly faster' },
  { id: 'weaver-snare', hero: 'weaver', name: 'STICKY', description: 'Longer snares' },
  { id: 'weaver-yank', hero: 'weaver', name: 'WHIPLASH', description: 'Yanks hit harder' },
  { id: 'havoc-damage', hero: 'havoc', name: 'HOLLOW POINT', description: 'Shots hit harder' },
  { id: 'havoc-rate', hero: 'havoc', name: 'HAIR TRIGGER', description: 'Faster auto-fire' },
  { id: 'havoc-pierce', hero: 'havoc', name: 'RAILGUN', description: 'Shots pierce enemies' },
];

export interface Skin {
  readonly id: string;
  readonly hero: HeroId;
  readonly name: string;
  readonly color: string;
  readonly price: number;
}

const SKIN_SETS: ReadonlyArray<readonly [HeroId, string, string]> = [
  ['arc', 'CLASSIC', '#3DF5FF'],
  ['arc', 'SOLAR', '#FFB01F'],
  ['arc', 'VERDANT', '#39FF88'],
  ['talon', 'CLASSIC', '#FF2D9A'],
  ['talon', 'BLOODMOON', '#FF2A2A'],
  ['talon', 'VENOM', '#B4FF2E'],
  ['tempest', 'CLASSIC', '#9D8CFF'],
  ['tempest', 'GOLDBOLT', '#FFD23F'],
  ['tempest', 'ICEFALL', '#7FE9FF'],
  ['orion', 'CLASSIC', '#5DFFB0'],
  ['orion', 'STARFIRE', '#FF7A3D'],
  ['orion', 'NOVA', '#E8E8FF'],
  ['weaver', 'CLASSIC', '#FF3D5A'],
  ['weaver', 'NOIR', '#C8C8D8'],
  ['weaver', 'MIDNIGHT', '#4D7BFF'],
  ['havoc', 'CLASSIC', '#FFB01F'],
  ['havoc', 'TOXIC', '#B6FF3D'],
  ['havoc', 'CHROME', '#DDE3F0'],
];

export const SKINS: readonly Skin[] = SKIN_SETS.map(([hero, name, color], i) => ({
  id: `${hero}-${name.toLowerCase()}`,
  hero,
  name,
  color,
  price: name === 'CLASSIC' ? 0 : 250 + (i % 3) * 100,
}));

// ---------------------------------------------------------------- profile

export interface Settings {
  music: number;
  sfx: number;
  difficulty: Difficulty;
  aimAssist: boolean;
  leftHanded: boolean;
}

export interface Profile {
  version: 1;
  coins: number;
  heroes: HeroId[];
  upgrades: Record<string, number>;
  skins: string[];
  equipped: Partial<Record<HeroId, string>>;
  /** Best stars (1-3) per cleared stage id. */
  stars: Record<string, number>;
  /** Story rewards earned (overdrive-*, core-*, legend-*). */
  unlocks: string[];
  settings: Settings;
}

export function defaultProfile(): Profile {
  return {
    version: 1,
    coins: 150,
    heroes: ['arc'],
    upgrades: {},
    skins: SKINS.filter((s) => s.price === 0).map((s) => s.id),
    equipped: {},
    stars: {},
    unlocks: [],
    settings: { music: 0.6, sfx: 0.8, difficulty: 'normal', aimAssist: true, leftHanded: false },
  };
}

/** Merges stored data over defaults so older or partial saves still load. */
export function normalizeProfile(raw: unknown): Profile {
  const base = defaultProfile();
  if (raw == null || typeof raw !== 'object') return base;
  const r = raw as Partial<Profile>;
  return {
    version: 1,
    coins: typeof r.coins === 'number' && r.coins >= 0 ? Math.floor(r.coins) : base.coins,
    heroes: Array.isArray(r.heroes) && r.heroes.length > 0 ? r.heroes : base.heroes,
    upgrades: { ...(r.upgrades ?? {}) },
    skins: Array.from(new Set([...base.skins, ...(Array.isArray(r.skins) ? r.skins : [])])),
    equipped: { ...(r.equipped ?? {}) },
    stars: { ...(r.stars ?? {}) },
    unlocks: Array.isArray(r.unlocks) ? [...r.unlocks] : [],
    settings: { ...base.settings, ...(r.settings ?? {}) },
  };
}

export function upgradeLevel(profile: Profile, id: string): number {
  return Math.min(MAX_UPGRADE, profile.upgrades[id] ?? 0);
}

/** Levels cleared in `hero`'s story region. */
export function levelsCleared(profile: Profile, hero: HeroId): number {
  const worldId = chapterFor(hero).worldId;
  return STAGES.filter((s) => s.world.id === worldId && (profile.stars[s.id] ?? 0) > 0).length;
}

/**
 * Highest level an upgrade can reach right now: hero upgrades unlock as the
 * hero's story levels are cleared (1, then 3, then 5); shared ones are open.
 */
export function upgradeCap(profile: Profile, id: string): number {
  const def = UPGRADES.find((u) => u.id === id);
  if (def == null || def.hero === 'all') return MAX_UPGRADE;
  return [1, 3, 5, 5][Math.min(3, levelsCleared(profile, def.hero))];
}

/** Weapon tier 0-5 from the hero's total upgrade levels; drives visuals. */
export function weaponTier(profile: Profile, hero: HeroId): number {
  const total = UPGRADES.filter((u) => u.hero === hero).reduce((sum, u) => sum + upgradeLevel(profile, u.id), 0);
  return Math.min(5, Math.floor(total / 3));
}

export function nextUpgradeCost(profile: Profile, id: string): number | null {
  const level = upgradeLevel(profile, id);
  return level >= MAX_UPGRADE ? null : UPGRADE_COSTS[level];
}

/** Each returns true and mutates the profile only when the purchase succeeds. */
export function buyUpgrade(profile: Profile, id: string): boolean {
  const cost = nextUpgradeCost(profile, id);
  if (cost == null || profile.coins < cost || upgradeLevel(profile, id) >= upgradeCap(profile, id)) return false;
  profile.coins -= cost;
  profile.upgrades[id] = upgradeLevel(profile, id) + 1;
  return true;
}

export function buyHero(profile: Profile, hero: HeroId): boolean {
  if (profile.heroes.includes(hero) || profile.coins < HERO_PRICE[hero]) return false;
  profile.coins -= HERO_PRICE[hero];
  profile.heroes.push(hero);
  return true;
}

export function buySkin(profile: Profile, skinId: string): boolean {
  const skin = SKINS.find((s) => s.id === skinId);
  if (skin == null || profile.skins.includes(skinId) || profile.coins < skin.price) return false;
  profile.coins -= skin.price;
  profile.skins.push(skinId);
  profile.equipped[skin.hero] = skinId;
  return true;
}

export function equippedColor(profile: Profile, hero: HeroId): string {
  const id = profile.equipped[hero];
  const skin = SKINS.find((s) => s.id === id && s.hero === hero) ?? SKINS.find((s) => s.hero === hero);
  return skin?.color ?? '#FFFFFF';
}

/** Levels unlock in order within each hero's region. */
export function isStageUnlocked(profile: Profile, stage: Stage): boolean {
  if (stage.number === 1) return true;
  const previous = STAGES[stage.index - 1];
  return (profile.stars[previous.id] ?? 0) > 0;
}

export function maxHealth(profile: Profile): number {
  return DIFFICULTY[profile.settings.difficulty].health + upgradeLevel(profile, 'shield');
}

// ---------------------------------------------------------------- results

export interface RunResult {
  won: boolean;
  health: number;
  maxHealth: number;
  /** Coins already collected from kills during the run. */
  killCoins: number;
  hostagesSaved?: number;
  hostagesTotal?: number;
}

export interface Reward {
  stars: number;
  coins: number;
  newBest: boolean;
  /** Story reward id unlocked by this run, if it was new. */
  unlocked?: string;
}

/** One star for clearing, one for saving every hostage, one for finishing above half shield. */
export function starsFor(result: RunResult): number {
  if (!result.won) return 0;
  const allSaved = (result.hostagesSaved ?? 0) >= (result.hostagesTotal ?? 0);
  return 1 + (allSaved ? 1 : 0) + (result.health >= Math.ceil(result.maxHealth / 2) ? 1 : 0);
}

export function hasUnlock(profile: Profile, id: string): boolean {
  return profile.unlocks.includes(id);
}

/** Applies a finished run to the profile and returns what was earned. */
export function recordResult(profile: Profile, stage: Stage, result: RunResult): Reward {
  const stars = starsFor(result);
  const multiplier = DIFFICULTY[profile.settings.difficulty].coins;
  const clearBonus = result.won ? 40 + stage.index * 15 + stars * 20 : 0;
  const coins = Math.round((result.killCoins + clearBonus) * multiplier);
  const best = profile.stars[stage.id] ?? 0;
  if (stars > best) profile.stars[stage.id] = stars;
  profile.coins += coins;
  let unlocked: string | undefined;
  const story = levelStory(stage.world.id, stage.number);
  if (result.won && story && !profile.unlocks.includes(story.reward.id)) {
    unlocked = story.reward.id;
    profile.unlocks.push(unlocked);
    // Legend rewards grant the hero's first paid skin for free.
    if (unlocked.startsWith('legend-')) {
      const hero = unlocked.slice('legend-'.length);
      const skin = SKINS.find((k) => k.hero === hero && k.price > 0);
      if (skin && !profile.skins.includes(skin.id)) profile.skins.push(skin.id);
    }
  }
  return { stars, coins, newBest: stars > best, unlocked };
}
