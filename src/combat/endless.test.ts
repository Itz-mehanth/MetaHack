import { describe, expect, it } from 'vitest';
import { bossRound, championName, dailyBestToday, dailyChallenge, dailyStage, dayKey, endlessStage, endlessWave, ENDLESS_WAVES, isBossWave, liveStreak, previousDay, recordEndless, seeded, seedOf } from './endless.js';
import { defaultProfile, normalizeProfile, WORLDS } from './progression.js';
import { Run } from './run.js';

describe('dates and seeds', () => {
  it('formats the UTC day', () => {
    expect(dayKey(new Date(Date.UTC(2026, 10, 5, 23, 59)))).toBe('2026-11-05');
    expect(dayKey(new Date(Date.UTC(2026, 0, 1)))).toBe('2026-01-01');
  });

  it('finds the previous day across month and year ends', () => {
    expect(previousDay('2026-11-01')).toBe('2026-10-31');
    expect(previousDay('2027-01-01')).toBe('2026-12-31');
    expect(previousDay('2028-03-01')).toBe('2028-02-29');
  });

  it('hashes and seeds deterministically', () => {
    expect(seedOf('a')).toBe(seedOf('a'));
    expect(seedOf('a')).not.toBe(seedOf('b'));
    const one = seeded(7);
    const two = seeded(7);
    expect([one(), one(), one()]).toEqual([two(), two(), two()]);
    const r = seeded(99)();
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThan(1);
  });
});

describe('daily challenge', () => {
  it('is the same for everyone on a day and always has a twist', () => {
    const a = dailyChallenge('2026-11-12');
    expect(dailyChallenge('2026-11-12')).toEqual(a);
    expect(a.twist).not.toBe('none');
  });

  it('varies across days and covers several worlds', () => {
    const worlds = new Set<string>();
    for (let d = 1; d <= 30; d += 1) worlds.add(dailyChallenge(`2026-12-${String(d).padStart(2, '0')}`).world.id);
    expect(worlds.size).toBeGreaterThan(4);
  });

  it('builds a stage tagged as a daily', () => {
    const stage = dailyStage('2026-11-12');
    expect(stage.endless).toMatchObject({ mode: 'daily', day: '2026-11-12' });
    expect(stage.id).toBe('daily-2026-11-12');
    expect(stage.waves).toHaveLength(ENDLESS_WAVES);
  });
});

describe('endless waves', () => {
  it('puts a boss on every fifth wave and a champion between', () => {
    const world = WORLDS[1];
    for (let n = 0; n < 20; n += 1) {
      const wave = endlessWave(world, n);
      expect(Boolean(wave.boss)).toBe(isBossWave(n));
      if (wave.boss) expect(wave.champion).toBeUndefined();
    }
    expect(endlessWave(world, 4).boss).toBe(true);
    expect(endlessWave(world, 2).champion).toBeDefined();
  });

  it('escalates but stays bounded', () => {
    for (const world of WORLDS) {
      const early = endlessWave(world, 0);
      const late = endlessWave(world, ENDLESS_WAVES - 1);
      expect(late.speed).toBeGreaterThan(early.speed);
      expect(late.interval).toBeLessThanOrEqual(early.interval);
      expect(late.interval).toBeGreaterThanOrEqual(0.8);
      // The small cute swarmers come in bigger crowds than the rest.
      const swarm = world.enemies[0] === 'swarmer';
      expect(late.count).toBeLessThanOrEqual(swarm ? 36 : 24);
      expect(late.alive ?? 0).toBeLessThanOrEqual(swarm ? 16 : 9);
      for (let n = 0; n < ENDLESS_WAVES; n += 1) expect(endlessWave(world, n).kinds.length).toBeGreaterThan(0);
    }
  });

  it('starts gentle: no flyers or Colossi on the first waves', () => {
    for (const world of WORLDS) {
      const kinds = endlessWave(world, 0).kinds;
      expect(kinds).not.toContain('flyer');
      expect(kinds).not.toContain('titan');
    }
  });

  it('names champions and counts boss rounds', () => {
    expect(championName('ember-foundry', 2)).toBe('SLAG HOUND');
    expect(championName('ember-foundry', 7)).toBe('FURNACE KING');
    expect(bossRound(3)).toBe(0);
    expect(bossRound(4)).toBe(1);
    expect(bossRound(9)).toBe(2);
  });

  it('plays through the Run state machine to a wave beyond the first boss', () => {
    const run = new Run(() => 0);
    run.start(endlessStage('neon-grid', '2026-11-12'), { maxHealth: 5, speedScale: 1 });
    let guard = 0;
    while (run.wave < 5 && guard++ < 5000) {
      const order = run.update(0.5);
      if (order) run.kill(order.kind);
      else if (run.phase === 'fighting' && run.aliveCount === 0) run.kill();
    }
    expect(run.wave).toBe(5);
    expect(run.phase).not.toBe('victory');
  });
});

