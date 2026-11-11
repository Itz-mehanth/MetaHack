/**
 * The world leaderboard: a Vercel serverless function, /api/board.
 *
 *   GET  /api/board?hero=arc  ->  { enabled, entries: [{ name, score, mode, label, at }] }   (top 10)
 *   POST /api/board           ->  { ok, rank }   body: { hero, name, score, mode, label }
 *
 * Scores live in a Redis sorted set per hero (one best score per name) on a
 * Vercel KV / Upstash Redis database, reached over its REST interface with
 * plain fetch, so there is nothing to install. With no database connected
 * (the KV_REST_API_URL / KV_REST_API_TOKEN variables are missing) every call
 * answers `enabled: false` and the game keeps its boards on the player's
 * device only. Self-contained on purpose: Vercel builds this file alone.
 *
 * Anyone can post a score, so it is arcade-grade: names are letters and
 * digits only (with a short block list), scores are capped, one post per few
 * seconds per address, and only the best 50 per hero are kept.
 */

export const HEROES = ['arc', 'talon', 'tempest', 'orion', 'weaver', 'havoc', 'ronin', 'psion', 'vesper', 'vanguard'];
const MODES = ['campaign', 'endless', 'daily'];
const NAME_MAX = 10;
const TOP = 10;
const KEEP = 50;
const MAX_SCORE = 5_000_000;
const BLOCKED = ['FUCK', 'SHIT', 'CUNT', 'NIGG', 'FAGG', 'RAPE', 'NAZI', 'HITLER', 'BITCH', 'WHORE', 'PUSSY', 'SLUT', 'COCK', 'PENIS', 'VAGINA', 'ASSHOLE'];

export interface Submission {
  hero: string;
  name: string;
  score: number;
  mode: string;
  label: string;
}

export interface BoardRow {
  name: string;
  score: number;
  mode: string;
  label: string;
  at: number;
}

/** Runs Redis commands in one round trip and returns each command's result. */
export type Exec = (commands: (string | number)[][]) => Promise<unknown[]>;

interface Req {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
}

interface Res {
  status(code: number): Res;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
}

export function cleanName(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trimStart().slice(0, NAME_MAX).trimEnd();
}

function cleanLabel(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
}

/** False for names that spell something on the block list (also with look-alike digits). */
export function nameAllowed(name: string): boolean {
  const flat = name.replace(/ /g, '').replace(/0/g, 'O').replace(/1/g, 'I').replace(/3/g, 'E').replace(/4/g, 'A').replace(/5/g, 'S').replace(/7/g, 'T');
  return !BLOCKED.some((word) => flat.includes(word));
}

export function parseSubmission(body: unknown): { ok: true; value: Submission } | { ok: false; error: string } {
  if (body == null || typeof body !== 'object') return { ok: false, error: 'bad body' };
  const b = body as Record<string, unknown>;
  const hero = typeof b.hero === 'string' ? b.hero : '';
  if (!HEROES.includes(hero)) return { ok: false, error: 'bad hero' };
  const name = cleanName(typeof b.name === 'string' ? b.name : '');
  if (name === '') return { ok: false, error: 'bad name' };
  if (!nameAllowed(name)) return { ok: false, error: 'name not allowed' };
  const score = typeof b.score === 'number' ? Math.floor(b.score) : NaN;
  if (!Number.isFinite(score) || score < 1 || score > MAX_SCORE) return { ok: false, error: 'bad score' };
  const mode = typeof b.mode === 'string' && MODES.includes(b.mode) ? b.mode : 'campaign';
  return { ok: true, value: { hero, name, score, mode, label: cleanLabel(typeof b.label === 'string' ? b.label : '') } };
}

const boardKey = (hero: string): string => `surge:board:${hero}`;
const metaKey = (hero: string): string => `surge:meta:${hero}`;

