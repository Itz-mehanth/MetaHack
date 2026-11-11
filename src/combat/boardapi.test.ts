import { describe, expect, it } from 'vitest';
import { type Exec, nameAllowed, parseSubmission, redisFrom, submitScore, topScores } from '../../api/board.js';

/** A tiny in-memory Redis that understands only the commands the board uses. */
function fakeRedis(): Exec {
  const zsets = new Map<string, Map<string, number>>();
  const hashes = new Map<string, Map<string, string>>();
  const strings = new Set<string>();
  const run = (cmd: (string | number)[]): unknown => {
    const [name, key, ...rest] = cmd as [string, string, ...(string | number)[]];
    const z = zsets.get(key) ?? new Map<string, number>();
    const sorted = () => [...z.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
    switch (name) {
      case 'SET':
        if (strings.has(key)) return null;
        strings.add(key);
        return 'OK';
      case 'ZADD': {
        const [, , score, member] = rest as [string, string, number, string];
        const old = z.get(member);
        if (old != null && score <= old) return 0;
        z.set(member, score);
        zsets.set(key, z);
        return 1;
      }
      case 'ZREVRANGE': {
        const [from, to] = rest as [number, number];
        return sorted().slice(from, to + 1).flatMap(([m, s]) => [m, String(s)]);
      }
      case 'ZREVRANK': {
        const i = sorted().findIndex(([m]) => m === rest[0]);
        return i < 0 ? null : i;
      }
      case 'ZREMRANGEBYRANK': {
        const list = sorted().reverse();
        const [from, to] = rest as [number, number];
        const end = to < 0 ? list.length + to : to;
        for (const [m] of list.slice(from, end + 1)) z.delete(m);
        return 0;
      }
      case 'HSET': {
        const h = hashes.get(key) ?? new Map<string, string>();
        h.set(String(rest[0]), String(rest[1]));
        hashes.set(key, h);
        return 1;
      }
      case 'HGETALL':
        return [...(hashes.get(key) ?? new Map<string, string>()).entries()].flat();
      default:
        throw new Error(`unsupported ${name}`);
    }
  };
  return async (commands) => commands.map(run);
}

describe('submission rules', () => {
  const ok = { hero: 'arc', name: 'Ace Pilot', score: 4200, mode: 'endless', label: 'endless wave 9' };

  it('accepts a good score and cleans it', () => {
    const parsed = parseSubmission(ok);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value).toEqual({ hero: 'arc', name: 'ACE PILOT', score: 4200, mode: 'endless', label: 'ENDLESS WAVE 9' });
  });

  it('rejects bad heroes, names and scores', () => {
    for (const bad of [null, 'x', { ...ok, hero: 'nobody' }, { ...ok, name: '!!!' }, { ...ok, name: '' }, { ...ok, score: 0 }, { ...ok, score: 9_000_000 }, { ...ok, score: 'lots' }, { ...ok, score: Number.NaN }]) {
      expect(parseSubmission(bad).ok).toBe(false);
    }
  });

  it('blocks rude names, including look-alike digits', () => {
    expect(nameAllowed('ACE')).toBe(true);
    expect(nameAllowed('NAZI')).toBe(false);
    expect(nameAllowed('N4Z1')).toBe(false);
    expect(nameAllowed('SH1T HEAD')).toBe(false);
    expect(parseSubmission({ ...ok, name: 'n4z1' }).ok).toBe(false);
  });

  it('turns an unknown mode into campaign', () => {
    const parsed = parseSubmission({ ...ok, mode: 'cheat' });
    expect(parsed.ok && parsed.value.mode).toBe('campaign');
  });
});

describe('the board', () => {
  const sub = (name: string, score: number) => ({ hero: 'arc', name, score, mode: 'daily', label: 'DAILY WAVE 3' });

  it('keeps the best score per name and ranks them', async () => {
    const exec = fakeRedis();
    expect((await submitScore(exec, '1.1.1.1', sub('ACE', 500), 10)).body).toEqual({ ok: true, improved: true, rank: 1 });
    expect((await submitScore(exec, '1.1.1.2', sub('BEE', 900), 11)).body).toEqual({ ok: true, improved: true, rank: 1 });
    expect((await submitScore(exec, '1.1.1.3', sub('ACE', 300), 12)).body).toEqual({ ok: true, improved: false, rank: 2 });
    expect((await submitScore(exec, '1.1.1.4', sub('ACE', 700), 13)).body).toEqual({ ok: true, improved: true, rank: 2 });
    const rows = await topScores(exec, 'arc');
    expect(rows.map((r) => [r.name, r.score])).toEqual([['BEE', 900], ['ACE', 700]]);
    expect(rows[0]).toMatchObject({ mode: 'daily', label: 'DAILY WAVE 3', at: 11 });
  });

  it('answers a second post from the same address with 429', async () => {
    const exec = fakeRedis();
    expect((await submitScore(exec, '9.9.9.9', sub('ACE', 500), 1)).status).toBe(200);
    expect((await submitScore(exec, '9.9.9.9', sub('ACE', 800), 2)).status).toBe(429);
    expect((await topScores(exec, 'arc')).map((r) => r.score)).toEqual([500]);
  });

  it('shows only the top ten and keeps heroes apart', async () => {
    const exec = fakeRedis();
    for (let i = 1; i <= 14; i += 1) await submitScore(exec, `ip${i}`, sub(`P${i}`, i * 100), i);
    const rows = await topScores(exec, 'arc');
    expect(rows.length).toBe(10);
    expect(rows[0].score).toBe(1400);
    expect(await topScores(exec, 'ronin')).toEqual([]);
  });
});

describe('connection', () => {
  it('is off without database variables and on with them', () => {
    expect(redisFrom({})).toBeNull();
    expect(redisFrom({ KV_REST_API_URL: 'https://x.upstash.io' })).toBeNull();
    expect(redisFrom({ KV_REST_API_URL: 'https://x.upstash.io', KV_REST_API_TOKEN: 't' })).not.toBeNull();
    expect(redisFrom({ UPSTASH_REDIS_REST_URL: 'https://x.upstash.io', UPSTASH_REDIS_REST_TOKEN: 't' })).not.toBeNull();
  });
});
