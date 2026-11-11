import type { HeroId } from './heroes.js';
import { type BoardEntry, cleanLabel, cleanName } from './leaderboard.js';

/**
 * The online (world) leaderboard: a small client for the /api/board function
 * (api/board.ts). It only exists when the game is hosted with a database
 * connected; everywhere else `fetchBoard` answers null or `enabled: false`
 * and the game quietly keeps to the boards on this device.
 */

const ENDPOINT = `${import.meta.env.BASE_URL}api/board`;
const TIMEOUT_MS = 6000;
const CACHE_MS = 20_000;

export interface NetBoard {
  enabled: boolean;
  entries: BoardEntry[];
}

const cache = new Map<string, { at: number; value: NetBoard }>();

async function call(url: string, init?: RequestInit): Promise<unknown> {
  const control = new AbortController();
  const timer = window.setTimeout(() => control.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: control.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

/** Top scores for `hero`, or null if the online board cannot be reached. */
export async function fetchBoard(hero: HeroId): Promise<NetBoard | null> {
  const cached = cache.get(hero);
  if (cached != null && Date.now() - cached.at < CACHE_MS) return cached.value;
  const body = (await call(`${ENDPOINT}?hero=${hero}`)) as { enabled?: unknown; entries?: unknown } | null;
  if (body == null || typeof body !== 'object') return null;
  const entries: BoardEntry[] = [];
  if (Array.isArray(body.entries)) {
    for (const item of body.entries) {
      const e = item as Partial<BoardEntry> | null;
      if (e == null || typeof e.score !== 'number' || !Number.isFinite(e.score)) continue;
      const mode = e.mode === 'endless' || e.mode === 'daily' ? e.mode : 'campaign';
      entries.push({ name: cleanName(String(e.name ?? '')) || 'PLAYER', score: Math.floor(e.score), mode, label: cleanLabel(String(e.label ?? '')), at: typeof e.at === 'number' ? e.at : 0 });
    }
  }
  const value: NetBoard = { enabled: body.enabled === true, entries };
  cache.set(hero, { at: Date.now(), value });
  return value;
}

/** Sends a score to the online board; returns its world rank (1 is the top) or null. */
export async function postScore(hero: HeroId, entry: BoardEntry): Promise<number | null> {
  const body = (await call(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hero, name: entry.name, score: entry.score, mode: entry.mode, label: entry.label }),
  })) as { ok?: unknown; rank?: unknown } | null;
  cache.delete(hero);
  return body != null && body.ok === true && typeof body.rank === 'number' ? body.rank : null;
}
