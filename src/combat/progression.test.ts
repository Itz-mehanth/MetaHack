import { describe, expect, it } from 'vitest';
import {
  buyHero,
  buySkin,
  buyUpgrade,
  defaultProfile,
  equippedColor,
  isStageUnlocked,
  maxHealth,
  MAX_UPGRADE,
  nextUpgradeCost,
  normalizeProfile,
  recordResult,
  SKINS,
  STAGES,
  STAGES_PER_WORLD,
  starsFor,
  upgradeCap,
  weaponTier,
  WORLDS,
} from './progression.js';

describe('stages', () => {
  it('builds three stages per world with unique ids and growing difficulty', () => {
    expect(STAGES).toHaveLength(WORLDS.length * STAGES_PER_WORLD);
    expect(new Set(STAGES.map((s) => s.id)).size).toBe(STAGES.length);
    const first = STAGES[0].waves[0];
    const last = STAGES[STAGES.length - 1].waves[0];
    expect(last.count).toBeGreaterThan(first.count);
    expect(last.speed).toBeGreaterThan(first.speed);
  });

  it('puts a titan in every boss stage', () => {
    for (const stage of STAGES.filter((s) => s.number === 3)) {
      expect(stage.waves.some((w) => w.kinds.includes('titan'))).toBe(true);
    }
  });

  it('unlocks stages in order', () => {
    const p = defaultProfile();
    expect(isStageUnlocked(p, STAGES[0])).toBe(true);
    expect(isStageUnlocked(p, STAGES[1])).toBe(false);
    p.stars[STAGES[0].id] = 1;
    expect(isStageUnlocked(p, STAGES[1])).toBe(true);
    // Every region's first level is open from the start.
    expect(isStageUnlocked(p, STAGES[STAGES_PER_WORLD])).toBe(true);
  });
});

describe('economy', () => {
  it('buys upgrades with rising costs up to the max level', () => {
    const p = defaultProfile();
    p.coins = 100000;
    // Hero upgrades unlock with story progress: clear ARC's levels first.
    for (const s of STAGES.filter((st) => st.world.id === 'neon-grid')) p.stars[s.id] = 1;
    let spent = 0;
    for (let i = 0; i < MAX_UPGRADE; i += 1) {
      const cost = nextUpgradeCost(p, 'arc-rate')!;
      spent += cost;
      expect(buyUpgrade(p, 'arc-rate')).toBe(true);
    }
    expect(nextUpgradeCost(p, 'arc-rate')).toBeNull();
    expect(buyUpgrade(p, 'arc-rate')).toBe(false);
    expect(p.coins).toBe(100000 - spent);
  });

  it('refuses purchases it cannot afford without changing anything', () => {
    const p = defaultProfile();
    p.coins = 50;
    expect(buyUpgrade(p, 'shield')).toBe(false);
    expect(buyHero(p, 'talon')).toBe(false);
    expect(p.coins).toBe(50);
    expect(p.heroes).toEqual(['arc']);
  });

  it('buys heroes once and skins equip on purchase', () => {
    const p = defaultProfile();
    p.coins = 5000;
    expect(buyHero(p, 'talon')).toBe(true);
    expect(buyHero(p, 'talon')).toBe(false);
    const solar = SKINS.find((s) => s.id === 'arc-solar')!;
    expect(equippedColor(p, 'arc')).toBe('#3DF5FF');
    expect(buySkin(p, solar.id)).toBe(true);
    expect(equippedColor(p, 'arc')).toBe(solar.color);
  });

  it('caps hero upgrades by story progress and raises the weapon tier', () => {
    const p = defaultProfile();
    p.coins = 100000;
    expect(upgradeCap(p, 'arc-power')).toBe(1);
    expect(upgradeCap(p, 'shield')).toBe(5);
    expect(buyUpgrade(p, 'arc-power')).toBe(true);
    expect(buyUpgrade(p, 'arc-power')).toBe(false);
    p.stars[STAGES[0].id] = 2;
    expect(upgradeCap(p, 'arc-power')).toBe(3);
    expect(buyUpgrade(p, 'arc-power')).toBe(true);
    expect(weaponTier(p, 'arc')).toBe(0);
    expect(buyUpgrade(p, 'arc-rate')).toBe(true);
    expect(weaponTier(p, 'arc')).toBe(1);
  });

  it('shield upgrades and difficulty set max health', () => {
    const p = defaultProfile();
    expect(maxHealth(p)).toBe(5);
    p.upgrades.shield = 2;
    p.settings.difficulty = 'hard';
    expect(maxHealth(p)).toBe(5);
  });
});

