import { describe, expect, it } from 'vitest';
import { type HandJoints, isBlastPose, isFist, isOpenPalm, isWebPose, palmNormal } from './gestures.js';
import { STAGES } from './progression.js';
import { Run } from './run.js';

const STAGE = STAGES[0];
const WAVES = STAGE.waves;
const OPTS = { maxHealth: 5, speedScale: 1 };

/** Right hand, fingers up, palm facing -Z (away from a head at the origin). */
function rightHand(curl: boolean, z = -0.4): HandJoints {
  const tipY = curl ? 0.06 : 0.17;
  const tipZ = curl ? z + 0.03 : z;
  return {
    wrist: [0.2, 1.3, z],
    thumbTip: [0.15, 1.36, z],
    indexMeta: [0.18, 1.37, z],
    pinkyMeta: [0.22, 1.36, z],
    knuckles: [
      [0.18, 1.39, z],
      [0.195, 1.395, z],
      [0.21, 1.39, z],
      [0.225, 1.385, z],
    ],
    tips: [
      [0.17, 1.3 + tipY, tipZ],
      [0.195, 1.3 + tipY, tipZ],
      [0.215, 1.3 + tipY, tipZ],
      [0.235, 1.3 + tipY * 0.9, tipZ],
    ],
  };
}

function mirror(hand: HandJoints): HandJoints {
  const m = (v: readonly [number, number, number]) => [-v[0], v[1], v[2]] as const;
  return {
    wrist: m(hand.wrist),
    thumbTip: m(hand.thumbTip),
    indexMeta: m(hand.indexMeta),
    pinkyMeta: m(hand.pinkyMeta),
    knuckles: hand.knuckles.map(m) as unknown as HandJoints['knuckles'],
    tips: hand.tips.map(m) as unknown as HandJoints['tips'],
  };
}

const HEAD = [0, 1.5, 0] as const;

describe('gestures', () => {
  it('detects the web pose: index and pinky out, middle and ring curled', () => {
    const open = rightHand(false);
    const fist = rightHand(true);
    const web: HandJoints = {
      ...open,
      tips: [open.tips[0], fist.tips[1], fist.tips[2], open.tips[3]],
    };
    expect(isWebPose(web)).toBe(true);
    expect(isWebPose(open)).toBe(false);
    expect(isWebPose(fist)).toBe(false);
    expect(isOpenPalm(web)).toBe(false);
    expect(isFist(web)).toBe(false);
  });

  it('classifies open palm and fist', () => {
    expect(isOpenPalm(rightHand(false))).toBe(true);
    expect(isFist(rightHand(false))).toBe(false);
    expect(isOpenPalm(rightHand(true))).toBe(false);
    expect(isFist(rightHand(true))).toBe(true);
  });

  it('palm normal points away from the face for a forward palm, both hands', () => {
    expect(palmNormal(rightHand(false), 'right')[2]).toBeLessThan(-0.9);
    expect(palmNormal(mirror(rightHand(false)), 'left')[2]).toBeLessThan(-0.9);
  });

  it('blast pose needs an open palm facing away from the head', () => {
    expect(isBlastPose(rightHand(false), 'right', HEAD)).toBe(true);
    expect(isBlastPose(mirror(rightHand(false)), 'left', HEAD)).toBe(true);
    expect(isBlastPose(rightHand(true), 'right', HEAD)).toBe(false);
    // Same hand behind the head: palm now faces toward the face.
    expect(isBlastPose(rightHand(false, 0.4), 'right', HEAD)).toBe(false);
  });
});

function playWave(run: Run): number {
  let spawned = 0;
  for (let i = 0; i < 2000 && run.phase !== 'fighting'; i += 1) run.update(0.1);
  for (let i = 0; i < 2000 && spawned < run.waveDef.count; i += 1) {
    if (run.update(0.1)) spawned += 1;
  }
  return spawned;
}