/** The best ten scores for `hero`. */
export async function topScores(exec: Exec, hero: string): Promise<BoardRow[]> {
  const [ranked, meta] = await exec([['ZREVRANGE', boardKey(hero), 0, TOP - 1, 'WITHSCORES'], ['HGETALL', metaKey(hero)]]);
  const notes = new Map<string, { m?: string; l?: string; t?: number }>();
  if (Array.isArray(meta)) {
    for (let i = 0; i + 1 < meta.length; i += 2) {
      try {
        notes.set(String(meta[i]), JSON.parse(String(meta[i + 1])));
      } catch {
        // a damaged note only loses its label
      }
    }
  } else if (meta != null && typeof meta === 'object') {
    for (const [name, value] of Object.entries(meta)) {
      try {
        notes.set(name, typeof value === 'string' ? JSON.parse(value) : (value as object));
      } catch {
        // as above
      }
    }
  }
  const rows: BoardRow[] = [];
  if (Array.isArray(ranked)) {
    for (let i = 0; i + 1 < ranked.length; i += 2) {
      const name = String(ranked[i]);
      const note = notes.get(name) ?? {};
      rows.push({ name, score: Math.floor(Number(ranked[i + 1])), mode: note.m ?? 'campaign', label: note.l ?? '', at: note.t ?? 0 });
    }
  }
  return rows;
}

/** Records a submission (keeping the best score per name) and returns the HTTP answer. */
export async function submitScore(exec: Exec, ip: string, s: Submission, now: number): Promise<{ status: number; body: unknown }> {
  const [allowed] = await exec([['SET', `surge:rl:${ip}`, '1', 'NX', 'EX', 6]]);
  if (allowed !== 'OK') return { status: 429, body: { ok: false, error: 'slow down' } };
  const [changed] = await exec([['ZADD', boardKey(s.hero), 'GT', 'CH', s.score, s.name]]);
  const improved = Number(changed) > 0;
  const follow: (string | number)[][] = [];
  if (improved) follow.push(['HSET', metaKey(s.hero), s.name, JSON.stringify({ m: s.mode, l: s.label, t: now })]);
  follow.push(['ZREVRANK', boardKey(s.hero), s.name], ['ZREMRANGEBYRANK', boardKey(s.hero), 0, -(KEEP + 1)]);
  const out = await exec(follow);
  const rank = out[improved ? 1 : 0];
  return { status: 200, body: { ok: true, improved, rank: typeof rank === 'number' ? rank + 1 : null } };
}

/** A Redis REST client from the environment, or null when no database is connected. */
export function redisFrom(env: Record<string, string | undefined>): Exec | null {
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return async (commands) => {
    const response = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands),
    });
    if (!response.ok) throw new Error(`redis ${response.status}`);
    const rows = (await response.json()) as { result?: unknown; error?: string }[];
    return rows.map((row) => {
      if (row.error) throw new Error(row.error);
      return row.result;
    });
  };
}

export default async function handler(req: Req, res: Res): Promise<void> {
  const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
  const exec = redisFrom(env);
  try {
    if (req.method === 'GET') {
      const hero = String(Array.isArray(req.query.hero) ? req.query.hero[0] : (req.query.hero ?? ''));
      if (!HEROES.includes(hero)) {
        res.status(400).json({ enabled: false, entries: [] });
        return;
      }
      if (exec == null) {
        res.status(200).json({ enabled: false, entries: [] });
        return;
      }
      res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
      res.status(200).json({ enabled: true, entries: await topScores(exec, hero) });
      return;
    }
    if (req.method === 'POST') {
      if (exec == null) {
        res.status(200).json({ ok: false, error: 'offline' });
        return;
      }
      const parsed = parseSubmission(req.body);
      if (!parsed.ok) {
        res.status(422).json({ ok: false, error: parsed.error });
        return;
      }
      const forwarded = req.headers['x-forwarded-for'] ?? req.headers['x-real-ip'] ?? '';
      const ip = String(Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim() || 'anon';
      res.setHeader('Cache-Control', 'no-store');
      const result = await submitScore(exec, ip, parsed.value, Date.now());
      res.status(result.status).json(result.body);
      return;
    }
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ ok: false });
  } catch {
    // A database hiccup must never break the game: report the board as offline.
    res.status(200).json({ enabled: false, ok: false, entries: [] });
  }
}
