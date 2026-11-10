import type { HeroId } from './heroes.js';
import { chapterFor } from './story.js';
import type { EnemyKind, WaveDef } from './missions.js';
import { DIFFICULTY, type EndlessInfo, type Profile, type Stage, WORLDS, type World } from './progression.js';
import { CHAMPIONS, type TwistId } from './twists.js';

/**
 * Endless and the daily challenge: a generated run with no story. Waves
 * escalate without end, a boss comes every fifth wave, and the daily picks the
 * same world and twist for everyone on the same UTC day. Pure and tested.
 */

/** Waves generated per run. Reaching the end is a legendary clear. */
export const ENDLESS_WAVES = 40;
export const BOSS_EVERY = 5;

/** Twists a daily can roll (not 'none': a daily always has a rule). */
const DAILY_TWISTS: readonly TwistId[] = ['meteors', 'lightning', 'lowgrav', 'blackout', 'ceiling', 'frenzy'];

// ---------------------------------------------------------------- dates and seeds

const pad = (n: number): string => String(n).padStart(2, '0');

/** The UTC calendar day of `date` as YYYY-MM-DD. */
export function dayKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** The day before `day` (YYYY-MM-DD). */
export function previousDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return dayKey(new Date(Date.UTC(y, m - 1, d - 1)));
}

/** A stable 32-bit hash of `text` (FNV-1a). */
export function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A small seeded random generator (mulberry32). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- the daily

export interface DailyChallenge {
  day: string;
  world: World;
  twist: TwistId;
  /** Shifts the Colossus cadence so two days with one world still differ. */
  salt: number;
}

/** Everyone gets the same world and twist for a given UTC day. */
export function dailyChallenge(day: string): DailyChallenge {
  const random = seeded(seedOf(`surge-daily-${day}`));
  const world = WORLDS[Math.floor(random() * WORLDS.length)];
  const twist = DAILY_TWISTS[Math.floor(random() * DAILY_TWISTS.length)];
  return { day, world, twist, salt: Math.floor(random() * 4) };
}

// ---------------------------------------------------------------- waves

/** The giant elite kind that closes a champion wave in `world`. */
function championKind(world: World): EnemyKind {
  if (world.enemies[0] === 'blade') return 'blade';
  return world.enemies.includes('titan') ? 'titan' : 'armored';
}

/** True on boss waves (the 5th, 10th, ... counting from wave 1). */
export function isBossWave(n: number): boolean {
  return (n + 1) % BOSS_EVERY === 0;
}

/** Wave `n` (0-based) of an endless run in `world`. */
export function endlessWave(world: World, n: number, salt = 0): WaveDef {
  const swarm = world.enemies[0] === 'swarmer';
  const boss = isBossWave(n);
  const champion = n % BOSS_EVERY === 2;
  const kinds: EnemyKind[] = [];
  world.enemies.forEach((kind, k) => {
    // A Colossus is a rare event, not a crowd member.
    if (kind === 'titan' && (n + salt) % 4 !== 3) return;
    // Flyers join once the player has settled in.
    if (kind === 'flyer' && n < 2) return;
    // Heavier kinds arrive every couple of waves and grow more common.
    const weight = k === 0 ? 3 : n >= k * 2 ? 1 + Math.floor((n - k * 2) / 6) : 0;
    for (let i = 0; i < weight; i += 1) kinds.push(kind);
  });
  if (kinds.length === 0) kinds.push(world.enemies[0]);
  // Boss waves bring fewer extras: the boss summons its own.
  const base = Math.min(24, (swarm ? 6 : 4) + Math.floor(n * 0.8));
  return {
    count: boss ? Math.max(3, Math.floor(base * 0.6)) : base,
    alive: Math.min(9, (swarm ? 6 : 4) + Math.floor(n / 3)),
    interval: Math.max(0.8, (swarm ? 2.2 : 2.0) - n * 0.04),
    speed: Math.min(1.9, (swarm ? 1.3 : 0.7) + n * 0.035),
    kinds,
    burst: swarm ? 2 + Math.min(2, Math.floor(n / 5)) : undefined,
    boss: boss ? true : undefined,
    champion: champion && !boss ? championKind(world) : undefined,
  };
}