describe('results', () => {
  it('awards stars for clearing, saving every hostage and keeping shield', () => {
    const base = { maxHealth: 5, killCoins: 0, hostagesTotal: 3 };
    expect(starsFor({ ...base, won: false, health: 5, hostagesSaved: 3 })).toBe(0);
    expect(starsFor({ ...base, won: true, health: 5, hostagesSaved: 3 })).toBe(3);
    expect(starsFor({ ...base, won: true, health: 1, hostagesSaved: 3 })).toBe(2);
    expect(starsFor({ ...base, won: true, health: 5, hostagesSaved: 1 })).toBe(2);
    expect(starsFor({ ...base, won: true, health: 1, hostagesSaved: 0 })).toBe(1);
  });

  it('grants each story reward once, and legend skins for free', () => {
    const p = defaultProfile();
    const first = recordResult(p, STAGES[0], { won: true, health: 5, maxHealth: 5, killCoins: 0 });
    expect(first.unlocked).toBe('overdrive-arc');
    expect(recordResult(p, STAGES[0], { won: true, health: 5, maxHealth: 5, killCoins: 0 }).unlocked).toBeUndefined();
    const boss = recordResult(p, STAGES[2], { won: true, health: 5, maxHealth: 5, killCoins: 0 });
    expect(boss.unlocked).toBe('legend-arc');
    expect(p.skins).toContain('arc-solar');
    const lost = recordResult(p, STAGES[3], { won: false, health: 0, maxHealth: 5, killCoins: 0 });
    expect(lost.unlocked).toBeUndefined();
  });

  it('records best stars and pays coins, scaled by difficulty', () => {
    const p = defaultProfile();
    const start = p.coins;
    const reward = recordResult(p, STAGES[0], { won: true, health: 5, maxHealth: 5, killCoins: 60 });
    expect(reward.stars).toBe(3);
    expect(reward.newBest).toBe(true);
    expect(p.stars[STAGES[0].id]).toBe(3);
    expect(p.coins).toBe(start + reward.coins);
    const again = recordResult(p, STAGES[0], { won: true, health: 1, maxHealth: 5, killCoins: 0 });
    expect(again.newBest).toBe(false);
    expect(p.stars[STAGES[0].id]).toBe(3);

    const hard = defaultProfile();
    hard.settings.difficulty = 'hard';
    const hardReward = recordResult(hard, STAGES[0], { won: true, health: 5, maxHealth: 5, killCoins: 60 });
    expect(hardReward.coins).toBeGreaterThan(reward.coins);
  });

  it('pays kill coins even on defeat', () => {
    const p = defaultProfile();
    const reward = recordResult(p, STAGES[0], { won: false, health: 0, maxHealth: 5, killCoins: 30 });
    expect(reward.coins).toBe(30);
    expect(p.stars[STAGES[0].id]).toBeUndefined();
  });
});

describe('profile', () => {
  it('normalizes missing or corrupt saves to defaults', () => {
    expect(normalizeProfile(null)).toEqual(defaultProfile());
    expect(normalizeProfile('junk')).toEqual(defaultProfile());
    const partial = normalizeProfile({ coins: 999, settings: { music: 0.1 } });
    expect(partial.coins).toBe(999);
    expect(partial.settings.music).toBe(0.1);
    expect(partial.settings.difficulty).toBe('normal');
    expect(partial.heroes).toEqual(['arc']);
  });
});

describe('new heroes', () => {
  it('gives RONIN and PSION a region, upgrades, skins and a price', () => {
    for (const hero of ['ronin', 'psion'] as const) {
      expect(STAGES.filter((s) => s.world.id === (hero === 'ronin' ? 'moon-temple' : 'sky-ruins'))).toHaveLength(STAGES_PER_WORLD);
      expect(SKINS.filter((s) => s.hero === hero)).toHaveLength(3);
      const p = defaultProfile();
      p.coins = 100000;
      expect(buyHero(p, hero)).toBe(true);
      expect(upgradeCap(p, `${hero === 'ronin' ? 'ronin-edge' : 'psion-mass'}`)).toBe(1);
    }
  });
});
