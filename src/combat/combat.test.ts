import { describe, expect, it } from 'vitest';
import { type HandJoints, isBlastPose, isFist, isOpenPalm, palmNormal } from './gestures.js';
import { MAX_HEALTH, Run, WAVES } from './run.js';

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
    run.start();
    expect(run.phase).toBe('intro');
    expect(run.health).toBe(MAX_HEALTH);
  });

  it('spawns the wave count, clears on the last kill, and advances', () => {
    const run = new Run(() => 0.99);
    run.start();
    expect(playWave(run)).toBe(WAVES[0].count);
    for (let i = 0; i < WAVES[0].count - 1; i += 1) expect(run.kill()).toBe(false);
    expect(run.kill()).toBe(true);
    expect(run.phase).toBe('cleared');
    for (let i = 0; i < 40; i += 1) run.update(0.1);
    expect(run.wave).toBe(1);
    expect(run.phase).toBe('intro');
  });

  it('scores with a capped combo that resets after the window', () => {
    const run = new Run(() => 0.99);
    run.start();
    playWave(run);
    run.kill();
    run.kill();
    expect(run.score).toBe(100 + 200);
    for (let i = 0; i < 30; i += 1) run.update(0.1);
    expect(run.combo).toBe(0);
  });

  it('loses health on hits and ends in defeat', () => {
    const run = new Run(() => 0.99);
    run.start();
    for (let i = 0; i < 400; i += 1) run.update(0.1);
    run.hit();
    expect(run.health).toBe(MAX_HEALTH - 1);
    for (let i = 0; i < 5000 && run.phase !== 'defeat'; i += 1) {
      if (run.phase === 'fighting' && run.aliveCount > 0) run.hit();
      else run.update(0.1);
    }
    expect(run.phase).toBe('defeat');
    expect(run.health).toBe(0);
  });

  it('reaches victory after the last wave', () => {
    const run = new Run(() => 0.99);
    run.start();
    for (let w = 0; w < WAVES.length; w += 1) {
      playWave(run);
      for (let i = 0; i < WAVES[w].count; i += 1) run.kill();
      for (let i = 0; i < 40 && run.phase === 'cleared'; i += 1) run.update(0.1);
    }
    expect(run.phase).toBe('victory');
  });

  it('ignores kills and hits outside the fighting phase', () => {
    const run = new Run();
    expect(run.kill()).toBe(false);
    run.hit();
    expect(run.health).toBe(MAX_HEALTH);
  });
});