/** The champion's name for wave `n`: the world's two named champions, alternating. */
export function championName(worldId: string, n: number): string {
  return CHAMPIONS[`${worldId}-${1 + (Math.floor(n / BOSS_EVERY) % 2)}`] ?? 'CHAMPION';
}

/** How many bosses have come by wave `n` (0-based), counting that wave's own. */
export function bossRound(n: number): number {
  return Math.floor((n + 1) / BOSS_EVERY);
}

// ---------------------------------------------------------------- stages

/** The endless stage in `hero`'s home world. */
export function endlessStage(heroWorldId: string, day: string): Stage {
  const world = WORLDS.find((w) => w.id === heroWorldId) ?? WORLDS[0];
  return build(`endless-${world.id}`, 'ENDLESS', 'Survive as long as you can. A boss every 5 waves.', world, { mode: 'endless', day, twist: 'none' }, 0);
}

/** Today's daily-challenge stage. */
export function dailyStage(day: string): Stage {
  const c = dailyChallenge(day);
  return build(`daily-${day}`, 'DAILY CHALLENGE', 'Same world and twist for everyone today. How far can you get?', c.world, { mode: 'daily', day, twist: c.twist }, c.salt);
}

function build(id: string, name: string, objective: string, world: World, endless: EndlessInfo, salt: number): Stage {
  return {
    id,
    world,
    index: -1,
    number: 0,
    name,
    objective,
    waves: Array.from({ length: ENDLESS_WAVES }, (_, n) => endlessWave(world, n, salt)),
    endless,
  };
}

/** The home-world id for `hero`'s endless runs. */
export function endlessWorldOf(hero: HeroId): string {
  return chapterFor(hero).worldId;
}

// ---------------------------------------------------------------- records

export interface EndlessResult {
  info: EndlessInfo;
  /** Waves fully cleared before the run ended. */
  waves: number;
  score: number;
  killCoins: number;
}

export interface EndlessReward {
  coins: number;
  newBest: boolean;
  /** Best waves cleared for this mode (today's best for a daily). */
  best: number;
  streak: number;
  bestStreak: number;
}

/** Applies a finished endless or daily run to the profile. */
export function recordEndless(profile: Profile, result: EndlessResult): EndlessReward {
  const a = profile.arcade;
  const { waves, score } = result;
  let newBest = false;
  if (result.info.mode === 'endless') {
    a.endlessRuns += 1;
    newBest = waves > a.endlessBest || (waves === a.endlessBest && score > a.endlessScore);
    if (newBest) {
      a.endlessBest = waves;
      a.endlessScore = score;
    }
  } else {
    const day = result.info.day;
    if (a.dailyDay !== day) {
      a.dailyDay = day;
      a.dailyBest = 0;
      a.dailyScore = 0;
    }
    if (a.streakDay !== day) {
      a.streak = a.streakDay === previousDay(day) ? a.streak + 1 : 1;
      a.streakDay = day;
      a.bestStreak = Math.max(a.bestStreak, a.streak);
    }
    newBest = waves > a.dailyBest || (waves === a.dailyBest && score > a.dailyScore);
    if (newBest) {
      a.dailyBest = waves;
      a.dailyScore = score;
    }
  }
  // Half the story rate for kills, plus a flat bonus per wave: worth playing, not a coin farm.
  const coins = Math.round((result.killCoins * 0.5 + waves * 12) * DIFFICULTY[profile.settings.difficulty].coins);
  profile.coins += coins;
  return {
    coins,
    newBest,
    best: result.info.mode === 'endless' ? a.endlessBest : a.dailyBest,
    streak: a.streak,
    bestStreak: a.bestStreak,
  };
}

/** Today's best waves for the daily (0 if not played today). */
export function dailyBestToday(profile: Profile, day: string): number {
  return profile.arcade.dailyDay === day ? profile.arcade.dailyBest : 0;
}

/** The streak still alive on `day`: it counts if the daily was played today or yesterday. */
export function liveStreak(profile: Profile, day: string): number {
  const a = profile.arcade;
  return a.streakDay === day || a.streakDay === previousDay(day) ? a.streak : 0;
}