describe('Run', () => {
  it('starts on the title and begins with an intro', () => {
    const run = new Run(() => 0.99);
    expect(run.phase).toBe('title');
    run.start(STAGE, OPTS);
    expect(run.phase).toBe('intro');
    expect(run.health).toBe(5);
    expect(run.introLength).toBe(4);
  });

  it('spawns the wave count, clears on the last kill, and advances', () => {
    const run = new Run(() => 0.99);
    run.start(STAGE, OPTS);
    expect(playWave(run)).toBe(WAVES[0].count);
    for (let i = 0; i < WAVES[0].count - 1; i += 1) expect(run.kill('drone')).toBe(false);
    expect(run.kill('drone')).toBe(true);
    expect(run.phase).toBe('cleared');
    for (let i = 0; i < 40; i += 1) run.update(0.1);
    expect(run.wave).toBe(1);
    expect(run.phase).toBe('intro');
  });

  it('scores with a capped combo and collects coins', () => {
    const run = new Run(() => 0.99);
    run.start(STAGE, OPTS);
    playWave(run);
    run.kill('drone');
    run.kill('drone');
    expect(run.score).toBe(100 + 200);
    run.kill('armored');
    expect(run.score).toBe(100 + 200 + 600);
    expect(run.coins).toBe(5 + 5 + 10);
    expect(run.bestCombo).toBe(3);
    for (let i = 0; i < 30; i += 1) run.update(0.1);
    expect(run.combo).toBe(0);
  });

  it('applies difficulty: health and enemy speed', () => {
    const run = new Run(() => 0);
    run.start(STAGE, { maxHealth: 3, speedScale: 2 });
    expect(run.health).toBe(3);
    let order = null;
    for (let i = 0; i < 100 && order == null; i += 1) order = run.update(0.1);
    expect(order?.speed).toBeCloseTo(WAVES[0].speed * 2);
  });

  it('loses health on hits and ends in defeat, staying there for the menu', () => {
    const run = new Run(() => 0.99);
    run.start(STAGE, OPTS);
    for (let i = 0; i < 400; i += 1) run.update(0.1);
    run.hit();
    expect(run.health).toBe(4);
    for (let i = 0; i < 5000 && run.phase !== 'defeat'; i += 1) {
      if (run.phase === 'fighting' && run.aliveCount > 0) run.hit();
      else run.update(0.1);
    }
    expect(run.phase).toBe('defeat');
    for (let i = 0; i < 100; i += 1) run.update(0.1);
    expect(run.phase).toBe('defeat');
  });

  it('reaches victory after the last wave', () => {
    const run = new Run(() => 0.99);
    run.start(STAGE, OPTS);
    for (let w = 0; w < WAVES.length; w += 1) {
      playWave(run);
      for (let i = 0; i < WAVES[w].count; i += 1) run.kill('drone');
      for (let i = 0; i < 40 && run.phase === 'cleared'; i += 1) run.update(0.1);
    }
    expect(run.phase).toBe('victory');
  });

  it('spawns swarm waves in bursts', () => {
    const swarmStage = STAGES.find((s) => s.world.id === 'ember-foundry')!;
    const run = new Run(() => 0);
    run.start(swarmStage, OPTS);
    for (let i = 0; i < 60 && run.phase !== 'fighting'; i += 1) run.update(0.1);
    const times: number[] = [];
    let t = 0;
    for (let i = 0; i < 400 && times.length < 6; i += 1) {
      t += 0.05;
      const order = run.update(0.05);
      if (order) {
        expect(order.kind).toBe('swarmer');
        times.push(t);
      }
    }
    expect(times[1] - times[0]).toBeLessThan(0.3);
    expect(times[3] - times[2]).toBeGreaterThan(1.5);
  });

  it('spawns the boss first in a boss wave and only clears when it falls', () => {
    const bossStage = STAGES.find((st) => st.number === 3)!;
    const run = new Run(() => 0.5);
    run.start(bossStage, OPTS);
    // Play to the final wave.
    for (let w = 0; w < bossStage.waves.length - 1; w += 1) {
      const n = playWave(run);
      for (let i = 0; i < n; i += 1) run.kill('drone');
      for (let i = 0; i < 40 && run.phase === 'cleared'; i += 1) run.update(0.1);
    }
    for (let i = 0; i < 100 && run.phase !== 'fighting'; i += 1) run.update(0.1);
    expect(run.update(0.1)).toEqual({ kind: 'boss', speed: 0 });
    let spawned = 0;
    for (let i = 0; i < 2000 && spawned < run.waveDef.count; i += 1) if (run.update(0.1)) spawned += 1;
    for (let i = 0; i < spawned; i += 1) run.kill('drone');
    expect(run.phase).toBe('fighting');
    expect(run.kill('boss')).toBe(true);
    expect(run.phase).toBe('victory');
  });

  it('applies uncounted damage and healing', () => {
    const run = new Run();
    run.start(STAGE, OPTS);
    for (let i = 0; i < 100 && run.phase !== 'fighting'; i += 1) run.update(0.1);
    run.damage(2);
    expect(run.health).toBe(3);
    run.heal(5);
    expect(run.health).toBe(5);
    run.damage(9);
    expect(run.phase).toBe('defeat');
  });

  it('ignores kills and hits outside the fighting phase', () => {
    const run = new Run();
    expect(run.kill()).toBe(false);
    run.hit();
    expect(run.health).toBe(5);
  });
});