describe('records', () => {
  it('records endless bests by waves, then score', () => {
    const profile = defaultProfile();
    const info = endlessStage('neon-grid', '2026-11-12').endless!;
    const first = recordEndless(profile, { info, waves: 6, score: 1000, killCoins: 100 });
    expect(first.newBest).toBe(true);
    expect(profile.arcade.endlessBest).toBe(6);
    expect(recordEndless(profile, { info, waves: 4, score: 9999, killCoins: 0 }).newBest).toBe(false);
    expect(recordEndless(profile, { info, waves: 6, score: 1500, killCoins: 0 }).newBest).toBe(true);
    expect(profile.arcade.endlessRuns).toBe(3);
  });

  it('pays coins but less than the campaign', () => {
    const profile = defaultProfile();
    const before = profile.coins;
    const info = endlessStage('neon-grid', '2026-11-12').endless!;
    const reward = recordEndless(profile, { info, waves: 10, score: 5000, killCoins: 200 });
    expect(reward.coins).toBe(220);
    expect(profile.coins).toBe(before + 220);
  });

  it('keeps a daily streak across consecutive days and resets after a gap', () => {
    const profile = defaultProfile();
    const play = (day: string, waves: number) => recordEndless(profile, { info: dailyStage(day).endless!, waves, score: waves * 100, killCoins: 0 });
    expect(play('2026-11-10', 3).streak).toBe(1);
    expect(play('2026-11-10', 5).streak).toBe(1);
    expect(play('2026-11-11', 2).streak).toBe(2);
    expect(play('2026-11-12', 2).streak).toBe(3);
    expect(profile.arcade.bestStreak).toBe(3);
    expect(play('2026-11-15', 2).streak).toBe(1);
    expect(profile.arcade.bestStreak).toBe(3);
  });

  it('resets the daily best each new day and reports today only', () => {
    const profile = defaultProfile();
    recordEndless(profile, { info: dailyStage('2026-11-10').endless!, waves: 9, score: 900, killCoins: 0 });
    expect(dailyBestToday(profile, '2026-11-10')).toBe(9);
    expect(dailyBestToday(profile, '2026-11-11')).toBe(0);
    const next = recordEndless(profile, { info: dailyStage('2026-11-11').endless!, waves: 2, score: 200, killCoins: 0 });
    expect(next.newBest).toBe(true);
    expect(next.best).toBe(2);
  });

  it('shows a live streak only while it can still be extended', () => {
    const profile = defaultProfile();
    recordEndless(profile, { info: dailyStage('2026-11-10').endless!, waves: 1, score: 1, killCoins: 0 });
    expect(liveStreak(profile, '2026-11-10')).toBe(1);
    expect(liveStreak(profile, '2026-11-11')).toBe(1);
    expect(liveStreak(profile, '2026-11-12')).toBe(0);
  });

  it('loads old saves without arcade data', () => {
    const old = { ...defaultProfile() } as Partial<ReturnType<typeof defaultProfile>>;
    delete old.arcade;
    expect(normalizeProfile(old).arcade.streak).toBe(0);
  });
});
